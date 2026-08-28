<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\EmailAman;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

/**
 * Manajemen pegawai / user internal (Fungsi Tata Usaha).
 * Superadmin: CRUD penuh atas semua user termasuk dirinya sendiri.
 * Pegawai lain: hanya boleh melihat & mengedit profil sendiri (via updateSelf).
 */
class UserController extends Controller
{
    private const STATUS_LABEL = [
        // ASN mencakup PNS dan PPPK; keduanya ditampilkan sebagai kategori terpisah.
        'asn' => 'PNS',
        'pppk' => 'PPPK',
        'outsourcing' => 'Outsourcing',
        'magang' => 'Magang',
        // Akun masyarakat (eksternal) yang sudah disetujui admin.
        'masyarakat' => 'Masyarakat',
    ];

    /**
     * Kelompok untuk pegawai internal yang status kepegawaiannya belum diisi.
     *
     * Sengaja TIDAK dimasukkan ke STATUS_LABEL agar tidak ikut muncul sebagai
     * pilihan pada formulir — ini penanda data yang belum lengkap, bukan status
     * yang boleh ditetapkan. Tanpa kelompok ini akun seperti Kepala Balai dan
     * Kasubag TU tidak pernah tampil di direktori.
     */
    private const KELOMPOK_LAINNYA = 'lainnya';

    private const LABEL_LAINNYA = 'Belum Ditetapkan';

    /** Kelompok tampilan: status kepegawaian untuk internal, 'masyarakat' untuk eksternal. */
    private function kelompok(User $u): string
    {
        if ($u->account_type === 'eksternal') {
            return 'masyarakat';
        }

        $status = (string) $u->status_kepegawaian;

        return isset(self::STATUS_LABEL[$status]) ? $status : self::KELOMPOK_LAINNYA;
    }

    private function serialize(User $u): array
    {
        $role = $u->getRoleNames()->first();

        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'nip_nik' => $u->nip_nik,
            'phone' => $u->phone,
            'account_type' => $u->account_type,
            'jenis_pegawai' => $u->jenis_pegawai,
            'status_kepegawaian' => $this->kelompok($u),
            'status_label' => self::STATUS_LABEL[$this->kelompok($u)] ?? self::LABEL_LAINNYA,
            'jabatan' => $u->jabatan,
            'penugasan' => $u->penugasan,
            'role' => $role,
            'is_active' => (bool) $u->is_active,
            'created_at' => $u->created_at?->toIso8601String(),
        ];
    }

    /** Daftar pegawai internal, terurut ASN → P3K → Outsourcing → Magang lalu nama. */
    public function index(Request $request)
    {
        // Pegawai internal + akun masyarakat yang sudah disetujui admin.
        $q = User::query()->where(function ($w) {
            $w->where('account_type', 'internal')
                ->orWhere(fn ($e) => $e->where('account_type', 'eksternal')
                    ->where('is_active', true)
                    ->whereNotNull('email_verified_at'));
        });

        if ($search = trim((string) $request->query('q', ''))) {
            $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('nip_nik', 'like', "%{$search}%")
                    ->orWhere('jabatan', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            if ($status === 'masyarakat') {
                $q->where('account_type', 'eksternal');
            } elseif ($status === self::KELOMPOK_LAINNYA) {
                $q->where('account_type', 'internal')
                    ->where(fn ($w) => $w->whereNull('status_kepegawaian')
                        ->orWhereNotIn('status_kepegawaian', array_keys(self::STATUS_LABEL)));
            } else {
                $q->where('account_type', 'internal')->where('status_kepegawaian', $status);
            }
        }

        // Urut: kelompok kepegawaian dulu, lalu nama. Memakai SATU kunci gabungan
        // karena sortBy() dengan array closure diperlakukan sebagai pembanding
        // ($a, $b), bukan pengambil kunci — sehingga urutannya tidak menentu.
        $urutan = User::URUTAN_STATUS;
        $users = $q->get()
            ->sortBy(function ($u) use ($urutan) {
                // Masyarakat ditempatkan setelah seluruh kelompok pegawai internal.
                $kelompok = $u->account_type === 'eksternal'
                    ? 90
                    : ($urutan[$u->status_kepegawaian] ?? 89);

                return sprintf('%02d|%s', $kelompok, mb_strtolower((string) $u->name));
            })
            ->values()
            ->map(fn ($u) => $this->serialize($u));

        // Ringkasan jumlah per kelompok untuk kartu statistik.
        $ringkasan = collect(self::STATUS_LABEL)->map(function ($label, $key) {
            $jumlah = $key === 'masyarakat'
                ? User::where('account_type', 'eksternal')
                    ->where('is_active', true)->whereNotNull('email_verified_at')->count()
                : User::where('account_type', 'internal')->where('status_kepegawaian', $key)->count();

            return ['status' => $key, 'label' => $label, 'jumlah' => $jumlah];
        })->values();

        // Pegawai internal yang status kepegawaiannya belum diisi tetap dihitung
        // dan tetap tampil; kartunya hanya muncul bila memang ada datanya.
        $belumDitetapkan = User::where('account_type', 'internal')
            ->where(fn ($w) => $w->whereNull('status_kepegawaian')
                ->orWhereNotIn('status_kepegawaian', array_keys(self::STATUS_LABEL)))
            ->count();

        if ($belumDitetapkan > 0) {
            $ringkasan->push([
                'status' => self::KELOMPOK_LAINNYA,
                'label' => self::LABEL_LAINNYA,
                'jumlah' => $belumDitetapkan,
            ]);
        }

        return response()->json([
            'data' => $users,
            'ringkasan' => $ringkasan,
            'total' => $users->count(),
            // Total seluruh pengguna LENTERA (pegawai internal + masyarakat disetujui),
            // tidak terpengaruh pencarian/saringan yang sedang aktif.
            'total_pengguna' => $ringkasan->sum('jumlah'),
        ]);
    }

    public function show(User $user)
    {
        return response()->json(['data' => $this->serialize($user)]);
    }

    /** Daftar role & status yang bisa dipilih di form (untuk dropdown). */
    public function opsi()
    {
        return response()->json([
            'roles' => Role::whereNot('name', 'masyarakat')->pluck('name'),
            'status_kepegawaian' => collect(self::STATUS_LABEL)
                ->map(fn ($label, $key) => ['value' => $key, 'label' => $label])->values(),
            'jenis_pegawai' => ['pegawai', 'pelayanan', 'keamanan', 'kebersihan', 'pengemudi', 'magang'],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', new EmailAman, 'unique:users,email'],
            'nip_nik' => ['nullable', 'string', 'max:32', 'unique:users,nip_nik'],
            'phone' => ['nullable', 'string', 'max:20'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            'status_kepegawaian' => ['nullable', Rule::in(array_keys(self::STATUS_LABEL))],
            'jabatan' => ['nullable', 'string', 'max:190'],
            'penugasan' => ['nullable', 'string', 'max:190'],
            'jenis_pegawai' => ['nullable', 'string', 'max:30'],
            'password' => ['nullable', 'string', 'min:8', 'max:72'],
            'is_active' => ['boolean'],
        ]);

        $plainPassword = $data['password'] ?? Str::password(10, symbols: false);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $plainPassword,
            'nip_nik' => $data['nip_nik'] ?? null,
            'phone' => $data['phone'] ?? null,
            'account_type' => 'internal',
            'jenis_pegawai' => $data['jenis_pegawai'] ?? 'pegawai',
            'status_kepegawaian' => $data['status_kepegawaian'] ?? null,
            'jabatan' => $data['jabatan'] ?? null,
            'penugasan' => $data['penugasan'] ?? null,
            'is_active' => $data['is_active'] ?? true,
            'email_verified_at' => now(),
        ]);
        $user->syncRoles([$data['role']]);

        return response()->json([
            'data' => $this->serialize($user),
            'generated_password' => $request->filled('password') ? null : $plainPassword,
            'message' => 'Pegawai berhasil ditambahkan.',
        ], 201);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'email' => ['sometimes', 'email', 'max:150', new EmailAman, Rule::unique('users', 'email')->ignore($user->id)],
            'nip_nik' => ['nullable', 'string', 'max:32', Rule::unique('users', 'nip_nik')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20'],
            'role' => ['sometimes', 'string', Rule::exists('roles', 'name')],
            'status_kepegawaian' => ['nullable', Rule::in(array_keys(self::STATUS_LABEL))],
            'jabatan' => ['nullable', 'string', 'max:190'],
            'penugasan' => ['nullable', 'string', 'max:190'],
            'jenis_pegawai' => ['nullable', 'string', 'max:30'],
            'is_active' => ['boolean'],
        ]);

        $user->fill(collect($data)->except('role')->toArray());
        $user->save();

        if (isset($data['role'])) {
            $user->syncRoles([$data['role']]);
        }

        return response()->json([
            'data' => $this->serialize($user->fresh()),
            'message' => 'Data pegawai diperbarui.',
        ]);
    }

    /** Reset password → menghasilkan password acak baru yang dikembalikan sekali. */
    public function resetPassword(User $user)
    {
        $plain = Str::password(10, symbols: false);

        // Penguncian otomatis akibat lima kali salah kata sandi ikut dilepas.
        // Tanpa ini pengguna yang baru direset tetap ditolak sampai masa kunci
        // habis, padahal kata sandinya sudah diganti admin.
        $terkunci = $user->isLocked();
        $user->forceFill([
            'password' => $plain,
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ])->save();

        return response()->json([
            'generated_password' => $plain,
            'message' => $terkunci
                ? "Password {$user->name} berhasil direset dan kunci akun dilepas."
                : "Password {$user->name} berhasil direset.",
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Tidak dapat menghapus akun sendiri.'], 422);
        }
        $user->delete();

        return response()->json(['message' => 'Pegawai berhasil dihapus.']);
    }

    /** Update profil milik sendiri (semua user login). */
    public function updateSelf(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:20'],
            'password' => ['nullable', 'string', 'min:8', 'max:72'],
        ]);

        if (! empty($data['name'])) {
            $user->name = $data['name'];
        }
        if (array_key_exists('phone', $data)) {
            $user->phone = $data['phone'];
        }
        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }
        $user->save();

        return response()->json([
            'data' => $this->serialize($user->fresh()),
            'message' => 'Profil berhasil diperbarui.',
        ]);
    }
}
