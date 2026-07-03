<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aplikasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fungsi_id')->constrained('fungsi')->cascadeOnDelete();
            $table->string('slug', 60)->unique();
            $table->string('nama', 150);
            $table->text('deskripsi')->nullable();
            $table->string('icon', 50)->nullable();
            $table->boolean('is_external_access')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('urutan')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aplikasi');
    }
};
