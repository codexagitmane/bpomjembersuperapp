<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApotekPemeriksaan extends Model
{
    protected $table = 'apotek_pemeriksaan';

    protected $fillable = [
        'apotek_id', 'tanggal', 'jenis', 'petugas', 'hasil', 'jumlah_temuan',
        'status_tindak_lanjut', 'target_penyelesaian', 'catatan', 'user_id',
    ];

    protected function casts(): array
    {
        return ['tanggal' => 'date:Y-m-d', 'target_penyelesaian' => 'date:Y-m-d'];
    }

    public function apotek(): BelongsTo
    {
        return $this->belongsTo(SigApotek::class, 'apotek_id');
    }

    public function temuan(): HasMany
    {
        return $this->hasMany(ApotekTemuan::class, 'pemeriksaan_id');
    }
}
