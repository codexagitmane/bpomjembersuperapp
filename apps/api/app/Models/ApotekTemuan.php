<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApotekTemuan extends Model
{
    protected $table = 'apotek_temuan';

    protected $fillable = [
        'pemeriksaan_id', 'apotek_id', 'tanggal', 'kategori', 'deskripsi',
        'status', 'target', 'pic',
    ];

    protected function casts(): array
    {
        return ['tanggal' => 'date:Y-m-d', 'target' => 'date:Y-m-d'];
    }

    public function apotek(): BelongsTo
    {
        return $this->belongsTo(SigApotek::class, 'apotek_id');
    }

    public function pemeriksaan(): BelongsTo
    {
        return $this->belongsTo(ApotekPemeriksaan::class, 'pemeriksaan_id');
    }

    public function tindakLanjut(): HasMany
    {
        return $this->hasMany(ApotekTindakLanjut::class, 'temuan_id');
    }
}
