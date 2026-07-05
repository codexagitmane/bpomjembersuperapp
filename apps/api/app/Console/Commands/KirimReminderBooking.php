<?php

namespace App\Console\Commands;

use App\Mail\BookingReminderMail;
use App\Models\AuditLog;
use App\Models\BookingKonsultasi;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Reminder email H-1 untuk booking konsultasi yang sudah dikonfirmasi.
 * Dijadwalkan harian (07:00 WIB) via scheduler; idempoten lewat
 * kolom reminder_sent_at sehingga aman dijalankan ulang.
 */
class KirimReminderBooking extends Command
{
    protected $signature = 'booking:kirim-reminder';

    protected $description = 'Kirim email pengingat H-1 untuk booking konsultasi yang dikonfirmasi';

    public function handle(): int
    {
        $besok = now()->addDay()->toDateString();

        $bookings = BookingKonsultasi::with('user:id,name,email')
            ->whereDate('tanggal', $besok)
            ->where('status', 'dikonfirmasi')
            ->whereNull('reminder_sent_at')
            ->get();

        foreach ($bookings as $booking) {
            Mail::to($booking->user->email)->queue(new BookingReminderMail($booking));
            $booking->update(['reminder_sent_at' => now()]);
        }

        if ($bookings->isNotEmpty()) {
            AuditLog::catat(null, 'booking_reminder_h1', 'infokom',
                "Reminder H-1 dikirim untuk {$bookings->count()} booking tanggal {$besok}.");
        }

        $this->info("Reminder terkirim: {$bookings->count()} booking untuk {$besok}.");

        return self::SUCCESS;
    }
}
