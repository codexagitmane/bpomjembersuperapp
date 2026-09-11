<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #000; font-size: 10px; margin: 0; }
        .head { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        .head td { vertical-align: middle; }
        .title { text-align: center; font-weight: bold; font-size: 13px; margin: 2px 0; }
        .subtitle { text-align: center; font-weight: bold; font-size: 12px; margin: 0 0 10px; }
        table.t { width: 100%; border-collapse: collapse; }
        table.t th, table.t td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
        table.t thead th { background: #eef1f6; text-align: center; font-size: 9.5px; }
        .grp td { background: #e4e9f2; font-weight: bold; }
        .c { text-align: center; }
        .num { width: 26px; }
        .kode { white-space: nowrap; }
        .ket { color: #333; }
        .ringkas { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5px; }
        .ringkas td { border: 1px solid #cbd3e0; padding: 4px 8px; }
        .ringkas .k { background: #f4f6fa; font-weight: bold; width: 22%; }
        table.ttd { width: 100%; margin-top: 26px; border-collapse: collapse; }
        table.ttd td { width: 50%; text-align: center; font-size: 10px; vertical-align: top; padding: 2px 6px; }
        .sp { height: 60px; }
        .nm { font-weight: bold; text-decoration: underline; }
        .foot { margin-top: 8px; font-size: 8px; color: #666; text-align: right; }
    </style>
</head>
<body>
    <table class="head">
        <tr>
            <td style="width:16%">@if($logo)<img src="{{ $logo }}" height="42" alt="">@endif</td>
            <td style="width:84%">
                <div class="title">{{ $data['judul'] }}</div>
                <div class="subtitle">{{ $data['periode_label'] }}</div>
            </td>
        </tr>
    </table>

    @php $rk = $data['ringkasan']; @endphp
    <table class="ringkas">
        <tr>
            <td class="k">Total BMN</td><td>{{ $rk['total_bmn'] }} unit</td>
            <td class="k">Sudah Dipelihara</td><td>{{ $rk['terpelihara'] }} unit</td>
        </tr>
        <tr>
            <td class="k">Kondisi Baik</td><td>{{ $rk['kondisi']['baik'] }} unit</td>
            <td class="k">Rusak Ringan / Sedang / Berat</td>
            <td>{{ $rk['kondisi']['rusak_ringan'] }} / {{ $rk['kondisi']['rusak_sedang'] }} / {{ $rk['kondisi']['rusak_berat'] }} unit</td>
        </tr>
    </table>

    <table class="t">
        <thead>
            <tr>
                <th class="num">NO</th>
                <th>FASILITAS</th>
                <th>Kode Barang</th>
                <th>No. Urut<br>Pendaftaran</th>
                <th>Jumlah</th>
                <th>Hasil Pemeliharaan/<br>Perbaikan</th>
                <th>Keterangan</th>
            </tr>
        </thead>
        <tbody>
            @php $nourut = 0; @endphp
            @forelse($data['grup'] as $lokasi => $items)
                <tr class="grp"><td class="c">{{ ++$nourut }}</td><td colspan="6">{{ $lokasi }}</td></tr>
                @foreach($items as $it)
                    <tr>
                        <td></td>
                        <td>{{ $it['nama'] }}</td>
                        <td class="kode">{{ $it['kode'] }}</td>
                        <td class="c">{{ $it['nup'] }}</td>
                        <td class="c">{{ $it['jumlah'] }}</td>
                        <td>{{ $it['hasil'] }}</td>
                        <td class="ket">{{ $it['keterangan'] }}</td>
                    </tr>
                @endforeach
            @empty
                <tr><td colspan="7" class="c" style="padding:18px">Belum ada data BMN.</td></tr>
            @endforelse
        </tbody>
    </table>

    @php $tt = $data['penandatangan']; @endphp
    <table class="ttd">
        <tr>
            <td>Mengetahui,<br>Kepala Sub Bagian Tata Usaha</td>
            <td>Pengelola BMN,</td>
        </tr>
        <tr>
            <td class="sp"></td>
            <td class="sp"></td>
        </tr>
        <tr>
            <td>
                <span class="nm">{{ $tt['kasubag_nama'] }}</span>
                @if($tt['kasubag_nip'])<br>NIP. {{ $tt['kasubag_nip'] }}@endif
            </td>
            <td>
                <span class="nm">{{ $tt['pengelola_nama'] }}</span>
                @if($tt['pengelola_nip'])<br>NIP. {{ $tt['pengelola_nip'] }}@endif
            </td>
        </tr>
    </table>

    <div class="foot">Dicetak: {{ $data['dicetak'] }}</div>
</body>
</html>
