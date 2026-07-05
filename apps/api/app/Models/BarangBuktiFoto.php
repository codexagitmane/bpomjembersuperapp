<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BarangBuktiFoto extends Model
{
    protected $table = 'barang_bukti_foto';

    protected $fillable = ['barang_bukti_id', 'path', 'keterangan', 'uploaded_by'];

    public function barangBukti()
    {
        return $this->belongsTo(BarangBukti::class);
    }

    public function pengunggah()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
