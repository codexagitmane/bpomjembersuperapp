<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Presensi extends Model
{
    protected $table = 'presensi';

    protected $fillable = [
        'user_id', 'tanggal',
        'jam_masuk', 'lokasi_masuk_lat', 'lokasi_masuk_lng', 'jarak_masuk_meter',
        'akurasi_masuk_meter', 'foto_masuk_path', 'status_masuk', 'mode_masuk', 'titik_masuk', 'ip_masuk', 'device_masuk',
        'jam_keluar', 'lokasi_keluar_lat', 'lokasi_keluar_lng', 'jarak_keluar_meter',
        'akurasi_keluar_meter', 'foto_keluar_path', 'status_keluar', 'mode_keluar', 'titik_keluar', 'ip_keluar', 'device_keluar',
        'catatan',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date:Y-m-d',
            'lokasi_masuk_lat' => 'float',
            'lokasi_masuk_lng' => 'float',
            'lokasi_keluar_lat' => 'float',
            'lokasi_keluar_lng' => 'float',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
