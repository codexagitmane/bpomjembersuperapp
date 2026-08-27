<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LayananKonsumen extends Model
{
    protected $table = 'layanan_konsumen';

    protected $fillable = [
        'nomor', 'user_id', 'unit_pelayanan', 'nama_konsumen', 'tanggal_layanan', 'jam_layanan',
        'jenis_layanan', 'klasifikasi', 'petugas_1', 'petugas_2', 'petugas_3', 'perlu_rujuk', 'data',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_layanan' => 'date',
            'perlu_rujuk' => 'boolean',
            'data' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
