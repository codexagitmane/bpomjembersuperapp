<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sig_apotek', function (Blueprint $table) {
            $table->id();
            $table->string('nama_apotek', 150);
            $table->text('alamat');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('nomor_izin', 100)->nullable();
            $table->enum('status_izin', ['aktif', 'kadaluarsa', 'dicabut'])->default('aktif');
            $table->string('penanggung_jawab', 150)->nullable();
            $table->date('tanggal_pemeriksaan_terakhir')->nullable();
            $table->text('hasil_pemeriksaan_terakhir')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['status_izin']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sig_apotek');
    }
};
