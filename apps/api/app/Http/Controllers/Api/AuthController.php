<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterEksternalRequest;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login untuk akun internal (pegawai) maupun eksternal (masyarakat).
     * Dilindungi rate-limit per IP+email dan penguncian akun otomatis
     * setelah beberapa kali gagal berturut-turut (anti brute-force).
     */
    public function login(LoginRequest $request)
    {
        $throttleKey = Str::lower($request->input('email')).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 10)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => "Terlalu banyak percobaan login. Coba lagi dalam {$seconds} detik.",
            ]);
        }

        $user = User::where('email', $request->input('email'))->first();

        if ($user && $user->isLocked()) {
            AuditLog::catat($user->id, 'login_gagal_terkunci', 'auth', 'Login ditolak: akun terkunci sementara.');
            throw ValidationException::withMessages([
                'email' => 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi nanti.',
            ]);
        }

        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            RateLimiter::hit($throttleKey, 60);

            if ($user) {
                $this->catatPercobaanGagal($user);
            }

            AuditLog::catat($user?->id, 'login_gagal', 'auth', "Percobaan login gagal untuk email: {$request->input('email')}");

            throw ValidationException::withMessages([
                'email' => 'Email atau kata sandi salah.',
            ]);
        }

        if (! $user->is_active) {
            $pesan = $user->account_type === 'eksternal'
                ? 'Akun Anda belum aktif — menunggu verifikasi petugas BPOM Jember. Anda akan menerima email saat akun diaktifkan.'
                : 'Akun Anda dinonaktifkan. Hubungi administrator.';
            throw ValidationException::withMessages(['email' => $pesan]);
        }

        RateLimiter::clear($throttleKey);
        $user->forceFill([
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ])->save();

        // Batasi jumlah token aktif per user untuk mengurangi permukaan serangan token bocor.
        $user->tokens()->where('name', $request->input('device_name', 'default'))->delete();

        $token = $user->createToken(
            $request->input('device_name', 'default'),
            ['*'],
            now()->addMinutes((int) config('sanctum.expiration'))
        )->plainTextToken;

        AuditLog::catat($user->id, 'login_sukses', 'auth', 'Login berhasil.');

        return response()->json([
            'user' => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    /**
     * Registrasi mandiri untuk masyarakat (akun eksternal).
     * Akun internal TIDAK bisa self-register — hanya diprovisi Superadmin/Kepala Subag TU.
     */
    public function registerEksternal(RegisterEksternalRequest $request)
    {
        // Akun masyarakat TIDAK langsung aktif — wajib diverifikasi tim IT/admin
        // BPOM Jember terlebih dahulu (anti akun spam/bot).
        $user = User::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'phone' => $request->input('phone'),
            'password' => $request->input('password'),
            'account_type' => 'eksternal',
            'is_active' => false,
        ]);

        $user->assignRole('masyarakat');

        AuditLog::catat($user->id, 'registrasi_eksternal', 'auth', 'Registrasi akun masyarakat baru (menunggu verifikasi).');

        return response()->json([
            'message' => 'Registrasi berhasil. Akun Anda akan aktif setelah diverifikasi petugas BPOM Jember — pemberitahuan dikirim ke email Anda.',
            'perlu_verifikasi' => true,
        ], 201);
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $this->formatUser($request->user())]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        AuditLog::catat($request->user()->id, 'logout', 'auth', 'Logout berhasil.');

        return response()->json(['message' => 'Berhasil keluar.']);
    }

    private function catatPercobaanGagal(User $user): void
    {
        $maxAttempts = (int) config('app.auth_max_failed_attempts', env('AUTH_MAX_FAILED_ATTEMPTS', 5));
        $lockoutMinutes = (int) env('AUTH_LOCKOUT_MINUTES', 15);

        $attempts = $user->failed_login_attempts + 1;
        $update = ['failed_login_attempts' => $attempts];

        if ($attempts >= $maxAttempts) {
            $update['locked_until'] = now()->addMinutes($lockoutMinutes);
            $update['failed_login_attempts'] = 0;
        }

        $user->forceFill($update)->save();
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'nip_nik' => $user->nip_nik,
            'phone' => $user->phone,
            'account_type' => $user->account_type,
            'jenis_pegawai' => $user->jenis_pegawai,
            'role' => $user->getRoleNames()->first(),
            'avatar_url' => $user->avatar_path ? asset('storage/'.$user->avatar_path) : null,
            'is_active' => $user->is_active,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
