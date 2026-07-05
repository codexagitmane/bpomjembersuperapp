<?php

namespace App\Mail;

use App\Models\BookingKonsultasi;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly BookingKonsultasi $booking)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Pengingat: Jadwal Konsultasi Anda Besok — BPOM Jember');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.booking-reminder');
    }
}
