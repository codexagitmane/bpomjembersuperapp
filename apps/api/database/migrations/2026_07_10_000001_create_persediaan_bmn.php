<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Katalog persediaan BMN (ATK, reagen, test kit lab, dll).
        Schema::create('persediaan_bmn', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 190);
            $table->enum('kategori', ['atk', 'reagen', 'test_kit', 'alat', 'lainnya'])->default('lainnya');
            $table->string('satuan', 30)->default('unit');
            $table->unsignedInteger('stok')->default(0);
            $table->unsignedInteger('stok_minimum')->default(0);
            $table->date('tanggal_kedaluwarsa')->nullable();
            $table->string('keterangan', 500)->nullable();
            $table->timestamps();
        });

        // Permintaan persediaan oleh pegawai — persetujuan berjenjang Kasubag → Kabalai.
        Schema::create('permintaan_persediaan', function (Blueprint $table) {
            $table->id();
            $table->string('nomor', 40)->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->json('items'); // [{nama, jumlah, satuan}]
            $table->string('keperluan', 500);
            $table->enum('status', ['diajukan', 'disetujui_kasubag', 'disetujui', 'ditolak'])->default('diajukan');
            $table->string('catatan', 500)->nullable();
            $table->foreignId('approved_kasubag_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_kasubag_at')->nullable();
            $table->foreignId('approved_kabalai_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_kabalai_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permintaan_persediaan');
        Schema::dropIfExists('persediaan_bmn');
    }
};
