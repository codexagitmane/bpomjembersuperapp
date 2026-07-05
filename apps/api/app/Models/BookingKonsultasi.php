<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingKonsultasi extends Model
{
    protected $table = 'booking_konsultasi';

    protected $fillable = [
        'user_id', 'jenis_layanan', 'tanggal', 'jam_slot', 'subjek', 'deskripsi',
        'lampiran_path', 'status', 'ditangani_oleh', 'catatan_petugas', 'reminder_sent_at',
    ];

    protected function casts(): array
    {
        return ['tanggal' => 'date:Y-m-d', 'reminder_sent_at' => 'datetime'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function petugas()
    {
        return $this->belongsTo(User::class, 'ditangani_oleh');
    }
}
