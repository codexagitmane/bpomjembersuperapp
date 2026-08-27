<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SI PANDU AI — Asisten Pintar Pelaku Usaha.
 *
 * Menyimpan riwayat interaksi (konsultasi, cek produk, review label, CAPA,
 * edit desain) dan profil usaha milik pengguna. Riwayat disimpan di server
 * agar dapat diakses lintas perangkat; hanya pemilik yang dapat membacanya.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pandu_riwayat')) {
            Schema::create('pandu_riwayat', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                // konsultasi | cek_produk | cek_label | capa | edit_label
                $table->string('jenis', 30)->index();
                $table->string('judul', 200);
                $table->json('masukan')->nullable();   // input pengguna
                $table->json('hasil')->nullable();     // keluaran asisten
                $table->string('berkas_path')->nullable(); // label/dokumen yang diunggah
                $table->timestamps();
                $table->index(['user_id', 'jenis']);
            });
        }

        if (! Schema::hasTable('pandu_profil_usaha')) {
            Schema::create('pandu_profil_usaha', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->string('nama_usaha', 150)->nullable();
                $table->string('nama_pemilik', 150)->nullable();
                $table->string('jenis_usaha', 100)->nullable();
                $table->string('lokasi', 200)->nullable();
                $table->string('kabupaten', 100)->nullable();
                $table->string('komoditas', 150)->nullable();
                $table->string('nib', 60)->nullable();
                $table->string('status_sertifikasi', 150)->nullable();
                $table->text('produk')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pandu_riwayat');
        Schema::dropIfExists('pandu_profil_usaha');
    }
};
