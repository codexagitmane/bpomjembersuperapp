<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WfhLocation extends Model
{
    protected $table = 'wfh_locations';

    protected $fillable = [
        'user_id', 'label', 'alamat', 'latitude', 'longitude',
        'status', 'verified_by', 'verified_at', 'catatan_verifikasi',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'verified_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function verifikator()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
