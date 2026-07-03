<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presensi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('tanggal');

            $table->time('jam_masuk')->nullable();
            $table->decimal('lokasi_masuk_lat', 10, 7)->nullable();
            $table->decimal('lokasi_masuk_lng', 10, 7)->nullable();
            $table->unsignedInteger('jarak_masuk_meter')->nullable();
            $table->unsignedInteger('akurasi_masuk_meter')->nullable();
            $table->string('foto_masuk_path')->nullable();
            $table->enum('status_masuk', ['tepat_waktu', 'terlambat', 'di_luar_geofence'])->nullable();
            $table->string('ip_masuk', 45)->nullable();
            $table->string('device_masuk')->nullable();

            $table->time('jam_keluar')->nullable();
            $table->decimal('lokasi_keluar_lat', 10, 7)->nullable();
            $table->decimal('lokasi_keluar_lng', 10, 7)->nullable();
            $table->unsignedInteger('jarak_keluar_meter')->nullable();
            $table->unsignedInteger('akurasi_keluar_meter')->nullable();
            $table->string('foto_keluar_path')->nullable();
            $table->enum('status_keluar', ['tepat_waktu', 'pulang_awal', 'di_luar_geofence'])->nullable();
            $table->string('ip_keluar', 45)->nullable();
            $table->string('device_keluar')->nullable();

            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'tanggal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presensi');
    }
};
