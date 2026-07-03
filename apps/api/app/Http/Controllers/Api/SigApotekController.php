<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SigApotek;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SigApotekController extends Controller
{
    /** Semua titik apotek untuk ditampilkan di peta SIG. */
    public function index(Request $request)
    {
        $query = SigApotek::query()->orderBy('nama_apotek');

        if ($request->filled('status_izin')) {
            $query->where('status_izin', $request->input('status_izin'));
        }

        return response()->json(['apotek' => $query->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_apotek' => ['required', 'string', 'max:150'],
            'alamat' => ['required', 'string', 'max:2000'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'nomor_izin' => ['nullable', 'string', 'max:100'],
            'status_izin' => ['required', Rule::in(['aktif', 'kadaluarsa', 'dicabut'])],
            'penanggung_jawab' => ['nullable', 'string', 'max:150'],
        ]);

        $apotek = SigApotek::create([...$validated, 'created_by' => $request->user()->id]);

        AuditLog::catat($request->user()->id, 'sig_apotek_dibuat', 'pemeriksaan', "Apotek '{$apotek->nama_apotek}' ditambahkan ke peta.");

        return response()->json(['apotek' => $apotek], 201);
    }

    public function update(Request $request, SigApotek $sigApotek)
    {
        $validated = $request->validate([
            'status_izin' => ['sometimes', Rule::in(['aktif', 'kadaluarsa', 'dicabut'])],
            'tanggal_pemeriksaan_terakhir' => ['sometimes', 'date'],
            'hasil_pemeriksaan_terakhir' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $sigApotek->update($validated);

        AuditLog::catat($request->user()->id, 'sig_apotek_diupdate', 'pemeriksaan', "Data apotek '{$sigApotek->nama_apotek}' diperbarui.");

        return response()->json(['apotek' => $sigApotek]);
    }
}
