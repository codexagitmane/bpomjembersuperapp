<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #0b1f3a; font-size: 12px; }
        .head { text-align: center; border-bottom: 2px solid #0b1f3a; padding-bottom: 10px; margin-bottom: 16px; }
        .head h1 { margin: 0; font-size: 16px; }
        .head p { margin: 2px 0; font-size: 11px; color: #444; }
        .meta td { padding: 2px 4px; font-size: 12px; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.items th, table.items td { border: 1px solid #99a; padding: 6px 8px; font-size: 12px; }
        table.items th { background: #eef3fb; text-align: left; }
        .center { text-align: center; }
        .ttd { width: 100%; margin-top: 40px; }
        .ttd td { width: 50%; text-align: center; font-size: 12px; vertical-align: top; }
        .sign-space { height: 60px; }
        .status { display: inline-block; padding: 3px 10px; border-radius: 6px; font-weight: bold; font-size: 11px; }
    </style>
</head>
<body>
    <div class="head">
        <h1>PERMINTAAN PERSEDIAAN BARANG MILIK NEGARA</h1>
        <p>Balai Pengawas Obat dan Makanan di Jember</p>
        <p>Nomor: {{ $p->nomor }}</p>
    </div>

    <table class="meta">
        <tr><td width="140">Pemohon</td><td>: {{ $p->user->name ?? '-' }}</td></tr>
        <tr><td>NIP/NIK</td><td>: {{ $p->user->nip_nik ?? '-' }}</td></tr>
        <tr><td>Tanggal Pengajuan</td><td>: {{ $p->created_at?->timezone('Asia/Jakarta')->format('d M Y H:i') }} WIB</td></tr>
        <tr><td>Keperluan</td><td>: {{ $p->keperluan }}</td></tr>
        <tr>
            <td>Status</td>
            <td>:
                @php $labels = ['diajukan' => 'Menunggu Kasubag TU', 'disetujui_kasubag' => 'Menunggu Kepala Balai', 'disetujui' => 'Disetujui', 'ditolak' => 'Ditolak']; @endphp
                <span class="status">{{ $labels[$p->status] ?? $p->status }}</span>
            </td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th width="30" class="center">No</th>
                <th>Nama Barang</th>
                <th width="80" class="center">Jumlah</th>
                <th width="80" class="center">Satuan</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($p->items as $i => $item)
                <tr>
                    <td class="center">{{ $i + 1 }}</td>
                    <td>{{ $item['nama'] ?? '-' }}</td>
                    <td class="center">{{ $item['jumlah'] ?? '-' }}</td>
                    <td class="center">{{ $item['satuan'] ?? '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="ttd">
        <tr>
            <td>
                Menyetujui,<br>Kepala Subag Tata Usaha
                <div class="sign-space"></div>
                <strong>{{ $p->approved_kasubag_at ? ($p->kasubagApprover->name ?? '') : '( .......................... )' }}</strong>
            </td>
            <td>
                Mengetahui,<br>Kepala Balai POM di Jember
                <div class="sign-space"></div>
                <strong>{{ $p->approved_kabalai_at ? ($p->kabalaiApprover->name ?? '') : '( .......................... )' }}</strong>
            </td>
        </tr>
    </table>
</body>
</html>
