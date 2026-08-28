#!/usr/bin/env python3
"""Bangun dokumen Rencana Kebutuhan Khusus modul SI PANDU AI (PDF).

Hasilnya sudah disertakan pada docs/Rencana-Kebutuhan-Khusus-SI-PANDU-AI.pdf.
Skrip ini disimpan agar dokumen dapat dibangun ulang ketika modulnya berubah,
sehingga isi dokumen tidak pernah menyimpang jauh dari kode yang berjalan.

Pemakaian:
    pip install reportlab
    python3 scripts/buat-dokumen-srs-pandu.py docs/Rencana-Kebutuhan-Khusus-SI-PANDU-AI.pdf

Berkas huruf yang dipakai adalah Liberation (metrik setara Arial/Times) yang
tersedia pada sebagian besar distribusi Linux melalui paket fonts-liberation.
"""

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, KeepTogether, NextPageTemplate, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

# ── Identitas visual ────────────────────────────────────────────────────────

TINTA = colors.HexColor("#12203A")
AKSEN = colors.HexColor("#15915A")
REDUP = colors.HexColor("#5A6478")
GARIS = colors.HexColor("#DCE1E9")
HALUS = colors.HexColor("#F4F7FA")
PUTIH = colors.white

LIB = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Serif", LIB + "LiberationSerif-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Serif-B", LIB + "LiberationSerif-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Serif-I", LIB + "LiberationSerif-Italic.ttf"))
pdfmetrics.registerFont(TTFont("Sans", LIB + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Sans-B", LIB + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Sans-I", LIB + "LiberationSans-Italic.ttf"))
pdfmetrics.registerFont(TTFont("Mono", LIB + "LiberationMono-Regular.ttf"))

MARGIN_X = 2.5 * cm
MARGIN_ATAS = 2.3 * cm
MARGIN_BAWAH = 2.2 * cm
LEBAR_ISI = A4[0] - 2 * MARGIN_X

JUDUL_DOK = "Rencana Kebutuhan Khusus — SI PANDU AI"
VERSI = "1.0"
TANGGAL = "28 Agustus 2026"

# ── Gaya ────────────────────────────────────────────────────────────────────

S = {
    "eyebrow": ParagraphStyle(
        "eyebrow", fontName="Sans-B", fontSize=7.2, leading=10,
        textColor=AKSEN, spaceAfter=5,
    ),
    "sampul_judul": ParagraphStyle(
        "sampul_judul", fontName="Serif-B", fontSize=30, leading=35,
        textColor=TINTA, spaceAfter=8,
    ),
    "sampul_sub": ParagraphStyle(
        "sampul_sub", fontName="Serif", fontSize=13.5, leading=19,
        textColor=REDUP,
    ),
    "bab_no": ParagraphStyle(
        "bab_no", fontName="Sans-B", fontSize=7.5, leading=10,
        textColor=AKSEN, spaceAfter=4,
    ),
    "bab": ParagraphStyle(
        "bab", fontName="Serif-B", fontSize=17.5, leading=22,
        textColor=TINTA, spaceAfter=3,
    ),
    "h2": ParagraphStyle(
        "h2", fontName="Sans-B", fontSize=10.5, leading=14,
        textColor=TINTA, spaceBefore=13, spaceAfter=5,
    ),
    "h3": ParagraphStyle(
        "h3", fontName="Sans-B", fontSize=9, leading=12,
        textColor=REDUP, spaceBefore=9, spaceAfter=3,
    ),
    "body": ParagraphStyle(
        "body", fontName="Sans", fontSize=9.2, leading=14.1,
        textColor=TINTA, alignment=TA_JUSTIFY, spaceAfter=5.5,
    ),
    "body_redup": ParagraphStyle(
        "body_redup", fontName="Sans", fontSize=8.6, leading=13.4,
        textColor=REDUP, alignment=TA_JUSTIFY, spaceAfter=5,
    ),
    "poin": ParagraphStyle(
        "poin", fontName="Sans", fontSize=9.2, leading=14.0,
        textColor=TINTA, leftIndent=11, bulletIndent=1, spaceAfter=3.2,
    ),
    "sel": ParagraphStyle(
        "sel", fontName="Sans", fontSize=8.4, leading=12.4, textColor=TINTA,
    ),
    "sel_redup": ParagraphStyle(
        "sel_redup", fontName="Sans", fontSize=8.4, leading=12.4, textColor=REDUP,
    ),
    "sel_b": ParagraphStyle(
        "sel_b", fontName="Sans-B", fontSize=8.4, leading=12.4, textColor=TINTA,
    ),
    "sel_kepala": ParagraphStyle(
        "sel_kepala", fontName="Sans-B", fontSize=7.2, leading=10, textColor=REDUP,
    ),
    "mono": ParagraphStyle(
        "mono", fontName="Mono", fontSize=7.8, leading=11.6, textColor=TINTA,
    ),
    "kode_id": ParagraphStyle(
        "kode_id", fontName="Sans-B", fontSize=8, leading=11, textColor=AKSEN,
    ),
    "catatan": ParagraphStyle(
        "catatan", fontName="Sans", fontSize=8.4, leading=13.2,
        textColor=TINTA, alignment=TA_JUSTIFY,
    ),
    "isi_bab": ParagraphStyle(
        "isi_bab", fontName="Sans-B", fontSize=9, leading=15, textColor=TINTA,
    ),
    "isi_sub": ParagraphStyle(
        "isi_sub", fontName="Sans", fontSize=8.6, leading=14.4, textColor=REDUP,
    ),
}


def sp(t):
    """Huruf besar berjarak — dipakai untuk label kecil.

    Spasi antar kata dilebarkan sendiri; bila hanya disisipkan satu spasi
    seperti antar huruf, batas katanya hilang sama sekali saat dirender.
    """
    return "&nbsp;&nbsp;".join(" ".join(k.upper()) for k in t.split())


# ── Blok penyusun ───────────────────────────────────────────────────────────

def garis(warna=GARIS, tebal=0.6, atas=4, bawah=8):
    t = Table([[""]], colWidths=[LEBAR_ISI], rowHeights=[0.1])
    t.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, 0), tebal, warna),
        ("TOPPADDING", (0, 0), (-1, -1), atas),
        ("BOTTOMPADDING", (0, 0), (-1, -1), bawah),
    ]))
    return t


def bab(nomor, judul, ringkas=None):
    isi = [
        Paragraph(sp(f"Bab {nomor}"), S["bab_no"]),
        Paragraph(judul, S["bab"]),
        garis(AKSEN, 1.1, 3, 10),
    ]
    if ringkas:
        isi.append(Paragraph(ringkas, S["body_redup"]))
        isi.append(Spacer(1, 3))
    return KeepTogether(isi)


def h2(teks):
    return KeepTogether([Paragraph(teks, S["h2"]), garis(GARIS, 0.5, 1, 6)])


def poin(items, gaya="poin"):
    return [Paragraph(t, S[gaya], bulletText="—") for t in items]


def tabel(kepala, baris, lebar, gaya_sel=None, zebra=True):
    """Tabel bergaris mendatar saja — tanpa kotak, sesuai gaya dokumen."""
    data = [[Paragraph(sp(k), S["sel_kepala"]) for k in kepala]]
    for r in baris:
        data.append([
            c if not isinstance(c, str) else Paragraph(c, S[(gaya_sel or ["sel"] * len(kepala))[i]])
            for i, c in enumerate(r)
        ])

    t = Table(data, colWidths=lebar, repeatRows=1)
    perintah = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.7, TINTA),
        ("LINEBELOW", (0, 1), (-1, -2), 0.4, GARIS),
        ("LINEBELOW", (0, -1), (-1, -1), 0.7, GARIS),
        ("TOPPADDING", (0, 0), (-1, -1), 4.6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.6),
        ("LEFTPADDING", (0, 0), (0, -1), 0),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 0),
        ("LEFTPADDING", (1, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-2, -1), 7),
    ]
    if zebra:
        for i in range(2, len(data), 2):
            perintah.append(("BACKGROUND", (0, i), (-1, i), HALUS))
    t.setStyle(TableStyle(perintah))
    return t


def kartu(kode, judul, medan):
    """Kartu kebutuhan: kode + judul, lalu daftar medan berpasangan."""
    kepala = Table(
        [[Paragraph(kode, S["kode_id"]), Paragraph(judul, S["sel_b"])]],
        colWidths=[2.1 * cm, LEBAR_ISI - 2.1 * cm - 0.9 * cm],
    )
    kepala.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))

    baris = [[Paragraph(k, S["sel_kepala"]), Paragraph(v, S["sel"])] for k, v in medan]
    isi = Table(baris, colWidths=[2.1 * cm, LEBAR_ISI - 2.1 * cm - 0.9 * cm])
    isi.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 2.6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.6),
    ]))

    luar = Table([[kepala], [isi]], colWidths=[LEBAR_ISI])
    luar.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (0, 0), 9),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 9),
        ("TOPPADDING", (0, 1), (-1, 1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
        ("LINEBEFORE", (0, 0), (0, -1), 1.6, AKSEN),
        ("BACKGROUND", (0, 0), (-1, -1), HALUS),
    ]))
    return KeepTogether([luar, Spacer(1, 7)])


def catatan(judul, teks):
    t = Table(
        [[Paragraph(sp(judul), S["eyebrow"])], [Paragraph(teks, S["catatan"])]],
        colWidths=[LEBAR_ISI],
    )
    t.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (0, 0), 10),
        ("BOTTOMPADDING", (0, 0), (0, 0), 0),
        ("TOPPADDING", (0, 1), (0, 1), 0),
        ("BOTTOMPADDING", (0, 1), (0, 1), 11),
        ("LINEBEFORE", (0, 0), (0, -1), 1.6, TINTA),
        ("BACKGROUND", (0, 0), (-1, -1), HALUS),
    ]))
    return KeepTogether([Spacer(1, 3), t, Spacer(1, 9)])


# ── Kanvas halaman ──────────────────────────────────────────────────────────

def halaman_sampul(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(AKSEN)
    canvas.setLineWidth(2.4)
    canvas.line(MARGIN_X, A4[1] - MARGIN_ATAS + 6, MARGIN_X + 3.4 * cm, A4[1] - MARGIN_ATAS + 6)
    canvas.setStrokeColor(GARIS)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN_X, MARGIN_BAWAH - 6, A4[0] - MARGIN_X, MARGIN_BAWAH - 6)
    canvas.setFont("Sans", 7.4)
    canvas.setFillColor(REDUP)
    canvas.drawString(MARGIN_X, MARGIN_BAWAH - 18, "Balai Pengawas Obat dan Makanan di Jember")
    canvas.drawRightString(A4[0] - MARGIN_X, MARGIN_BAWAH - 18, f"Versi {VERSI} · {TANGGAL}")
    canvas.restoreState()


def halaman_isi(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(GARIS)
    canvas.setLineWidth(0.5)
    y = MARGIN_BAWAH - 10
    canvas.line(MARGIN_X, y, A4[0] - MARGIN_X, y)
    canvas.setFont("Sans", 7.2)
    canvas.setFillColor(REDUP)
    canvas.drawString(MARGIN_X, y - 12, JUDUL_DOK)
    canvas.setFont("Sans-B", 7.8)
    canvas.setFillColor(TINTA)
    canvas.drawRightString(A4[0] - MARGIN_X, y - 12, f"{doc.page - 1:02d}")
    canvas.restoreState()


# ── Isi dokumen ─────────────────────────────────────────────────────────────

def sampul():
    return [
        Spacer(1, 3.0 * cm),
        Paragraph(sp("Dokumen Rekayasa Perangkat Lunak"), S["eyebrow"]),
        Spacer(1, 4),
        Paragraph("Rencana Kebutuhan Khusus", S["sampul_judul"]),
        Paragraph(
            "Modul <b>SI PANDU AI</b> — Asisten Pintar Pelaku Usaha<br/>"
            "pada Sistem LENTERA Balai POM di Jember",
            S["sampul_sub"],
        ),
        Spacer(1, 1.5 * cm),
        garis(GARIS, 0.6, 0, 14),
        tabel(
            ["Butir", "Keterangan"],
            [
                ["Nama modul", "SI PANDU AI — Asisten Pintar Pelaku Usaha"],
                ["Sistem induk", "LENTERA — Layanan Elektronik Terpadu &amp; Terintegrasi"],
                ["Unit pemilik", "Balai Pengawas Obat dan Makanan di Jember"],
                ["Wilayah kerja", "Jember, Banyuwangi, Bondowoso, Situbondo, Lumajang"],
                ["Versi dokumen", f"{VERSI} ({TANGGAL})"],
                ["Status", "Terimplementasi — dokumen menjelaskan sistem yang sudah berjalan"],
                ["Basis pengetahuan", "knowledge.json versi 1.0 — 34 topik, 33 FAQ, 14 elemen label"],
            ],
            [4.2 * cm, LEBAR_ISI - 4.2 * cm],
            ["sel_b", "sel"],
            zebra=False,
        ),
        Spacer(1, 1.1 * cm),
        catatan(
            "Sifat dokumen",
            "Dokumen ini menguraikan kebutuhan dan rancang bangun modul SI PANDU AI sebagaimana "
            "telah diimplementasikan, bukan usulan yang belum dikerjakan. Seluruh angka, nama "
            "berkas, tabel basis data, dan titik akhir API yang disebut di dalamnya diambil dari "
            "kode sumber yang berjalan. Bagian yang belum terpasang dinyatakan secara terbuka pada "
            "Bab 8 sebagai rencana lanjutan.",
        ),
        NextPageTemplate("isi"),
        PageBreak(),
    ]


def daftar_isi():
    baris = [
        ("1", "Pendahuluan", "Latar belakang · Tujuan · Ruang lingkup · Definisi"),
        ("2", "Deskripsi Umum", "Perspektif modul · Karakteristik pengguna · Batasan · Asumsi"),
        ("3", "Kebutuhan Fungsional", "Sebelas kebutuhan, KF-01 sampai KF-11"),
        ("4", "Kebutuhan Non-Fungsional", "Keamanan · Kinerja · Keterpakaian · Etika"),
        ("5", "Rancang Bangun", "Arsitektur · Teknologi · Data · Antarmuka API"),
        ("6", "Pagar Pengaman Jawaban", "Lingkup · Ambang keyakinan · Eskalasi · Penyangkalan"),
        ("7", "Pengujian dan Kriteria Penerimaan", "Skenario uji · Kriteria lulus"),
        ("8", "Rencana Lanjutan dan Risiko", "Integrasi model bahasa · Daftar risiko"),
        ("L", "Lampiran", "Titik akhir API · Skema tabel · Glosarium"),
    ]
    isi = [
        Paragraph(sp("Isi Dokumen"), S["eyebrow"]),
        Paragraph("Daftar Isi", S["bab"]),
        garis(AKSEN, 1.1, 3, 12),
    ]
    data = [[
        Paragraph(n, S["kode_id"]),
        Paragraph(j, S["isi_bab"]),
        Paragraph(k, S["isi_sub"]),
    ] for n, j, k in baris]

    t = Table(data, colWidths=[1.1 * cm, 5.4 * cm, LEBAR_ISI - 6.5 * cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, -1), 0),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, GARIS),
    ]))
    isi.append(t)
    isi.append(PageBreak())
    return isi


def bab1():
    return [
        bab("1", "Pendahuluan"),

        h2("1.1 Latar Belakang"),
        Paragraph(
            "Pelaku usaha mikro dan kecil di wilayah kerja Balai POM di Jember kerap terhambat pada "
            "tahap paling awal: tidak mengetahui jalur layanan yang relevan bagi produknya, informasi "
            "apa yang perlu disiapkan, dan bagaimana membaca kelengkapan label. Pertanyaan seperti ini "
            "berulang setiap hari dan sebagian besar bersifat edukatif — tidak memerlukan keputusan "
            "petugas, tetapi tetap memakan waktu layanan.",
            S["body"],
        ),
        Paragraph(
            "SI PANDU AI hadir sebagai lapisan bantu mandiri: pelaku usaha memperoleh penjelasan awal "
            "kapan saja, sementara petugas tetap menjadi satu-satunya sumber keputusan resmi. Modul ini "
            "sengaja dirancang agar tidak pernah menggantikan kewenangan itu.",
            S["body"],
        ),

        h2("1.2 Tujuan Dokumen"),
        *poin([
            "Menetapkan kebutuhan fungsional dan non-fungsional modul SI PANDU AI secara terukur.",
            "Menguraikan rancang bangun modul: arsitektur, struktur data, dan antarmuka layanan.",
            "Menjadi acuan pengujian penerimaan serta acuan pemeliharaan bagi pengembang berikutnya.",
            "Merekam batas kemampuan modul secara terbuka, termasuk apa yang sengaja tidak dikerjakannya.",
        ]),

        h2("1.3 Ruang Lingkup"),
        Paragraph(
            "Modul mencakup sebelas fungsi yang dapat diakses pengguna terautentikasi: konsultasi tanya "
            "jawab, cek produk, cek label, rencana desain label, bantuan penyusunan CAPA, pustaka "
            "regulasi, FAQ, kanal kontak resmi, riwayat interaksi, profil usaha, dan beranda modul.",
            S["body"],
        ),
        Paragraph(
            "<b>Di luar lingkup.</b> Modul tidak menerbitkan izin, tidak memutuskan status permohonan, "
            "tidak menetapkan sanksi, tidak menyunting berkas desain pengguna secara otomatis, dan tidak "
            "menghasilkan logo sertifikasi maupun nomor sertifikat.",
            S["body"],
        ),

        h2("1.4 Definisi dan Akronim"),
        tabel(
            ["Istilah", "Penjelasan"],
            [
                ["SRS", "Software Requirements Specification — spesifikasi kebutuhan perangkat lunak."],
                ["CAPA", "Corrective and Preventive Action — tindakan perbaikan dan pencegahan atas suatu temuan."],
                ["NIB", "Nomor Induk Berusaha — identitas legalitas usaha."],
                ["Basis pengetahuan", "Berkas terkurasi berisi topik, FAQ, dan elemen label yang menjadi sumber jawaban modul."],
                ["Eskalasi", "Pengalihan pertanyaan kepada petugas ketika modul tidak memiliki dasar untuk menjawab."],
                ["Pagar pengaman", "Aturan yang membatasi apa yang boleh dan tidak boleh dijawab modul."],
            ],
            [3.6 * cm, LEBAR_ISI - 3.6 * cm],
            ["sel_b", "sel"],
        ),

        h2("1.5 Referensi Sumber Resmi"),
        Paragraph(
            "Modul mengarahkan pengguna ke kanal berikut untuk verifikasi dan keputusan resmi: "
            "JDIH Badan POM (jdih.pom.go.id), laman Badan POM (pom.go.id), laman Balai POM di Jember "
            "(jember.pom.go.id), dan Cek BPOM (cekbpom.pom.go.id).",
            S["body"],
        ),
        PageBreak(),
    ]


def bab2():
    return [
        bab("2", "Deskripsi Umum"),

        h2("2.1 Perspektif Modul"),
        Paragraph(
            "SI PANDU AI adalah modul di dalam sistem LENTERA, bukan aplikasi berdiri sendiri. Modul "
            "memakai autentikasi, tata letak, dan kebijakan keamanan sistem induk; seluruh titik akhirnya "
            "berada di bawah prefiks <font name='Mono' size='8'>/api/pandu</font> dan dilindungi Sanctum.",
            S["body"],
        ),
        Paragraph(
            "Antarmukanya berupa satu halaman dengan navigasi kartu — tanpa bilah samping tersendiri — "
            "agar pelaku usaha yang jarang memakai aplikasi pemerintahan tidak perlu mempelajari struktur menu baru.",
            S["body"],
        ),

        h2("2.2 Karakteristik Pengguna"),
        tabel(
            ["Pengguna", "Kebutuhan Utama", "Tingkat Kemahiran"],
            [
                ["Pelaku usaha mikro/kecil", "Penjelasan awal yang mudah dipahami, tanpa istilah teknis berlebihan", "Rendah — sering baru pertama berurusan dengan regulasi"],
                ["Pendamping UMKM", "Bahan pendampingan terstruktur yang dapat disalin", "Menengah"],
                ["Petugas Balai POM", "Gambaran pertanyaan yang sering muncul dan riwayat interaksi", "Tinggi"],
            ],
            [4.0 * cm, 6.2 * cm, LEBAR_ISI - 10.2 * cm],
            ["sel_b", "sel", "sel_redup"],
        ),

        h2("2.3 Fungsi Utama"),
        *poin([
            "<b>Konsultasi.</b> Tanya jawab berbasis pengetahuan terkurasi, dengan pagar lingkup.",
            "<b>Asesmen mandiri.</b> Cek Produk dan Cek Label — penilaian awal beserta skor kelengkapan.",
            "<b>Bantuan penyusunan.</b> Draf CAPA dan denah tata letak label.",
            "<b>Pustaka dan kanal.</b> Regulasi menurut kategori, FAQ, serta kontak resmi.",
            "<b>Kesinambungan.</b> Riwayat interaksi dan profil usaha tersimpan per pengguna.",
        ]),

        # Dua subbab penutup dijaga menyatu: bila dibiarkan mengalir, tabel
        # batasan menyisakan satu baris sendirian di halaman berikutnya.
        KeepTogether([
            h2("2.4 Asumsi dan Ketergantungan"),
            *poin([
                "Pengguna telah memiliki akun LENTERA yang aktif dan terverifikasi.",
                "Basis pengetahuan dipelihara unit teknis; ketepatan isinya tanggung jawab pemilik proses, bukan sistem.",
                "Model bahasa pihak ketiga belum terpasang; seluruh jawaban bersumber dari basis pengetahuan.",
                "Ketersediaan modul mengikuti ketersediaan sistem LENTERA, basis data, dan Redis-nya.",
            ]),
            h2("2.5 Batasan Rancangan"),
            tabel(
                ["Kode", "Batasan"],
                [
                    ["BT-01", "Modul tidak menyampaikan nomor peraturan, tarif, tenggat, atau sanksi yang tidak dapat dipastikan."],
                    ["BT-02", "Modul tidak menghasilkan gambar hasil suntingan atas karya pengguna; yang dihasilkan adalah rencana dan denah."],
                    ["BT-03", "Modul tidak membuat logo sertifikasi maupun nomor sertifikat dalam bentuk apa pun."],
                    ["BT-04", "Seluruh keluaran wajib disertai penyangkalan bahwa ia bukan keputusan resmi BPOM."],
                    ["BT-05", "Unggahan berkas dibatasi pada berkas gambar JPG, JPEG, PNG, atau WEBP berukuran maksimal 5 MB."],
                    ["BT-06", "Antarmuka dan seluruh keluaran modul menggunakan Bahasa Indonesia."],
                ],
                [2.0 * cm, LEBAR_ISI - 2.0 * cm],
                ["kode_id", "sel"],
            ),
        ]),
        PageBreak(),
    ]


def bab3():
    kf = [
        ("KF-01", "Konsultasi BPOM", [
            ("Deskripsi", "Pengguna mengajukan pertanyaan; modul menjawab dari basis pengetahuan terkurasi."),
            ("Masukan", "Teks pertanyaan 3–1.000 karakter."),
            ("Proses", "Uji lingkup, pencarian berbobot pada 34 topik dan 33 FAQ, penilaian keyakinan terhadap ambang 6,0."),
            ("Keluaran", "Ringkasan, poin, langkah, dokumen terkait, penanda perlu petugas, penyangkalan."),
            ("Kriteria", "Pertanyaan di luar lingkup ditolak dengan sopan; jawaban tidak pernah memuat nomor peraturan yang tidak ada pada basis pengetahuan."),
        ]),
        ("KF-02", "Cek Produk", [
            ("Deskripsi", "Penilaian awal kesiapan produk sebelum mengajukan layanan resmi."),
            ("Masukan", "Sepuluh medan: nama, jenis, kategori, komposisi, cara produksi, lokasi, status produksi, NIB, status izin, status peredaran."),
            ("Proses", "Pemilahan medan terisi dan kosong, pemetaan jalur layanan menurut kategori, penyusunan dokumen dan langkah."),
            ("Keluaran", "Skor Kesiapan 0–100, tingkat, tindakan prioritas, daftar dokumen, langkah berikutnya."),
            ("Kriteria", "Skor dinyatakan sebagai kelengkapan isian, bukan kelayakan produk; kondisi sudah beredar tanpa izin memunculkan arahan konsultasi."),
        ]),
        ("KF-03", "Cek Label", [
            ("Deskripsi", "Peninjauan kelengkapan informasi pada desain label secara swa-periksa."),
            ("Masukan", "Berkas gambar label, kategori dan nama produk, jawaban swa-periksa atas 14 elemen label."),
            ("Proses", "Penilaian berbobot — enam elemen inti berbobot penuh — ditambah catatan desain dari sifat gambar yang terukur."),
            ("Keluaran", "Skor kelengkapan, status tiap elemen beserta penjelasan dan saran, catatan keterbacaan."),
            ("Kriteria", "Modul tidak menyatakan label memenuhi atau melanggar ketentuan; ia hanya menunjukkan kelengkapan."),
        ]),
        ("KF-04", "Edit Label", [
            ("Deskripsi", "Penyusunan rencana perubahan desain beserta denah tata letak."),
            ("Masukan", "Berkas gambar label, instruksi perubahan, pernyataan kepemilikan aset resmi."),
            ("Proses", "Penerjemahan instruksi menjadi langkah desain, penapisan permintaan yang menyentuh informasi regulatori dan logo sertifikasi."),
            ("Keluaran", "Rencana perubahan, daftar yang dipertahankan, denah tujuh blok berikut porsi ruang dan penekanannya."),
            ("Kriteria", "Permintaan menambah logo sertifikasi tanpa aset resmi ditolak; denah dinyatakan sebagai kerangka, bukan hasil suntingan."),
        ]),
        ("KF-05", "Bantuan CAPA", [
            ("Deskripsi", "Penyusunan draf tindakan perbaikan dan pencegahan atas suatu temuan."),
            ("Masukan", "Temuan, kondisi aktual, bukti, penanggung jawab, target penyelesaian."),
            ("Proses", "Penawaran kemungkinan akar masalah, penyusunan tindakan korektif dan preventif, penyiapan format salin."),
            ("Keluaran", "Draf CAPA terstruktur yang dapat disalin ke dokumen pengguna."),
            ("Kriteria", "Akar masalah disampaikan sebagai kemungkinan untuk ditelaah, bukan vonis."),
        ]),
        ("KF-06", "Regulasi", [
            ("Deskripsi", "Pustaka topik regulasi menurut sepuluh kategori."),
            ("Masukan", "Kata kunci pencarian dan penyaring kategori."),
            ("Proses", "Penelusuran pada basis pengetahuan."),
            ("Keluaran", "Daftar topik beserta ringkasan, poin penting, dan penanda perlu verifikasi."),
            ("Kriteria", "Setiap topik yang memerlukan verifikasi ditandai jelas beserta tautan sumber resmi."),
        ]),
        ("KF-07", "FAQ", [
            ("Deskripsi", "Tiga puluh tiga pertanyaan yang paling sering diajukan pelaku usaha."),
            ("Masukan", "Kata kunci pencarian."),
            ("Proses", "Penelusuran teks dengan penundaan ketik."),
            ("Keluaran", "Pertanyaan dan jawaban terurai; sepuluh di antaranya diarahkan ke petugas."),
            ("Kriteria", "Jawaban yang menyentuh ketentuan formal selalu disertai arahan ke kanal resmi."),
        ]),
        ("KF-08", "Hubungi BPOM Jember", [
            ("Deskripsi", "Kanal kontak resmi Balai POM di Jember."),
            ("Masukan", "Tidak ada; opsional pertanyaan yang sedang dibahas."),
            ("Proses", "Pembacaan data kontak dari basis pengetahuan dan penyusunan tautan WhatsApp berisi pertanyaan."),
            ("Keluaran", "WhatsApp, telepon, surel, laman resmi, dan wilayah kerja."),
            ("Kriteria", "Kanal kontak tidak pernah dikarang; seluruhnya berasal dari basis pengetahuan."),
        ]),
        ("KF-09", "Riwayat", [
            ("Deskripsi", "Rekaman interaksi pengguna lintas perangkat."),
            ("Masukan", "Penyaring jenis interaksi."),
            ("Proses", "Pembacaan tabel riwayat milik pengguna yang sedang masuk."),
            ("Keluaran", "Daftar interaksi beserta masukan, hasil, dan berkas terkait."),
            ("Kriteria", "Pengguna hanya dapat membaca dan menghapus riwayatnya sendiri; berkas ikut terhapus."),
        ]),
        ("KF-10", "Profil Usaha", [
            ("Deskripsi", "Data usaha yang dipakai untuk memperkaya konteks asesmen."),
            ("Masukan", "Nama usaha, pemilik, jenis, lokasi, kabupaten, komoditas, NIB, status sertifikasi, produk."),
            ("Proses", "Penyimpanan satu profil per pengguna."),
            ("Keluaran", "Profil tersimpan dan dapat disunting kembali."),
            ("Kriteria", "Seluruh medan bersifat opsional; modul tetap berfungsi tanpa profil."),
        ]),
        ("KF-11", "Beranda Modul", [
            ("Deskripsi", "Halaman muka modul berisi kartu navigasi ke seluruh fungsi."),
            ("Masukan", "Tidak ada."),
            ("Proses", "Pemuatan data awal modul dalam satu permintaan."),
            ("Keluaran", "Sapaan maskot, kartu fungsi, dan penyangkalan."),
            ("Kriteria", "Seluruh fungsi terjangkau dari beranda tanpa bilah samping."),
        ]),
    ]

    isi = [
        bab("3", "Kebutuhan Fungsional",
            "Sebelas kebutuhan berikut menguraikan perilaku modul yang harus dipenuhi. "
            "Setiap kebutuhan mencantumkan kriteria penerimaan yang dapat diuji."),
    ]
    for kode, judul, medan in kf:
        isi.append(kartu(kode, judul, medan))
    isi.append(PageBreak())
    return isi


def bab4():
    knf = [
        ("KNF-01", "Keamanan &amp; Privasi", [
            "Seluruh titik akhir berada di balik autentikasi token Sanctum.",
            "Riwayat dan profil bersifat milik pengguna; tidak ada jalur baca lintas pengguna.",
            "Unggahan dibatasi jenis dan ukurannya, disimpan pada disk publik terpisah, dan ikut terhapus bersama riwayatnya.",
            "Alamat surel divalidasi tambahan untuk menolak karakter kendali.",
        ]),
        ("KNF-02", "Kinerja &amp; Batas Laju", [
            "Lima titik akhir berbiaya tinggi dibatasi 30 permintaan per menit per pengguna.",
            "Basis pengetahuan disimpan dalam cache selama 300 detik sehingga tidak dibaca dari disk pada setiap permintaan.",
            "Jawaban konsultasi disusun tanpa panggilan jaringan keluar, sehingga waktu tanggapnya ditentukan oleh basis data setempat.",
        ]),
        ("KNF-03", "Ketersediaan", [
            "Modul mengikuti ketersediaan sistem induk; tidak ada ketergantungan pada layanan pihak ketiga.",
            "Kegagalan pemuatan data awal ditangani dengan pesan yang jelas, bukan halaman kosong.",
        ]),
        ("KNF-04", "Keterpakaian", [
            "Antarmuka dirancang untuk layar ponsel lebih dulu; seluruh tabel lebar digulung di dalam wadahnya.",
            "Bahasa yang dipakai lugas dan menghindari istilah teknis yang tidak perlu.",
            "Setiap keadaan kosong, memuat, dan galat memiliki tampilan tersendiri.",
        ]),
        ("KNF-05", "Keterpeliharaan", [
            "Logika jawaban dipisahkan ke lapisan layanan tersendiri, terpisah dari pengendali HTTP.",
            "Basis pengetahuan berupa berkas data, sehingga isinya dapat diperbarui tanpa menyentuh kode.",
            "Lapisan layanan disiapkan sebagai titik sambung tunggal bila model bahasa dipasang kelak.",
        ]),
        ("KNF-06", "Etika &amp; Kepatuhan", [
            "Modul tidak pernah mengarang nomor peraturan, tarif, tenggat, kontak, atau nomor sertifikat.",
            "Ketidaktahuan dinyatakan apa adanya dan dialihkan kepada petugas.",
            "Setiap keluaran memuat penyangkalan bahwa ia bukan keputusan resmi BPOM.",
        ]),
        ("KNF-07", "Auditabilitas", [
            "Setiap interaksi tersimpan beserta masukan dan keluarannya, sehingga jawaban dapat ditelusuri kembali.",
            "Versi basis pengetahuan tercatat pada berkasnya sendiri.",
        ]),
    ]

    isi = [
        bab("4", "Kebutuhan Non-Fungsional",
            "Kebutuhan berikut menetapkan mutu modul di luar perilaku fungsionalnya."),
    ]
    for kode, judul, butir in knf:
        blok = [
            Table(
                [[Paragraph(kode, S["kode_id"]), Paragraph(judul, S["sel_b"])]],
                colWidths=[2.1 * cm, LEBAR_ISI - 2.1 * cm],
                style=TableStyle([
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]),
            ),
            *poin(butir),
            Spacer(1, 7),
        ]
        isi.append(KeepTogether(blok))
    isi.append(PageBreak())
    return isi


def bab5():
    return [
        bab("5", "Rancang Bangun"),

        h2("5.1 Arsitektur Lapisan"),
        tabel(
            ["Lapisan", "Isi", "Tanggung Jawab"],
            [
                ["Antarmuka", "Next.js App Router, React", "Navigasi kartu, formulir, penyajian hasil, keadaan memuat dan galat."],
                ["Layanan klien", "pandu-service.ts", "Satu-satunya jalur akses data; komponen tidak memanggil API langsung."],
                ["Pengendali", "PanduAiController", "Validasi masukan, pemanggilan layanan, penyimpanan riwayat."],
                ["Layanan domain", "PanduAiService, KnowledgeService, LabelAnalysisService, ImageEditService", "Seluruh logika penyusunan jawaban dan penilaian."],
                ["Sumber pengetahuan", "resources/pandu/knowledge.json", "Isi terkurasi; dibaca melalui cache 300 detik."],
                ["Penyimpanan", "MySQL, disk publik, Redis", "Riwayat, profil, berkas unggahan, dan cache."],
            ],
            [2.9 * cm, 4.6 * cm, LEBAR_ISI - 7.5 * cm],
            ["sel_b", "mono", "sel"],
        ),
        Spacer(1, 4),
        Paragraph(
            "Pemisahan ini disengaja: bila kelak modul disambungkan ke model bahasa, perubahan cukup "
            "dilakukan pada lapisan layanan domain. Pengendali, antarmuka, dan struktur data tidak perlu "
            "berubah, dan basis pengetahuan tetap dipakai sebagai konteks yang sudah terverifikasi.",
            S["body"],
        ),

        h2("5.2 Teknologi"),
        tabel(
            ["Komponen", "Teknologi"],
            [
                ["Antarmuka", "Next.js (App Router), React, TypeScript, Tailwind CSS"],
                ["Layanan aplikasi", "Laravel 11 di atas PHP 8.4"],
                ["Autentikasi", "Laravel Sanctum — token per perangkat"],
                ["Basis data", "MySQL 8.4"],
                ["Cache dan antrian", "Redis dengan klien PHP murni"],
                ["Penyajian berkas", "Disk publik Laravel melalui Caddy"],
            ],
            [4.4 * cm, LEBAR_ISI - 4.4 * cm],
            ["sel_b", "sel"],
        ),

        h2("5.3 Struktur Data"),
        Paragraph(
            "Modul menambahkan dua tabel. Keduanya terikat pada tabel pengguna dengan penghapusan "
            "berjenjang, sehingga data ikut terhapus bila akun dihapus.",
            S["body"],
        ),
        tabel(
            ["Tabel", "Kolom Utama", "Keterangan"],
            [
                ["pandu_riwayat", "user_id, jenis, judul, masukan, hasil, berkas_path", "Satu baris per interaksi. Kolom masukan dan hasil bertipe JSON sehingga bentuk keluaran dapat berkembang tanpa migrasi."],
                ["pandu_profil_usaha", "user_id (unik), nama_usaha, jenis_usaha, kabupaten, komoditas, nib, status_sertifikasi", "Satu profil per pengguna; seluruh medan opsional."],
            ],
            [3.4 * cm, 5.0 * cm, LEBAR_ISI - 8.4 * cm],
            ["mono", "mono", "sel"],
        ),

        h2("5.4 Alur Proses Konsultasi"),
        tabel(
            ["Tahap", "Tindakan", "Hasil bila gagal"],
            [
                ["1", "Validasi panjang pertanyaan (3–1.000 karakter).", "Ditolak dengan pesan validasi."],
                ["2", "Uji lingkup terhadap daftar kata kunci ranah Badan POM.", "Dijawab dengan pesan di luar lingkup; tidak disimpan ke riwayat."],
                ["3", "Pencarian berbobot pada topik dan FAQ.", "Lanjut ke tahap 4 dengan nilai rendah."],
                ["4", "Perbandingan nilai keyakinan terhadap ambang 6,0.", "Ditandai perlu petugas beserta tautan WhatsApp."],
                ["5", "Penyusunan jawaban dan penyangkalan.", "—"],
                ["6", "Penyimpanan ke riwayat bila pertanyaan berada dalam lingkup.", "—"],
            ],
            [1.5 * cm, 8.0 * cm, LEBAR_ISI - 9.5 * cm],
            ["kode_id", "sel", "sel_redup"],
        ),
        PageBreak(),
    ]


def bab6():
    return [
        bab("6", "Pagar Pengaman Jawaban",
            "Bab ini menetapkan aturan yang menjaga agar modul tidak menyampaikan sesuatu yang tidak "
            "dapat dipertanggungjawabkan. Aturan ini bersifat mengikat dan diuji tersendiri."),

        h2("6.1 Empat Lapis Penjagaan"),
        tabel(
            ["Lapis", "Mekanisme", "Perilaku"],
            [
                ["1", "Penjaga lingkup", "Pertanyaan di luar ranah Badan POM dijawab dengan penolakan sopan, bukan jawaban umum."],
                ["2", "Ambang keyakinan", "Nilai kecocokan di bawah 6,0 tidak dianggap cukup; jawaban ditandai perlu petugas."],
                ["3", "Penanda eskalasi", "Sepuluh entri yang menyentuh biaya, lama proses, sanksi, dan sejenisnya selalu diarahkan ke petugas."],
                ["4", "Penyangkalan", "Setiap keluaran memuat pernyataan bahwa ia bukan keputusan atau persetujuan resmi BPOM."],
            ],
            [1.4 * cm, 4.2 * cm, LEBAR_ISI - 5.6 * cm],
            ["kode_id", "sel_b", "sel"],
        ),

        h2("6.2 Yang Tidak Pernah Dilakukan Modul"),
        *poin([
            "Menyebut nomor peraturan, pasal, tarif, tenggat, atau sanksi yang tidak ada pada basis pengetahuan.",
            "Menyatakan suatu produk atau label memenuhi maupun melanggar ketentuan.",
            "Membuat logo sertifikasi, nomor sertifikat, atau nomor izin edar.",
            "Mengubah informasi wajib pada label pengguna tanpa peringatan.",
            "Menjawab dengan karangan ketika basis pengetahuannya tidak memuat jawaban.",
        ]),

        h2("6.3 Kanal Eskalasi"),
        Paragraph(
            "Ketika modul menyatakan tidak dapat menjawab, pengguna diarahkan ke kanal resmi Balai POM "
            "di Jember: WhatsApp, telepon, surel, dan laman resmi. Tautan WhatsApp disusun beserta "
            "pertanyaan yang sedang dibahas, sehingga petugas langsung memperoleh konteksnya.",
            S["body"],
        ),
        catatan(
            "Prinsip perancangan",
            "Modul dirancang dengan asumsi bahwa jawaban yang salah lebih merugikan daripada tidak ada "
            "jawaban. Karena itu setiap keraguan diselesaikan dengan mengalihkan pertanyaan kepada "
            "manusia, bukan dengan menebak.",
        ),
        PageBreak(),
    ]


def bab7():
    return [
        bab("7", "Pengujian dan Kriteria Penerimaan"),

        h2("7.1 Skenario Uji Wajib"),
        tabel(
            ["Kode", "Skenario", "Kriteria Lulus"],
            [
                ["UJ-01", "Pertanyaan dalam lingkup, tersedia pada basis pengetahuan.", "Jawaban tersusun; tidak ditandai perlu petugas."],
                ["UJ-02", "Pertanyaan di luar ranah Badan POM.", "Ditolak sopan; tidak tersimpan ke riwayat."],
                ["UJ-03", "Pertanyaan menyangkut biaya, lama proses, atau sanksi.", "Ditandai perlu petugas beserta tautan kontak."],
                ["UJ-04", "Cek Produk dengan satu medan terisi.", "Skor rendah; tindakan prioritas menunjuk medan yang paling mendasar."],
                ["UJ-05", "Cek Produk lengkap namun beredar tanpa izin.", "Tindakan prioritas berupa arahan konsultasi."],
                ["UJ-06", "Unggah berkas bukan gambar atau melebihi 5 MB.", "Ditolak dengan pesan yang menjelaskan sebabnya."],
                ["UJ-07", "Instruksi edit meminta penambahan logo sertifikasi tanpa aset resmi.", "Permintaan ditolak dan alasannya dijelaskan."],
                ["UJ-08", "Permintaan melebihi 30 kali dalam satu menit.", "Dibatasi oleh pembatas laju."],
                ["UJ-09", "Pengguna lain mencoba membaca riwayat orang lain.", "Ditolak; tidak ada data yang bocor."],
                ["UJ-10", "Penghapusan riwayat yang memiliki berkas.", "Baris dan berkasnya terhapus bersama."],
            ],
            [1.7 * cm, 7.4 * cm, LEBAR_ISI - 9.1 * cm],
            ["kode_id", "sel", "sel_redup"],
        ),

        h2("7.2 Kriteria Penerimaan Modul"),
        *poin([
            "Seluruh skenario UJ-01 sampai UJ-10 lulus.",
            "Tidak ditemukan satu pun jawaban yang memuat nomor peraturan, tarif, atau kontak di luar basis pengetahuan.",
            "Seluruh halaman modul terbaca utuh pada layar selebar 360 piksel tanpa geser mendatar.",
            "Setiap keluaran memuat penyangkalan.",
            "Proses pembangunan antarmuka berhasil tanpa galat.",
        ]),
        PageBreak(),
    ]


def bab8():
    return [
        bab("8", "Rencana Lanjutan dan Risiko"),

        h2("8.1 Rencana Pengembangan"),
        tabel(
            ["Tahap", "Rencana", "Prasyarat"],
            [
                ["L-1", "Penyambungan model bahasa untuk pertanyaan yang belum tercakup basis pengetahuan.", "Kebijakan penggunaan, anggaran token, dan uji kepatuhan pagar pengaman."],
                ["L-2", "Pengeditan gambar label secara otomatis dengan mempertahankan informasi wajib.", "Layanan penyuntingan gambar dan uji keterjagaan informasi produk."],
                ["L-3", "Perluasan basis pengetahuan beserta tata kelola pemutakhirannya.", "Penunjukan pemilik isi dan siklus peninjauan berkala."],
                ["L-4", "Pelaporan pertanyaan yang sering gagal dijawab sebagai umpan balik perbaikan.", "Pengolahan riwayat secara agregat tanpa membuka identitas pengguna."],
            ],
            [1.5 * cm, 7.6 * cm, LEBAR_ISI - 9.1 * cm],
            ["kode_id", "sel", "sel_redup"],
        ),

        h2("8.2 Daftar Risiko"),
        tabel(
            ["Risiko", "Dampak", "Penanganan"],
            [
                ["Basis pengetahuan usang", "Jawaban menyesatkan meski sistem berjalan normal", "Versi tercatat pada berkas; peninjauan berkala oleh pemilik proses"],
                ["Pengguna menganggap jawaban sebagai keputusan resmi", "Kesalahan langkah oleh pelaku usaha", "Penyangkalan pada setiap keluaran dan eskalasi eksplisit"],
                ["Model bahasa mengarang bila kelak dipasang", "Hilangnya kepercayaan terhadap modul", "Basis pengetahuan dijadikan konteks wajib; pagar pengaman tetap berlaku"],
                ["Unggahan berkas disalahgunakan", "Beban penyimpanan dan risiko berkas berbahaya", "Batas jenis dan ukuran, pembatas laju, penghapusan bersama riwayat"],
            ],
            [4.0 * cm, 4.4 * cm, LEBAR_ISI - 8.4 * cm],
            ["sel_b", "sel_redup", "sel"],
        ),
        PageBreak(),
    ]


def lampiran():
    return [
        bab("L", "Lampiran"),

        h2("L.1 Titik Akhir API"),
        Paragraph(
            "Seluruh titik akhir berada di bawah autentikasi Sanctum. Lima titik akhir bertanda "
            "bintang dibatasi 30 permintaan per menit.",
            S["body_redup"],
        ),
        tabel(
            ["Metode", "Alamat", "Fungsi"],
            [
                ["GET", "/api/pandu/bootstrap", "Data awal modul"],
                ["POST", "/api/pandu/chat *", "Konsultasi tanya jawab"],
                ["POST", "/api/pandu/cek-produk *", "Asesmen kesiapan produk"],
                ["POST", "/api/pandu/cek-label *", "Peninjauan kelengkapan label"],
                ["POST", "/api/pandu/edit-label *", "Rencana perubahan dan denah tata letak"],
                ["POST", "/api/pandu/capa *", "Penyusunan draf CAPA"],
                ["GET", "/api/pandu/regulasi", "Pustaka topik regulasi"],
                ["GET", "/api/pandu/faq", "Pertanyaan yang sering diajukan"],
                ["GET", "/api/pandu/kontak", "Kanal resmi Balai POM di Jember"],
                ["GET", "/api/pandu/riwayat", "Riwayat interaksi pengguna"],
                ["DELETE", "/api/pandu/riwayat", "Penghapusan seluruh riwayat"],
                ["DELETE", "/api/pandu/riwayat/{id}", "Penghapusan satu riwayat"],
                ["GET", "/api/pandu/profil-usaha", "Pembacaan profil usaha"],
                ["PUT", "/api/pandu/profil-usaha", "Penyimpanan profil usaha"],
            ],
            [1.9 * cm, 6.2 * cm, LEBAR_ISI - 8.1 * cm],
            ["sel_b", "mono", "sel"],
        ),

        h2("L.2 Ringkasan Basis Pengetahuan"),
        tabel(
            ["Bagian", "Jumlah", "Keterangan"],
            [
                ["Topik", "34", "Materi utama termasuk sertifikasi, cara produksi yang baik, label, dan CAPA"],
                ["FAQ", "33", "Sepuluh di antaranya ditandai perlu petugas"],
                ["Elemen label", "14", "Enam berbobot inti pada penilaian kelengkapan"],
                ["Kategori regulasi", "10", "Pangan hingga layanan dan informasi"],
                ["Kanal kontak", "1", "WhatsApp, telepon, surel, dan laman resmi"],
                ["Wilayah kerja", "5", "Jember, Banyuwangi, Bondowoso, Situbondo, Lumajang"],
            ],
            [4.2 * cm, 1.8 * cm, LEBAR_ISI - 6.0 * cm],
            ["sel_b", "kode_id", "sel"],
        ),

        h2("L.3 Glosarium Keluaran"),
        tabel(
            ["Istilah", "Arti dalam modul ini"],
            [
                ["Skor Kesiapan", "Persentase kelengkapan isian formulir Cek Produk. Bukan penilaian kelayakan produk."],
                ["Denah tata letak", "Kerangka susunan blok informasi pada label. Bukan hasil suntingan atas desain pengguna."],
                ["Perlu petugas", "Penanda bahwa pertanyaan harus dikonfirmasi kepada petugas berwenang."],
                ["Perlu verifikasi", "Penanda pada topik regulasi yang kebenarannya harus dipastikan melalui kanal resmi."],
            ],
            [4.2 * cm, LEBAR_ISI - 4.2 * cm],
            ["sel_b", "sel"],
        ),

        Spacer(1, 1.1 * cm),
        garis(GARIS, 0.6, 0, 10),
        Paragraph(
            "Dokumen ini disusun berdasarkan kode sumber modul SI PANDU AI pada sistem LENTERA "
            f"Balai POM di Jember, versi {VERSI}, {TANGGAL}.",
            S["body_redup"],
        ),
    ]


def bangun(keluaran):
    dok = BaseDocTemplate(
        keluaran,
        pagesize=A4,
        leftMargin=MARGIN_X, rightMargin=MARGIN_X,
        topMargin=MARGIN_ATAS, bottomMargin=MARGIN_BAWAH,
        title="Rencana Kebutuhan Khusus — Modul SI PANDU AI",
        author="Balai POM di Jember",
        subject="Spesifikasi kebutuhan dan rancang bangun modul SI PANDU AI pada sistem LENTERA",
    )
    bingkai = Frame(
        MARGIN_X, MARGIN_BAWAH, LEBAR_ISI,
        A4[1] - MARGIN_ATAS - MARGIN_BAWAH, id="isi",
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )
    dok.addPageTemplates([
        PageTemplate(id="sampul", frames=[bingkai], onPage=halaman_sampul),
        PageTemplate(id="isi", frames=[bingkai], onPage=halaman_isi),
    ])

    cerita = []
    cerita += sampul()
    cerita += daftar_isi()
    cerita += bab1()
    cerita += bab2()
    cerita += bab3()
    cerita += bab4()
    cerita += bab5()
    cerita += bab6()
    cerita += bab7()
    cerita += bab8()
    cerita += lampiran()

    dok.build(cerita)
    print(f"selesai: {keluaran}")


if __name__ == "__main__":
    import sys
    bangun(sys.argv[1] if len(sys.argv) > 1 else "srs-si-pandu-ai.pdf")
