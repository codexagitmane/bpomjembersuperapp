<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PersediaanKeluar extends Model
{
    protected $table = 'persediaan_keluar';

    protected $fillable = [
        'persediaan_id', 'masuk_id', 'permintaan_id', 'jumlah', 'tanggal', 'lokasi', 'keterangan', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'jumlah' => 'integer',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(PersediaanBmn::class, 'persediaan_id');
    }

    public function masuk(): BelongsTo
    {
        return $this->belongsTo(PersediaanMasuk::class, 'masuk_id');
    }

    public function permintaan(): BelongsTo
    {
        return $this->belongsTo(PermintaanPersediaan::class, 'permintaan_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
