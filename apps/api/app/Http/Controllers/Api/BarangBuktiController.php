<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\BarangBukti;
use App\Models\BarangBuktiLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BarangBuktiController extends Controller
{
    public function index(Request $request)
    {
        $query = BarangBukti::with('penanggungJawab:id,name')->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('cari')) {
            $cari = $request->input('cari');
            $query->where(function ($q) use ($cari) {
                $q->where('nomor_bb', 'like', "%{$cari}%")->orWhere('nama_barang', 'like', "%{$cari}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    public function show(BarangBukti $barangBukti)
    {
        $barangBukti->load(['penanggungJawab:id,name', 'logs.oleh:id,name']);

        return response()->json(['barang_bukti' => $barangBukti]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nomor_bb' => ['required', 'string', 'max:60', 'unique:barang_bukti,nomor_bb'],
            'nama_barang' => ['required', 'string', 'max:150'],
            'kategori' => ['nullable', 'string', 'max:100'],
            'jumlah' => ['required', 'integer', 'min:1'],
            'satuan' => ['required', 'string', 'max:30'],
            'asal_perkara' => ['nullable', 'string', 'max:2000'],
            'tanggal_penyitaan' => ['required', 'date'],
            'lokasi_penyimpanan' => ['nullable', 'string', 'max:150'],
            'penanggung_jawab_id' => ['nullable', 'exists:users,id'],
        ]);

        $bb = BarangBukti::create([
            ...$validated,
            'status' => 'disimpan',
            'created_by' => $request->user()->id,
        ]);

        BarangBuktiLog::create([
            'barang_bukti_id' => $bb->id,
            'aksi' => 'diterima',
            'keterangan' => 'Barang bukti dicatat dan diterima ke penyimpanan.',
            'oleh_user_id' => $request->user()->id,
        ]);

        AuditLog::catat($request->user()->id, 'barang_bukti_dibuat', 'penindakan', "Barang bukti {$bb->nomor_bb} dicatat.");

        return response()->json(['barang_bukti' => $bb], 201);
    }

    /** Catat perubahan status / rantai pengelolaan (chain of custody). */
    public function tambahLog(Request $request, BarangBukti $barangBukti)
    {
        $validated = $request->validate([
            'aksi' => ['required', Rule::in(['diterima', 'dipindah', 'diperiksa', 'dimusnahkan', 'dikembalikan', 'dilimpahkan'])],
            'keterangan' => ['nullable', 'string', 'max:1000'],
        ]);

        BarangBuktiLog::create([
            ...$validated,
            'barang_bukti_id' => $barangBukti->id,
            'oleh_user_id' => $request->user()->id,
        ]);

        $statusBaru = match ($validated['aksi']) {
            'dimusnahkan' => 'dimusnahkan',
            'dikembalikan' => 'dikembalikan',
            'dilimpahkan' => 'dilimpahkan',
            'diperiksa', 'dipindah' => 'dalam_proses',
            default => $barangBukti->status,
        };
        $barangBukti->update(['status' => $statusBaru]);

        AuditLog::catat($request->user()->id, 'barang_bukti_log', 'penindakan', "Barang bukti {$barangBukti->nomor_bb}: {$validated['aksi']}.");

        return response()->json(['barang_bukti' => $barangBukti->fresh('logs.oleh')]);
    }
}
