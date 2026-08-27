<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BmnItem extends Model
{
    protected $table = 'bmn_items';

    protected $fillable = ['kode_barang', 'nup', 'nama_barang', 'jenis_bmn', 'lokasi', 'kondisi', 'tahun_perolehan', 'foto_path', 'bast_path'];

    public function pengajuan()
    {
        return $this->hasMany(PengajuanBmn::class);
    }
}
