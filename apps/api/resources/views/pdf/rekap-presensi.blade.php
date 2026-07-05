<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<style>
  * { font-family: DejaVu Sans, sans-serif; }
  body { font-size: 11px; color: #0b1f3a; }
  h1 { font-size: 15px; margin: 0; }
  .sub { color: #5b6b85; font-size: 11px; margin: 2px 0 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; }
  th { background: #0b1f3a; color: #fff; text-align: center; }
  td.center { text-align: center; }
  tr:nth-child(even) td { background: #f4f7fb; }
  .foot { margin-top: 16px; font-size: 10px; color: #5b6b85; }
</style>
</head>
<body>
  <h1>REKAP PRESENSI PEGAWAI ({{ strtoupper($rekap['mode']) }}) — BALAI POM DI JEMBER</h1>
  <p class="sub">Periode: {{ $rekap['periode'] }}
    @isset($rekap['hari_kerja']) &nbsp;|&nbsp; Hari kerja: {{ $rekap['hari_kerja'] }} hari @endisset
    &nbsp;|&nbsp; Total pegawai: {{ $rekap['ringkasan']['total_pegawai'] }}</p>
  <table>
    <thead>
      <tr>
        @foreach($rekap['headers'] as $h)
        <th>{{ $h }}</th>
        @endforeach
      </tr>
    </thead>
    <tbody>
      @foreach($rekap['rows'] as $i => $row)
      <tr>
        <td class="center">{{ $i + 1 }}</td>
        @foreach($rekap['kolom'] as $k)
        <td class="{{ in_array($k, ['nama', 'nip_nik']) ? '' : 'center' }}">{{ $k === 'jenis_pegawai' ? ucfirst($row[$k]) : $row[$k] }}</td>
        @endforeach
      </tr>
      @endforeach
    </tbody>
  </table>
  <p class="foot">Dicetak dari LENTERA BPOM Jember pada {{ now()->translatedFormat('l, d F Y H:i') }} WIB.</p>
</body>
</html>
