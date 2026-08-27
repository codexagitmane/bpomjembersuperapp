<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerjalananDinas extends Model
{
    protected $table = 'perjalanan_dinas';

    protected $fillable = [
        'nomor_surat', 'user_id', 'dasar', 'maksud', 'tujuan', 'tempat_berangkat', 'alat_angkut',
        'tanggal_berangkat', 'tanggal_kembali', 'lama_hari', 'pembebanan_anggaran', 'tingkat_biaya',
        'keterangan', 'pegawai', 'penandatangan_jabatan', 'penandatangan_id',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_berangkat' => 'date',
            'tanggal_kembali' => 'date',
            'pegawai' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function penandatangan(): BelongsTo
    {
        return $this->belongsTo(User::class, 'penandatangan_id');
    }
}
