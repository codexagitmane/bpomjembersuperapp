<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Berita extends Model
{
    protected $table = 'berita';

    protected $fillable = [
        'judul', 'slug', 'ringkasan', 'konten', 'gambar_path',
        'kategori', 'status', 'penulis_id', 'published_at',
    ];

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
    }

    public function penulis()
    {
        return $this->belongsTo(User::class, 'penulis_id');
    }
}
