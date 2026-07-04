<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PenggunaanBahanLab extends Model
{
    protected $table = 'penggunaan_bahan_lab';

    protected $fillable = ['bahan_lab_id', 'user_id', 'tanggal', 'jumlah_diambil', 'nama_sampel', 'catatan'];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date:Y-m-d',
            'jumlah_diambil' => 'decimal:2',
        ];
    }

    public function bahan()
    {
        return $this->belongsTo(BahanLab::class, 'bahan_lab_id');
    }

    public function penguji()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
