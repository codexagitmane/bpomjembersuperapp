<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Jejak perubahan data sarana (audit trail) modul SIG. */
class ApotekAudit extends Model
{
    protected $table = 'apotek_audit';

    protected $fillable = ['apotek_id', 'user_id', 'aksi', 'sebelum', 'sesudah'];

    protected function casts(): array
    {
        return ['sebelum' => 'array', 'sesudah' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
