<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barang_bukti_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('barang_bukti_id')->constrained('barang_bukti')->cascadeOnDelete();
            $table->enum('aksi', ['diterima', 'dipindah', 'diperiksa', 'dimusnahkan', 'dikembalikan', 'dilimpahkan']);
            $table->text('keterangan')->nullable();
            $table->foreignId('oleh_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barang_bukti_log');
    }
};
