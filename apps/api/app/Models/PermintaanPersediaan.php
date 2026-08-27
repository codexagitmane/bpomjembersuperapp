<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PermintaanPersediaan extends Model
{
    protected $table = 'permintaan_persediaan';

    protected $fillable = [
        'nomor', 'kelompok', 'nomor_urut', 'user_id', 'ketua_tim_id', 'items', 'keperluan', 'unit_kerja', 'status', 'catatan',
        'alasan_tolak', 'justifikasi',
        'approved_katim_by', 'approved_katim_at',
        'approved_gudang_by', 'approved_gudang_at',
        'approved_kasubag_by', 'approved_kasubag_at', 'approved_kabalai_by', 'approved_kabalai_at',
    ];

    protected function casts(): array
    {
        return [
            'items' => 'array',
            'approved_katim_at' => 'datetime',
            'approved_gudang_at' => 'datetime',
            'approved_kasubag_at' => 'datetime',
            'approved_kabalai_at' => 'datetime',
        ];
    }

    public function gudangApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_gudang_by');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Ketua Tim yang dipilih pemohon (penyetuju tahap-1). */
    public function ketuaTim(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ketua_tim_id');
    }

    public function katimApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_katim_by');
    }

    public function kasubagApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_kasubag_by');
    }

    public function kabalaiApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_kabalai_by');
    }
}
