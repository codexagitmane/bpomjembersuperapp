<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class CutiIzin extends Model
{
    protected $table = 'cuti_izin';

    protected $fillable = [
        'user_id', 'jenis', 'tanggal_mulai', 'tanggal_selesai', 'jumlah_hari',
        'alasan', 'status', 'approved_by', 'approved_at', 'catatan_approval',
        'approval_kasubag_by', 'approval_kasubag_at', 'approval_kabalai_by', 'approval_kabalai_at',
    ];

    protected $appends = ['tahap'];

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'date:Y-m-d',
            'tanggal_selesai' => 'date:Y-m-d',
            'approved_at' => 'datetime',
            'approval_kasubag_at' => 'datetime',
            'approval_kabalai_at' => 'datetime',
        ];
    }

    /**
     * Tahap persetujuan saat ini untuk konsumsi frontend:
     * - menunggu_kasubag: baru diajukan
     * - menunggu_kabalai: sudah disetujui Kasubag, tunggu Kepala Balai (khusus outsourcing)
     * - selesai: sudah final (disetujui/ditolak)
     */
    public function getTahapAttribute(): string
    {
        if ($this->status !== 'diajukan') {
            return 'selesai';
        }

        return $this->approval_kasubag_at ? 'menunggu_kabalai' : 'menunggu_kasubag';
    }

    public function kasubagApprover()
    {
        return $this->belongsTo(User::class, 'approval_kasubag_by');
    }

    public function kabalaiApprover()
    {
        return $this->belongsTo(User::class, 'approval_kabalai_by');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /** Hitung hari kerja (Senin–Jumat) dalam rentang, inklusif. */
    public static function hitungHariKerja(Carbon $mulai, Carbon $selesai): int
    {
        $count = 0;
        $cursor = $mulai->copy()->startOfDay();
        $akhir = $selesai->copy()->startOfDay();
        while ($cursor <= $akhir) {
            if ($cursor->dayOfWeekIso <= 5) {
                $count++;
            }
            $cursor->addDay();
        }

        return $count;
    }

    /** Total hari cuti DISETUJUI milik user pada satu tahun (untuk sisa jatah). */
    public static function totalCutiDisetujui(int $userId, int $tahun): int
    {
        return (int) static::where('user_id', $userId)
            ->where('jenis', 'cuti')
            ->where('status', 'disetujui')
            ->whereYear('tanggal_mulai', $tahun)
            ->sum('jumlah_hari');
    }

    /** Apakah user sedang cuti/izin/sakit DISETUJUI pada tanggal tertentu. */
    public static function jenisPadaTanggal(int $userId, string $tanggal): ?string
    {
        return static::where('user_id', $userId)
            ->where('status', 'disetujui')
            ->whereDate('tanggal_mulai', '<=', $tanggal)
            ->whereDate('tanggal_selesai', '>=', $tanggal)
            ->value('jenis');
    }
}
