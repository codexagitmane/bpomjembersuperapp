<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Master data bahan/reagen laboratorium (Fungsi Pengujian).
        Schema::create('bahan_lab', function (Blueprint $table) {
            $table->id();
            $table->string('nama_bahan', 150);
            $table->string('kategori', 100)->nullable();
            $table->string('satuan', 20)->default('gram');
            $table->decimal('stok_tersedia', 12, 2)->default(0);
            $table->decimal('stok_minimum', 12, 2)->default(0);
            $table->date('tanggal_kedaluwarsa')->nullable();
            $table->enum('status', ['aktif', 'nonaktif'])->default('aktif');
            $table->text('keterangan')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status']);
            $table->index(['tanggal_kedaluwarsa']);
        });

        // Log pemakaian bahan oleh penguji — sumber data dashboard analitik SIMBA.
        Schema::create('penggunaan_bahan_lab', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bahan_lab_id')->constrained('bahan_lab')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('tanggal');
            $table->decimal('jumlah_diambil', 12, 2);
            $table->string('nama_sampel', 150)->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->index(['tanggal']);
            $table->index(['user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penggunaan_bahan_lab');
        Schema::dropIfExists('bahan_lab');
    }
};
