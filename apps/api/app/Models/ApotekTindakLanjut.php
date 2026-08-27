<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApotekTindakLanjut extends Model
{
    protected $table = 'apotek_tindak_lanjut';

    protected $fillable = [
        'temuan_id', 'tanggal', 'uraian', 'bukti', 'tahap', 'status',
        'pic', 'terverifikasi', 'user_id',
    ];

    protected function casts(): array
    {
        return ['tanggal' => 'date:Y-m-d', 'terverifikasi' => 'bool'];
    }

    public function temuan(): BelongsTo
    {
        return $this->belongsTo(ApotekTemuan::class, 'temuan_id');
    }
}
