<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class BahanLab extends Model
{
    protected $table = 'bahan_lab';

    protected $fillable = [
        'nama_bahan', 'kategori', 'satuan', 'stok_tersedia', 'stok_minimum',
        'tanggal_kedaluwarsa', 'status', 'keterangan', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'stok_tersedia' => 'decimal:2',
            'stok_minimum' => 'decimal:2',
            'tanggal_kedaluwarsa' => 'date:Y-m-d',
        ];
    }

    public function penggunaan()
    {
        return $this->hasMany(PenggunaanBahanLab::class);
    }

    public function sudahKedaluwarsa(): bool
    {
        return $this->tanggal_kedaluwarsa !== null && $this->tanggal_kedaluwarsa->lt(Carbon::today());
    }

    /** Status efektif untuk tampilan: kedaluwarsa (dihitung dari tanggal) selalu menang atas status manual. */
    public function statusEfektif(): string
    {
        if ($this->sudahKedaluwarsa()) {
            return 'kedaluwarsa';
        }

        return $this->status;
    }

    public function perluPengadaan(): bool
    {
        return (float) $this->stok_tersedia <= (float) $this->stok_minimum;
    }
}
