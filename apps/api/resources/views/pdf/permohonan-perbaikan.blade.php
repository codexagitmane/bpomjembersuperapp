<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #000; font-size: 11px; margin: 0; }
        .hd { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .hd td { vertical-align: top; }
        .code { display: inline-block; border: 1px solid #000; padding: 3px 8px; font-weight: bold; font-size: 10px; }
        .title { text-align: center; font-weight: bold; font-size: 13px; margin: 8px 0 12px; text-transform: uppercase; }
        table.f { width: 100%; border-collapse: collapse; }
        table.f td { border: 1px solid #000; padding: 5px 7px; vertical-align: top; font-size: 11px; }
        td.lbl { width: 27%; }
        td.sep { width: 2%; text-align: center; border-left: none; border-right: none; }
        .sec { text-align: center; font-weight: bold; background: #fff; }
        .sec-left { font-weight: bold; }
        .tall { height: 70px; }
        table.ttd { width: 100%; margin-top: 26px; border-collapse: collapse; }
        table.ttd td { width: 33.33%; text-align: center; font-size: 10px; vertical-align: top; padding: 4px 6px; }
        .sp { height: 58px; }
        .nm { font-weight: bold; text-decoration: underline; }
    </style>
</head>
@php
    $tgl = fn ($d) => $d ? $d->timezone('Asia/Jakarta')->locale('id')->translatedFormat('d F Y') : '';
    $pemohonNama = $p->pemohon_nama ?? ($p->user->name ?? '');
    $pemohonNip = $p->pemohon_nip ?? ($p->user->nip_nik ?? '');
    $row = function ($label, $value, $tall = false) {
        $cls = $tall ? ' class="tall"' : '';
        return '<tr><td class="lbl"'.$cls.'>'.e($label).'</td><td class="sep">:</td><td'.$cls.'>'.nl2br(e($value ?? '')).'</td></tr>';
    };
@endphp
<body>
    <table class="hd">
        <tr>
            <td style="width:70%"><span class="code">POM-14.01/CFM.01/SOP.01/IK.33B.01/F.03 revisi 03</span></td>
            <td style="width:30%; text-align:right">@if($logo)<img src="{{ $logo }}" height="46" alt="">@endif</td>
        </tr>
    </table>

    <div class="title">Form Permohonan Perbaikan</div>

    <table class="f">
        {!! $row('No.', $p->nomor_permohonan) !!}
        {!! $row('Tanggal', $tgl($p->tanggal_permohonan)) !!}
        {!! $row('Kepada', $p->pengelolaBmn->name ?? '') !!}
        <tr><td colspan="3" class="sec">Informasi Pemohon</td></tr>
        {!! $row('Nama Pemohon', $pemohonNama) !!}
        {!! $row('NIP', $pemohonNip) !!}
        {!! $row('Jabatan', $p->jabatan) !!}
        {!! $row('Kelompok Substansi', $p->kelompok_substansi) !!}
        <tr><td colspan="3" class="sec">Informasi Kerusakan</td></tr>
        {!! $row('Nama BMN', $p->nama_barang_lain ?? ($p->bmnItem->nama_barang ?? '')) !!}
        {!! $row('No. BMN', $p->no_bmn) !!}
        {!! $row('Kerusakan Mulai Tgl', $tgl($p->kerusakan_mulai)) !!}
        {!! $row('Deskripsi Kerusakan', $p->deskripsi_kerusakan, true) !!}
        {!! $row('Tindakan', $p->tindakan) !!}
        {!! $row('Tanggal diperbaiki', $tgl($p->tanggal_diperbaiki)) !!}
        {!! $row('Selesai Tanggal', $tgl($p->selesai_tanggal)) !!}
        {!! $row('Keterangan Perbaikan', $p->keterangan_perbaikan, true) !!}
    </table>

    <table class="ttd">
        <tr>
            <td>Pemohon/Yang<br>Menyerahkan,</td>
            <td>Pengelola BMN,</td>
            <td>Kepala Sub Bagian Tata Usaha,</td>
        </tr>
        <tr>
            <td class="sp">@if(!empty($qr['pemohon']))<img src="{{ $qr['pemohon'] }}" width="52" height="52" alt="">@endif</td>
            <td class="sp">@if(!empty($qr['pengelola']))<img src="{{ $qr['pengelola'] }}" width="52" height="52" alt="">@endif</td>
            <td class="sp">@if(!empty($qr['kasubag']))<img src="{{ $qr['kasubag'] }}" width="52" height="52" alt="">@endif</td>
        </tr>
        <tr>
            <td><span class="nm">{{ $pemohonNama ?: '.............................' }}</span><br>NIP. {{ $pemohonNip ?: '.............................' }}</td>
            <td><span class="nm">{{ $p->pengelolaBmn->name ?? '.............................' }}</span><br>NIP. {{ $p->pengelolaBmn->nip_nik ?? '.............................' }}</td>
            <td><span class="nm">{{ $p->kasubag->name ?? '.............................' }}</span><br>NIP. {{ $p->kasubag->nip_nik ?? '.............................' }}</td>
        </tr>
    </table>
</body>
</html>
