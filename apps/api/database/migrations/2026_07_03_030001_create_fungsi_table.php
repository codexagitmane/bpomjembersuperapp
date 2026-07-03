<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fungsi', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 40)->unique();
            $table->string('nama', 100);
            $table->text('deskripsi')->nullable();
            $table->string('icon', 50)->nullable();
            $table->unsignedSmallInteger('urutan')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fungsi');
    }
};
