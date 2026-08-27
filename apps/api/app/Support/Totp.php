<?php

namespace App\Support;

/**
 * TOTP (RFC 6238) — kompatibel dengan Google Authenticator, Authy, dsb.
 * SHA-1, 6 digit, periode 30 detik.
 */
class Totp
{
    private const ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /** Rahasia base32 acak (default 20 byte = 160 bit). */
    public static function secret(int $bytes = 20): string
    {
        return self::base32encode(random_bytes($bytes));
    }

    public static function code(string $secret, ?int $ts = null, int $period = 30, int $digits = 6): string
    {
        $ts = $ts ?? time();
        $counter = intdiv($ts, $period);
        $bin = "\0\0\0\0".pack('N', $counter); // 64-bit big-endian counter
        $hash = hash_hmac('sha1', $bin, self::base32decode($secret), true);
        $offset = ord($hash[strlen($hash) - 1]) & 0xf;
        $val = ((ord($hash[$offset]) & 0x7f) << 24)
            | ((ord($hash[$offset + 1]) & 0xff) << 16)
            | ((ord($hash[$offset + 2]) & 0xff) << 8)
            | (ord($hash[$offset + 3]) & 0xff);

        return str_pad((string) ($val % (10 ** $digits)), $digits, '0', STR_PAD_LEFT);
    }

    /** Verifikasi kode dengan toleransi +/- $window periode (drift jam). */
    public static function verify(string $secret, string $code, int $window = 1): bool
    {
        $code = preg_replace('/\D/', '', $code);
        if ($code === '' || $secret === '') {
            return false;
        }
        for ($i = -$window; $i <= $window; $i++) {
            if (hash_equals(self::code($secret, time() + $i * 30), $code)) {
                return true;
            }
        }

        return false;
    }

    /** otpauth:// URI untuk QR di aplikasi authenticator. */
    public static function uri(string $secret, string $label, string $issuer): string
    {
        return 'otpauth://totp/'.rawurlencode($issuer.':'.$label)
            .'?secret='.$secret
            .'&issuer='.rawurlencode($issuer)
            .'&algorithm=SHA1&digits=6&period=30';
    }

    public static function base32encode(string $data): string
    {
        if ($data === '') {
            return '';
        }
        $out = '';
        $bits = 0;
        $val = 0;
        for ($i = 0, $n = strlen($data); $i < $n; $i++) {
            $val = ($val << 8) | ord($data[$i]);
            $bits += 8;
            while ($bits >= 5) {
                $out .= self::ALPH[($val >> ($bits - 5)) & 31];
                $bits -= 5;
            }
        }
        if ($bits > 0) {
            $out .= self::ALPH[($val << (5 - $bits)) & 31];
        }

        return $out;
    }

    public static function base32decode(string $b32): string
    {
        $b32 = strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $b32));
        $out = '';
        $bits = 0;
        $val = 0;
        for ($i = 0, $n = strlen($b32); $i < $n; $i++) {
            $val = ($val << 5) | strpos(self::ALPH, $b32[$i]);
            $bits += 5;
            if ($bits >= 8) {
                $out .= chr(($val >> ($bits - 8)) & 0xff);
                $bits -= 8;
            }
        }

        return $out;
    }
}
