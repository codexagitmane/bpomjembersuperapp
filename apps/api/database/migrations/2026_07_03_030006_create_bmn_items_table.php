<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_items', function (Blueprint $table) {
            $table->id();
            $table->string('kode_barang', 60)->unique();
            $table->string('nama_barang', 150);
            $table->string('lokasi', 150)->nullable();
            $table->enum('kondisi', ['baik', 'rusak_ringan', 'rusak_berat'])->default('baik');
            $table->year('tahun_perolehan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_items');
    }
};
