<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\BookingDikonfirmasiMail;
use App\Models\AuditLog;
use App\Models\BookingKonsultasi;
use App\Models\Pengaturan;
use App\Services\BookingSlotService;
use App\Services\NotifikasiService;
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

    /** Slot booking yang tersedia pada tanggal tertentu (publik untuk user login). */
    public function slotTersedia(Request $request, BookingSlotService $slotService)
    {
        $validated = $request->validate(['tanggal' => ['required', 'date', 'after_or_equal:today']]);

        return response()->json($slotService->slotTersedia($validated['tanggal']));
    }

    /** Konfigurasi slot booking — khusus petugas Infokom. */
    public function getConfig(BookingSlotService $slotService)
    {
        return response()->json($slotService->config());
    }

    public function updateConfig(Request $request)
    {
        $validated = $request->validate([
            'jam_mulai' => ['required', 'date_format:H:i'],
            'jam_selesai' => ['required', 'date_format:H:i', 'after:jam_mulai'],
            'interval_menit' => ['required', 'integer', 'min:15', 'max:240'],
            'kuota_per_slot' => ['required', 'integer', 'min:1', 'max:20'],
            'hari_libur' => ['array'],
            'hari_libur.*' => [Rule::in(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'])],
        ]);

        Pengaturan::updateOrCreate(['key' => 'booking.jam_mulai'], ['value' => $validated['jam_mulai'], 'tipe' => 'string']);
        Pengaturan::updateOrCreate(['key' => 'booking.jam_selesai'], ['value' => $validated['jam_selesai'], 'tipe' => 'string']);
        Pengaturan::updateOrCreate(['key' => 'booking.interval_menit'], ['value' => (string) $validated['interval_menit'], 'tipe' => 'number']);
        Pengaturan::updateOrCreate(['key' => 'booking.kuota_per_slot'], ['value' => (string) $validated['kuota_per_slot'], 'tipe' => 'number']);
        Pengaturan::updateOrCreate(['key' => 'booking.hari_libur'], ['value' => json_encode($validated['hari_libur'] ?? []), 'tipe' => 'json']);

        AuditLog::catat($request->user()->id, 'booking_config_diubah', 'infokom', 'Konfigurasi slot booking diperbarui.');

        return response()->json(['message' => 'Konfigurasi slot booking berhasil disimpan.']);
    }

    public function store(Request $request, BookingSlotService $slotService)
    {
        $validated = $request->validate([
            'jenis_layanan' => ['required', Rule::in(['konsultasi', 'pengaduan'])],
            'tanggal' => ['required', 'date', 'after_or_equal:today'],
            'jam_slot' => ['required', 'date_format:H:i'],
            'subjek' => ['required', 'string', 'min:5', 'max:150'],
            'deskripsi' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        // Validasi slot terhadap konfigurasi terbaru (jam operasional, kuota, hari libur).
        $info = $slotService->slotTersedia($validated['tanggal']);
        if ($info['libur']) {
            return response()->json(['message' => $info['alasan']], 422);
        }
        $slot = collect($info['slots'])->firstWhere('jam', $validated['jam_slot']);
        if (! $slot) {
            return response()->json(['message' => 'Jam yang dipilih di luar jam layanan. Silakan pilih slot yang tersedia.'], 422);
        }
        if ($slot['penuh']) {
            return response()->json(['message' => 'Slot jadwal tersebut sudah penuh. Silakan pilih jam lain.'], 422);
        }

        $booking = BookingKonsultasi::create([
            ...$validated,
            'user_id' => $request->user()->id,
            'status' => 'menunggu',
        ]);

        AuditLog::catat($request->user()->id, 'booking_dibuat', 'infokom', "Booking #{$booking->id} dibuat.");

        return response()->json(['booking' => $booking], 201);
    }

    public function updateStatus(Request $request, BookingKonsultasi $booking, NotifikasiService $notif)
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

        $notif->kirim([$booking->user_id],
            'Booking '.ucfirst($validated['status']),
            "Booking konsultasi Anda tanggal {$booking->tanggal->format('Y-m-d')} kini berstatus {$validated['status']}.",
            '/booking-konsultasi');

        return response()->json(['booking' => $booking]);
    }
}
