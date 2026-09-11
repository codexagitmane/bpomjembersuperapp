<?php

namespace App\Services;

use App\Models\BmnItem;
use App\Models\JadwalPemeliharaanBmn;
use App\Models\User;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Menyusun data & ekspor untuk dua dokumen Pemeliharaan BMN:
 *
 *  1. Laporan Pemeliharaan & Perbaikan BMN — rekap seluruh BMN dikelompokkan
 *     per ruangan/lokasi, mengikuti format Formulir Laporan Bulanan. Bisa
 *     direkap per bulan, per semester, atau per tahun. Kolom kondisi diambil
 *     dari master BMN dan keterangan disinkronkan dengan realisasi jadwal.
 *
 *  2. Kartu Pemeliharaan / Perbaikan Barang — kartu per BMN untuk satu tahun,
 *     mengikuti Formulir POM-14.01/CFM.01/SOP.01/IK.33B.01/F.01 revisi 06,
 *     dengan bagian Mandiri, Pihak Ketiga, dan Lain-lain. Bulan yang sudah
 *     terealisasi pada jadwal ikut ditandai.
 *
 * Data laporan & kartu dibangun sekali di sini lalu dipakai bersama oleh
 * pratinjau (JSON), cetak PDF (Blade), dan unduh Excel — supaya ketiganya
 * tidak pernah berbeda isi.
 */
class PemeliharaanExportService
{
    public const KONDISI_LABEL = [
        'baik' => 'Baik',
        'rusak_ringan' => 'Rusak Ringan',
        'rusak_sedang' => 'Rusak Sedang',
        'rusak_berat' => 'Rusak Berat',
    ];

    public const BULAN = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    public const BULAN_SINGKAT = [
        1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr', 5 => 'Mei', 6 => 'Jun',
        7 => 'Jul', 8 => 'Agu', 9 => 'Sep', 10 => 'Okt', 11 => 'Nov', 12 => 'Des',
    ];

    // ===================================================================
    // LAPORAN
    // ===================================================================

    /**
     * Bangun dataset laporan untuk satu periode.
     *
     * @param  string  $periode  'bulan' | 'semester' | 'tahun'
     * @return array{judul:string, periode_label:string, tahun:int, grup:array, total:int, ringkasan:array, penandatangan:array, dicetak:string}
     */
    public function laporanData(int $tahun, string $periode, ?int $bulan, ?int $semester): array
    {
        $months = $this->bulanPeriode($periode, $bulan, $semester);

        $jadwal = JadwalPemeliharaanBmn::where('tahun', $tahun)->get()->keyBy('bmn_item_id');
        $items = BmnItem::orderBy('lokasi')->orderBy('nama_barang')->get();

        $grup = [];
        $no = 0;
        $terpelihara = 0;
        $kondisiHitung = ['baik' => 0, 'rusak_ringan' => 0, 'rusak_sedang' => 0, 'rusak_berat' => 0];

        foreach ($items as $b) {
            $lokasi = trim((string) $b->lokasi) !== '' ? $b->lokasi : 'Lainnya';
            if (! isset($grup[$lokasi])) {
                $grup[$lokasi] = [];
            }

            $j = $jadwal->get($b->id);
            $realisasi = $this->bulanRealisasi($j?->bulan ?? [], $months);
            if (count($realisasi) > 0) {
                $terpelihara++;
            }
            $kondisi = $b->kondisi ?: 'baik';
            if (isset($kondisiHitung[$kondisi])) {
                $kondisiHitung[$kondisi]++;
            }

            $grup[$lokasi][] = [
                'no' => ++$no,
                'nama' => $b->nama_barang,
                'kode' => $b->kode_barang,
                'nup' => $b->nup,
                'jumlah' => $j?->jumlah ?: 1,
                'hasil' => self::KONDISI_LABEL[$kondisi] ?? 'Baik',
                'keterangan' => $this->keteranganLaporan($periode, $realisasi, $j?->keterangan),
            ];
        }

        return [
            'judul' => 'Laporan Pemeliharaan dan Perbaikan BMN',
            'periode_label' => $this->periodeLabel($periode, $bulan, $semester, $tahun),
            'tahun' => $tahun,
            'grup' => $grup,
            'total' => $no,
            'ringkasan' => [
                'total_bmn' => $no,
                'terpelihara' => $terpelihara,
                'belum' => $no - $terpelihara,
                'kondisi' => $kondisiHitung,
            ],
            'penandatangan' => $this->penandatangan(),
            'dicetak' => now()->timezone('Asia/Jakarta')->locale('id')->translatedFormat('d F Y H:i').' WIB',
        ];
    }

    /** Unduh laporan sebagai Excel (dikelompokkan per ruangan, sesuai format). */
    public function laporanExcel(array $data): StreamedResponse
    {
        $ss = new Spreadsheet();
        $sheet = $ss->getActiveSheet();
        $sheet->setTitle('Laporan Pemeliharaan');

        $headers = ['NO', 'FASILITAS', 'Kode Barang', 'No. Urut Pendaftaran', 'Jumlah', 'Hasil Pemeliharaan/Perbaikan', 'Keterangan'];
        $last = Coordinate::stringFromColumnIndex(count($headers)); // G

        // Judul
        $sheet->setCellValue('A1', $data['judul']);
        $sheet->mergeCells("A1:{$last}1");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->setCellValue('A2', $data['periode_label']);
        $sheet->mergeCells("A2:{$last}2");
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(11);
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Header tabel
        $r = 4;
        $sheet->fromArray($headers, null, "A{$r}");
        $sheet->getStyle("A{$r}:{$last}{$r}")->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle("A{$r}:{$last}{$r}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0B1F3A');
        $sheet->getStyle("A{$r}:{$last}{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER)->setWrapText(true);
        $awalTabel = $r;
        $r++;

        foreach ($data['grup'] as $lokasi => $items) {
            // Baris ruangan (header kelompok)
            $sheet->setCellValue("A{$r}", $lokasi);
            $sheet->mergeCells("A{$r}:{$last}{$r}");
            $sheet->getStyle("A{$r}:{$last}{$r}")->getFont()->setBold(true);
            $sheet->getStyle("A{$r}:{$last}{$r}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E4E9F2');
            $r++;
            foreach ($items as $it) {
                $sheet->fromArray([
                    $it['no'], $it['nama'], $it['kode'], $it['nup'], $it['jumlah'], $it['hasil'], $it['keterangan'],
                ], null, "A{$r}");
                $sheet->getStyle("A{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("D{$r}:E{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $r++;
            }
        }
        $akhirTabel = $r - 1;

        if ($akhirTabel >= $awalTabel) {
            $sheet->getStyle("A{$awalTabel}:{$last}{$akhirTabel}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        }

        // Lebar kolom
        $lebar = ['A' => 5, 'B' => 42, 'C' => 20, 'D' => 12, 'E' => 8, 'F' => 24, 'G' => 30];
        foreach ($lebar as $col => $w) {
            $sheet->getColumnDimension($col)->setWidth($w);
        }
        $sheet->getStyle("B5:B{$akhirTabel}")->getAlignment()->setWrapText(true);
        $sheet->getStyle("G5:G{$akhirTabel}")->getAlignment()->setWrapText(true);

        // Tanda tangan
        $tt = $data['penandatangan'];
        $r += 2;
        $sheet->setCellValue("B{$r}", 'Mengetahui,');
        $sheet->setCellValue("F{$r}", 'Pengelola BMN,');
        $sheet->setCellValue('B'.($r + 1), 'Kepala Sub Bagian Tata Usaha');
        $rTtd = $r + 5;
        $sheet->setCellValue("B{$rTtd}", $tt['kasubag_nama']);
        $sheet->setCellValue("F{$rTtd}", $tt['pengelola_nama']);
        $sheet->getStyle("B{$rTtd}")->getFont()->setUnderline(true)->setBold(true);
        $sheet->getStyle("F{$rTtd}")->getFont()->setUnderline(true)->setBold(true);
        if ($tt['kasubag_nip']) {
            $sheet->setCellValue('B'.($rTtd + 1), 'NIP. '.$tt['kasubag_nip']);
        }
        if ($tt['pengelola_nip']) {
            $sheet->setCellValue('F'.($rTtd + 1), 'NIP. '.$tt['pengelola_nip']);
        }

        $namaFile = 'Laporan-Pemeliharaan-BMN-'.$this->slugPeriode($data['periode_label']).'.xlsx';

        return $this->unduh($ss, $namaFile);
    }

    // ===================================================================
    // KARTU
    // ===================================================================

    /**
     * Bangun dataset kartu pemeliharaan satu BMN untuk satu tahun.
     *
     * @return array{bmn:array, tahun:int, kondisi_label:string, triwulan:array, bulan_realisasi:array, penandatangan:array, dicetak:string}
     */
    public function kartuData(BmnItem $bmn, int $tahun): array
    {
        $j = JadwalPemeliharaanBmn::where('bmn_item_id', $bmn->id)->where('tahun', $tahun)->first();
        $realisasi = $this->bulanRealisasi($j?->bulan ?? [], range(1, 12));

        $triwulan = [];
        foreach ([1, 4, 7, 10] as $idx => $mulai) {
            $bulan = [];
            for ($m = $mulai; $m < $mulai + 3; $m++) {
                $bulan[] = [
                    'no' => $m,
                    'nama' => self::BULAN[$m],
                    'realisasi' => in_array($m, $realisasi, true),
                ];
            }
            $triwulan[] = [
                'label' => 'Triwulan '.['I', 'II', 'III', 'IV'][$idx],
                'bulan' => $bulan,
            ];
        }

        return [
            'bmn' => [
                'nama' => $bmn->nama_barang,
                'nomor' => $bmn->kode_barang.($bmn->nup ? ' / NUP '.$bmn->nup : ''),
                'lokasi' => $bmn->lokasi ?: '-',
            ],
            'tahun' => $tahun,
            'kondisi_label' => self::KONDISI_LABEL[$bmn->kondisi ?? 'baik'] ?? 'Baik',
            'triwulan' => $triwulan,
            'bulan_realisasi' => $realisasi,
            'penandatangan' => $this->penandatangan(),
            'dicetak' => now()->timezone('Asia/Jakarta')->locale('id')->translatedFormat('d F Y H:i').' WIB',
        ];
    }

    /**
     * Unduh kartu sebagai Excel. Bulan disusun sebagai baris (12 bulan) untuk
     * tiap jenis pemeliharaan, agar mudah diisi dan disunting secara digital.
     */
    public function kartuExcel(array $data): StreamedResponse
    {
        $ss = new Spreadsheet();
        $sheet = $ss->getActiveSheet();
        $sheet->setTitle('Kartu Pemeliharaan');

        $headers = ['No', 'Bulan', 'Tanggal', 'Pelaksana', 'Hasil', 'Verifikator', 'Keterangan'];
        $last = Coordinate::stringFromColumnIndex(count($headers)); // G

        $sheet->setCellValue('A1', 'KARTU PEMELIHARAAN / PERBAIKAN BARANG');
        $sheet->mergeCells("A1:{$last}1");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->setCellValue('A2', 'BALAI PENGAWAS OBAT DAN MAKANAN DI JEMBER — TAHUN '.$data['tahun']);
        $sheet->mergeCells("A2:{$last}2");
        $sheet->getStyle('A2')->getFont()->setBold(true);
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->setCellValue('A3', 'POM-14.01/CFM.01/SOP.01/IK.33B.01/F.01 revisi 06');
        $sheet->mergeCells("A3:{$last}3");
        $sheet->getStyle('A3')->getFont()->setSize(9)->setItalic(true);
        $sheet->getStyle('A3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->setCellValue('A5', 'Nama Barang');
        $sheet->setCellValue('C5', ': '.$data['bmn']['nama']);
        $sheet->setCellValue('A6', 'Nomor BMN');
        $sheet->setCellValue('C6', ': '.$data['bmn']['nomor']);
        $sheet->setCellValue('A7', 'Lokasi');
        $sheet->setCellValue('C7', ': '.$data['bmn']['lokasi']);
        $sheet->setCellValue('A8', 'Kondisi Terkini');
        $sheet->setCellValue('C8', ': '.$data['kondisi_label']);
        $sheet->getStyle('A5:A8')->getFont()->setBold(true);

        $r = 10;
        $awalTabel = $r;
        foreach (['Mandiri', 'Pihak Ketiga', 'Lain-lain'] as $jenis) {
            $sheet->setCellValue("A{$r}", strtoupper($jenis));
            $sheet->mergeCells("A{$r}:{$last}{$r}");
            $sheet->getStyle("A{$r}:{$last}{$r}")->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
            $sheet->getStyle("A{$r}:{$last}{$r}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('4E6EB5');
            $r++;

            $sheet->fromArray($headers, null, "A{$r}");
            $sheet->getStyle("A{$r}:{$last}{$r}")->getFont()->setBold(true);
            $sheet->getStyle("A{$r}:{$last}{$r}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E4E9F2');
            $sheet->getStyle("A{$r}:{$last}{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $r++;

            foreach (self::BULAN as $m => $namaBulan) {
                // Untuk pemeliharaan Mandiri, bulan yang sudah terealisasi pada
                // jadwal langsung ditandai hasilnya dengan kondisi terkini.
                $hasil = ($jenis === 'Mandiri' && in_array($m, $data['bulan_realisasi'], true))
                    ? $data['kondisi_label'] : '';
                $sheet->fromArray([$m, $namaBulan, '', '', $hasil, '', ''], null, "A{$r}");
                $sheet->getStyle("A{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                if ($hasil !== '') {
                    $sheet->getStyle("E{$r}")->getFont()->setBold(true)->getColor()->setRGB('15803D');
                }
                $r++;
            }
        }
        $akhirTabel = $r - 1;
        $sheet->getStyle("A{$awalTabel}:{$last}{$akhirTabel}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        foreach (['A' => 5, 'B' => 14, 'C' => 16, 'D' => 22, 'E' => 18, 'F' => 22, 'G' => 26] as $col => $w) {
            $sheet->getColumnDimension($col)->setWidth($w);
        }

        // Keterangan + tanda tangan
        $r += 1;
        $sheet->setCellValue("A{$r}", 'Keterangan: * diisi nama dan paraf; ** diisi pemeliharaan selain pemeliharaan rutin (mandiri dan pihak ketiga).');
        $sheet->mergeCells("A{$r}:{$last}{$r}");
        $sheet->getStyle("A{$r}")->getFont()->setItalic(true)->setSize(9);
        $r += 2;
        $sheet->setCellValue("E{$r}", 'Mengetahui,');
        $sheet->setCellValue('E'.($r + 1), 'Petugas BMN');
        $sheet->setCellValue('E'.($r + 5), $data['penandatangan']['pengelola_nama']);
        $sheet->getStyle('E'.($r + 5))->getFont()->setUnderline(true)->setBold(true);

        return $this->unduh($ss, 'Kartu-Pemeliharaan-'.$this->slug($data['bmn']['nama']).'-'.$data['tahun'].'.xlsx');
    }

    // ===================================================================
    // Pembantu
    // ===================================================================

    /** @return int[] Daftar nomor bulan yang tercakup periode. */
    private function bulanPeriode(string $periode, ?int $bulan, ?int $semester): array
    {
        return match ($periode) {
            'bulan' => [max(1, min(12, (int) $bulan))],
            'semester' => ((int) $semester === 2) ? range(7, 12) : range(1, 6),
            default => range(1, 12),
        };
    }

    /**
     * Dari matriks bulan jadwal ({"1":{"r":..,"e":..}}), ambil bulan yang
     * realisasinya (e) aktif dan termasuk dalam daftar bulan periode.
     *
     * @return int[]
     */
    private function bulanRealisasi(mixed $bulan, array $months): array
    {
        $out = [];
        $bulan = is_array($bulan) ? $bulan : [];
        foreach ($months as $m) {
            $sel = $bulan[$m] ?? $bulan[(string) $m] ?? null;
            if (is_array($sel) && ! empty($sel['e'])) {
                $out[] = (int) $m;
            }
        }

        return $out;
    }

    private function keteranganLaporan(string $periode, array $realisasi, ?string $catatan): string
    {
        $catatan = trim((string) $catatan);

        if ($periode === 'bulan') {
            $inti = count($realisasi) > 0 ? 'Terpelihara' : 'Belum dipelihara';
        } elseif (count($realisasi) > 0) {
            $nama = array_map(fn ($m) => self::BULAN_SINGKAT[$m], $realisasi);
            $inti = 'Terlaksana: '.implode(', ', $nama);
        } else {
            $inti = 'Belum ada realisasi';
        }

        return $catatan !== '' ? $inti.' — '.$catatan : $inti;
    }

    private function periodeLabel(string $periode, ?int $bulan, ?int $semester, int $tahun): string
    {
        return match ($periode) {
            'bulan' => 'Bulan '.(self::BULAN[max(1, min(12, (int) $bulan))]).' '.$tahun,
            'semester' => 'Semester '.((int) $semester === 2 ? 'II (Juli–Desember)' : 'I (Januari–Juni)').' '.$tahun,
            default => 'Tahun '.$tahun,
        };
    }

    /** Data penanda tangan laporan: Kepala Subag TU & Pengelola BMN. */
    private function penandatangan(): array
    {
        $kasubag = User::role('kepala_subag_tu')->orderBy('name')->first();
        $pengelola = User::where('is_pengelola_bmn', true)->orderBy('name')->first();

        return [
            'kasubag_nama' => $kasubag?->name ?: '.............................',
            'kasubag_nip' => $kasubag?->nip_nik,
            'pengelola_nama' => $pengelola?->name ?: '.............................',
            'pengelola_nip' => $pengelola?->nip_nik,
        ];
    }

    private function slug(string $v): string
    {
        $v = preg_replace('/[^A-Za-z0-9]+/', '-', $v);

        return trim((string) $v, '-') ?: 'BMN';
    }

    private function slugPeriode(string $label): string
    {
        return $this->slug($label);
    }

    private function unduh(Spreadsheet $ss, string $namaFile): StreamedResponse
    {
        return response()->streamDownload(function () use ($ss) {
            (new Xlsx($ss))->save('php://output');
        }, $namaFile, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
