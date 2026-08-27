<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PanduProfilUsaha extends Model
{
    protected $table = 'pandu_profil_usaha';

    protected $fillable = [
        'user_id', 'nama_usaha', 'nama_pemilik', 'jenis_usaha', 'lokasi',
        'kabupaten', 'komoditas', 'nib', 'status_sertifikasi', 'produk',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
