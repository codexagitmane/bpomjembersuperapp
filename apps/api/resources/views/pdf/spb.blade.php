<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #111; font-size: 12px; margin: 0; }
        .hd { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        .hd td { vertical-align: middle; }
        .code { text-align: right; font-weight: bold; font-size: 12px; }
        .title { text-align: center; font-weight: bold; font-size: 14px; margin: 10px 0 4px; letter-spacing: 0.5px; }
        .nomor { text-align: center; font-size: 12px; margin-bottom: 12px; }
        table.meta td { padding: 1px 3px; font-size: 12px; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.items th, table.items td { border: 1px solid #333; padding: 5px 6px; font-size: 11px; }
        table.items th { text-align: center; font-weight: bold; }
        .num { text-align: center; }
        .ttd { width: 100%; margin-top: 26px; border-collapse: collapse; }
        .ttd td { width: 50%; text-align: center; font-size: 11px; vertical-align: top; padding: 4px; }
        .space { height: 60px; }
        .nm { font-weight: bold; text-decoration: underline; }
    </style>
</head>
<body>
    <table class="hd">
        <tr>
            <td width="70">@if($logo)<img src="{{ $logo }}" height="46" alt="">@endif</td>
            <td class="code">POM-12.SOP.01.IK.13(024) / F.02</td>
        </tr>
    </table>

    <div class="title">SURAT PERMINTAAN BARANG ( SPB )</div>
    <div class="nomor">Nomor : {{ $p->nomor }}</div>

    <table class="meta">
        <tr><td width="150">Unit Kerja</td><td>: {{ $p->unit_kerja ?? 'Balai POM di Jember' }}</td></tr>
        <tr><td>Tanggal Permintaan</td><td>: {{ $p->created_at?->timezone('Asia/Jakarta')->locale('id')->translatedFormat('d F Y') }}</td></tr>
        <tr><td>Keperluan</td><td>: {{ $p->keperluan }}</td></tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th rowspan="2" width="30">No.</th>
                <th rowspan="2">Nama Barang</th>
                <th rowspan="2" width="60">Satuan</th>
                <th colspan="2" width="140">Jumlah</th>
                <th rowspan="2" width="140">Keterangan</th>
            </tr>
            <tr>
                <th width="70">Permintaan</th>
                <th width="70">Disetujui</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($p->items as $i => $item)
                @php $ditolak = $item['ditolak'] ?? false; @endphp
                <tr>
                    <td class="num">{{ $i + 1 }}</td>
                    <td>{{ $item['nama'] ?? '-' }}</td>
                    <td class="num">{{ $item['satuan'] ?? '-' }}</td>
                    <td class="num">{{ $item['jumlah'] ?? '-' }}</td>
                    <td class="num">{{ $p->status === 'diajukan' ? '' : ($ditolak ? '0' : ($item['jumlah_disetujui'] ?? $item['jumlah'] ?? '')) }}</td>
                    <td>{{ $ditolak ? ('Ditolak' . (!empty($item['keterangan']) && $item['keterangan'] !== 'Ditolak' ? ' — '.$item['keterangan'] : '')) : ($item['keterangan'] ?? '') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="ttd">
        <tr>
            <td>Pengelola Gudang,</td>
            <td>Menyetujui,<br>Ketua Tim / Fungsi</td>
        </tr>
        <tr>
            <td class="space">@if(!empty($qr['gudang']))<img src="{{ $qr['gudang'] }}" width="55" height="55" alt="">@endif</td>
            <td class="space">@if(!empty($qr['katim']))<img src="{{ $qr['katim'] }}" width="55" height="55" alt="">@endif</td>
        </tr>
        <tr>
            <td><span class="nm">{{ $p->gudangApprover->name ?? '( ....................... )' }}</span><br>NIP. {{ $p->gudangApprover->nip_nik ?? '................' }}</td>
            <td><span class="nm">{{ $p->katimApprover->name ?? '( ....................... )' }}</span><br>NIP. {{ $p->katimApprover->nip_nik ?? '................' }}</td>
        </tr>
    </table>
</body>
</html>
