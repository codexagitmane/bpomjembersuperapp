<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Peminjaman & Pengembalian Arsip Aktif/Inaktif.
 * - Penanda petugas arsip: is_pengelola_arsip (arsip aktif per Tim Kerja) &
 *   is_arsiparis (arsip inaktif). fungsi_arsip menautkan pengelola aktif ke fungsi.
 * - Tabel peminjaman_arsip: formulir, alur persetujuan, dua TTD (peminjam & petugas).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'is_pengelola_arsip')) {
                $table->boolean('is_pengelola_arsip')->default(false)->after('is_pengelola_bmn');
            }
            if (! Schema::hasColumn('users', 'is_arsiparis')) {
                $table->boolean('is_arsiparis')->default(false)->after('is_pengelola_arsip');
            }
            if (! Schema::hasColumn('users', 'fungsi_arsip')) {
                $table->string('fungsi_arsip', 40)->nullable()->after('is_arsiparis');
            }
        });

        if (! Schema::hasTable('peminjaman_arsip')) {
            Schema::create('peminjaman_arsip', function (Blueprint $table) {
                $table->id();
                $table->string('nomor', 50)->unique();
                $table->unsignedInteger('nomor_urut')->default(0);
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // peminjam
                $table->enum('jenis', ['aktif', 'inaktif'])->default('aktif');
                $table->foreignId('petugas_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('tim_kerja', 40)->nullable(); // fungsi (untuk arsip aktif)
                $table->string('unit_pengolah', 190)->nullable();
                $table->text('keperluan');
                $table->json('daftar_arsip'); // [{uraian, kode, tahun, nomor_boks?}]
                $table->date('tanggal_pinjam');
                $table->date('tanggal_harus_kembali');
                $table->date('tanggal_dikembalikan')->nullable();
                $table->enum('status', ['diajukan', 'disetujui', 'dikembalikan', 'selesai', 'ditolak'])->default('diajukan');
                $table->string('alasan_tolak', 500)->nullable();
                $table->text('catatan_petugas')->nullable();
                $table->timestamp('ttd_peminjam_at')->nullable();
                $table->timestamp('ttd_petugas_at')->nullable();
                $table->timestamp('ttd_kembali_at')->nullable();
                $table->timestamps();
                $table->index(['status', 'jenis']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('peminjaman_arsip');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_pengelola_arsip', 'is_arsiparis', 'fungsi_arsip']);
        });
    }
};
