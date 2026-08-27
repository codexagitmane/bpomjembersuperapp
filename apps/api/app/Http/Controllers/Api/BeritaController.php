<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Berita;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BeritaController extends Controller
{
    private const KATEGORI = ['obat', 'makanan', 'kosmetik', 'pengumuman'];

    /** Publik: hanya berita berstatus terbit. */
    public function index(Request $request)
    {
        $query = Berita::where('status', 'terbit')->orderByDesc('published_at');

        if ($request->filled('kategori')) {
            $query->where('kategori', $request->input('kategori'));
        }

        return response()->json(
            $query->select(['id', 'judul', 'slug', 'ringkasan', 'gambar_path', 'kategori', 'published_at'])->paginate(12)
        );
    }

    public function show(string $slug)
    {
        $berita = Berita::where('slug', $slug)->where('status', 'terbit')->firstOrFail();

        return response()->json(['berita' => $berita]);
    }

    /**
     * Daftar kelola (Infokom/Superadmin): memuat draft dan berita terbit,
     * lengkap dengan penulis — dipakai halaman kelola berita.
     */
    public function kelola(Request $request)
    {
        $q = Berita::with('penulis:id,name')->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($kategori = $request->query('kategori')) {
            $q->where('kategori', $kategori);
        }
        if ($cari = trim((string) $request->query('q', ''))) {
            $q->where(fn ($w) => $w->where('judul', 'like', "%{$cari}%")
                ->orWhere('ringkasan', 'like', "%{$cari}%"));
        }

        return response()->json([
            'data' => $q->limit(200)->get()->map(fn ($b) => $this->serialize($b)),
            'ringkasan' => [
                'total' => Berita::count(),
                'terbit' => Berita::where('status', 'terbit')->count(),
                'draft' => Berita::where('status', 'draft')->count(),
            ],
        ]);
    }

    /** Detail satu berita untuk formulir ubah (termasuk draft). */
    public function detail(Berita $berita)
    {
        return response()->json(['data' => $this->serialize($berita->load('penulis:id,name'))]);
    }

    /** Khusus petugas Infokom/Superadmin. */
    public function store(Request $request)
    {
        $validated = $request->validate($this->aturan());
        $gambar = $this->simpanGambar($request);

        $berita = Berita::create([
            ...collect($validated)->except('gambar')->all(),
            'slug' => Str::slug($validated['judul']).'-'.Str::random(6),
            'gambar_path' => $gambar,
            'penulis_id' => $request->user()->id,
            'published_at' => $validated['status'] === 'terbit' ? now() : null,
        ]);

        AuditLog::catat($request->user()->id, 'berita_dibuat', 'infokom', "Berita '{$berita->judul}' dibuat.");

        return response()->json(['berita' => $berita, 'data' => $this->serialize($berita), 'message' => 'Berita disimpan.'], 201);
    }

    /** Ubah berita. Slug ikut diperbarui bila judul berubah. */
    public function update(Request $request, Berita $berita)
    {
        $validated = $request->validate($this->aturan());

        $isi = collect($validated)->except('gambar')->all();

        if ($validated['judul'] !== $berita->judul) {
            $isi['slug'] = Str::slug($validated['judul']).'-'.Str::random(6);
        }

        // Waktu terbit diisi saat pertama kali berpindah ke status terbit.
        if ($validated['status'] === 'terbit') {
            $isi['published_at'] = $berita->published_at ?? now();
        } else {
            $isi['published_at'] = null;
        }

        if ($gambar = $this->simpanGambar($request)) {
            $this->hapusGambar($berita);
            $isi['gambar_path'] = $gambar;
        } elseif ($request->boolean('hapus_gambar')) {
            $this->hapusGambar($berita);
            $isi['gambar_path'] = null;
        }

        $berita->update($isi);
        AuditLog::catat($request->user()->id, 'berita_diubah', 'infokom', "Berita '{$berita->judul}' diubah.");

        return response()->json(['data' => $this->serialize($berita->fresh()), 'message' => 'Berita diperbarui.']);
    }

    /** Terbitkan / kembalikan ke draft tanpa membuka formulir. */
    public function ubahStatus(Request $request, Berita $berita)
    {
        $v = $request->validate(['status' => ['required', Rule::in(['draft', 'terbit'])]]);

        $berita->update([
            'status' => $v['status'],
            'published_at' => $v['status'] === 'terbit' ? ($berita->published_at ?? now()) : null,
        ]);
        AuditLog::catat($request->user()->id, 'berita_status', 'infokom', "Berita '{$berita->judul}' menjadi {$v['status']}.");

        return response()->json([
            'data' => $this->serialize($berita->fresh()),
            'message' => $v['status'] === 'terbit' ? 'Berita diterbitkan.' : 'Berita dikembalikan ke draft.',
        ]);
    }

    public function destroy(Request $request, Berita $berita)
    {
        $judul = $berita->judul;
        $this->hapusGambar($berita);
        $berita->delete();
        AuditLog::catat($request->user()->id, 'berita_dihapus', 'infokom', "Berita '{$judul}' dihapus.");

        return response()->json(['message' => 'Berita dihapus.']);
    }

    /** @return array<string,mixed> */
    private function aturan(): array
    {
        return [
            'judul' => ['required', 'string', 'max:200'],
            'ringkasan' => ['nullable', 'string', 'max:300'],
            'konten' => ['required', 'string'],
            'kategori' => ['required', Rule::in(self::KATEGORI)],
            'status' => ['required', Rule::in(['draft', 'terbit'])],
            'gambar' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:3072'],
        ];
    }

    private function simpanGambar(Request $request): ?string
    {
        return $request->hasFile('gambar')
            ? $request->file('gambar')->store('berita', 'public')
            : null;
    }

    private function hapusGambar(Berita $berita): void
    {
        if ($berita->gambar_path && Storage::disk('public')->exists($berita->gambar_path)) {
            Storage::disk('public')->delete($berita->gambar_path);
        }
    }

    private function serialize(Berita $b): array
    {
        return [
            'id' => $b->id,
            'judul' => $b->judul,
            'slug' => $b->slug,
            'ringkasan' => $b->ringkasan,
            'konten' => $b->konten,
            'kategori' => $b->kategori,
            'status' => $b->status,
            'gambar_path' => $b->gambar_path,
            'gambar_url' => $b->gambar_path ? Storage::disk('public')->url($b->gambar_path) : null,
            'penulis' => $b->penulis?->name,
            'published_at' => $b->published_at?->toIso8601String(),
            'created_at' => $b->created_at?->toIso8601String(),
        ];
    }
}
