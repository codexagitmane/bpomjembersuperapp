<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #000; font-size: 9px; margin: 0; }
        .head { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        .head td { vertical-align: middle; }
        .code { display: inline-block; border: 1px solid #000; padding: 2px 6px; font-weight: bold; font-size: 8px; }
        .title { text-align: center; font-weight: bold; font-size: 11px; line-height: 1.3; }
        .ident { width: 100%; border-collapse: collapse; margin: 4px 0 8px; font-size: 9.5px; }
        .ident td { padding: 1px 3px; vertical-align: top; }
        .ident .l { width: 90px; }
        .ident .s { width: 8px; }
        table.t { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        table.t th, table.t td { border: 1px solid #000; padding: 2px 3px; }
        table.t th { background: #cdd7ea; text-align: center; font-size: 8px; }
        .jenis { width: 90px; text-align: left; font-weight: bold; background: #eef1f6; }
        .band td { background: #dbe3f1; font-weight: bold; }
        .cell { height: 15px; }
        .done { background: #eaf6ee; }
        .done .mk { color: #15803d; font-weight: bold; font-size: 8px; }
        .c { text-align: center; }
        .tw { font-weight: bold; font-size: 9.5px; margin: 2px 0 3px; }
        table.ttd { width: 100%; margin-top: 6px; border-collapse: collapse; }
        table.ttd td { width: 50%; font-size: 9px; vertical-align: top; padding: 2px 6px; }
        .sp { height: 40px; }
        .nm { font-weight: bold; text-decoration: underline; }
        .ket { font-size: 8px; color: #333; }
        .foot { font-size: 7.5px; color: #888; }
    </style>
</head>
<body>
    <table class="head">
        <tr>
            <td style="width:30%"><span class="code">POM-14.01/CFM.01/SOP.01/IK.33B.01/F.01 revisi 06</span></td>
            <td style="width:56%"><div class="title">KARTU PEMELIHARAAN / PERBAIKAN BARANG<br>BALAI PENGAWAS OBAT DAN MAKANAN DI JEMBER<br>TAHUN {{ $data['tahun'] }}</div></td>
            <td style="width:14%; text-align:right">@if($logo)<img src="{{ $logo }}" height="40" alt="">@endif</td>
        </tr>
    </table>

    <table class="ident">
        <tr><td class="l">Nama Barang</td><td class="s">:</td><td>{{ $data['bmn']['nama'] }}</td></tr>
        <tr><td class="l">Nomor BMN</td><td class="s">:</td><td>{{ $data['bmn']['nomor'] }}</td></tr>
        <tr><td class="l">Lokasi</td><td class="s">:</td><td>{{ $data['bmn']['lokasi'] }}</td></tr>
        <tr><td class="l">Kondisi Terkini</td><td class="s">:</td><td>{{ $data['kondisi_label'] }}</td></tr>
    </table>

    @foreach($data['triwulan'] as $tw)
        <div class="tw">{{ $tw['label'] }}</div>
        <table class="t">
            <thead>
                <tr>
                    <th rowspan="2" class="jenis" style="vertical-align:middle">Jenis<br>Pemeliharaan</th>
                    @foreach($tw['bulan'] as $b)
                        <th colspan="4">Bulan {{ $b['nama'] }}</th>
                    @endforeach
                </tr>
                <tr>
                    @foreach($tw['bulan'] as $b)
                        <th>Tanggal</th><th>Pelaksana*</th><th>Hasil</th><th>Verifikator*</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach(['Mandiri' => 2, 'Pihak Ketiga' => 1, 'Lain-lain**' => 1] as $jenis => $extra)
                    <tr class="band"><td colspan="13">{{ $jenis }}</td></tr>
                    {{-- Baris pertama Mandiri = pemeliharaan rutin bulanan; bulan yang sudah terealisasi ditandai. --}}
                    <tr>
                        <td class="jenis" style="font-weight:normal">{{ $jenis === 'Mandiri' ? 'Rutin bulanan' : '' }}</td>
                        @foreach($tw['bulan'] as $b)
                            @php $tandai = ($jenis === 'Mandiri' && $b['realisasi']); @endphp
                            <td class="cell c {{ $tandai ? 'done' : '' }}"></td>
                            <td class="cell {{ $tandai ? 'done' : '' }}"></td>
                            <td class="cell c {{ $tandai ? 'done' : '' }}">@if($tandai)<span class="mk">{{ $data['kondisi_label'] }}</span>@endif</td>
                            <td class="cell {{ $tandai ? 'done' : '' }}"></td>
                        @endforeach
                    </tr>
                    @for($i = 0; $i < $extra; $i++)
                        <tr>
                            <td class="jenis" style="font-weight:normal">&nbsp;</td>
                            @foreach($tw['bulan'] as $b)
                                <td class="cell"></td><td class="cell"></td><td class="cell"></td><td class="cell"></td>
                            @endforeach
                        </tr>
                    @endfor
                @endforeach
            </tbody>
        </table>
    @endforeach

    @php $tt = $data['penandatangan']; @endphp
    <table class="ttd">
        <tr>
            <td class="ket">
                Keterangan:<br>
                * diisi nama dan paraf<br>
                ** diisi dengan pemeliharaan selain pemeliharaan rutin (mandiri dan pihak ketiga)<br>
                <span style="color:#15803d">■</span> sel bertanda hijau: bulan yang telah terealisasi pada Jadwal Pemeliharaan.<br>
                <span class="foot">Dicetak: {{ $data['dicetak'] }}</span>
            </td>
            <td style="text-align:center">
                Mengetahui,<br>Petugas BMN
                <div class="sp"></div>
                <span class="nm">{{ $tt['pengelola_nama'] }}</span>
                @if($tt['pengelola_nip'])<br>NIP. {{ $tt['pengelola_nip'] }}@endif
            </td>
        </tr>
    </table>
</body>
</html>
