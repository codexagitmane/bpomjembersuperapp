<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BarangBukti extends Model
{
    protected $table = 'barang_bukti';

    protected $fillable = [
        'nomor_bb', 'nama_barang', 'kategori', 'jumlah', 'satuan', 'asal_perkara',
        'tanggal_penyitaan', 'lokasi_penyimpanan', 'status', 'penanggung_jawab_id',
        'foto_path', 'created_by',
    ];

    protected function casts(): array
    {
        return ['tanggal_penyitaan' => 'date:Y-m-d'];
    }

    public function penanggungJawab()
    {
        return $this->belongsTo(User::class, 'penanggung_jawab_id');
    }

    public function pembuat()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function logs()
    {
        return $this->hasMany(BarangBuktiLog::class)->latest();
    }
}
