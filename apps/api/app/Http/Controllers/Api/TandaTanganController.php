<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TandaTangan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Registry Tanda Tangan / Barcode pegawai (khusus admin).
 * QR bila dipindai menampilkan Nama, NIP, dan Jabatan pemilik.
 */
class TandaTanganController extends Controller
{
    /** Daftar pegawai internal + status tanda tangan. */
    public function index()
    {
        $ttd = TandaTangan::with('user:id,name,nip_nik,jabatan')->get()->keyBy('user_id');

        $users = User::where('account_type', 'internal')
            ->orderBy('name')
            ->get(['id', 'name', 'nip_nik', 'jabatan'])
            ->map(function ($u) use ($ttd) {
                $t = $ttd->get($u->id);

                return [
                    'user_id' => $u->id,
                    'name' => $u->name,
                    'nip_nik' => $u->nip_nik,
                    'jabatan' => $t->jabatan ?? $u->jabatan,
                    'kode' => $t->kode ?? null,
                    'is_active' => $t ? (bool) $t->is_active : false,
                    'aktif_terdaftar' => (bool) $t,
                ];
            });

        return response()->json(['data' => $users]);
    }

    /** Buat / perbarui tanda tangan seorang pegawai. */
    public function simpan(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'jabatan' => ['nullable', 'string', 'max:190'],
            'is_active' => ['boolean'],
        ]);

        $ttd = TandaTangan::firstOrNew(['user_id' => $data['user_id']]);
        if (! $ttd->exists) {
            $ttd->kode = 'TTD-'.Str::upper(Str::random(10));
        }
        $ttd->jabatan = $data['jabatan'] ?? User::find($data['user_id'])?->jabatan;
        $ttd->is_active = $data['is_active'] ?? true;
        $ttd->save();

        return response()->json(['message' => 'Tanda tangan disimpan.', 'kode' => $ttd->kode]);
    }

    public function hapus(User $user)
    {
        TandaTangan::where('user_id', $user->id)->delete();

        return response()->json(['message' => 'Tanda tangan dihapus.']);
    }

    /** PUBLIK — verifikasi data pemilik tanda tangan dari kode QR. */
    public function verify(string $kode)
    {
        $ttd = TandaTangan::with('user:id,name,nip_nik,jabatan')->where('kode', $kode)->where('is_active', true)->first();
        if (! $ttd || ! $ttd->user) {
            return response()->json(['valid' => false, 'message' => 'Tanda tangan tidak ditemukan atau tidak aktif.'], 404);
        }

        return response()->json([
            'valid' => true,
            'nama' => $ttd->user->name,
            'nip' => $ttd->user->nip_nik,
            'jabatan' => $ttd->jabatan ?? $ttd->user->jabatan,
        ]);
    }

    /** PUBLIK — QR code (SVG) untuk sebuah kode tanda tangan. */
    public function qr(string $kode)
    {
        $url = rtrim(config('app.url'), '/').'/ttd/'.$kode;
        $svg = QrCode::format('svg')->size(160)->margin(0)->generate($url);

        return response($svg, 200, ['Content-Type' => 'image/svg+xml']);
    }
}
