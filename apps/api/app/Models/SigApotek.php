<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Sarana apotek pada modul SIG Monitoring Distribusi Apotek.
 *
 * Status pada model ini bersifat administratif — menggambarkan keadaan data
 * di dalam sistem, bukan keputusan regulator atas sarana yang bersangkutan.
 */
class SigApotek extends Model
{
    protected $table = 'sig_apotek';

    /** Status sarana yang dikenali sistem. */
    public const STATUS_SARANA = ['aktif', 'nonaktif', 'belum_diverifikasi'];

    protected $fillable = [
        'nama_apotek', 'alamat', 'kabupaten', 'kecamatan', 'desa',
        'latitude', 'longitude', 'nib', 'nomor_identitas', 'nomor_izin',
        'pemilik', 'penanggung_jawab', 'telepon', 'email',
        'jenis_sarana', 'status_sarana', 'status_izin', 'keterangan',
        'tanggal_pemeriksaan_terakhir', 'hasil_pemeriksaan_terakhir',
        'jumlah_pelanggaran', 'keterangan_pelanggaran',
        'is_demo', 'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'is_demo' => 'bool',
            'tanggal_pemeriksaan_terakhir' => 'date:Y-m-d',
        ];
    }

    public function pembuat()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function pemeriksaan(): HasMany
    {
        return $this->hasMany(ApotekPemeriksaan::class, 'apotek_id');
    }

    public function temuan(): HasMany
    {
        return $this->hasMany(ApotekTemuan::class, 'apotek_id');
    }

    public function distribusiKeluar(): HasMany
    {
        return $this->hasMany(ApotekDistribusi::class, 'sumber_id');
    }

    public function distribusiMasuk(): HasMany
    {
        return $this->hasMany(ApotekDistribusi::class, 'penerima_id');
    }

    public function audit(): HasMany
    {
        return $this->hasMany(ApotekAudit::class, 'apotek_id');
    }

    /** Apakah sarana sudah memiliki koordinat yang dapat dipetakan. */
    public function punyaKoordinat(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }
}
