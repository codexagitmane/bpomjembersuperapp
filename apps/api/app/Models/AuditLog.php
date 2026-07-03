<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $table = 'audit_logs';

    public $timestamps = false;

    protected $fillable = ['user_id', 'aksi', 'modul', 'deskripsi', 'ip_address', 'user_agent', 'created_at'];

    protected $casts = ['created_at' => 'datetime'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function catat(?int $userId, string $aksi, ?string $modul = null, ?string $deskripsi = null): void
    {
        static::create([
            'user_id' => $userId,
            'aksi' => $aksi,
            'modul' => $modul,
            'deskripsi' => $deskripsi,
            'ip_address' => request()->ip(),
            'user_agent' => substr((string) request()->userAgent(), 0, 255),
            'created_at' => now(),
        ]);
    }
}
