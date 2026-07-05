<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<style>
  * { font-family: DejaVu Sans, sans-serif; }
  body { font-size: 11px; color: #0b1f3a; margin: 24px 32px; }
  .kop { text-align: center; border-bottom: 3px double #0b1f3a; padding-bottom: 10px; margin-bottom: 16px; }
  .kop h1 { font-size: 14px; margin: 0; letter-spacing: 0.5px; }
  .kop p { margin: 2px 0 0; font-size: 10px; color: #5b6b85; }
  h2 { font-size: 13px; text-align: center; margin: 14px 0 2px; text-decoration: underline; }
  .nomor { text-align: center; font-size: 11px; margin: 0 0 14px; }
  table.identitas { width: 100%; margin-bottom: 14px; }
  table.identitas td { padding: 3px 4px; vertical-align: top; }
  table.identitas td.k { width: 170px; color: #5b6b85; }
  table.log { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  table.log th, table.log td { border: 1px solid #cbd5e1; padding: 5px 7px; }
  table.log th { background: #0b1f3a; color: #fff; font-size: 10px; }
  .foto-grid { margin: 6px 0 14px; }
  .foto-grid img { width: 160px; height: 120px; object-fit: cover; margin: 0 8px 8px 0; border: 1px solid #cbd5e1; }
  .ttd { width: 100%; margin-top: 28px; }
  .ttd td { width: 50%; text-align: center; vertical-align: top; font-size: 11px; }
  .ttd .spasi { height: 64px; }
  .foot { margin-top: 24px; font-size: 9px; color: #8b97ab; border-top: 1px solid #e2e8f0; padding-top: 6px; }
</style>
</head>
<body>
  <div class="kop">
    <h1>BADAN PENGAWAS OBAT DAN MAKANAN<br>BALAI POM DI JEMBER</h1>
    <p>Fungsi Penindakan — Pengelolaan Barang Bukti</p>
  </div>

  <h2>BERITA ACARA BARANG BUKTI</h2>
  <p class="nomor">Nomor: BA/{{ $bb->nomor_bb }}/{{ now()->format('Y') }}</p>

  <table class="identitas">
    <tr><td class="k">Nomor Barang Bukti</td><td>: <strong>{{ $bb->nomor_bb }}</strong></td></tr>
    <tr><td class="k">Nama Barang</td><td>: {{ $bb->nama_barang }}</td></tr>
    <tr><td class="k">Kategori</td><td>: {{ $bb->kategori ?? '-' }}</td></tr>
    <tr><td class="k">Jumlah</td><td>: {{ $bb->jumlah }} {{ $bb->satuan }}</td></tr>
    <tr><td class="k">Tanggal Penyitaan</td><td>: {{ \Illuminate\Support\Carbon::parse($bb->tanggal_penyitaan)->translatedFormat('d F Y') }}</td></tr>
    <tr><td class="k">Asal Perkara</td><td>: {{ $bb->asal_perkara ?? '-' }}</td></tr>
    <tr><td class="k">Lokasi Penyimpanan</td><td>: {{ $bb->lokasi_penyimpanan ?? '-' }}</td></tr>
    <tr><td class="k">Status Saat Ini</td><td>: {{ strtoupper(str_replace('_', ' ', $bb->status)) }}</td></tr>
    <tr><td class="k">Penanggung Jawab</td><td>: {{ $bb->penanggungJawab?->name ?? '-' }}</td></tr>
    <tr><td class="k">Dicatat Oleh</td><td>: {{ $bb->pembuat?->name ?? '-' }}</td></tr>
  </table>

  <strong>Kronologi Pengelolaan (Chain of Custody):</strong>
  <table class="log">
    <thead>
      <tr><th style="width:26px">No</th><th style="width:110px">Waktu</th><th style="width:90px">Aksi</th><th>Keterangan</th><th style="width:110px">Oleh</th></tr>
    </thead>
    <tbody>
      @forelse($bb->logs->sortBy('created_at')->values() as $i => $log)
      <tr>
        <td style="text-align:center">{{ $i + 1 }}</td>
        <td>{{ $log->created_at->format('d-m-Y H:i') }}</td>
        <td>{{ ucfirst($log->aksi) }}</td>
        <td>{{ $log->keterangan ?? '-' }}</td>
        <td>{{ $log->oleh?->name ?? '-' }}</td>
      </tr>
      @empty
      <tr><td colspan="5" style="text-align:center;color:#8b97ab">Belum ada catatan.</td></tr>
      @endforelse
    </tbody>
  </table>

  @if(count($fotoPaths) > 0)
  <strong>Lampiran Foto ({{ count($fotoPaths) }}):</strong>
  <div class="foto-grid">
    @foreach($fotoPaths as $p)
    <img src="{{ $p }}" alt="Foto barang bukti">
    @endforeach
  </div>
  @endif

  <table class="ttd">
    <tr>
      <td>
        Penanggung Jawab Barang Bukti
        <div class="spasi"></div>
        <strong>{{ $bb->penanggungJawab?->name ?? '(................................)' }}</strong><br>
        NIP: {{ $bb->penanggungJawab?->nip_nik ?? '................................' }}
      </td>
      <td>
        Jember, {{ now()->translatedFormat('d F Y') }}<br>
        Petugas Pencetak
        <div class="spasi"></div>
        <strong>{{ $dicetakOleh->name }}</strong><br>
        NIP: {{ $dicetakOleh->nip_nik ?? '-' }}
      </td>
    </tr>
  </table>

  <p class="foot">Dokumen ini dibuat otomatis oleh LENTERA BPOM Jember pada {{ now()->translatedFormat('l, d F Y H:i') }} WIB.
  Keaslian dokumen dapat diverifikasi melalui audit log sistem.</p>
</body>
</html>
