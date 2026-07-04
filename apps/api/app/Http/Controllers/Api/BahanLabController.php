<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\BahanLab;
use App\Models\PenggunaanBahanLab;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BahanLabController extends Controller
{
    public function index(Request $request)
    {
        $query = BahanLab::query()->orderBy('nama_bahan');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('cari')) {
            $query->where('nama_bahan', 'like', '%'.$request->input('cari').'%');
        }

        $data = $query->paginate(20);
        $data->getCollection()->transform(fn ($b) => $this->format($b));

        return response()->json($data);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_bahan' => ['required', 'string', 'max:150'],
            'kategori' => ['nullable', 'string', 'max:100'],
            'satuan' => ['required', 'string', 'max:20'],
            'stok_tersedia' => ['required', 'numeric', 'min:0'],
            'stok_minimum' => ['required', 'numeric', 'min:0'],
            'tanggal_kedaluwarsa' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
        ]);

        $bahan = BahanLab::create([...$validated, 'status' => 'aktif', 'created_by' => $request->user()->id]);

        AuditLog::catat($request->user()->id, 'bahan_lab_dibuat', 'pengujian', "Bahan lab '{$bahan->nama_bahan}' dicatat.");

        return response()->json(['bahan' => $this->format($bahan)], 201);
    }

    public function update(Request $request, BahanLab $bahanLab)
    {
        $validated = $request->validate([
            'nama_bahan' => ['sometimes', 'string', 'max:150'],
            'kategori' => ['sometimes', 'nullable', 'string', 'max:100'],
            'satuan' => ['sometimes', 'string', 'max:20'],
            'stok_tersedia' => ['sometimes', 'numeric', 'min:0'],
            'stok_minimum' => ['sometimes', 'numeric', 'min:0'],
            'tanggal_kedaluwarsa' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', Rule::in(['aktif', 'nonaktif'])],
            'keterangan' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $bahanLab->update($validated);
        AuditLog::catat($request->user()->id, 'bahan_lab_diupdate', 'pengujian', "Bahan lab '{$bahanLab->nama_bahan}' diperbarui.");

        return response()->json(['bahan' => $this->format($bahanLab)]);
    }

    /** Catat pemakaian bahan oleh penguji — otomatis mengurangi stok. */
    public function catatPemakaian(Request $request, BahanLab $bahanLab)
    {
        $validated = $request->validate([
            'tanggal' => ['required', 'date'],
            'jumlah_diambil' => ['required', 'numeric', 'min:0.01'],
            'nama_sampel' => ['nullable', 'string', 'max:150'],
            'catatan' => ['nullable', 'string', 'max:500'],
        ]);

        if ((float) $validated['jumlah_diambil'] > (float) $bahanLab->stok_tersedia) {
            return response()->json([
                'message' => sprintf(
                    'Stok tidak cukup. Sisa stok %s: %s %s.',
                    $bahanLab->nama_bahan, $bahanLab->stok_tersedia, $bahanLab->satuan
                ),
            ], 422);
        }

        $penggunaan = PenggunaanBahanLab::create([
            ...$validated,
            'bahan_lab_id' => $bahanLab->id,
            'user_id' => $request->user()->id,
        ]);

        $bahanLab->decrement('stok_tersedia', (float) $validated['jumlah_diambil']);

        AuditLog::catat($request->user()->id, 'bahan_lab_dipakai', 'pengujian',
            "Pemakaian {$validated['jumlah_diambil']} {$bahanLab->satuan} {$bahanLab->nama_bahan}.");

        return response()->json([
            'penggunaan' => $penggunaan,
            'bahan' => $this->format($bahanLab->fresh()),
        ], 201);
    }

    public function riwayatPemakaian(Request $request, BahanLab $bahanLab)
    {
        $riwayat = $bahanLab->penggunaan()->with('penguji:id,name')->orderByDesc('tanggal')->paginate(15);

        return response()->json($riwayat);
    }

    private function format(BahanLab $b): array
    {
        return [
            'id' => $b->id,
            'nama_bahan' => $b->nama_bahan,
            'kategori' => $b->kategori,
            'satuan' => $b->satuan,
            'stok_tersedia' => (float) $b->stok_tersedia,
            'stok_minimum' => (float) $b->stok_minimum,
            'tanggal_kedaluwarsa' => $b->tanggal_kedaluwarsa?->toDateString(),
            'status' => $b->status,
            'status_efektif' => $b->statusEfektif(),
            'perlu_pengadaan' => $b->perluPengadaan(),
            'keterangan' => $b->keterangan,
        ];
    }
}
