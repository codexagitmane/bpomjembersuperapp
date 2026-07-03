<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IzinKeluarMasuk extends Model
{
    protected $table = 'izin_keluar_masuk';

    protected $fillable = [
        'user_id', 'tanggal', 'jam_mulai', 'jam_selesai', 'jenis', 'keperluan',
        'status', 'approved_by', 'approved_at', 'catatan_approval', 'waktu_kembali_aktual',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date:Y-m-d',
            'approved_at' => 'datetime',
            'waktu_kembali_aktual' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
