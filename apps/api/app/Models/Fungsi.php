<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Fungsi extends Model
{
    protected $table = 'fungsi';

    protected $fillable = ['slug', 'nama', 'deskripsi', 'icon', 'urutan'];

    public function aplikasi()
    {
        return $this->hasMany(Aplikasi::class);
    }
}
