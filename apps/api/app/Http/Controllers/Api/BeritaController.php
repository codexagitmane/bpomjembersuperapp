<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Berita;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BeritaController extends Controller
{
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

    /** Khusus petugas Infokom/Superadmin. */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'judul' => ['required', 'string', 'max:200'],
            'ringkasan' => ['nullable', 'string', 'max:300'],
            'konten' => ['required', 'string'],
            'kategori' => ['required', Rule::in(['obat', 'makanan', 'kosmetik', 'pengumuman'])],
            'status' => ['required', Rule::in(['draft', 'terbit'])],
        ]);

        $berita = Berita::create([
            ...$validated,
            'slug' => Str::slug($validated['judul']).'-'.Str::random(6),
            'penulis_id' => $request->user()->id,
            'published_at' => $validated['status'] === 'terbit' ? now() : null,
        ]);

        AuditLog::catat($request->user()->id, 'berita_dibuat', 'infokom', "Berita '{$berita->judul}' dibuat.");

        return response()->json(['berita' => $berita], 201);
    }
}
