<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notifikasi;
use Illuminate\Http\Request;

class NotifikasiController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        return response()->json([
            'data' => Notifikasi::where('user_id', $userId)
                ->orderByDesc('created_at')
                ->limit(30)
                ->get(),
            'unread_count' => Notifikasi::where('user_id', $userId)->whereNull('read_at')->count(),
        ]);
    }

    /** Tandai satu notifikasi terbaca. */
    public function baca(Request $request, Notifikasi $notifikasi)
    {
        abort_unless($notifikasi->user_id === $request->user()->id, 403);
        $notifikasi->update(['read_at' => $notifikasi->read_at ?? now()]);

        return response()->json(['notifikasi' => $notifikasi]);
    }

    /** Tandai semua notifikasi terbaca. */
    public function bacaSemua(Request $request)
    {
        Notifikasi::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Semua notifikasi ditandai terbaca.']);
    }
}
