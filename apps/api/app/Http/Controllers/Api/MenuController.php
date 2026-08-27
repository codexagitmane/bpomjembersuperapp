<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fungsi;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    /**
     * Struktur menu Fungsi -> Aplikasi, sudah difilter sesuai akses role
     * user yang login (RBAC ditegakkan di server, bukan cuma UI).
     */
    public function index(Request $request)
    {
        $user = $request->user();
        // Superadmin, Kepala Balai, & Kepala Subag TU melihat seluruh fungsi (lintas fungsi).
        $isSuperOrKepala = $user->hasAnyRole(['superadmin', 'kepala_balai', 'kepala_subag_tu']);

        $fungsi = Fungsi::with(['aplikasi' => function ($q) {
            $q->where('is_active', true)->orderBy('urutan');
        }])->orderBy('urutan')->get();

        $fungsi = $fungsi->map(function ($f) use ($user, $isSuperOrKepala) {
            $aplikasi = $f->aplikasi->filter(function ($a) use ($user, $isSuperOrKepala) {
                if ($isSuperOrKepala) {
                    return true;
                }

                return $user->can('akses-'.$a->slug);
            })->values();

            return [
                'slug' => $f->slug,
                'nama' => $f->nama,
                'deskripsi' => $f->deskripsi,
                'icon' => $f->icon,
                'aplikasi' => $aplikasi->map(fn ($a) => [
                    'slug' => $a->slug,
                    'nama' => $a->nama,
                    'deskripsi' => $a->deskripsi,
                    'icon' => $a->icon,
                ]),
            ];
        })->filter(fn ($f) => count($f['aplikasi']) > 0)->values();

        return response()->json(['fungsi' => $fungsi]);
    }
}
