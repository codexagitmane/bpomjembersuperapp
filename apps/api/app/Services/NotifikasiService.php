<?php

namespace App\Services;

use App\Models\Notifikasi;
use App\Models\User;

/**
 * Notifikasi in-app (bell). Pengiriman sinkron & ringan (insert baris),
 * klien membaca via polling — cukup untuk skala satu balai; bisa diganti
 * broadcast (websocket) tanpa mengubah pemanggil.
 */
class NotifikasiService
{
    /** @param int[] $userIds */
    public function kirim(array $userIds, string $judul, string $pesan, ?string $url = null): void
    {
        $now = now();
        $rows = array_map(fn (int $id) => [
            'user_id' => $id,
            'judul' => mb_substr($judul, 0, 150),
            'pesan' => mb_substr($pesan, 0, 500),
            'url' => $url,
            'created_at' => $now,
            'updated_at' => $now,
        ], array_values(array_unique($userIds)));

        if ($rows !== []) {
            Notifikasi::insert($rows);
        }
    }

    /** Kirim ke semua user aktif pemegang role tertentu. */
    public function kirimKeRole(array $roles, string $judul, string $pesan, ?string $url = null): void
    {
        $ids = User::role($roles)->where('is_active', true)->pluck('id')->all();
        $this->kirim($ids, $judul, $pesan, $url);
    }
}
