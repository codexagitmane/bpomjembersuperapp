<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #000; font-size: 10px; margin: 0; }
        .title { text-align: center; font-weight: bold; font-size: 13px; margin: 0 0 2px; }
        .subtitle { text-align: center; font-weight: bold; font-size: 12px; margin: 0 0 12px; }
        table.t { width: 100%; border-collapse: collapse; }
        table.t th, table.t td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
        table.t thead th { text-align: center; font-size: 9.5px; }
        .c { text-align: center; }
        .num { width: 26px; }
        .grp-no { text-align: center; font-weight: bold; }
        .grp-nama { font-weight: bold; }
        .kode { white-space: nowrap; }
        table.ttd { width: 100%; margin-top: 30px; border-collapse: collapse; }
        table.ttd td { width: 50%; text-align: center; font-size: 10px; vertical-align: top; padding: 2px 6px; }
        .sp { height: 64px; }
        .foot { margin-top: 10px; font-size: 8px; color: #888; text-align: right; }
    </style>
</head>
<body>
    <div class="title">{{ $data['judul'] }}</div>
    <div class="subtitle">{{ $data['periode_label'] }}</div>

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
            @php $no = 0; @endphp
            @forelse($data['grup'] as $lokasi => $items)
                <tr>
                    <td class="grp-no">{{ ++$no }}</td>
                    <td class="grp-nama">{{ $lokasi }}</td>
                    <td></td><td></td><td></td><td></td><td></td>
                </tr>
                @foreach($items as $it)
                    <tr>
                        <td></td>
                        <td>{{ $it['nama'] }}</td>
                        <td class="kode">{{ $it['kode'] }}</td>
                        <td class="c">{{ $it['nup'] }}</td>
                        <td class="c">{{ $it['jumlah'] }}</td>
                        <td>{{ $it['hasil'] }}</td>
                        <td>{{ $it['keterangan'] }}</td>
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
            <td>Mengetahui,<br>Kepala Sub bagian Tata Usaha</td>
            <td>Pengelola BMN,</td>
        </tr>
        <tr>
            <td class="sp"></td>
            <td class="sp"></td>
        </tr>
        <tr>
            <td>{{ $tt['kasubag_nama'] }}</td>
            <td>{{ $tt['pengelola_nama'] }}</td>
        </tr>
    </table>

    <div class="foot">Dicetak: {{ $data['dicetak'] }}</div>
</body>
</html>
