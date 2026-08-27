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
        .title { text-align: center; font-weight: bold; font-size: 14px; margin: 10px 0 4px; }
        .nomor { text-align: center; font-size: 12px; margin-bottom: 12px; }
        table.meta td { padding: 1px 3px; font-size: 12px; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.items th, table.items td { border: 1px solid #333; padding: 5px 6px; font-size: 11px; }
        table.items th { text-align: center; font-weight: bold; }
        .num { text-align: center; }
        .tgl { text-align: right; margin-top: 16px; font-size: 12px; }
        .ttd { width: 100%; margin-top: 8px; border-collapse: collapse; }
        .ttd td { width: 50%; text-align: center; font-size: 11px; vertical-align: top; padding: 4px; }
        .space { height: 60px; }
        .nm { font-weight: bold; text-decoration: underline; }
    </style>
</head>
<body>
    <table class="hd">
        <tr>
            <td width="70">@if($logo)<img src="{{ $logo }}" height="46" alt="">@endif</td>
            <td class="code">POM-12.SOP.01.IK.13(024)/F.03</td>
        </tr>
    </table>

    <div class="title">SURAT BUKTI BARANG KELUAR (SBBK)</div>
    <div class="nomor">Nomor : {{ str_replace('SPB', 'SBBK', $p->nomor) }}</div>

    <table class="meta">
        <tr><td width="140">Unit Kerja</td><td>: {{ $p->unit_kerja ?? 'Balai POM di Jember' }}</td></tr>
        <tr><td>No. dan Tgl. SPB</td><td>: {{ $p->nomor }} — {{ $p->created_at?->timezone('Asia/Jakarta')->locale('id')->translatedFormat('d F Y') }}</td></tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th width="30">No.</th>
                <th>Nama Barang</th>
                <th width="70">Satuan</th>
                <th width="70">Jumlah</th>
                <th width="150">Keterangan</th>
            </tr>
        </thead>
        <tbody>
            @php $no = 0; @endphp
            @foreach ($p->items as $item)
                @php $ditolak = $item['ditolak'] ?? false; $jml = $item['jumlah_disetujui'] ?? $item['jumlah'] ?? 0; @endphp
                @if (! $ditolak && $jml > 0)
                    @php $no++; @endphp
                    <tr>
                        <td class="num">{{ $no }}</td>
                        <td>{{ $item['nama'] ?? '-' }}</td>
                        <td class="num">{{ $item['satuan'] ?? '-' }}</td>
                        <td class="num">{{ $jml }}</td>
                        <td>{{ $item['keterangan'] ?? '' }}</td>
                    </tr>
                @endif
            @endforeach
            @if ($no === 0)
                <tr><td colspan="5" class="num">— Tidak ada barang yang disetujui —</td></tr>
            @endif
        </tbody>
    </table>

    <p class="tgl">Jember, {{ now()->timezone('Asia/Jakarta')->locale('id')->translatedFormat('d F Y') }}</p>

    <table class="ttd">
        <tr>
            <td>Yang Menerima,</td>
            <td>Pengelola Gudang,</td>
        </tr>
        <tr>
            <td class="space">@if(!empty($qr['pemohon']))<img src="{{ $qr['pemohon'] }}" width="55" height="55" alt="">@endif</td>
            <td class="space">@if(!empty($qr['gudang']))<img src="{{ $qr['gudang'] }}" width="55" height="55" alt="">@endif</td>
        </tr>
        <tr>
            <td><span class="nm">{{ $p->user->name ?? '' }}</span><br>NIP. {{ $p->user->nip_nik ?? '................' }}</td>
            <td><span class="nm">{{ $p->gudangApprover->name ?? '( ....................... )' }}</span><br>NIP. {{ $p->gudangApprover->nip_nik ?? '................' }}</td>
        </tr>
    </table>
</body>
</html>
