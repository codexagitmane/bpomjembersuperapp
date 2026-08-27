<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Penguat validasi alamat surel.
 *
 * Aturan `email` bawaan Laravel 11 masih meloloskan karakter kendali seperti
 * CR/LF pada sebagian bentuk masukan (lihat advisory GHSA-5vg9-5847-vvmq).
 * Karena alamat yang diterima sistem ini dipakai sebagai penerima surel,
 * karakter kendali berpotensi disalahgunakan untuk menyisipkan tajuk surel.
 *
 * Aturan ini menolak seluruh karakter kendali dan spasi di dalam alamat,
 * sehingga tetap aman meskipun versi framework belum dinaikkan.
 */
class EmailAman implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('Alamat email tidak valid.');

            return;
        }

        // Karakter kendali ASCII (termasuk CR, LF, TAB, NUL) dan DEL.
        if (preg_match('/[\x00-\x1F\x7F]/', $value) === 1) {
            $fail('Alamat email tidak boleh memuat karakter kendali.');

            return;
        }

        if (preg_match('/\s/u', $value) === 1) {
            $fail('Alamat email tidak boleh memuat spasi.');
        }
    }
}
