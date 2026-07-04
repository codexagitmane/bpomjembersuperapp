<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\BookingDikonfirmasiMail;
use App\Models\AuditLog;
use App\Models\BookingKonsultasi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class BookingKonsultasiController extends Controller
{
    /** Riwayat booking milik user yang login (masyarakat maupun internal). */
    public function index(Request $request)
    {
        $data = BookingKonsultasi::where('user_id', $request->user()->id)
            ->orderByDesc('tanggal')
            ->orderByDesc('jam_slot')
            ->paginate(20);

        return response()->json($data);
    }

    /** Daftar semua booking — khusus petugas Fungsi Infokom. */
    public function semua(Request $request)
    {
        $query = BookingKonsultasi::with('user:id,name,email,phone')->orderByDesc('tanggal');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'jenis_layanan' => ['required', Rule::in(['konsultasi', 'pengaduan'])],
            'tanggal' => ['required', 'date', 'after_or_equal:today'],
            'jam_slot' => ['required', 'date_format:H:i'],
            'subjek' => ['required', 'string', 'min:5', 'max:150'],
            'deskripsi' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $sudahAda = BookingKonsultasi::where('tanggal', $validated['tanggal'])
            ->where('jam_slot', $validated['jam_slot'])
            ->whereIn('status', ['menunggu', 'dikonfirmasi'])
            ->exists();

        if ($sudahAda) {
            return response()->json(['message' => 'Slot jadwal tersebut sudah dibooking. Silakan pilih jam lain.'], 422);
        }

        $booking = BookingKonsultasi::create([
            ...$validated,
            'user_id' => $request->user()->id,
            'status' => 'menunggu',
        ]);

        AuditLog::catat($request->user()->id, 'booking_dibuat', 'infokom', "Booking #{$booking->id} dibuat.");

        return response()->json(['booking' => $booking], 201);
    }

    public function updateStatus(Request $request, BookingKonsultasi $booking)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['dikonfirmasi', 'selesai', 'dibatalkan'])],
            'catatan_petugas' => ['nullable', 'string', 'max:1000'],
        ]);

        $booking->update([
            ...$validated,
            'ditangani_oleh' => $request->user()->id,
        ]);

        // Notifikasi email ke masyarakat saat booking dikonfirmasi petugas.
        if ($validated['status'] === 'dikonfirmasi') {
            $booking->load('user');
            Mail::to($booking->user->email)->queue(new BookingDikonfirmasiMail($booking));
        }

        AuditLog::catat($request->user()->id, 'booking_status_diubah', 'infokom', "Booking #{$booking->id} -> {$validated['status']}.");

        return response()->json(['booking' => $booking]);
    }
}
