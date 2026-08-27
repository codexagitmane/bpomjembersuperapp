<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, SoftDeletes, HasApiTokens, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'nip_nik',
        'phone',
        'account_type',
        'jenis_pegawai',
        'is_pengelola_gudang',
        'is_ketua_tim',
        'is_pengelola_bmn',
        'fungsi_ketua_tim',
        'status_kepegawaian',
        'jabatan',
        'penugasan',
        'kelompok_substansi',
        'is_pengelola_arsip',
        'is_arsiparis',
        'fungsi_arsip',
        'avatar_path',
        'is_active',
    ];

    /** Urutan tampil kelompok kepegawaian: ASN → P3K → Outsourcing → Magang. */
    public const URUTAN_STATUS = ['asn' => 1, 'pppk' => 2, 'outsourcing' => 3, 'magang' => 4];

    protected $hidden = [
        'password',
        'remember_token',
        'failed_login_attempts',
        'locked_until',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'is_pengelola_gudang' => 'boolean',
            'is_ketua_tim' => 'boolean',
            'is_pengelola_bmn' => 'boolean',
            'last_login_at' => 'datetime',
            'locked_until' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'two_factor_recovery_codes' => 'array',
        ];
    }

    /** 2FA aktif hanya bila rahasia sudah dikonfirmasi. */
    public function twoFactorEnabled(): bool
    {
        return $this->two_factor_secret !== null && $this->two_factor_confirmed_at !== null;
    }

    public function isInternal(): bool
    {
        return $this->account_type === 'internal';
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    /** Outsourcing/magang: cuti butuh persetujuan berjenjang & tanpa jatah tahunan. */
    public function isOutsourcing(): bool
    {
        return $this->hasRole('pegawai_outsourcing_magang');
    }

    /** Hanya ASN/PPPK (termasuk pejabat struktural) yang punya jatah cuti tahunan. */
    public function berhakJatahCutiTahunan(): bool
    {
        return $this->hasAnyRole(['pegawai_asn_pppk', 'kepala_balai', 'kepala_subag_tu']);
    }

    public function presensi()
    {
        return $this->hasMany(Presensi::class);
    }

    public function izinKeluarMasuk()
    {
        return $this->hasMany(IzinKeluarMasuk::class);
    }

    public function bookingKonsultasi()
    {
        return $this->hasMany(BookingKonsultasi::class);
    }
}
