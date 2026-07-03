<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengajuan_bmn', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('bmn_item_id')->nullable()->constrained('bmn_items')->nullOnDelete();
            $table->string('nama_barang_lain', 150)->nullable();
            $table->enum('jenis_pengajuan', ['pemeliharaan', 'perbaikan']);
            $table->text('deskripsi_kerusakan');
            $table->string('foto_path')->nullable();
            $table->enum('prioritas', ['rendah', 'sedang', 'tinggi'])->default('sedang');
            $table->enum('status', ['diajukan', 'diproses', 'selesai', 'ditolak'])->default('diajukan');
            $table->foreignId('ditugaskan_ke')->nullable()->constrained('users')->nullOnDelete();
            $table->text('catatan_penyelesaian')->nullable();
            $table->timestamp('selesai_at')->nullable();
            $table->timestamps();

            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengajuan_bmn');
    }
};
