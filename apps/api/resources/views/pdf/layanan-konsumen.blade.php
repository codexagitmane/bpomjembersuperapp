<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #111; font-size: 11px; margin: 0; }
        .hd { width: 100%; border-collapse: collapse; border-bottom: 2px solid #0b1f3a; padding-bottom: 4px; }
        .hd td { vertical-align: middle; }
        .inst { font-weight: bold; font-size: 13px; color: #0b1f3a; }
        .inst small { font-weight: normal; font-size: 10px; color: #444; }
        .title { text-align: center; font-weight: bold; font-size: 13px; margin: 12px 0 2px; text-transform: uppercase; }
        .nomor { text-align: center; font-size: 11px; margin-bottom: 10px; color: #333; }
        .sec { background: #0b1f3a; color: #fff; font-weight: bold; font-size: 10px; padding: 4px 8px; margin-top: 10px; text-transform: uppercase; letter-spacing: .5px; }
        table.f { width: 100%; border-collapse: collapse; margin-top: 3px; }
        table.f td { padding: 3px 8px; vertical-align: top; font-size: 10.5px; border-bottom: 1px solid #eee; }
        td.k { width: 30%; color: #555; }
        td.k::after { content: ':'; float: right; }
        td.v { font-weight: 600; color: #111; }
        .ttd { width: 100%; margin-top: 18px; }
        .ttd td { width: 50%; text-align: center; font-size: 10.5px; vertical-align: top; }
        .sp { height: 46px; }
        .nm { font-weight: bold; text-decoration: underline; }
        .badge { display: inline-block; background: #e8f5ee; color: #0f854e; border-radius: 4px; padding: 1px 6px; font-size: 9.5px; font-weight: bold; }
    </style>
</head>
@php
    $d = $r['detail'] ?? [];
    $kon = $d['konsumen'] ?? [];
    $prod = $d['produk'] ?? [];
    $lay = $d['layanan'] ?? [];
    $tl = $d['tindak_lanjut'] ?? [];
    $row = fn ($k, $v) => $v ? '<tr><td class="k">'.$k.'</td><td class="v">'.e($v).'</td></tr>' : '';
@endphp
<body>
    <table class="hd">
        <tr>
            <td width="60">@if($logo)<img src="{{ $logo }}" height="48" alt="">@endif</td>
            <td class="inst">BADAN PENGAWAS OBAT DAN MAKANAN<br>
                <small>BALAI POM DI JEMBER — Layanan Informasi, Konsultasi &amp; Pengaduan Konsumen</small>
            </td>
        </tr>
    </table>

    <div class="title">Formulir Layanan Informasi Konsumen</div>
    <div class="nomor">Nomor : {{ $r['nomor'] }} &nbsp;•&nbsp; {{ $r['unit_pelayanan_label'] }} &nbsp;•&nbsp;
        <span class="badge">{{ $r['jenis_layanan_label'] }}</span>
    </div>

    <div class="sec">A. Identitas Konsumen</div>
    <table class="f">
        {!! $row('Nama', $r['nama_konsumen']) !!}
        {!! $row('Jenis Kelamin', $kon['jenis_kelamin'] ?? null) !!}
        {!! $row('Usia', $kon['usia'] ?? null) !!}
        {!! $row('Pekerjaan', $kon['pekerjaan'] ?? null) !!}
        {!! $row('Instansi', $kon['instansi'] ?? null) !!}
        {!! $row('Jenis Perusahaan', $kon['jenis_perusahaan'] ?? null) !!}
        {!! $row('Alamat', $kon['alamat'] ?? null) !!}
        {!! $row('Kota/Kabupaten', $kon['kota_kabupaten'] ?? null) !!}
        {!! $row('Provinsi', $kon['provinsi'] ?? null) !!}
        {!! $row('Negara', $kon['negara'] ?? null) !!}
        {!! $row('Email', $kon['email'] ?? null) !!}
        {!! $row('No. Telp', $kon['no_telp'] ?? null) !!}
        {!! $row('No. Fax', $kon['no_fax'] ?? null) !!}
        {!! $row('Tanggal Layanan', $r['tanggal_layanan_label'].($r['jam_layanan'] ? ' — '.$r['jam_layanan'].' WIB' : '')) !!}
    </table>

    @if(!empty(array_filter($prod)))
    <div class="sec">B. Identitas Produk</div>
    <table class="f">
        {!! $row('Nama Dagang', $prod['nama_dagang'] ?? null) !!}
        {!! $row('Nama Generik', $prod['nama_generik'] ?? null) !!}
        {!! $row('Pabrik', $prod['pabrik'] ?? null) !!}
        {!! $row('Nomor Izin Edar', $prod['nomor_izin_edar'] ?? null) !!}
        {!! $row('Nomor Batch', $prod['nomor_batch'] ?? null) !!}
        {!! $row('Alamat', $prod['alamat'] ?? null) !!}
        {!! $row('Kota/Kabupaten', $prod['kota_kabupaten'] ?? null) !!}
        {!! $row('Provinsi', $prod['provinsi'] ?? null) !!}
        {!! $row('Negara', $prod['negara'] ?? null) !!}
        {!! $row('Tanggal Kadaluarsa', $prod['tanggal_kadaluarsa'] ?? null) !!}
        {!! $row('Diperoleh di', $prod['diperoleh_di'] ?? null) !!}
        {!! $row('Tanggal Diperoleh', $prod['tanggal_diperoleh'] ?? null) !!}
        {!! $row('Tanggal Digunakan', $prod['tanggal_digunakan'] ?? null) !!}
    </table>
    @endif

    <div class="sec">C. Layanan</div>
    <table class="f">
        {!! $row('Inti Masalah', $lay['inti_masalah'] ?? null) !!}
        {!! $row('Pertanyaan', $lay['pertanyaan'] ?? null) !!}
        {!! $row('Jenis Layanan', $r['jenis_layanan_label']) !!}
        {!! $row('Jenis Komoditi', $lay['jenis_komoditi'] ?? null) !!}
        {!! $row('Layanan Melalui', $lay['layanan_melalui'] ?? null) !!}
        {!! $row('Klasifikasi', $r['klasifikasi'].(($lay['sub_klasifikasi'] ?? null) ? ' — '.$lay['sub_klasifikasi'] : '')) !!}
        {!! $row('Sumber Data', $lay['sumber_data'] ?? null) !!}
        {!! $row('Petugas Layanan', implode(', ', $r['petugas'])) !!}
    </table>

    <div class="sec">D. Jawaban &amp; Tindak Lanjut</div>
    <table class="f">
        {!! $row('Jawaban', $lay['jawaban'] ?? null) !!}
        {!! $row('Perlu Rujuk', $r['perlu_rujuk'] ? 'Ya' : 'Tidak') !!}
        {!! $row('Rujukan', $tl['rujukan'] ?? null) !!}
        {!! $row('SLA', $tl['sla'] ?? null) !!}
        {!! $row('Keterangan', $tl['keterangan'] ?? null) !!}
    </table>

    <table class="ttd">
        <tr>
            <td>&nbsp;</td>
            <td>Jember, {{ now()->timezone('Asia/Jakarta')->locale('id')->translatedFormat('d F Y') }}<br>Petugas Layanan,</td>
        </tr>
        <tr><td class="sp">&nbsp;</td><td class="sp">&nbsp;</td></tr>
        <tr>
            <td>&nbsp;</td>
            <td><span class="nm">{{ $r['petugas'][0] ?? $r['petugas_input'] }}</span></td>
        </tr>
    </table>
</body>
</html>
