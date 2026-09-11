<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #000; font-size: 9.5px; margin: 0; }
        .page { page-break-inside: avoid; }
        .brk { page-break-after: always; }
        .head { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .head td { vertical-align: middle; }
        .code { display: inline-block; border: 1px solid #000; padding: 2px 6px; font-weight: bold; font-size: 8.5px; }
        .title { text-align: center; font-weight: bold; font-size: 12px; line-height: 1.35; }
        .ident { width: 100%; border-collapse: collapse; margin: 2px 0 6px; font-size: 10px; }
        .ident td { padding: 1px 3px; vertical-align: top; }
        .ident .l { width: 96px; }
        .ident .s { width: 8px; }
        .tw { font-weight: bold; font-size: 11px; margin: 4px 0 4px; }
        table.t { width: 100%; border-collapse: collapse; }
        table.t th, table.t td { border: 1px solid #000; padding: 3px 4px; }
        table.t th { background: #cdd7ea; text-align: center; font-size: 9px; }
        .jenis { width: 190px; text-align: left; }
        .jhead { background: #eef1f6; font-weight: bold; }
        .band td { background: #dbe3f1; font-weight: bold; }
        .cell { height: 26px; }
        table.ttd { width: 100%; margin-top: 14px; border-collapse: collapse; }
        table.ttd td { font-size: 10px; vertical-align: top; padding: 2px 8px; }
        .sp { height: 56px; }
        .nm { font-weight: bold; }
        .ket { font-size: 8.5px; color: #333; margin-top: 8px; }
        .foot { font-size: 8px; color: #999; margin-top: 4px; }
    </style>
</head>
<body>
    @foreach($data['triwulan'] as $tw)
    <div class="page {{ $loop->last ? '' : 'brk' }}">
        <table class="head">
            <tr>
                <td style="width:30%"><span class="code">POM-14.01/CFM.01/SOP.01/IK.33B.01/F.01 revisi 06</span></td>
                <td style="width:56%"><div class="title">KARTU PEMELIHARAAN / PERBAIKAN BARANG<br>BALAI PENGAWAS OBAT DAN MAKANAN DI JEMBER<br>TAHUN {{ $data['tahun'] }}</div></td>
                <td style="width:14%; text-align:right">@if($logo)<img src="{{ $logo }}" height="42" alt="">@endif</td>
            </tr>
        </table>

        <table class="ident">
            <tr><td class="l">Nama Barang</td><td class="s">:</td><td>{{ $data['bmn']['nama'] }}</td></tr>
            <tr><td class="l">Nomor BMN</td><td class="s">:</td><td>{{ $data['bmn']['nomor'] }}</td></tr>
            <tr><td class="l">Lokasi</td><td class="s">:</td><td>{{ $data['bmn']['lokasi'] }}</td></tr>
        </table>

        <div class="tw">{{ $tw['label'] }} — Tahun {{ $data['tahun'] }}</div>

        <table class="t">
            <thead>
                <tr>
                    <th rowspan="2" class="jenis" style="vertical-align:middle">Jenis Pemeliharaan / Kegiatan</th>
                    @foreach($tw['bulan'] as $b)
                        <th colspan="4">Bulan {{ $b['nama'] }}</th>
                    @endforeach
                </tr>
                <tr>
                    @foreach($tw['bulan'] as $b)
                        <th>Tanggal</th><th>Hasil<br>Pemeliharaan</th><th>Paraf</th><th>Verifikasi</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach($data['bagian'] as $nama => $jumlah)
                    <tr class="band"><td colspan="13">{{ $nama }}</td></tr>
                    @for($i = 0; $i < $jumlah; $i++)
                        <tr>
                            <td class="jenis cell"></td>
                            @foreach($tw['bulan'] as $b)
                                <td class="cell"></td><td class="cell"></td><td class="cell"></td><td class="cell"></td>
                            @endforeach
                        </tr>
                    @endfor
                @endforeach
            </tbody>
        </table>

        <div class="ket">
            Keterangan: kolom <b>Tanggal</b> dan <b>Hasil Pemeliharaan</b> diisi tiap pelaksanaan;
            <b>Paraf</b> oleh Pengelola BMN, <b>Verifikasi</b> oleh Kepala Sub bagian Tata Usaha.
        </div>

        @php $tt = $data['penandatangan']; @endphp
        <table class="ttd">
            <tr>
                <td style="width:34%; text-align:center">Pengelola BMN,</td>
                <td style="width:32%"></td>
                <td style="width:34%; text-align:center">Mengetahui,<br>Kepala Sub bagian Tata Usaha</td>
            </tr>
            <tr>
                <td class="sp"></td><td></td><td class="sp"></td>
            </tr>
            <tr>
                <td style="text-align:center"><span class="nm">{{ $tt['pengelola_nama'] }}</span></td>
                <td></td>
                <td style="text-align:center"><span class="nm">{{ $tt['kasubag_nama'] }}</span></td>
            </tr>
        </table>

        <div class="foot">Dicetak: {{ $data['dicetak'] }}</div>
    </div>
    @endforeach
</body>
</html>
