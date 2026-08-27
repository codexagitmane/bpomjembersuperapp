<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JadwalPemeliharaanBmn extends Model
{
    protected $table = 'jadwal_pemeliharaan_bmn';

    protected $fillable = [
        'bmn_item_id', 'tahun', 'jumlah', 'bulan', 'keterangan', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'bulan' => 'array',
            'tahun' => 'integer',
            'jumlah' => 'integer',
        ];
    }

    public function bmnItem(): BelongsTo
    {
        return $this->belongsTo(BmnItem::class, 'bmn_item_id');
    }
}
