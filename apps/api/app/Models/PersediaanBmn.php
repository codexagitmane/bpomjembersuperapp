<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PersediaanBmn extends Model
{
    protected $table = 'persediaan_bmn';

    protected $fillable = [
        'nama', 'kategori', 'kelompok', 'satuan', 'lokasi', 'stok', 'stok_minimum', 'tanggal_kedaluwarsa', 'keterangan',
    ];

    public function masuk(): HasMany
    {
        return $this->hasMany(PersediaanMasuk::class, 'persediaan_id');
    }

    public function keluar(): HasMany
    {
        return $this->hasMany(PersediaanKeluar::class, 'persediaan_id');
    }

    protected function casts(): array
    {
        return [
            'tanggal_kedaluwarsa' => 'date',
            'stok' => 'integer',
            'stok_minimum' => 'integer',
        ];
    }
}
