<x-mail::message>
# Selamat Datang, {{ $user->name }}!

Akun **SIGAP BPOM Jember** Anda telah diverifikasi dan diaktifkan oleh petugas kami.
Anda kini dapat masuk dan menggunakan layanan booking konsultasi & pengaduan.

<x-mail::button :url="config('app.frontend_url', 'http://localhost:3000').'/login'">
Masuk Sekarang
</x-mail::button>

Terima kasih,<br>
Balai Pengawas Obat dan Makanan di Jember
</x-mail::message>
