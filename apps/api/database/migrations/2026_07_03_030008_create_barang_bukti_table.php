<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barang_bukti', function (Blueprint $table) {
            $table->id();
            $table->string('nomor_bb', 60)->unique();
            $table->string('nama_barang', 150);
            $table->string('kategori', 100)->nullable();
            $table->unsignedInteger('jumlah')->default(1);
            $table->string('satuan', 30)->default('pcs');
            $table->text('asal_perkara')->nullable();
            $table->date('tanggal_penyitaan');
            $table->string('lokasi_penyimpanan', 150)->nullable();
            $table->enum('status', ['disimpan', 'dalam_proses', 'dimusnahkan', 'dikembalikan', 'dilimpahkan'])->default('disimpan');
            $table->foreignId('penanggung_jawab_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('foto_path')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barang_bukti');
    }
};
