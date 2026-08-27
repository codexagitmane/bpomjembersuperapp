<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="utf-8">
    <title>Layanan Konsumen {{ $r['nomor'] }}</title>
    <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; }
        .title { text-align: center; font-weight: bold; font-size: 14pt; margin: 10pt 0 2pt; text-transform: uppercase; }
        .nomor { text-align: center; font-size: 11pt; margin-bottom: 12pt; }
        .inst { font-weight: bold; font-size: 13pt; }
        .sec { background: #0b1f3a; color: #fff; font-weight: bold; padding: 4pt 8pt; margin-top: 12pt; }
        table.f { width: 100%; border-collapse: collapse; }
        table.f td { padding: 3pt 8pt; vertical-align: top; border-bottom: 1px solid #ccc; }
        td.k { width: 32%; color: #333; }
        td.v { font-weight: bold; }
        hr { border: none; border-top: 2px solid #0b1f3a; }
    </style>
</head>
@php
    $d = $r['detail'] ?? [];
    $kon = $d['konsumen'] ?? []; $prod = $d['produk'] ?? []; $lay = $d['layanan'] ?? []; $tl = $d['tindak_lanjut'] ?? [];
    $row = fn ($k, $v) => $v ? '<tr><td class="k">'.$k.'</td><td class="v">: '.e($v).'</td></tr>' : '';
@endphp
<body>
    <table style="width:100%"><tr>
        <td style="width:60pt">@if($logo)<img src="{{ $logo }}" height="60" alt="">@endif</td>
        <td class="inst">BADAN PENGAWAS OBAT DAN MAKANAN<br>
            <span style="font-size:10pt;font-weight:normal">Balai POM di Jember — Layanan Informasi, Konsultasi &amp; Pengaduan Konsumen</span>
        </td>
    </tr></table>
    <hr>
    <div class="title">Formulir Layanan Informasi Konsumen</div>
    <div class="nomor">Nomor : {{ $r['nomor'] }} &nbsp;•&nbsp; {{ $r['unit_pelayanan_label'] }} &nbsp;•&nbsp; {{ $r['jenis_layanan_label'] }}</div>

    <div class="sec">A. IDENTITAS KONSUMEN</div>
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
    <div class="sec">B. IDENTITAS PRODUK</div>
    <table class="f">
        {!! $row('Nama Dagang', $prod['nama_dagang'] ?? null) !!}
        {!! $row('Nama Generik', $prod['nama_generik'] ?? null) !!}
        {!! $row('Pabrik', $prod['pabrik'] ?? null) !!}
        {!! $row('Nomor Izin Edar', $prod['nomor_izin_edar'] ?? null) !!}
        {!! $row('Nomor Batch', $prod['nomor_batch'] ?? null) !!}
        {!! $row('Alamat', $prod['alamat'] ?? null) !!}
        {!! $row('Tanggal Kadaluarsa', $prod['tanggal_kadaluarsa'] ?? null) !!}
        {!! $row('Diperoleh di', $prod['diperoleh_di'] ?? null) !!}
        {!! $row('Tanggal Diperoleh', $prod['tanggal_diperoleh'] ?? null) !!}
        {!! $row('Tanggal Digunakan', $prod['tanggal_digunakan'] ?? null) !!}
    </table>
    @endif

    <div class="sec">C. LAYANAN</div>
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

    <div class="sec">D. JAWABAN &amp; TINDAK LANJUT</div>
    <table class="f">
        {!! $row('Jawaban', $lay['jawaban'] ?? null) !!}
        {!! $row('Perlu Rujuk', $r['perlu_rujuk'] ? 'Ya' : 'Tidak') !!}
        {!! $row('Rujukan', $tl['rujukan'] ?? null) !!}
        {!! $row('SLA', $tl['sla'] ?? null) !!}
        {!! $row('Keterangan', $tl['keterangan'] ?? null) !!}
    </table>

    <table style="width:100%;margin-top:24pt"><tr>
        <td style="width:50%">&nbsp;</td>
        <td style="width:50%;text-align:center">
            Jember, {{ now()->timezone('Asia/Jakarta')->locale('id')->translatedFormat('d F Y') }}<br>Petugas Layanan,<br><br><br><br>
            <b><u>{{ $r['petugas'][0] ?? $r['petugas_input'] }}</u></b>
        </td>
    </tr></table>
</body>
</html>
