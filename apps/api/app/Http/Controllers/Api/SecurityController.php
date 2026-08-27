<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\Totp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Keamanan akun: foto profil, 2FA (authenticator TOTP) & kode pemulihan.
 */
class SecurityController extends Controller
{
    /** Unggah / ganti foto profil. */
    public function uploadAvatar(Request $request)
    {
        $request->validate(['foto' => ['required', 'image', 'max:2048']]);
        $user = $request->user();
        if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }
        $path = $request->file('foto')->store('avatars', 'public');
        $user->forceFill(['avatar_path' => $path])->save();
        AuditLog::catat($user->id, 'avatar_diubah', 'akun', 'Foto profil diperbarui.');

        return response()->json(['avatar_url' => asset('storage/'.$path), 'message' => 'Foto profil diperbarui.']);
    }

    public function hapusAvatar(Request $request)
    {
        $user = $request->user();
        if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }
        $user->forceFill(['avatar_path' => null])->save();

        return response()->json(['avatar_url' => null, 'message' => 'Foto profil dihapus.']);
    }

    /** Mulai penyiapan 2FA: buat rahasia (belum aktif) + QR untuk authenticator. */
    public function twoFactorSetup(Request $request)
    {
        $user = $request->user();
        if ($user->twoFactorEnabled()) {
            return response()->json(['message' => '2FA sudah aktif.'], 422);
        }
        $secret = Totp::secret();
        $user->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => null])->save();
        $uri = Totp::uri($secret, $user->email, 'LENTERA BPOM Jember');
        $svg = QrCode::format('svg')->size(220)->margin(1)->generate($uri);

        return response()->json([
            'secret' => $secret,
            'otpauth_uri' => $uri,
            'qr' => 'data:image/svg+xml;base64,'.base64_encode($svg),
        ]);
    }

    /** Konfirmasi kode dari authenticator → aktifkan 2FA + tampilkan kode pemulihan. */
    public function twoFactorConfirm(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string']]);
        $user = $request->user();
        if (! $user->two_factor_secret) {
            return response()->json(['message' => 'Mulai penyiapan 2FA terlebih dahulu.'], 422);
        }
        if (! Totp::verify($user->two_factor_secret, $data['code'])) {
            throw ValidationException::withMessages(['code' => 'Kode tidak valid. Coba lagi.']);
        }
        $codes = collect(range(1, 8))->map(fn () => Str::upper(Str::random(4).'-'.Str::random(4)))->all();
        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $codes,
        ])->save();
        AuditLog::catat($user->id, '2fa_aktif', 'akun', 'Autentikasi dua faktor diaktifkan.');

        return response()->json(['recovery_codes' => $codes, 'message' => 'Autentikasi dua faktor aktif.']);
    }

    /** Nonaktifkan 2FA (butuh konfirmasi kata sandi). */
    public function twoFactorDisable(Request $request)
    {
        $data = $request->validate(['password' => ['required', 'string']]);
        $user = $request->user();
        if (! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['password' => 'Kata sandi salah.']);
        }
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();
        AuditLog::catat($user->id, '2fa_nonaktif', 'akun', 'Autentikasi dua faktor dinonaktifkan.');

        return response()->json(['message' => 'Autentikasi dua faktor dinonaktifkan.']);
    }

    /** Buat ulang kode pemulihan (butuh 2FA aktif). */
    public function recoveryCodes(Request $request)
    {
        $user = $request->user();
        abort_unless($user->twoFactorEnabled(), 422, '2FA belum aktif.');
        $codes = collect(range(1, 8))->map(fn () => Str::upper(Str::random(4).'-'.Str::random(4)))->all();
        $user->forceFill(['two_factor_recovery_codes' => $codes])->save();

        return response()->json(['recovery_codes' => $codes]);
    }
}
