<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Jenis kepegawaian untuk aturan jadwal presensi — terpisah dari role RBAC.
            // Nilai: pegawai|magang|keamanan|kebersihan|pengemudi|pelayanan
            $table->string('jenis_pegawai', 30)->default('pegawai')->after('account_type')->index();
        });

        Schema::table('presensi', function (Blueprint $table) {
            $table->string('mode_masuk', 10)->nullable()->after('status_masuk');   // wfo|wfh|dinas
            $table->string('mode_keluar', 10)->nullable()->after('status_keluar');
            $table->string('titik_masuk', 40)->nullable()->after('mode_masuk');    // kantor_utama|gedung_lab|wfh|dinas
            $table->string('titik_keluar', 40)->nullable()->after('mode_keluar');
            // Longgarkan kolom status dari enum ke string agar bisa menampung
            // status baru (mis. lewat_batas utk shift keamanan) tanpa ALTER enum.
            $table->string('status_masuk', 30)->nullable()->change();
            $table->string('status_keluar', 30)->nullable()->change();
        });

        Schema::create('wfh_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('label', 100)->default('Rumah');
            $table->text('alamat')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->enum('status', ['diajukan', 'diverifikasi', 'ditolak'])->default('diajukan');
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('catatan_verifikasi')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });

        Schema::table('sig_apotek', function (Blueprint $table) {
            $table->string('kecamatan', 100)->nullable()->after('alamat');
            $table->unsignedInteger('jumlah_pelanggaran')->default(0)->after('hasil_pemeriksaan_terakhir');
            $table->text('keterangan_pelanggaran')->nullable()->after('jumlah_pelanggaran');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('jenis_pegawai');
        });
        Schema::table('presensi', function (Blueprint $table) {
            $table->dropColumn(['mode_masuk', 'mode_keluar', 'titik_masuk', 'titik_keluar']);
        });
        Schema::dropIfExists('wfh_locations');
        Schema::table('sig_apotek', function (Blueprint $table) {
            $table->dropColumn(['kecamatan', 'jumlah_pelanggaran', 'keterangan_pelanggaran']);
        });
    }
};
