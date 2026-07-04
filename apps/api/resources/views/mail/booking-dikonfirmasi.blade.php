<x-mail::message>
# Booking Anda Dikonfirmasi

Halo {{ $booking->user->name }},

Pengajuan **{{ $booking->jenis_layanan === 'pengaduan' ? 'pengaduan' : 'konsultasi' }}** Anda telah dikonfirmasi petugas kami:

| | |
|---|---|
| Subjek | {{ $booking->subjek }} |
| Tanggal | {{ $booking->tanggal->translatedFormat('l, d F Y') }} |
| Jam | {{ substr($booking->jam_slot, 0, 5) }} WIB |

@if($booking->catatan_petugas)
**Catatan petugas:** {{ $booking->catatan_petugas }}
@endif

Mohon hadir tepat waktu di Kantor Balai POM di Jember.

Terima kasih,<br>
Balai Pengawas Obat dan Makanan di Jember
</x-mail::message>
