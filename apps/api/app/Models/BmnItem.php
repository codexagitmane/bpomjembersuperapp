<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BmnItem extends Model
{
    protected $table = 'bmn_items';

    protected $fillable = ['kode_barang', 'nama_barang', 'lokasi', 'kondisi', 'tahun_perolehan'];

    public function pengajuan()
    {
        return $this->hasMany(PengajuanBmn::class);
    }
}
