<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApotekDistribusi extends Model
{
    protected $table = 'apotek_distribusi';

    protected $fillable = [
        'sumber_id', 'penerima_id', 'sumber_nama', 'penerima_nama', 'tanggal',
        'produk', 'kategori', 'jumlah', 'satuan', 'referensi', 'status', 'is_demo',
    ];

    protected function casts(): array
    {
        return ['tanggal' => 'date:Y-m-d', 'jumlah' => 'float', 'is_demo' => 'bool'];
    }

    public function sumber(): BelongsTo
    {
        return $this->belongsTo(SigApotek::class, 'sumber_id');
    }

    public function penerima(): BelongsTo
    {
        return $this->belongsTo(SigApotek::class, 'penerima_id');
    }
}
