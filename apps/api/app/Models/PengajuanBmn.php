<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PengajuanBmn extends Model
{
    protected $table = 'pengajuan_bmn';

    protected $fillable = [
        'user_id', 'bmn_item_id', 'nama_barang_lain', 'jenis_pengajuan', 'deskripsi_kerusakan',
        'foto_path', 'prioritas', 'status', 'ditugaskan_ke', 'catatan_penyelesaian', 'selesai_at',
    ];

    protected function casts(): array
    {
        return ['selesai_at' => 'datetime'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function bmnItem()
    {
        return $this->belongsTo(BmnItem::class);
    }

    public function petugas()
    {
        return $this->belongsTo(User::class, 'ditugaskan_ke');
    }
}
