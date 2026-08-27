<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rework alur Pengajuan & Pemeliharaan (PnP) BMN:
 * Pemohon (TTD) → Pengelola BMN (TTD) → Kasubag TU (TTD).
 */
return new class extends Migration
{
    public function up(): void
    {
        // Penanda Pengelola BMN (Qithfirul & Yulia) — di-set di seeder.
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'is_pengelola_bmn')) {
                $table->boolean('is_pengelola_bmn')->default(false)->after('is_ketua_tim');
            }
        });

        Schema::table('pengajuan_bmn', function (Blueprint $table) {
            $add = function ($col, $cb) use ($table) {
                if (! Schema::hasColumn('pengajuan_bmn', $col)) {
                    $cb($table);
                }
            };
            $add('nomor_permohonan', fn ($t) => $t->string('nomor_permohonan', 60)->nullable()->after('id'));
            $add('tanggal_permohonan', fn ($t) => $t->date('tanggal_permohonan')->nullable()->after('nomor_permohonan'));
            $add('pengelola_bmn_id', fn ($t) => $t->foreignId('pengelola_bmn_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete());
            $add('jabatan', fn ($t) => $t->string('jabatan', 190)->nullable()->after('pengelola_bmn_id'));
            $add('kelompok_substansi', fn ($t) => $t->string('kelompok_substansi', 190)->nullable()->after('jabatan'));
            $add('no_bmn', fn ($t) => $t->string('no_bmn', 80)->nullable()->after('nama_barang_lain'));
            $add('lokasi', fn ($t) => $t->string('lokasi', 190)->nullable()->after('no_bmn'));
            $add('kerusakan_mulai', fn ($t) => $t->date('kerusakan_mulai')->nullable()->after('lokasi'));
            $add('tindakan', fn ($t) => $t->text('tindakan')->nullable()->after('catatan_penyelesaian'));
            $add('tanggal_diperbaiki', fn ($t) => $t->date('tanggal_diperbaiki')->nullable()->after('tindakan'));
            $add('selesai_tanggal', fn ($t) => $t->date('selesai_tanggal')->nullable()->after('tanggal_diperbaiki'));
            $add('keterangan_perbaikan', fn ($t) => $t->text('keterangan_perbaikan')->nullable()->after('selesai_tanggal'));
            // Tanda tangan berjenjang.
            $add('ttd_pemohon_at', fn ($t) => $t->timestamp('ttd_pemohon_at')->nullable()->after('keterangan_perbaikan'));
            $add('ttd_pengelola_at', fn ($t) => $t->timestamp('ttd_pengelola_at')->nullable()->after('ttd_pemohon_at'));
            $add('kasubag_id', fn ($t) => $t->foreignId('kasubag_id')->nullable()->after('ttd_pengelola_at')->constrained('users')->nullOnDelete());
            $add('ttd_kasubag_at', fn ($t) => $t->timestamp('ttd_kasubag_at')->nullable()->after('kasubag_id'));
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE pengajuan_bmn MODIFY status ENUM('diajukan','diproses','diperbaiki','selesai','ditolak') NOT NULL DEFAULT 'diajukan'");
            DB::statement("ALTER TABLE pengajuan_bmn MODIFY jenis_pengajuan ENUM('pemeliharaan','perbaikan') NOT NULL DEFAULT 'perbaikan'");
        }
    }

    public function down(): void
    {
        Schema::table('pengajuan_bmn', function (Blueprint $table) {
            foreach (['tanggal_permohonan', 'jabatan', 'kelompok_substansi', 'no_bmn', 'lokasi',
                'kerusakan_mulai', 'tindakan', 'tanggal_diperbaiki', 'selesai_tanggal', 'keterangan_perbaikan',
                'ttd_pemohon_at', 'ttd_pengelola_at', 'ttd_kasubag_at', 'nomor_permohonan'] as $col) {
                if (Schema::hasColumn('pengajuan_bmn', $col)) {
                    $table->dropColumn($col);
                }
            }
            if (Schema::hasColumn('pengajuan_bmn', 'pengelola_bmn_id')) {
                $table->dropConstrainedForeignId('pengelola_bmn_id');
            }
            if (Schema::hasColumn('pengajuan_bmn', 'kasubag_id')) {
                $table->dropConstrainedForeignId('kasubag_id');
            }
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_pengelola_bmn');
        });
    }
};
