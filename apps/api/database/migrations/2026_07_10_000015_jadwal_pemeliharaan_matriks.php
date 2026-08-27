<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ubah jadwal pemeliharaan menjadi matriks per tahun × 12 bulan (Rencana/Realisasi),
 * sesuai format Excel "Jadwal & Realisasi Pemeliharaan Sarpras". Satu baris per
 * BMN per tahun; kolom `bulan` (JSON) menyimpan {"1":{"r":bool,"e":bool},...,"12":{...}}.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('jadwal_pemeliharaan_bmn');
        Schema::create('jadwal_pemeliharaan_bmn', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bmn_item_id')->constrained('bmn_items')->cascadeOnDelete();
            $table->unsignedSmallInteger('tahun');
            $table->unsignedInteger('jumlah')->default(1);
            $table->json('bulan')->nullable(); // {"1":{"r":1,"e":0}, ...}
            $table->string('keterangan', 255)->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['bmn_item_id', 'tahun']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jadwal_pemeliharaan_bmn');
        Schema::create('jadwal_pemeliharaan_bmn', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bmn_item_id')->constrained('bmn_items')->cascadeOnDelete();
            $table->string('jenis_pemeliharaan', 120)->nullable();
            $table->date('rencana_tanggal')->nullable();
            $table->date('realisasi_tanggal')->nullable();
            $table->enum('status', ['belum', 'sudah'])->default('belum');
            $table->text('keterangan')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique('bmn_item_id');
        });
    }
};
