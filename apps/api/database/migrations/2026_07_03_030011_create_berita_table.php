<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('berita', function (Blueprint $table) {
            $table->id();
            $table->string('judul', 200);
            $table->string('slug', 220)->unique();
            $table->string('ringkasan', 300)->nullable();
            $table->longText('konten');
            $table->string('gambar_path')->nullable();
            $table->enum('kategori', ['obat', 'makanan', 'kosmetik', 'pengumuman'])->default('pengumuman');
            $table->enum('status', ['draft', 'terbit'])->default('draft');
            $table->foreignId('penulis_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('berita');
    }
};
