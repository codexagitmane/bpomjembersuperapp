<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Pengajuan cuti tahunan / izin / sakit — terpisah dari izin
        // keluar-masuk harian (yang hanya hitungan jam).
        Schema::create('cuti_izin', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('jenis', ['cuti', 'izin', 'sakit']);
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');
            $table->unsignedSmallInteger('jumlah_hari'); // hari kalender kerja, dihitung server
            $table->text('alasan');
            $table->enum('status', ['diajukan', 'disetujui', 'ditolak'])->default('diajukan');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->string('catatan_approval', 500)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['tanggal_mulai', 'tanggal_selesai']);
        });

        // Jatah cuti tahunan per pegawai (standar ASN 12 hari, bisa diubah admin).
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedSmallInteger('jatah_cuti_tahunan')->default(12)->after('jenis_pegawai');
        });

        // Notifikasi in-app (bell) — polling ringan dari klien.
        Schema::create('notifikasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('judul', 150);
            $table->string('pesan', 500);
            $table->string('url', 200)->nullable(); // rute frontend tujuan saat diklik
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
        });

        // Penanda reminder H-1 booking sudah terkirim (mencegah kirim ganda).
        Schema::table('booking_konsultasi', function (Blueprint $table) {
            $table->timestamp('reminder_sent_at')->nullable()->after('catatan_petugas');
        });

        // Lampiran foto barang bukti (bisa lebih dari satu per barang).
        Schema::create('barang_bukti_foto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('barang_bukti_id')->constrained('barang_bukti')->cascadeOnDelete();
            $table->string('path', 255);
            $table->string('keterangan', 300)->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barang_bukti_foto');
        Schema::table('booking_konsultasi', function (Blueprint $table) {
            $table->dropColumn('reminder_sent_at');
        });
        Schema::dropIfExists('notifikasi');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('jatah_cuti_tahunan');
        });
        Schema::dropIfExists('cuti_izin');
    }
};
