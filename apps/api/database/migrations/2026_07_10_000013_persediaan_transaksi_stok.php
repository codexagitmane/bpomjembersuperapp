<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Transaksi stok persediaan (lot-based, FIFO):
 * - persediaan_bmn.lokasi: lokasi penyimpanan item.
 * - persediaan_masuk: setiap pembelian / transfer masuk = satu "lot" berstok &
 *   bertanggal. Menambah stok katalog.
 * - persediaan_keluar: barang keluar (saat permintaan disetujui final) yang
 *   mengonsumsi lot tertua lebih dulu (First In First Out).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('persediaan_bmn') && ! Schema::hasColumn('persediaan_bmn', 'lokasi')) {
            Schema::table('persediaan_bmn', function (Blueprint $table) {
                $table->string('lokasi', 120)->nullable()->after('satuan');
            });
        }

        if (! Schema::hasTable('persediaan_masuk')) {
            Schema::create('persediaan_masuk', function (Blueprint $table) {
                $table->id();
                $table->foreignId('persediaan_id')->constrained('persediaan_bmn')->cascadeOnDelete();
                $table->enum('jenis', ['pembelian', 'transfer_masuk'])->default('pembelian');
                $table->unsignedInteger('jumlah');
                $table->unsignedInteger('sisa'); // sisa lot yang belum terpakai (untuk FIFO)
                $table->string('lokasi', 120)->nullable();
                $table->date('tanggal');
                $table->string('sumber', 190)->nullable(); // pemasok / asal transfer
                $table->string('keterangan', 500)->nullable();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['persediaan_id', 'tanggal']);
            });
        }

        if (! Schema::hasTable('persediaan_keluar')) {
            Schema::create('persediaan_keluar', function (Blueprint $table) {
                $table->id();
                $table->foreignId('persediaan_id')->constrained('persediaan_bmn')->cascadeOnDelete();
                $table->foreignId('masuk_id')->nullable()->constrained('persediaan_masuk')->nullOnDelete();
                $table->foreignId('permintaan_id')->nullable()->constrained('permintaan_persediaan')->nullOnDelete();
                $table->unsignedInteger('jumlah');
                $table->date('tanggal');
                $table->string('lokasi', 120)->nullable();
                $table->string('keterangan', 500)->nullable();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['persediaan_id', 'tanggal']);
                $table->index(['permintaan_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('persediaan_keluar');
        Schema::dropIfExists('persediaan_masuk');
        if (Schema::hasTable('persediaan_bmn') && Schema::hasColumn('persediaan_bmn', 'lokasi')) {
            Schema::table('persediaan_bmn', function (Blueprint $table) {
                $table->dropColumn('lokasi');
            });
        }
    }
};
