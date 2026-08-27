<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SIG Monitoring Distribusi Apotek.
 *
 * Memperluas data sarana apotek serta menambahkan rantai monitoring:
 * pemeriksaan → temuan → tindak lanjut, ditambah pencatatan hubungan
 * distribusi antar sarana.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Profil sarana diperluas ────────────────────────────────────────
        Schema::table('sig_apotek', function (Blueprint $table) {
            foreach ([
                'kabupaten' => fn () => $table->string('kabupaten', 60)->nullable()->index(),
                'desa' => fn () => $table->string('desa', 80)->nullable(),
                'nib' => fn () => $table->string('nib', 60)->nullable(),
                'nomor_identitas' => fn () => $table->string('nomor_identitas', 80)->nullable(),
                'pemilik' => fn () => $table->string('pemilik', 150)->nullable(),
                'telepon' => fn () => $table->string('telepon', 30)->nullable(),
                'email' => fn () => $table->string('email', 120)->nullable(),
                'jenis_sarana' => fn () => $table->string('jenis_sarana', 40)->default('apotek'),
                'status_sarana' => fn () => $table->string('status_sarana', 30)->default('aktif')->index(),
                'keterangan' => fn () => $table->text('keterangan')->nullable(),
                'is_demo' => fn () => $table->boolean('is_demo')->default(false)->index(),
                'updated_by' => fn () => $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete(),
            ] as $kolom => $buat) {
                if (! Schema::hasColumn('sig_apotek', $kolom)) {
                    $buat();
                }
            }
        });

        // Koordinat boleh kosong: sarana dapat didata lebih dulu, dipetakan kemudian.
        if (Schema::hasColumn('sig_apotek', 'latitude')) {
            Schema::table('sig_apotek', function (Blueprint $table) {
                $table->decimal('latitude', 10, 7)->nullable()->change();
                $table->decimal('longitude', 10, 7)->nullable()->change();
            });
        }

        // ── Pemeriksaan sarana ─────────────────────────────────────────────
        if (! Schema::hasTable('apotek_pemeriksaan')) {
            Schema::create('apotek_pemeriksaan', function (Blueprint $table) {
                $table->id();
                $table->foreignId('apotek_id')->constrained('sig_apotek')->cascadeOnDelete();
                $table->date('tanggal')->index();
                $table->string('jenis', 60)->default('pemeriksaan_sarana');
                $table->string('petugas', 200)->nullable();
                $table->text('hasil')->nullable();
                $table->unsignedSmallInteger('jumlah_temuan')->default(0);
                // belum | proses | selesai | perlu_verifikasi
                $table->string('status_tindak_lanjut', 30)->default('belum')->index();
                $table->date('target_penyelesaian')->nullable();
                $table->text('catatan')->nullable();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        // ── Temuan ─────────────────────────────────────────────────────────
        if (! Schema::hasTable('apotek_temuan')) {
            Schema::create('apotek_temuan', function (Blueprint $table) {
                $table->id();
                $table->foreignId('pemeriksaan_id')->nullable()->constrained('apotek_pemeriksaan')->cascadeOnDelete();
                $table->foreignId('apotek_id')->constrained('sig_apotek')->cascadeOnDelete();
                $table->date('tanggal')->index();
                $table->string('kategori', 80)->nullable();
                $table->text('deskripsi');
                // belum | proses | selesai
                $table->string('status', 20)->default('belum')->index();
                $table->date('target')->nullable();
                $table->string('pic', 150)->nullable();
                $table->timestamps();
            });
        }

        // ── Tindak lanjut ──────────────────────────────────────────────────
        if (! Schema::hasTable('apotek_tindak_lanjut')) {
            Schema::create('apotek_tindak_lanjut', function (Blueprint $table) {
                $table->id();
                $table->foreignId('temuan_id')->constrained('apotek_temuan')->cascadeOnDelete();
                $table->date('tanggal')->index();
                $table->text('uraian');
                $table->string('bukti', 255)->nullable();
                // tindakan | bukti | verifikasi | selesai
                $table->string('tahap', 20)->default('tindakan');
                $table->string('status', 20)->default('proses');
                $table->string('pic', 150)->nullable();
                $table->boolean('terverifikasi')->default(false);
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        // ── Hubungan distribusi antar sarana ───────────────────────────────
        if (! Schema::hasTable('apotek_distribusi')) {
            Schema::create('apotek_distribusi', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sumber_id')->nullable()->constrained('sig_apotek')->nullOnDelete();
                $table->foreignId('penerima_id')->nullable()->constrained('sig_apotek')->nullOnDelete();
                // Nama dipakai bila sarana lawan belum terdata sebagai apotek.
                $table->string('sumber_nama', 180)->nullable();
                $table->string('penerima_nama', 180)->nullable();
                $table->date('tanggal')->nullable()->index();
                $table->string('produk', 180)->nullable();
                $table->string('kategori', 80)->nullable();
                $table->decimal('jumlah', 12, 2)->nullable();
                $table->string('satuan', 30)->nullable();
                $table->string('referensi', 120)->nullable();
                $table->string('status', 30)->default('tercatat');
                $table->boolean('is_demo')->default(false);
                $table->timestamps();
            });
        }

        // ── Jejak perubahan data sarana ────────────────────────────────────
        if (! Schema::hasTable('apotek_audit')) {
            Schema::create('apotek_audit', function (Blueprint $table) {
                $table->id();
                $table->foreignId('apotek_id')->constrained('sig_apotek')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('aksi', 40);
                $table->json('sebelum')->nullable();
                $table->json('sesudah')->nullable();
                $table->timestamps();
                $table->index(['apotek_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('apotek_audit');
        Schema::dropIfExists('apotek_distribusi');
        Schema::dropIfExists('apotek_tindak_lanjut');
        Schema::dropIfExists('apotek_temuan');
        Schema::dropIfExists('apotek_pemeriksaan');
    }
};
