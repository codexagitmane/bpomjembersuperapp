<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LaporanKeamanan extends Model
{
    protected $table = 'laporan_keamanan';

    protected $fillable = [
        'user_id',
        'tanggal',
        'sesi',
        'foto_path',
        'latitude',
        'longitude',
        'kondisi',
        'catatan',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
