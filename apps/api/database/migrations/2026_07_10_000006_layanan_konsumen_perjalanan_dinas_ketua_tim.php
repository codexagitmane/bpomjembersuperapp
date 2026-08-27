<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // --- Ketua Tim per fungsi (penyetuju tahap-1 permintaan persediaan) ---
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'is_ketua_tim')) {
                $table->boolean('is_ketua_tim')->default(false)->after('is_pengelola_gudang');
            }
            if (! Schema::hasColumn('users', 'fungsi_ketua_tim')) {
                $table->string('fungsi_ketua_tim', 40)->nullable()->after('is_ketua_tim');
            }
        });

        // Ketua Tim fix per fungsi.
        $ketuaTim = [
            'puji.lestari@pom.go.id' => 'tata_usaha',
            'rini.setyaningsih@pom.go.id' => 'infokom',
            'yusita.harminingsih@pom.go.id' => 'pemeriksaan',
            'daniel.prasetiawan@pom.go.id' => 'penindakan',
        ];
        foreach ($ketuaTim as $email => $fungsi) {
            DB::table('users')->where('email', $email)->update([
                'is_ketua_tim' => true,
                'fungsi_ketua_tim' => $fungsi,
            ]);
        }

        // Pemohon memilih ketua tim saat mengajukan persediaan.
        Schema::table('permintaan_persediaan', function (Blueprint $table) {
            if (! Schema::hasColumn('permintaan_persediaan', 'ketua_tim_id')) {
                $table->foreignId('ketua_tim_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            }
        });

        // --- Sistem Informasi Layanan Konsumen (Fungsi Infokom) ---
        if (! Schema::hasTable('layanan_konsumen')) {
            Schema::create('layanan_konsumen', function (Blueprint $table) {
                $table->id();
                $table->string('nomor', 60)->unique();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                // Kolom yang dipromosikan untuk filter/tabel.
                $table->string('unit_pelayanan', 40)->default('balai_pom_jember'); // balai_pom_jember | mpp_banyuwangi
                $table->string('nama_konsumen', 190);
                $table->date('tanggal_layanan');
                $table->time('jam_layanan')->nullable();
                $table->string('jenis_layanan', 40)->nullable(); // permintaan_informasi | pengaduan
                $table->string('klasifikasi', 60)->nullable();
                $table->string('petugas_1', 120)->nullable();
                $table->string('petugas_2', 120)->nullable();
                $table->string('petugas_3', 120)->nullable();
                $table->boolean('perlu_rujuk')->default(false);
                // Seluruh isi formulir (identitas konsumen, produk, layanan, tindak lanjut).
                $table->json('data');
                $table->timestamps();

                $table->index('tanggal_layanan');
                $table->index('unit_pelayanan');
            });
        }

        // --- Aplikasi Perjalanan Dinas (Fungsi Tata Usaha) ---
        if (! Schema::hasTable('perjalanan_dinas')) {
            Schema::create('perjalanan_dinas', function (Blueprint $table) {
                $table->id();
                $table->string('nomor_surat', 80)->unique();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->text('dasar')->nullable();            // dasar penugasan
                $table->text('maksud');                       // maksud perjalanan
                $table->string('tujuan', 190);                // tempat tujuan
                $table->string('tempat_berangkat', 190)->default('Jember');
                $table->string('alat_angkut', 120)->nullable();
                $table->date('tanggal_berangkat');
                $table->date('tanggal_kembali');
                $table->unsignedSmallInteger('lama_hari')->default(1);
                $table->string('pembebanan_anggaran', 190)->nullable();
                $table->string('tingkat_biaya', 120)->nullable();
                $table->text('keterangan')->nullable();
                $table->json('pegawai');                      // [{nama,nip,jabatan,pangkat}]
                $table->string('penandatangan_jabatan', 120)->default('Kepala Balai POM di Jember');
                $table->foreignId('penandatangan_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index('tanggal_berangkat');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('perjalanan_dinas');
        Schema::dropIfExists('layanan_konsumen');
        Schema::table('permintaan_persediaan', function (Blueprint $table) {
            if (Schema::hasColumn('permintaan_persediaan', 'ketua_tim_id')) {
                $table->dropConstrainedForeignId('ketua_tim_id');
            }
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_ketua_tim', 'fungsi_ketua_tim']);
        });
    }
};
