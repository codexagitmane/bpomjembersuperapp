<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PengajuanBmn extends Model
{
    protected $table = 'pengajuan_bmn';

    protected $fillable = [
        'nomor_permohonan', 'tanggal_permohonan', 'user_id', 'pengelola_bmn_id', 'jabatan', 'pemohon_nama', 'pemohon_nip', 'kelompok_substansi',
        'bmn_item_id', 'nama_barang_lain', 'no_bmn', 'lokasi', 'kerusakan_mulai', 'jenis_pengajuan',
        'deskripsi_kerusakan', 'kondisi', 'foto_path', 'prioritas', 'status', 'ditugaskan_ke', 'catatan_penyelesaian',
        'tindakan', 'tanggal_diperbaiki', 'selesai_tanggal', 'keterangan_perbaikan',
        'ttd_pemohon_at', 'ttd_pengelola_at', 'kasubag_id', 'ttd_kasubag_at', 'selesai_at',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_permohonan' => 'date',
            'kerusakan_mulai' => 'date',
            'tanggal_diperbaiki' => 'date',
            'selesai_tanggal' => 'date',
            'ttd_pemohon_at' => 'datetime',
            'ttd_pengelola_at' => 'datetime',
            'ttd_kasubag_at' => 'datetime',
            'selesai_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function pengelolaBmn()
    {
        return $this->belongsTo(User::class, 'pengelola_bmn_id');
    }

    public function kasubag()
    {
        return $this->belongsTo(User::class, 'kasubag_id');
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
