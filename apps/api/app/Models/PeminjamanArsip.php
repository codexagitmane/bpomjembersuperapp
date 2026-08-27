<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PeminjamanArsip extends Model
{
    protected $table = 'peminjaman_arsip';

    protected $fillable = [
        'nomor', 'nomor_urut', 'user_id', 'jenis', 'petugas_id', 'tim_kerja', 'unit_pengolah',
        'keperluan', 'daftar_arsip', 'tanggal_pinjam', 'tanggal_harus_kembali', 'tanggal_dikembalikan',
        'status', 'alasan_tolak', 'catatan_petugas', 'ttd_peminjam_at', 'ttd_petugas_at', 'ttd_kembali_peminjam_at', 'ttd_kembali_at',
    ];

    protected function casts(): array
    {
        return [
            'daftar_arsip' => 'array',
            'tanggal_pinjam' => 'date',
            'tanggal_harus_kembali' => 'date',
            'tanggal_dikembalikan' => 'date',
            'ttd_peminjam_at' => 'datetime',
            'ttd_petugas_at' => 'datetime',
            'ttd_kembali_peminjam_at' => 'datetime',
            'ttd_kembali_at' => 'datetime',
        ];
    }

    public function peminjam(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function petugas(): BelongsTo
    {
        return $this->belongsTo(User::class, 'petugas_id');
    }
}
