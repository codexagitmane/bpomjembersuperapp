<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Aplikasi extends Model
{
    protected $table = 'aplikasi';

    protected $fillable = [
        'fungsi_id', 'slug', 'nama', 'deskripsi', 'icon',
        'is_external_access', 'is_active', 'urutan',
    ];

    protected function casts(): array
    {
        return [
            'is_external_access' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function fungsi()
    {
        return $this->belongsTo(Fungsi::class);
    }
}
