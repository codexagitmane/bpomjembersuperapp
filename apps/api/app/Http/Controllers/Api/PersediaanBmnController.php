<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PermintaanPersediaan;
use App\Models\PersediaanBmn;
use App\Models\PersediaanKeluar;
use App\Models\PersediaanMasuk;
use App\Models\TandaTangan;
use App\Models\User;
use App\Services\NotifikasiService;
use App\Services\PersediaanExcelService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Persediaan Barang Milik Negara (Fungsi Tata Usaha).
 * - Pegawai: mengajukan permintaan persediaan.
 * - Pengelola BMN (Kasubag TU / Superadmin): CRUD katalog, cek kedaluwarsa reagen/test-kit.
 * - Persetujuan berjenjang: Kasubag TU → Kepala Balai. Output PDF permintaan.
 */
class PersediaanBmnController extends Controller
{
    private const KATEGORI = ['atk', 'reagen', 'test_kit', 'alat', 'lainnya'];

    private function isPengelola($user): bool
    {
        // Pengelola Gudang (Yulia) juga berhak CRUD katalog stok persediaan.
        return $user->hasAnyRole(['superadmin', 'kepala_subag_tu']) || (bool) $user->is_pengelola_gudang;
    }

    private function isPimpinan($user): bool
    {
        return $user->hasAnyRole(['superadmin', 'kepala_subag_tu', 'kepala_balai']);
    }

    /** Katalog persediaan + ringkasan stok & kedaluwarsa. */
    public function katalog(Request $request)
    {
        $q = PersediaanBmn::query();
        if ($search = trim((string) $request->query('q', ''))) {
            $q->where('nama', 'like', "%{$search}%");
        }
        if ($kategori = $request->query('kategori')) {
            $q->where('kategori', $kategori);
        }
        if ($jenis = $request->query('jenis')) { // kelompok: atk | psd
            $q->where('kelompok', $jenis);
        }
        if ($request->boolean('menipis')) {
            $q->whereColumn('stok', '<=', 'stok_minimum');
        }
        $batasKedaluwarsa = Carbon::today()->addMonths(6);
        if ($request->boolean('kedaluwarsa')) {
            $q->whereNotNull('tanggal_kedaluwarsa')->whereDate('tanggal_kedaluwarsa', '<=', $batasKedaluwarsa);
        }
        $items = $q->orderBy('nama')->get();

        $ringkasan = [
            'total' => PersediaanBmn::count(),
            'stok_menipis' => PersediaanBmn::whereColumn('stok', '<=', 'stok_minimum')->count(),
            'kedaluwarsa' => PersediaanBmn::whereNotNull('tanggal_kedaluwarsa')
                ->whereDate('tanggal_kedaluwarsa', '<=', $batasKedaluwarsa)->count(),
        ];

        return response()->json([
            'data' => $items->map(fn ($i) => $this->serializeItem($i)),
            'ringkasan' => $ringkasan,
            'can_manage' => $this->isPengelola($request->user()),
        ]);
    }

    /** Daftar item reagen/test-kit yang mendekati / lewat kedaluwarsa. */
    public function kedaluwarsa()
    {
        $batas = Carbon::today()->addMonths(6);
        $items = PersediaanBmn::whereNotNull('tanggal_kedaluwarsa')
            ->whereDate('tanggal_kedaluwarsa', '<=', $batas)
            ->orderBy('tanggal_kedaluwarsa')
            ->get();

        return response()->json(['data' => $items->map(fn ($i) => $this->serializeItem($i))]);
    }

    private function serializeItem(PersediaanBmn $i): array
    {
        $exp = $i->tanggal_kedaluwarsa;
        $today = Carbon::today();
        $sisaHari = $exp ? $today->diffInDays($exp, false) : null;
        // "Segera kedaluwarsa" = tanggal kedaluwarsa berada dalam 6 bulan ke depan.
        $batas6bulan = $today->copy()->addMonths(6);
        $status = $exp === null
            ? null
            : ($exp->lt($today) ? 'kadaluarsa' : ($exp->lte($batas6bulan) ? 'mendekati' : 'aman'));

        return [
            'id' => $i->id,
            'nama' => $i->nama,
            'kategori' => $i->kategori,
            'kelompok' => $i->kelompok,
            'satuan' => $i->satuan,
            'lokasi' => $i->lokasi,
            'stok' => $i->stok,
            'stok_minimum' => $i->stok_minimum,
            'menipis' => $i->stok <= $i->stok_minimum,
            'tanggal_kedaluwarsa' => $exp?->toDateString(),
            'sisa_hari_kedaluwarsa' => $sisaHari === null ? null : (int) $sisaHari,
            'status_kedaluwarsa' => $status,
            'keterangan' => $i->keterangan,
        ];
    }

    public function simpanItem(Request $request)
    {
        abort_unless($this->isPengelola($request->user()), 403, 'Hanya pengelola BMN.');
        $data = $this->validateItem($request);
        $item = PersediaanBmn::create($data);
        AuditLog::catat($request->user()->id, 'persediaan.tambah', 'tata_usaha', "Menambah persediaan {$item->nama}.");

        return response()->json(['data' => $this->serializeItem($item), 'message' => 'Persediaan ditambahkan.'], 201);
    }

    public function updateItem(Request $request, PersediaanBmn $persediaan)
    {
        abort_unless($this->isPengelola($request->user()), 403, 'Hanya pengelola BMN.');
        $persediaan->update($this->validateItem($request));

        return response()->json(['data' => $this->serializeItem($persediaan->fresh()), 'message' => 'Persediaan diperbarui.']);
    }

    public function hapusItem(Request $request, PersediaanBmn $persediaan)
    {
        abort_unless($this->isPengelola($request->user()), 403, 'Hanya pengelola BMN.');
        $persediaan->delete();

        return response()->json(['message' => 'Persediaan dihapus.']);
    }

    private function validateItem(Request $request): array
    {
        return $request->validate([
            'nama' => ['required', 'string', 'max:190'],
            'kategori' => ['required', Rule::in(self::KATEGORI)],
            'kelompok' => ['required', Rule::in(['atk', 'psd'])],
            'satuan' => ['required', 'string', 'max:30'],
            'lokasi' => ['nullable', 'string', 'max:120'],
            'stok' => ['required', 'integer', 'min:0'],
            'stok_minimum' => ['nullable', 'integer', 'min:0'],
            'tanggal_kedaluwarsa' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string', 'max:500'],
        ]);
    }

    /** Pegawai mengajukan permintaan persediaan (satu atau beberapa item). */
    public function ajukan(Request $request, NotifikasiService $notif)
    {
        $data = $request->validate([
            'keperluan' => ['required', 'string', 'min:5', 'max:500'],
            'ketua_tim_id' => ['required', 'integer', Rule::exists('users', 'id')->where('is_ketua_tim', true)],
            'items' => ['required', 'array', 'min:1'],
            'items.*.nama' => ['required', 'string', 'max:190'],
            'items.*.jumlah' => ['required', 'integer', 'min:1'],
            'items.*.satuan' => ['required', 'string', 'max:30'],
        ]);

        $u = $request->user();
        $items = array_map(fn ($it) => [
            'nama' => $it['nama'],
            'jumlah' => (int) $it['jumlah'],
            'jumlah_disetujui' => (int) $it['jumlah'],
            'satuan' => $it['satuan'],
            'ditolak' => false,
            'keterangan' => null,
        ], $data['items']);

        $kelompok = $this->tentukanKelompok($items);
        [$nomor, $urut] = $this->generateNomor();

        $permintaan = PermintaanPersediaan::create([
            'nomor' => $nomor,
            'kelompok' => $kelompok,
            'nomor_urut' => $urut,
            'user_id' => $u->id,
            'ketua_tim_id' => (int) $data['ketua_tim_id'],
            'unit_kerja' => 'Balai POM di Jember',
            'items' => $items,
            'keperluan' => $data['keperluan'],
            'status' => 'diajukan',
        ]);
        AuditLog::catat($u->id, 'persediaan.ajukan', 'tata_usaha', "Permintaan persediaan {$permintaan->nomor} diajukan.");
        // Notifikasi langsung ke Ketua Tim yang dipilih pemohon.
        $notif->kirim([(int) $data['ketua_tim_id']],
            'Permintaan Persediaan Baru',
            "{$u->name} mengajukan permintaan persediaan {$permintaan->nomor} — menunggu persetujuan Ketua Tim.",
            '/persediaan-bmn');

        return response()->json(['data' => $this->serializePermintaan($permintaan->load($this->rel())), 'message' => 'Permintaan diajukan.'], 201);
    }

    /** Daftar permintaan: pegawai lihat miliknya, pimpinan/pengelola lihat semua. */
    public function daftarPermintaan(Request $request)
    {
        $user = $request->user();
        $q = PermintaanPersediaan::with($this->rel())->orderByDesc('created_at');
        // Pimpinan/Kasubag & Pengelola Gudang melihat semua; Ketua Tim melihat
        // miliknya + yang ditugaskan kepadanya; pegawai lain hanya miliknya.
        if (! $this->isPimpinan($user) && ! $user->is_pengelola_gudang) {
            $q->where(function ($w) use ($user) {
                $w->where('user_id', $user->id)->orWhere('ketua_tim_id', $user->id);
            });
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }

        return response()->json(['data' => $q->get()->map(fn ($p) => $this->serializePermintaan($p))]);
    }

    /**
     * Persetujuan berjenjang & tanda tangan:
     * diajukan → (Ketua Tim/Fungsi) → (Kasubag TU) → (Kepala Balai) → disetujui.
     * Penolakan di tahap manapun mengembalikan ke pemohon (status ditolak) untuk revisi.
     */
    public function putuskan(Request $request, PermintaanPersediaan $permintaan, NotifikasiService $notif)
    {
        $data = $request->validate([
            'aksi' => ['required', Rule::in(['setujui', 'tolak'])],
            'alasan' => ['nullable', 'string', 'max:500'],
            'keputusan' => ['nullable', 'array'],
            'keputusan.*.jumlah_disetujui' => ['nullable', 'integer', 'min:0'],
            'keputusan.*.ditolak' => ['nullable', 'boolean'],
            'keputusan.*.keterangan' => ['nullable', 'string', 'max:190'],
        ]);
        $user = $request->user();
        $isSuper = $user->hasRole('superadmin');
        $isKasubag = $user->hasRole('kepala_subag_tu') || $isSuper;  // Kasubag TU = Bu Puji
        $isGudang = (bool) $user->is_pengelola_gudang || $isSuper;   // Pengelola Gudang = Yulia
        // Ketua Tim = penyetuju tahap-1 yang dipilih pemohon (fallback ke Kasubag untuk data lama).
        $isKatim = ($permintaan->ketua_tim_id
            ? $user->id === $permintaan->ketua_tim_id
            : $isKasubag) || $isSuper;

        // Alur: Pegawai → Ketua Tim → Kasubag TU → Pengelola Gudang (TTD terakhir).
        $eligible = match ($permintaan->status) {
            'diajukan' => $isKatim,
            'disetujui_katim' => $isKasubag,
            'disetujui_kasubag' => $isGudang,
            default => false,
        };

        if (in_array($permintaan->status, ['disetujui', 'ditolak'], true)) {
            return response()->json(['message' => 'Permintaan ini sudah final.'], 422);
        }

        if ($data['aksi'] === 'tolak') {
            abort_unless($eligible, 403, 'Anda tidak berwenang pada tahap ini.');
            $permintaan->update(['status' => 'ditolak', 'alasan_tolak' => $data['alasan'] ?? 'Tidak disetujui.']);
            $notif->kirim([$permintaan->user_id], 'Permintaan Persediaan Ditolak',
                "Permintaan {$permintaan->nomor} ditolak. Silakan perbaiki & ajukan ulang.", '/persediaan-bmn');

            return response()->json(['data' => $this->serializePermintaan($permintaan->fresh()->load($this->rel())), 'message' => 'Permintaan ditolak & dikembalikan ke pemohon.']);
        }

        // Keputusan per-item (acc sebagian / tolak sebagian) — opsional, diterapkan tiap tahap setuju.
        $extra = [];
        if (! empty($data['keputusan'])) {
            $extra['items'] = $this->applyKeputusan($permintaan->items, $data['keputusan']);
        }
        $gudangIds = User::where('is_pengelola_gudang', true)->pluck('id')->all();

        // Tahap 1 — Ketua Tim / Fungsi (dipilih pemohon) — dengan TTD
        if ($permintaan->status === 'diajukan') {
            abort_unless($isKatim, 403, 'Menunggu persetujuan Ketua Tim/Fungsi.');
            $permintaan->update(array_merge(['status' => 'disetujui_katim', 'approved_katim_by' => $user->id, 'approved_katim_at' => now()], $extra));
            $notif->kirimKeRole(['kepala_subag_tu', 'superadmin'], 'Persetujuan Persediaan',
                "Permintaan {$permintaan->nomor} menunggu persetujuan Kasubag TU.", '/persediaan-bmn');

            return response()->json(['data' => $this->serializePermintaan($permintaan->fresh()->load($this->rel())), 'message' => 'Disetujui Ketua Tim, menunggu Kasubag TU.']);
        }

        // Tahap 2 — Kasubag TU (Bu Puji) — dengan TTD
        if ($permintaan->status === 'disetujui_katim') {
            abort_unless($isKasubag, 403, 'Menunggu persetujuan Kasubag TU.');
            $permintaan->update(array_merge(['status' => 'disetujui_kasubag', 'approved_kasubag_by' => $user->id, 'approved_kasubag_at' => now()], $extra));
            $notif->kirim($gudangIds, 'Persetujuan Persediaan',
                "Permintaan {$permintaan->nomor} menunggu persetujuan Pengelola Gudang.", '/persediaan-bmn');

            return response()->json(['data' => $this->serializePermintaan($permintaan->fresh()->load($this->rel())), 'message' => 'Disetujui Kasubag TU, menunggu Pengelola Gudang.']);
        }

        // Tahap 3 — Pengelola Gudang (Yulia) — TTD terakhir → final; stok dikurangi FIFO.
        abort_unless($isGudang, 403, 'Menunggu persetujuan Pengelola Gudang.');
        $permintaan->update(array_merge(['status' => 'disetujui', 'approved_gudang_by' => $user->id, 'approved_gudang_at' => now()], $extra));
        $this->kurangiStokFifo($permintaan->fresh(), $user);
        $notif->kirim([$permintaan->user_id], 'Permintaan Persediaan Disetujui',
            "Permintaan {$permintaan->nomor} disetujui Pengelola Gudang. SBBK dapat dicetak.", '/persediaan-bmn');

        return response()->json(['data' => $this->serializePermintaan($permintaan->fresh()->load($this->rel())), 'message' => 'Permintaan disetujui Pengelola Gudang. SBBK dapat dicetak.']);
    }

    /**
     * Mengurangi stok katalog dengan metode FIFO saat permintaan final:
     * konsumsi lot masuk tertua lebih dulu, catat tiap potongan ke persediaan_keluar.
     */
    private function kurangiStokFifo(PermintaanPersediaan $permintaan, User $user): void
    {
        foreach ($permintaan->items as $it) {
            if (! empty($it['ditolak'])) {
                continue;
            }
            $qty = (int) ($it['jumlah_disetujui'] ?? $it['jumlah'] ?? 0);
            if ($qty <= 0) {
                continue;
            }
            $item = PersediaanBmn::where('nama', $it['nama'])->first();
            if (! $item) {
                continue; // item bebas-teks tanpa katalog → tidak melacak stok.
            }
            $sisaPerlu = $qty;
            $lots = PersediaanMasuk::where('persediaan_id', $item->id)
                ->where('sisa', '>', 0)
                ->orderBy('tanggal')->orderBy('id')->get();
            foreach ($lots as $lot) {
                if ($sisaPerlu <= 0) {
                    break;
                }
                $ambil = min($lot->sisa, $sisaPerlu);
                $lot->decrement('sisa', $ambil);
                PersediaanKeluar::create([
                    'persediaan_id' => $item->id,
                    'masuk_id' => $lot->id,
                    'permintaan_id' => $permintaan->id,
                    'jumlah' => $ambil,
                    'tanggal' => now()->toDateString(),
                    'lokasi' => $lot->lokasi ?? $item->lokasi,
                    'keterangan' => "Permintaan {$permintaan->nomor}",
                    'user_id' => $user->id,
                ]);
                $sisaPerlu -= $ambil;
            }
            // Bila stok lot tak mencukupi, tetap catat sisa kebutuhan tanpa lot (stok bisa minus dicegah).
            if ($sisaPerlu > 0) {
                PersediaanKeluar::create([
                    'persediaan_id' => $item->id,
                    'masuk_id' => null,
                    'permintaan_id' => $permintaan->id,
                    'jumlah' => $sisaPerlu,
                    'tanggal' => now()->toDateString(),
                    'lokasi' => $item->lokasi,
                    'keterangan' => "Permintaan {$permintaan->nomor} (stok lot kurang)",
                    'user_id' => $user->id,
                ]);
            }
            $item->decrement('stok', min($qty, max($item->stok, 0)));
        }
    }

    /** Terapkan keputusan per-item (acc sebagian / tolak sebagian) ke daftar item. */
    private function applyKeputusan(array $items, array $keputusan): array
    {
        foreach ($items as $i => &$it) {
            if (! isset($keputusan[$i])) {
                continue;
            }
            $k = $keputusan[$i];
            $ditolak = (bool) ($k['ditolak'] ?? false);
            $it['ditolak'] = $ditolak;
            $it['jumlah_disetujui'] = $ditolak ? 0 : (int) ($k['jumlah_disetujui'] ?? ($it['jumlah'] ?? 0));
            $it['keterangan'] = $k['keterangan'] ?? ($ditolak ? 'Ditolak' : null);
        }

        return $items;
    }

    /** Pemohon merevisi permintaan yang ditolak lalu mengajukan ulang (dengan justifikasi). */
    public function ajukanUlang(Request $request, PermintaanPersediaan $permintaan)
    {
        abort_unless($permintaan->user_id === $request->user()->id, 403);
        if ($permintaan->status !== 'ditolak') {
            return response()->json(['message' => 'Hanya permintaan yang ditolak yang bisa diajukan ulang.'], 422);
        }
        $data = $request->validate([
            'justifikasi' => ['required', 'string', 'min:5', 'max:500'],
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.nama' => ['required_with:items', 'string', 'max:190'],
            'items.*.jumlah' => ['required_with:items', 'integer', 'min:1'],
            'items.*.satuan' => ['required_with:items', 'string', 'max:30'],
        ]);

        $update = [
            'status' => 'diajukan',
            'justifikasi' => $data['justifikasi'],
            'alasan_tolak' => null,
            'approved_katim_by' => null, 'approved_katim_at' => null,
            'approved_gudang_by' => null, 'approved_gudang_at' => null,
            'approved_kasubag_by' => null, 'approved_kasubag_at' => null,
            'approved_kabalai_by' => null, 'approved_kabalai_at' => null,
        ];
        if (! empty($data['items'])) {
            $update['items'] = array_map(fn ($it) => [
                'nama' => $it['nama'], 'jumlah' => (int) $it['jumlah'],
                'jumlah_disetujui' => (int) $it['jumlah'], 'satuan' => $it['satuan'],
            ], $data['items']);
        }
        $permintaan->update($update);

        return response()->json(['data' => $this->serializePermintaan($permintaan->fresh()->load($this->rel())), 'message' => 'Permintaan diajukan ulang.']);
    }

    /** SPB — Surat Permintaan Barang. TTD: Pengelola Gudang (Kasubag) & Kepala Balai. */
    public function spb(Request $request, PermintaanPersediaan $permintaan)
    {
        $this->authorizeCetak($request, $permintaan);
        $permintaan->load($this->rel());
        $qr = [
            'gudang' => $this->qrDataUri($permintaan->gudangApprover),
            'katim' => $this->qrDataUri($permintaan->katimApprover),
        ];
        $pdf = Pdf::loadView('pdf.spb', ['p' => $permintaan, 'qr' => $qr, 'logo' => $this->logoDataUri()]);

        return $pdf->download('SPB-'.str_replace('/', '-', $permintaan->nomor).'.pdf');
    }

    /** SBBK — Surat Bukti Barang Keluar. TTD: Yang Menerima (pemohon) & Pengelola Gudang. */
    public function sbbk(Request $request, PermintaanPersediaan $permintaan)
    {
        $this->authorizeCetak($request, $permintaan);
        if ($permintaan->status !== 'disetujui') {
            return response()->json(['message' => 'SBBK hanya untuk permintaan yang sudah disetujui penuh.'], 422);
        }
        $permintaan->load($this->rel());
        $qr = [
            'pemohon' => $this->qrDataUri($permintaan->user),
            'gudang' => $this->qrDataUri($permintaan->gudangApprover),
        ];
        $pdf = Pdf::loadView('pdf.sbbk', ['p' => $permintaan, 'qr' => $qr, 'logo' => $this->logoDataUri()]);

        return $pdf->download('SBBK-'.str_replace('/', '-', $permintaan->nomor).'.pdf');
    }

    private function logoDataUri(): ?string
    {
        $path = resource_path('views/pdf/badanpom.png');
        if (! is_file($path)) {
            return null;
        }

        return 'data:image/png;base64,'.base64_encode(file_get_contents($path));
    }

    /** QR tanda tangan (data URI SVG) untuk seorang penandatangan, bila terdaftar & aktif. */
    private function qrDataUri(?User $u): ?string
    {
        if (! $u) {
            return null;
        }
        $ttd = TandaTangan::where('user_id', $u->id)->where('is_active', true)->first();
        if (! $ttd) {
            return null;
        }
        $url = rtrim(config('app.url'), '/').'/ttd/'.$ttd->kode;
        $svg = QrCode::format('svg')->size(64)->margin(0)->generate($url);

        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    private function authorizeCetak(Request $request, PermintaanPersediaan $permintaan): void
    {
        $user = $request->user();
        $boleh = $this->isPimpinan($user)
            || $permintaan->user_id === $user->id
            || $permintaan->ketua_tim_id === $user->id
            || (bool) $user->is_pengelola_gudang;
        abort_unless($boleh, 403);
    }

    private function rel(): array
    {
        return ['user:id,name,nip_nik', 'ketuaTim:id,name,fungsi_ketua_tim', 'katimApprover:id,name,nip_nik', 'gudangApprover:id,name,nip_nik', 'kasubagApprover:id,name,nip_nik', 'kabalaiApprover:id,name,nip_nik'];
    }

    /** Daftar Ketua Tim per fungsi untuk dipilih pemohon. */
    public function ketuaTim()
    {
        $list = User::where('is_ketua_tim', true)->orderBy('fungsi_ketua_tim')->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'fungsi' => $u->fungsi_ketua_tim,
                'fungsi_label' => self::FUNGSI_LABEL[$u->fungsi_ketua_tim] ?? $u->fungsi_ketua_tim,
            ]);

        return response()->json(['data' => $list]);
    }

    private const FUNGSI_LABEL = [
        'tata_usaha' => 'Tata Usaha',
        'infokom' => 'Informasi & Komunikasi',
        'pemeriksaan' => 'Pemeriksaan',
        'penindakan' => 'Penindakan',
        'pengujian' => 'Pengujian',
    ];

    /** ATK bila SEMUA item tergolong ATK; selain itu PSD. */
    private function tentukanKelompok(array $items): string
    {
        $names = array_column($items, 'nama');
        $map = PersediaanBmn::whereIn('nama', $names)->pluck('kelompok', 'nama');
        foreach ($items as $it) {
            if (($map[$it['nama']] ?? 'psd') !== 'atk') {
                return 'psd';
            }
        }

        return 'atk';
    }

    // ===================== Transaksi Masuk (pembelian / transfer masuk) =====================

    /** Catat barang masuk (pembelian atau transfer masuk) → menambah stok & membuat lot FIFO. */
    public function transaksiMasuk(Request $request)
    {
        abort_unless($this->isPengelola($request->user()), 403, 'Hanya pengelola gudang.');
        $data = $request->validate([
            'persediaan_id' => ['required', 'integer', Rule::exists('persediaan_bmn', 'id')],
            'jenis' => ['required', Rule::in(['pembelian', 'transfer_masuk'])],
            'jumlah' => ['required', 'integer', 'min:1'],
            'tanggal' => ['required', 'date'],
            'lokasi' => ['nullable', 'string', 'max:120'],
            'sumber' => ['nullable', 'string', 'max:190'],
            'keterangan' => ['nullable', 'string', 'max:500'],
        ]);
        $item = PersediaanBmn::findOrFail($data['persediaan_id']);

        $masuk = PersediaanMasuk::create([
            'persediaan_id' => $item->id,
            'jenis' => $data['jenis'],
            'jumlah' => (int) $data['jumlah'],
            'sisa' => (int) $data['jumlah'],
            'lokasi' => $data['lokasi'] ?? $item->lokasi,
            'tanggal' => $data['tanggal'],
            'sumber' => $data['sumber'] ?? null,
            'keterangan' => $data['keterangan'] ?? null,
            'user_id' => $request->user()->id,
        ]);
        $item->increment('stok', (int) $data['jumlah']);
        if (! empty($data['lokasi']) && ! $item->lokasi) {
            $item->update(['lokasi' => $data['lokasi']]);
        }
        AuditLog::catat($request->user()->id, 'persediaan.masuk', 'tata_usaha',
            "Barang masuk {$data['jumlah']} {$item->satuan} {$item->nama} ({$data['jenis']}).");

        return response()->json(['data' => $this->serializeMasuk($masuk->load('item')), 'message' => 'Transaksi masuk dicatat.'], 201);
    }

    /** Riwayat transaksi masuk (pembelian / transfer masuk) dengan filter. */
    public function daftarMasuk(Request $request)
    {
        abort_unless($this->isPengelola($request->user()), 403, 'Hanya pengelola gudang.');
        $q = PersediaanMasuk::with(['item:id,nama,satuan', 'user:id,name'])->orderByDesc('tanggal')->orderByDesc('id');
        if ($jenis = $request->query('jenis')) {
            $q->where('jenis', $jenis);
        }
        if ($pid = $request->query('persediaan_id')) {
            $q->where('persediaan_id', $pid);
        }
        if ($dari = $request->query('dari')) {
            $q->whereDate('tanggal', '>=', $dari);
        }
        if ($sampai = $request->query('sampai')) {
            $q->whereDate('tanggal', '<=', $sampai);
        }
        if ($search = trim((string) $request->query('q', ''))) {
            $q->whereHas('item', fn ($w) => $w->where('nama', 'like', "%{$search}%"));
        }

        return response()->json([
            'data' => $q->limit(500)->get()->map(fn ($m) => $this->serializeMasuk($m)),
            'can_manage' => $this->isPengelola($request->user()),
        ]);
    }

    /** Stock opname: stok terkini + riwayat barang keluar (FIFO, urut tanggal). */
    public function stockOpname(Request $request)
    {
        abort_unless($this->isPengelola($request->user()), 403, 'Hanya pengelola gudang.');
        // Ringkasan stok terkini per item.
        $stok = PersediaanBmn::orderBy('nama')->get()->map(fn ($i) => $this->serializeItem($i));

        // Barang keluar — FIFO: diurutkan berdasarkan tanggal keluar tertua lebih dulu.
        $q = PersediaanKeluar::with(['item:id,nama,satuan', 'masuk:id,tanggal,jenis', 'user:id,name'])
            ->orderBy('tanggal')->orderBy('id');
        if ($pid = $request->query('persediaan_id')) {
            $q->where('persediaan_id', $pid);
        }
        if ($dari = $request->query('dari')) {
            $q->whereDate('tanggal', '>=', $dari);
        }
        if ($sampai = $request->query('sampai')) {
            $q->whereDate('tanggal', '<=', $sampai);
        }
        if ($lokasi = $request->query('lokasi')) {
            $q->where('lokasi', 'like', "%{$lokasi}%");
        }
        if ($search = trim((string) $request->query('q', ''))) {
            $q->whereHas('item', fn ($w) => $w->where('nama', 'like', "%{$search}%"));
        }

        return response()->json([
            'stok' => $stok,
            'keluar' => $q->limit(500)->get()->map(fn ($k) => $this->serializeKeluar($k)),
            'can_manage' => $this->isPengelola($request->user()),
        ]);
    }

    /** Unduh template Excel impor persediaan masuk. */
    public function templateMasuk(PersediaanExcelService $svc)
    {
        return $svc->template();
    }

    /** Impor massal persediaan masuk dari Excel (upsert item + tambah stok + lot FIFO). */
    public function importMasuk(Request $request, PersediaanExcelService $svc)
    {
        abort_unless($this->isPengelola($request->user()), 403, 'Hanya pengelola gudang.');
        $request->validate(['file' => ['required', 'file', 'max:5120']]);
        try {
            $hasil = $svc->import($request->file('file'), $request->user()->id);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'File tidak dapat dibaca. Pastikan format Excel (.xlsx) sesuai template.'], 422);
        }
        AuditLog::catat($request->user()->id, 'persediaan.import', 'tata_usaha',
            "Impor persediaan masuk: {$hasil['berhasil']} berhasil, {$hasil['gagal']} gagal.");

        return response()->json(['message' => "Impor selesai: {$hasil['berhasil']} barang masuk dicatat.".($hasil['gagal'] ? " {$hasil['gagal']} baris dilewati." : ''), ...$hasil]);
    }

    private function serializeMasuk(PersediaanMasuk $m): array
    {
        return [
            'id' => $m->id,
            'persediaan_id' => $m->persediaan_id,
            'nama' => $m->item?->nama,
            'satuan' => $m->item?->satuan,
            'jenis' => $m->jenis,
            'jenis_label' => $m->jenis === 'pembelian' ? 'Pembelian' : 'Transfer Masuk',
            'jumlah' => $m->jumlah,
            'sisa' => $m->sisa,
            'lokasi' => $m->lokasi,
            'tanggal' => $m->tanggal?->toDateString(),
            'sumber' => $m->sumber,
            'keterangan' => $m->keterangan,
            'petugas' => $m->user?->name,
        ];
    }

    private function serializeKeluar(PersediaanKeluar $k): array
    {
        return [
            'id' => $k->id,
            'nama' => $k->item?->nama,
            'satuan' => $k->item?->satuan,
            'jumlah' => $k->jumlah,
            'tanggal' => $k->tanggal?->toDateString(),
            'lokasi' => $k->lokasi,
            'keterangan' => $k->keterangan,
            'lot_tanggal' => $k->masuk?->tanggal?->toDateString(),
            'lot_jenis' => $k->masuk?->jenis,
            'petugas' => $k->user?->name,
        ];
    }

    private const ROMAWI = [1 => 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

    /**
     * Nomor tunggal: 001/Persediaan/VII/2026 — urut lintas seluruh permintaan,
     * reset tiap tahun, bulan dalam angka Romawi (standar surat dinas).
     */
    private function generateNomor(): array
    {
        $now = now();
        $year = $now->year;
        $urut = ((int) PermintaanPersediaan::whereYear('created_at', $year)->max('nomor_urut')) + 1;
        $bulan = self::ROMAWI[$now->month];
        $nomor = sprintf('%03d/Persediaan/%s/%d', $urut, $bulan, $year);

        return [$nomor, $urut];
    }

    private function serializePermintaan(PermintaanPersediaan $p): array
    {
        return [
            'id' => $p->id,
            'nomor' => $p->nomor,
            'kelompok' => $p->kelompok,
            'user' => $p->relationLoaded('user') && $p->user ? ['id' => $p->user->id, 'name' => $p->user->name] : null,
            'ketua_tim' => $p->ketuaTim?->name,
            'ketua_tim_id' => $p->ketua_tim_id,
            'ketua_tim_fungsi' => $p->ketuaTim ? (self::FUNGSI_LABEL[$p->ketuaTim->fungsi_ketua_tim] ?? $p->ketuaTim->fungsi_ketua_tim) : null,
            'items' => $p->items,
            'keperluan' => $p->keperluan,
            'unit_kerja' => $p->unit_kerja,
            'status' => $p->status,
            'alasan_tolak' => $p->alasan_tolak,
            'justifikasi' => $p->justifikasi,
            'approved_katim' => $p->katimApprover?->name,
            'approved_gudang' => $p->gudangApprover?->name,
            'approved_kasubag' => $p->kasubagApprover?->name,
            'approved_katim_id' => $p->approved_katim_by,
            'approved_gudang_id' => $p->approved_gudang_by,
            'approved_kasubag_id' => $p->approved_kasubag_by,
            'created_at' => $p->created_at?->toIso8601String(),
        ];
    }
}
