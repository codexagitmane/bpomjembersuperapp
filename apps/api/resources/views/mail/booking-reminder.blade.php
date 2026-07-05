<x-mail::message>
# Pengingat Jadwal Besok

Halo {{ $booking->user->name }},

Ini pengingat bahwa Anda memiliki jadwal **{{ $booking->jenis_layanan === 'pengaduan' ? 'pengaduan' : 'konsultasi' }}** **besok** di Balai POM di Jember:

| | |
|---|---|
| Subjek | {{ $booking->subjek }} |
| Tanggal | {{ $booking->tanggal->translatedFormat('l, d F Y') }} |
| Jam | {{ substr($booking->jam_slot, 0, 5) }} WIB |

Mohon hadir 10 menit sebelum jadwal dan membawa dokumen pendukung yang diperlukan.
Jika berhalangan hadir, silakan hubungi kami untuk penjadwalan ulang.

Sampai jumpa,<br>
Balai Pengawas Obat dan Makanan di Jember
</x-mail::message>
