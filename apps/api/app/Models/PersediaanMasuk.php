<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PersediaanMasuk extends Model
{
    protected $table = 'persediaan_masuk';

    protected $fillable = [
        'persediaan_id', 'jenis', 'jumlah', 'sisa', 'lokasi', 'tanggal', 'sumber', 'keterangan', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'jumlah' => 'integer',
            'sisa' => 'integer',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(PersediaanBmn::class, 'persediaan_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
