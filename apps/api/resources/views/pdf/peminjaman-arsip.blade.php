<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 14mm 14mm; }
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #111; font-size: 10px; margin: 0; }
        .top { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        .top td { vertical-align: top; }
        .sopbox { border: 1.2px solid #000; display: inline-block; padding: 5px 8px; font-size: 9px; font-weight: bold; letter-spacing: .2px; }
        .title { text-align: center; font-weight: bold; font-size: 13px; margin: 4px 0 1px; text-transform: uppercase; }
        .nomor { text-align: center; font-size: 10px; margin-bottom: 8px; }
        .hr { border: 0; border-top: 1.5px solid #000; margin: 4px 0 8px; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        table.info td { padding: 1.5px 4px; font-size: 10px; vertical-align: top; }
        .lbl { width: 33%; }
        table.b { width: 100%; border-collapse: collapse; margin: 4px 0 6px; }
        table.b td, table.b th { border: 1px solid #333; padding: 3px 5px; font-size: 9px; }
        table.b th { background: #eef2f7; text-align: center; font-weight: bold; }
        .kep { font-size: 10px; margin: 4px 0 2px; }
        table.sign { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.sign td { border: 1px solid #333; width: 50%; text-align: center; font-size: 9.5px; vertical-align: top; padding: 5px 4px; }
        .sh { background: #eef2f7; font-weight: bold; text-transform: uppercase; font-size: 9.5px; }
        .qr { height: 46px; margin: 2px 0; }
        .empty-sign { height: 46px; }
        .nm { font-weight: bold; text-decoration: underline; font-size: 9.5px; }
        .role { font-size: 9px; }
    </style>
</head>
@php
    $tgl = fn ($d) => $d ? $d->timezone('Asia/Jakarta')->locale('id')->translatedFormat('d F Y') : '-';
    $inaktif = $p->jenis === 'inaktif';
    $jenisLabel = $inaktif ? 'Inaktif' : 'Aktif';
    $alamat = 'Jl. Letjen Panjaitan No. 40, Sumbersari, Jember';
    $roleKiri = $inaktif ? 'Arsiparis' : ('Pengelola Tim Kerja ' . $fungsiLabel);
@endphp
<body>
    <table class="top">
        <tr>
            <td style="width:62%"><span class="sopbox">POM-14.02/CFM.02/SOP.01/IK.33B.01/{{ $inaktif ? 'F.07' : 'F.06' }} revisi 00</span></td>
            <td style="text-align:right">@if($logo)<img src="{{ $logo }}" height="46" alt="">@endif</td>
        </tr>
    </table>

    <div class="title">Form Peminjaman dan Pengembalian Arsip {{ $jenisLabel }}</div>
    <div class="nomor">Nomor : {{ $p->nomor }}</div>
    <hr class="hr">

    {{-- Kepala unit (berbeda antara Aktif & Inaktif, sesuai form baku) --}}
    <table class="info">
        @if($inaktif)
        <tr><td class="lbl">Unit Kerja</td><td>: Balai POM di Jember</td></tr>
        <tr><td class="lbl">Nama Pimpinan Unit Kerja</td><td>: Benny Hendrawan Prabowo, S.Farm, Apt.</td></tr>
        <tr><td class="lbl">Jabatan Unit Kerja</td><td>: Kepala Balai POM di Jember</td></tr>
        @else
        <tr><td class="lbl">Unit Pengolah</td><td>: {{ $fungsiLabel }}</td></tr>
        <tr><td class="lbl">Nama Pimpinan Unit Pengolah</td><td>: {{ $p->petugas->name ?? '-' }}</td></tr>
        <tr><td class="lbl">Jabatan Unit Pengolah</td><td>: Pengelola Tim Kerja {{ $fungsiLabel }}</td></tr>
        @endif
        <tr><td class="lbl">Alamat {{ $inaktif ? 'Unit Kerja' : 'Unit Pengolah' }}</td><td>: {{ $alamat }}</td></tr>
    </table>

    <table class="info">
        
        <tr><td class="lbl">Tanggal Pinjam</td><td>: {{ $tgl($p->tanggal_pinjam) }}</td></tr>
        <tr><td class="lbl">Tanggal Kembali</td><td>: {{ $p->tanggal_dikembalikan ? $tgl($p->tanggal_dikembalikan) : '-' }} <span style="font-size:9px; color:#555">(batas kembali tanggal {{ $tgl($p->tanggal_harus_kembali) }})</span></td></tr>
        <tr><td class="lbl">Nama Peminjam</td><td>: {{ $p->peminjam->name ?? '-' }}</td></tr>
        <tr><td class="lbl">Unit Pengolah Peminjam</td><td>: {{ $p->unit_pengolah ?? '-' }}</td></tr>
    </table>

    <table class="b">
        <thead>
            <tr>
                <th width="18">No</th>
                <th>Nama Arsip</th>
                <th width="90">Nomor Arsip</th>
                <th width="80">Klasifikasi</th>
                <th width="44">Tahun</th>
                @if($inaktif)<th width="44">Boks</th>@endif
                <th width="34">Jml</th>
            </tr>
        </thead>
        <tbody>
            @forelse(($p->daftar_arsip ?? []) as $i => $a)
            <tr>
                <td style="text-align:center">{{ $i + 1 }}</td>
                <td>{{ $a['uraian'] ?? '-' }}</td>
                <td>{{ $a['nomor'] ?? '-' }}</td>
                <td>{{ $a['kode'] ?? '-' }}</td>
                <td style="text-align:center">{{ $a['tahun'] ?? '-' }}</td>
                @if($inaktif)<td style="text-align:center">{{ $a['nomor_boks'] ?? '-' }}</td>@endif
                <td style="text-align:center">{{ $a['jumlah'] ?? 1 }}</td>
            </tr>
            @empty
            <tr><td colspan="7" style="text-align:center">-</td></tr>
            @endforelse
        </tbody>
    </table>

    <p class="kep"><b>Maksud dan Keperluan :</b> {{ $p->keperluan }}</p>
    @if($p->catatan_petugas)<p class="kep"><b>Catatan Petugas :</b> {{ $p->catatan_petugas }}</p>@endif

    @php
        $sigCell = function ($role, $qrImg, $name, $nip) {
            $q = $qrImg ? '<img class="qr" src="' . $qrImg . '">' : '<div class="empty-sign"></div>';
            return '<div class="role">' . $role . '</div>' . $q
                . '<div class="nm">' . ($name ?: '(............................)') . '</div>'
                . '<div style="font-size:8.5px">NIP. ' . ($nip ?: '................') . '</div>';
        };
        $peminjamName = $p->peminjam->name ?? '';
        $peminjamNip = $p->peminjam->nip_nik ?? '';
        $petugasName = $p->petugas->name ?? '';
        $petugasNip = $p->petugas->nip_nik ?? '';
    @endphp
    <table class="sign">
        <tr><td class="sh" colspan="2">Tanda Tangan Peminjaman</td></tr>
        <tr>
            <td>{!! $sigCell($roleKiri, $qr['pinjam_petugas'], $petugasName, $petugasNip) !!}</td>
            <td>{!! $sigCell('Peminjam Arsip', $qr['pinjam_peminjam'], $peminjamName, $peminjamNip) !!}</td>
        </tr>
        <tr><td class="sh" colspan="2">Tanda Tangan Pengembalian</td></tr>
        <tr>
            <td>{!! $sigCell($roleKiri, $qr['kembali_petugas'], $petugasName, $petugasNip) !!}</td>
            <td>{!! $sigCell('Peminjam Arsip', $qr['kembali_peminjam'], $peminjamName, $peminjamNip) !!}</td>
        </tr>
    </table>
    <p style="font-size:8px; color:#555; margin-top:6px">Dokumen ditandatangani secara elektronik (TTE) via QR-Code yang dapat diverifikasi melalui aplikasi LENTERA Balai POM di Jember.</p>
</body>
</html>
