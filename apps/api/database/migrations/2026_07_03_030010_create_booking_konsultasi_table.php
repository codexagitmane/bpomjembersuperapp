<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_konsultasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('jenis_layanan', ['konsultasi', 'pengaduan']);
            $table->date('tanggal');
            $table->time('jam_slot');
            $table->string('subjek', 150);
            $table->text('deskripsi');
            $table->string('lampiran_path')->nullable();
            $table->enum('status', ['menunggu', 'dikonfirmasi', 'selesai', 'dibatalkan'])->default('menunggu');
            $table->foreignId('ditangani_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->text('catatan_petugas')->nullable();
            $table->timestamps();

            $table->index(['tanggal', 'jam_slot']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_konsultasi');
    }
};
