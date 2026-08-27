<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PanduRiwayat extends Model
{
    protected $table = 'pandu_riwayat';

    protected $fillable = ['user_id', 'jenis', 'judul', 'masukan', 'hasil', 'berkas_path'];

    protected function casts(): array
    {
        return ['masukan' => 'array', 'hasil' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
