<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BarangBuktiLog extends Model
{
    protected $table = 'barang_bukti_log';

    protected $fillable = ['barang_bukti_id', 'aksi', 'keterangan', 'oleh_user_id'];

    public function barangBukti()
    {
        return $this->belongsTo(BarangBukti::class);
    }

    public function oleh()
    {
        return $this->belongsTo(User::class, 'oleh_user_id');
    }
}
