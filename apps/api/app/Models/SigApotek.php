<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SigApotek extends Model
{
    protected $table = 'sig_apotek';

    protected $fillable = [
        'nama_apotek', 'alamat', 'latitude', 'longitude', 'nomor_izin', 'status_izin',
        'penanggung_jawab', 'tanggal_pemeriksaan_terakhir', 'hasil_pemeriksaan_terakhir', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'tanggal_pemeriksaan_terakhir' => 'date:Y-m-d',
        ];
    }

    public function pembuat()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
