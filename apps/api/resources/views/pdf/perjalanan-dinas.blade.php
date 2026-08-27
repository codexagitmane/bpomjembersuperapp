<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #111; font-size: 11px; margin: 0; }
        .hd { width: 100%; border-collapse: collapse; border-bottom: 3px double #000; padding-bottom: 4px; }
        .hd td { vertical-align: middle; }
        .inst { text-align: center; font-weight: bold; font-size: 13px; line-height: 1.3; }
        .inst small { font-weight: normal; font-size: 9.5px; }
        .title { text-align: center; font-weight: bold; font-size: 13px; margin: 16px 0 2px; text-decoration: underline; text-transform: uppercase; }
        .nomor { text-align: center; font-size: 11px; margin-bottom: 12px; }
        p { line-height: 1.5; margin: 6px 0; text-align: justify; }
        table.g { width: 100%; border-collapse: collapse; margin: 4px 0; }
        table.g td { padding: 3px 6px; vertical-align: top; font-size: 11px; }
        table.b td, table.b th { border: 1px solid #333; padding: 4px 6px; font-size: 10.5px; }
        table.b th { background: #f0f0f0; text-align: center; }
        .k { width: 34%; }
        .ttd { width: 100%; margin-top: 20px; }
        .ttd td { width: 50%; text-align: center; font-size: 11px; vertical-align: top; }
        .sp { height: 52px; }
        .nm { font-weight: bold; text-decoration: underline; }
        .pagebreak { page-break-before: always; }
    </style>
</head>
@php
    $tgl = fn ($d) => $d ? $d->timezone('Asia/Jakarta')->locale('id')->translatedFormat('d F Y') : '-';
    $pegawai = $p->pegawai ?? [];
    $ptd = $p->penandatangan->name ?? null;
@endphp
<body>
    {{-- ============== SURAT TUGAS ============== --}}
    <table class="hd">
        <tr>
            <td width="64">@if($logo)<img src="{{ $logo }}" height="52" alt="">@endif</td>
            <td class="inst">BADAN PENGAWAS OBAT DAN MAKANAN<br>BALAI POM DI JEMBER
                <br><small>Jl. Kaliurang No. 15, Jember, Jawa Timur — bpom_jember@pom.go.id</small>
            </td>
        </tr>
    </table>

    <div class="title">Surat Tugas</div>
    <div class="nomor">Nomor : {{ $p->nomor_surat }}</div>

    @if($p->dasar)
    <table class="g"><tr><td class="k">Dasar</td><td>: {{ $p->dasar }}</td></tr></table>
    @endif
    <p>Kepala Balai POM di Jember dengan ini menugaskan kepada:</p>

    <table class="b">
        <thead><tr><th width="26">No</th><th>Nama / NIP</th><th>Pangkat / Gol.</th><th>Jabatan</th></tr></thead>
        <tbody>
            @foreach($pegawai as $i => $pg)
            <tr>
                <td style="text-align:center">{{ $i + 1 }}</td>
                <td>{{ $pg['nama'] ?? '-' }}@if(!empty($pg['nip']))<br><small>NIP. {{ $pg['nip'] }}</small>@endif</td>
                <td>{{ $pg['pangkat'] ?? '-' }}</td>
                <td>{{ $pg['jabatan'] ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <table class="g">
        <tr><td class="k">Untuk</td><td>: {{ $p->maksud }}</td></tr>
        <tr><td class="k">Tempat Tujuan</td><td>: {{ $p->tujuan }}</td></tr>
        <tr><td class="k">Lama Perjalanan</td><td>: {{ $p->lama_hari }} hari ({{ $tgl($p->tanggal_berangkat) }} s.d. {{ $tgl($p->tanggal_kembali) }})</td></tr>
        <tr><td class="k">Alat Angkut</td><td>: {{ $p->alat_angkut }}</td></tr>
        @if($p->pembebanan_anggaran)<tr><td class="k">Pembebanan Anggaran</td><td>: {{ $p->pembebanan_anggaran }}</td></tr>@endif
    </table>

    <p>Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.</p>

    <table class="ttd">
        <tr><td>&nbsp;</td><td>Jember, {{ $tgl($p->created_at) }}<br>{{ $p->penandatangan_jabatan }},</td></tr>
        <tr>
            <td>&nbsp;</td>
            <td class="sp">@if($qr)<img src="{{ $qr }}" width="52" height="52" alt="">@endif</td>
        </tr>
        <tr><td>&nbsp;</td><td><span class="nm">{{ $ptd ?? '(............................)' }}</span></td></tr>
    </table>

    {{-- ============== SPPD ============== --}}
    <div class="pagebreak"></div>
    <table class="hd">
        <tr>
            <td width="64">@if($logo)<img src="{{ $logo }}" height="52" alt="">@endif</td>
            <td class="inst">BADAN PENGAWAS OBAT DAN MAKANAN<br>BALAI POM DI JEMBER</td>
            <td width="120" style="text-align:right;font-size:10px">Lampiran SPPD<br>Nomor: {{ $p->nomor_surat }}</td>
        </tr>
    </table>

    <div class="title">Surat Perjalanan Dinas (SPPD)</div>

    <table class="b" style="width:100%">
        <tr><td class="k" width="6%" style="text-align:center">1</td><td width="40%">Pejabat yang memberi perintah</td><td>{{ $p->penandatangan_jabatan }}</td></tr>
        <tr><td style="text-align:center">2</td><td>Nama/NIP pegawai yang diperintah</td>
            <td>@foreach($pegawai as $pg){{ $pg['nama'] ?? '-' }}@if(!empty($pg['nip'])) (NIP. {{ $pg['nip'] }})@endif @if(!$loop->last)<br>@endif @endforeach</td></tr>
        <tr><td style="text-align:center">3</td><td>Pangkat dan golongan</td><td>{{ $pegawai[0]['pangkat'] ?? '-' }}</td></tr>
        <tr><td style="text-align:center">4</td><td>Maksud perjalanan dinas</td><td>{{ $p->maksud }}</td></tr>
        <tr><td style="text-align:center">5</td><td>Alat angkut yang dipergunakan</td><td>{{ $p->alat_angkut }}</td></tr>
        <tr><td style="text-align:center">6</td><td>Tempat berangkat / tujuan</td><td>{{ $p->tempat_berangkat }} — {{ $p->tujuan }}</td></tr>
        <tr><td style="text-align:center">7</td><td>Lamanya perjalanan dinas</td><td>{{ $p->lama_hari }} hari</td></tr>
        <tr><td style="text-align:center">8</td><td>Tanggal berangkat / kembali</td><td>{{ $tgl($p->tanggal_berangkat) }} s.d. {{ $tgl($p->tanggal_kembali) }}</td></tr>
        <tr><td style="text-align:center">9</td><td>Pembebanan anggaran</td><td>{{ $p->pembebanan_anggaran ?? '-' }}</td></tr>
        <tr><td style="text-align:center">10</td><td>Keterangan</td><td>{{ $p->keterangan ?? '-' }}</td></tr>
    </table>

    <table class="ttd">
        <tr><td>&nbsp;</td><td>Dikeluarkan di Jember<br>Pada tanggal {{ $tgl($p->created_at) }}<br>{{ $p->penandatangan_jabatan }},</td></tr>
        <tr><td>&nbsp;</td><td class="sp">@if($qr)<img src="{{ $qr }}" width="52" height="52" alt="">@endif</td></tr>
        <tr><td>&nbsp;</td><td><span class="nm">{{ $ptd ?? '(............................)' }}</span></td></tr>
    </table>
</body>
</html>
