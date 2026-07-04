<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RosterKeamanan extends Model
{
    protected $table = 'roster_keamanan';

    protected $fillable = ['user_id', 'tanggal', 'shift', 'keterangan', 'created_by'];

    protected function casts(): array
    {
        return ['tanggal' => 'date:Y-m-d'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
