#!/usr/bin/env python3
"""Bangun dokumen Alur Sistem Modul Persediaan BMN (PDF berisi diagram).

Seluruh diagram digambar sebagai vektor langsung pada halaman PDF — bukan
gambar raster — sehingga tetap tajam pada perbesaran berapa pun dan teksnya
tetap dapat dicari.

Isi diagram mengikuti kode yang berjalan: PersediaanBmnController,
PersediaanExcelService, migrasi tabel persediaan, serta berkas cetak SPB/SBBK.

Pemakaian:
    pip install reportlab
    python3 scripts/buat-dokumen-alur-persediaan.py docs/Alur-Sistem-Modul-Persediaan.pdf
"""

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, KeepTogether, NextPageTemplate,
    PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

# ── Identitas visual (sejalan dengan dokumen LENTERA lain) ──────────────────

TINTA = colors.HexColor("#12203A")
AKSEN = colors.HexColor("#15915A")
REDUP = colors.HexColor("#5A6478")
GARIS = colors.HexColor("#DCE1E9")
HALUS = colors.HexColor("#F4F7FA")
BIRU = colors.HexColor("#2C5596")
AMBAR = colors.HexColor("#B4761E")
MERAH = colors.HexColor("#C0484C")
PUTIH = colors.white

LIB = "/usr/share/fonts/truetype/liberation/"
for nama, berkas in [
    ("Serif", "LiberationSerif-Regular.ttf"), ("Serif-B", "LiberationSerif-Bold.ttf"),
    ("Sans", "LiberationSans-Regular.ttf"), ("Sans-B", "LiberationSans-Bold.ttf"),
    ("Sans-I", "LiberationSans-Italic.ttf"), ("Mono", "LiberationMono-Regular.ttf"),
]:
    pdfmetrics.registerFont(TTFont(nama, LIB + berkas))

MARGIN_X = 2.2 * cm
MARGIN_ATAS = 2.2 * cm
MARGIN_BAWAH = 2.1 * cm
LEBAR_ISI = A4[0] - 2 * MARGIN_X

JUDUL_DOK = "Alur Sistem — Modul Persediaan BMN"
VERSI = "1.0"
TANGGAL = "28 Agustus 2026"

# ── Gaya teks ───────────────────────────────────────────────────────────────

S = {
    "eyebrow": ParagraphStyle("eyebrow", fontName="Sans-B", fontSize=7.2, leading=10,
                              textColor=AKSEN, spaceAfter=5),
    "sampul_judul": ParagraphStyle("sampul_judul", fontName="Serif-B", fontSize=29, leading=34,
                                   textColor=TINTA, spaceAfter=8),
    "sampul_sub": ParagraphStyle("sampul_sub", fontName="Serif", fontSize=13, leading=18.5,
                                 textColor=REDUP),
    "bab_no": ParagraphStyle("bab_no", fontName="Sans-B", fontSize=7.5, leading=10,
                             textColor=AKSEN, spaceAfter=4),
    "bab": ParagraphStyle("bab", fontName="Serif-B", fontSize=17, leading=21,
                          textColor=TINTA, spaceAfter=3),
    "h2": ParagraphStyle("h2", fontName="Sans-B", fontSize=10.3, leading=14,
                         textColor=TINTA, spaceBefore=12, spaceAfter=5),
    "body": ParagraphStyle("body", fontName="Sans", fontSize=9.1, leading=14,
                           textColor=TINTA, alignment=TA_JUSTIFY, spaceAfter=5.5),
    "body_redup": ParagraphStyle("body_redup", fontName="Sans", fontSize=8.5, leading=13.2,
                                 textColor=REDUP, alignment=TA_JUSTIFY, spaceAfter=5),
    "poin": ParagraphStyle("poin", fontName="Sans", fontSize=9.1, leading=14,
                           textColor=TINTA, leftIndent=11, bulletIndent=1, spaceAfter=3.2),
    "sel": ParagraphStyle("sel", fontName="Sans", fontSize=8.2, leading=12.2, textColor=TINTA),
    "sel_redup": ParagraphStyle("sel_redup", fontName="Sans", fontSize=8.2, leading=12.2, textColor=REDUP),
    "sel_b": ParagraphStyle("sel_b", fontName="Sans-B", fontSize=8.2, leading=12.2, textColor=TINTA),
    "sel_kepala": ParagraphStyle("sel_kepala", fontName="Sans-B", fontSize=7, leading=9.6, textColor=REDUP),
    "mono": ParagraphStyle("mono", fontName="Mono", fontSize=7.6, leading=11.2, textColor=TINTA),
    "kode_id": ParagraphStyle("kode_id", fontName="Sans-B", fontSize=8, leading=11, textColor=AKSEN),
    "catatan": ParagraphStyle("catatan", fontName="Sans", fontSize=8.2, leading=13,
                              textColor=TINTA, alignment=TA_JUSTIFY),
    "keterangan": ParagraphStyle("keterangan", fontName="Sans", fontSize=8, leading=12.4,
                                 textColor=REDUP, alignment=TA_JUSTIFY, spaceBefore=4),
    "isi_bab": ParagraphStyle("isi_bab", fontName="Sans-B", fontSize=9, leading=15, textColor=TINTA),
    "isi_sub": ParagraphStyle("isi_sub", fontName="Sans", fontSize=8.5, leading=14.2, textColor=REDUP),
}


def sp(t):
    """Huruf besar berjarak; spasi antar kata dilebarkan agar batas kata terbaca."""
    return "&nbsp;&nbsp;".join(" ".join(k.upper()) for k in t.split())


# ── Blok teks ───────────────────────────────────────────────────────────────

def garis(warna=GARIS, tebal=0.6, atas=4, bawah=8):
    t = Table([[""]], colWidths=[LEBAR_ISI], rowHeights=[0.1])
    t.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, 0), tebal, warna),
        ("TOPPADDING", (0, 0), (-1, -1), atas),
        ("BOTTOMPADDING", (0, 0), (-1, -1), bawah),
    ]))
    return t


def bab(nomor, judul, ringkas=None):
    isi = [Paragraph(sp(f"Bagian {nomor}"), S["bab_no"]), Paragraph(judul, S["bab"]),
           garis(AKSEN, 1.1, 3, 10)]
    if ringkas:
        isi += [Paragraph(ringkas, S["body_redup"]), Spacer(1, 3)]
    return KeepTogether(isi)


def h2(teks):
    return KeepTogether([Paragraph(teks, S["h2"]), garis(GARIS, 0.5, 1, 6)])


def poin(items, gaya="poin"):
    return [Paragraph(t, S[gaya], bulletText="—") for t in items]


def tabel(kepala, baris, lebar, gaya_sel=None, zebra=True):
    data = [[Paragraph(sp(k), S["sel_kepala"]) for k in kepala]]
    for r in baris:
        data.append([c if not isinstance(c, str) else
                     Paragraph(c, S[(gaya_sel or ["sel"] * len(kepala))[i]])
                     for i, c in enumerate(r)])
    t = Table(data, colWidths=lebar, repeatRows=1)
    perintah = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.7, TINTA),
        ("LINEBELOW", (0, 1), (-1, -2), 0.4, GARIS),
        ("LINEBELOW", (0, -1), (-1, -1), 0.7, GARIS),
        ("TOPPADDING", (0, 0), (-1, -1), 4.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.4),
        ("LEFTPADDING", (0, 0), (0, -1), 0),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 0),
        ("LEFTPADDING", (1, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-2, -1), 6),
    ]
    if zebra:
        for i in range(2, len(data), 2):
            perintah.append(("BACKGROUND", (0, i), (-1, i), HALUS))
    t.setStyle(TableStyle(perintah))
    return t


def catatan(judul, teks, warna=TINTA):
    t = Table([[Paragraph(sp(judul), ParagraphStyle("j", parent=S["eyebrow"], textColor=warna))],
               [Paragraph(teks, S["catatan"])]], colWidths=[LEBAR_ISI])
    t.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 11), ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (0, 0), 9), ("BOTTOMPADDING", (0, 0), (0, 0), 0),
        ("TOPPADDING", (0, 1), (0, 1), 0), ("BOTTOMPADDING", (0, 1), (0, 1), 10),
        ("LINEBEFORE", (0, 0), (0, -1), 1.6, warna),
        ("BACKGROUND", (0, 0), (-1, -1), HALUS),
    ]))
    return KeepTogether([Spacer(1, 3), t, Spacer(1, 8)])


# ── Perkakas diagram ────────────────────────────────────────────────────────

def potong_teks(c, teks, font, ukuran, lebar_maks):
    """Bagi teks menjadi beberapa baris agar muat pada lebar tertentu."""
    kata = teks.split()
    baris, sekarang = [], ""
    for k in kata:
        coba = f"{sekarang} {k}".strip()
        if pdfmetrics.stringWidth(coba, font, ukuran) <= lebar_maks or not sekarang:
            sekarang = coba
        else:
            baris.append(sekarang)
            sekarang = k
    if sekarang:
        baris.append(sekarang)
    return baris


class Diagram(Flowable):
    """Kanvas gambar berukuran tetap; isinya digambar oleh fungsi `lukis`."""

    def __init__(self, lebar, tinggi, lukis):
        super().__init__()
        self.width = lebar
        self.height = tinggi
        self.lukis = lukis

    def draw(self):
        self.lukis(self.canv, self.width, self.height)


class G:
    """Primitif gambar. Koordinat memakai titik kiri-bawah kanvas flowable."""

    def __init__(self, c):
        self.c = c

    def kotak(self, x, y, w, h, teks, isi=PUTIH, tepi=TINTA, warna_teks=TINTA,
              font="Sans", ukuran=7.6, radius=5, tebal=0.9, tebal_kiri=None):
        c = self.c
        c.saveState()
        c.setFillColor(isi)
        c.setStrokeColor(tepi)
        c.setLineWidth(tebal)
        c.roundRect(x, y, w, h, radius, stroke=1, fill=1)
        if tebal_kiri:
            c.setStrokeColor(tebal_kiri)
            c.setLineWidth(2.4)
            c.line(x + 1.2, y + 3, x + 1.2, y + h - 3)
        c.setFillColor(warna_teks)
        c.setFont(font, ukuran)
        baris = potong_teks(c, teks, font, ukuran, w - 10)
        th = len(baris) * (ukuran + 2.2)
        ay = y + h / 2 + th / 2 - ukuran - 0.6
        for b in baris:
            c.drawCentredString(x + w / 2, ay, b)
            ay -= ukuran + 2.2
        c.restoreState()

    def label_atas(self, x, y, w, teks, warna=REDUP, ukuran=6.4):
        c = self.c
        c.saveState()
        c.setFillColor(warna)
        c.setFont("Sans-B", ukuran)
        c.drawCentredString(x + w / 2, y, teks)
        c.restoreState()

    def belah(self, cx, cy, w, h, teks, isi=colors.HexColor("#FFF6E6"), tepi=AMBAR):
        """Belah ketupat untuk percabangan keputusan."""
        c = self.c
        c.saveState()
        c.setFillColor(isi)
        c.setStrokeColor(tepi)
        c.setLineWidth(0.9)
        p = c.beginPath()
        p.moveTo(cx, cy + h / 2)
        p.lineTo(cx + w / 2, cy)
        p.lineTo(cx, cy - h / 2)
        p.lineTo(cx - w / 2, cy)
        p.close()
        c.drawPath(p, stroke=1, fill=1)
        c.setFillColor(TINTA)
        c.setFont("Sans-B", 7)
        baris = potong_teks(c, teks, "Sans-B", 7, w - 26)
        ay = cy + len(baris) * 4.6 - 6.6
        for b in baris:
            c.drawCentredString(cx, ay, b)
            ay -= 9.2
        c.restoreState()

    def silinder(self, x, y, w, h, teks, isi=colors.HexColor("#EEF3FA"), tepi=BIRU):
        """Lambang penyimpanan data."""
        c = self.c
        e = min(7, h / 5)
        c.saveState()
        c.setFillColor(isi)
        c.setStrokeColor(tepi)
        c.setLineWidth(0.9)
        c.rect(x, y + e, w, h - 2 * e, stroke=0, fill=1)
        c.ellipse(x, y + h - 2 * e, x + w, y + h, stroke=1, fill=1)
        c.ellipse(x, y, x + w, y + 2 * e, stroke=1, fill=1)
        c.line(x, y + e, x, y + h - e)
        c.line(x + w, y + e, x + w, y + h - e)
        c.setFillColor(TINTA)
        c.setFont("Mono", 6.2)
        baris = potong_teks(c, teks, "Mono", 6.2, w - 10)
        ay = y + h / 2 + len(baris) * 4.0 - 5.8
        for b in baris:
            c.drawCentredString(x + w / 2, ay, b)
            ay -= 8.0
        c.restoreState()

    def panah(self, x1, y1, x2, y2, teks=None, warna=REDUP, putus=False, lengkung=0):
        c = self.c
        c.saveState()
        c.setStrokeColor(warna)
        c.setFillColor(warna)
        c.setLineWidth(0.9)
        if putus:
            c.setDash(2.5, 2.2)
        if lengkung:
            p = c.beginPath()
            p.moveTo(x1, y1)
            p.curveTo(x1 + lengkung, y1, x2 + lengkung, y2, x2, y2)
            c.drawPath(p)
        else:
            c.line(x1, y1, x2, y2)
        c.setDash()
        # Mata panah
        import math
        sudut = math.atan2(y2 - y1, x2 - x1) if not lengkung else (0 if x2 > x1 else math.pi)
        pj, lb = 5.2, 2.6
        p = c.beginPath()
        p.moveTo(x2, y2)
        p.lineTo(x2 - pj * math.cos(sudut) + lb * math.sin(sudut),
                 y2 - pj * math.sin(sudut) - lb * math.cos(sudut))
        p.lineTo(x2 - pj * math.cos(sudut) - lb * math.sin(sudut),
                 y2 - pj * math.sin(sudut) + lb * math.cos(sudut))
        p.close()
        c.drawPath(p, stroke=0, fill=1)
        if teks:
            c.setFont("Sans-B", 6.2)
            c.setFillColor(warna)
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            lebar = pdfmetrics.stringWidth(teks, "Sans-B", 6.2)
            c.setFillColor(PUTIH)
            c.rect(mx - lebar / 2 - 2, my - 2.6, lebar + 4, 8, stroke=0, fill=1)
            c.setFillColor(warna)
            c.drawCentredString(mx, my, teks)
        c.restoreState()

    def lajur(self, x, y, w, h, judul, warna=BIRU):
        """Lajur (swimlane) beserta judul pelakunya."""
        c = self.c
        c.saveState()
        c.setFillColor(HALUS)
        c.setStrokeColor(GARIS)
        c.setLineWidth(0.5)
        c.rect(x, y, w, h, stroke=1, fill=1)
        c.setFillColor(warna)
        c.rect(x, y + h - 15, w, 15, stroke=0, fill=1)
        c.setFillColor(PUTIH)
        c.setFont("Sans-B", 6.8)
        c.drawCentredString(x + w / 2, y + h - 10.4, judul.upper())
        c.restoreState()

    def teks(self, x, y, t, font="Sans", ukuran=6.6, warna=REDUP, tengah=False):
        c = self.c
        c.saveState()
        c.setFillColor(warna)
        c.setFont(font, ukuran)
        (c.drawCentredString if tengah else c.drawString)(x, y, t)
        c.restoreState()


def bingkai_diagram(kode, judul, diagram, keterangan=None):
    """Diagram beserta nomor, judul, dan keterangan di bawahnya."""
    isi = [
        Table([[Paragraph(kode, S["kode_id"]), Paragraph(judul, S["sel_b"])]],
              colWidths=[1.6 * cm, LEBAR_ISI - 1.6 * cm],
              style=TableStyle([
                  ("VALIGN", (0, 0), (-1, -1), "TOP"),
                  ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                  ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
              ])),
        diagram,
    ]
    if keterangan:
        isi.append(Paragraph(keterangan, S["keterangan"]))
    isi.append(Spacer(1, 10))
    return KeepTogether(isi)


# ── Diagram 1 — Peta modul ──────────────────────────────────────────────────

def d1(c, W, H):
    g = G(c)
    kolom = 4
    jarak = 0.42 * cm
    kw = (W - (kolom - 1) * jarak) / kolom

    # Baris 1 — proses utama
    kh = 1.05 * cm
    y1 = H - kh - 12
    proses = ["1. Katalog Persediaan", "2. Transaksi Masuk", "3. Permintaan Barang", "4. Stock Opname"]
    g.teks(0, H - 7, "PROSES UTAMA", "Sans-B", 6.4, REDUP)
    px = []
    for i, judul in enumerate(proses):
        x = i * (kw + jarak)
        g.kotak(x, y1, kw, kh, judul, isi=PUTIH, tepi=TINTA, font="Sans-B", ukuran=7.6,
                tebal_kiri=AKSEN)
        px.append(x + kw / 2)

    # Baris 2 — tabel penyimpan
    sh = 0.92 * cm
    y2 = y1 - 1.42 * cm - sh
    g.teks(0, y2 + sh + 6, "TABEL PENYIMPAN", "Sans-B", 6.4, REDUP)
    tabel_db = ["persediaan_bmn", "persediaan_masuk", "permintaan_persediaan", "persediaan_keluar"]
    for i, nama in enumerate(tabel_db):
        g.silinder(i * (kw + jarak), y2, kw, sh, nama)
        g.panah(px[i], y1, px[i], y2 + sh)

    # Satu panah mendatar: permintaan final memotong stok lewat baris keluar.
    # Labelnya ditaruh di bawah, bukan di atas panah — jarak antar-silinder
    # terlalu sempit sehingga teks di atas panah menimpa nama tabel.
    gap_x = 2 * (kw + jarak) + kw + jarak / 2
    g.panah(2 * (kw + jarak) + kw, y2 + sh / 2, 3 * (kw + jarak), y2 + sh / 2, None, AMBAR)
    g.teks(gap_x, y2 - 10, "permintaan final memotong stok secara FIFO",
           "Sans-B", 6.2, AMBAR, tengah=True)

    # Baris 3 — keluaran
    oh = 0.92 * cm
    y3 = y2 - 1.42 * cm - oh
    g.teks(0, y3 + oh + 6, "KELUARAN", "Sans-B", 6.4, REDUP)
    keluaran = [
        ("Peringatan stok menipis & kedaluwarsa", AMBAR),
        ("Template & impor Excel", BIRU),
        ("SPB & SBBK — dokumen cetak ber-QR", AKSEN),
        ("Rekap stok terkini & riwayat keluar", BIRU),
    ]
    for i, (nama, warna) in enumerate(keluaran):
        g.kotak(i * (kw + jarak), y3, kw, oh, nama, isi=HALUS, tepi=warna, ukuran=6.8)
        g.panah(px[i], y2, px[i], y3 + oh)


# ── Diagram 2 — Alur permintaan (swimlane) ──────────────────────────────────

def d2(c, W, H):
    """Empat lajur pelaku. Kolom kiri = tindakan, tengah = keputusan, kanan = hasil.

    Jalur penolakan dikumpulkan pada satu koridor di tepi kanan supaya tidak
    memotong isi lajur, dan jalur maju digambar sebagai panah pendek antar-lajur
    pada sisi kiri.
    """
    g = G(c)
    n = 4
    sela = 8
    lh = (H - (n - 1) * sela) / n
    judul = [
        "PEMOHON — Pegawai ASN/PPPK",
        "KETUA TIM / FUNGSI — dipilih pemohon",
        "KASUBAG TATA USAHA",
        "PENGELOLA GUDANG — tanda tangan terakhir",
    ]
    warna_lajur = [BIRU, AKSEN, AKSEN, AKSEN]

    y = []
    for i in range(n):
        yy = H - (i + 1) * lh - i * sela
        y.append(yy)
        g.lajur(0, yy, W, lh, judul[i], warna_lajur[i])

    koridor = W - 0.5 * cm           # koridor merah: jalur penolakan
    koridor_hijau = W - 1.25 * cm    # koridor hijau: hasil akhir ke pemohon
    lebar_isi = koridor - 0.6 * cm
    kh = 0.74 * cm

    def baris(i):
        """Titik tengah vertikal area isi pada lajur ke-i."""
        return y[i] + (lh - 15) / 2 - kh / 2

    kw = 3.25 * cm
    x_a, x_b, x_c = 0.3 * cm, 4.15 * cm, 9.6 * cm

    # ── Lajur 1 — pemohon ──────────────────────────────────────────────
    yb = baris(0)
    g.kotak(x_a, yb, kw, kh, "Isi item, jumlah, satuan, keperluan, pilih Ketua Tim",
            isi=PUTIH, tepi=BIRU, ukuran=6.6)
    g.kotak(x_b, yb, kw, kh, "Nomor terbit: 001/Persediaan/VII/2026",
            isi=PUTIH, tepi=BIRU, ukuran=6.6)
    g.kotak(x_c, yb, kw, kh, "Terima notifikasi, cetak SPB & SBBK",
            isi=colors.HexColor("#E8F4EE"), tepi=AKSEN, ukuran=6.6)
    g.panah(x_a + kw, yb + kh / 2, x_b, yb + kh / 2)

    # ── Lajur 2–4 — para penyetuju ─────────────────────────────────────
    hasil = ["status → disetujui_katim", "status → disetujui_kasubag",
             "status → disetujui + potong stok FIFO"]
    for i in (1, 2, 3):
        yb = baris(i)
        g.kotak(x_a, yb, kw, kh, "Periksa daftar item, ubah jumlah atau tolak sebagian",
                isi=PUTIH, tepi=AKSEN, ukuran=6.6)
        g.belah(x_b + kw / 2, yb + kh / 2, 2.7 * cm, kh + 10, "Setuju?")
        g.panah(x_a + kw, yb + kh / 2, x_b + kw / 2 - 1.35 * cm, yb + kh / 2)
        g.kotak(x_c, yb, kw, kh, hasil[i - 1],
                isi=colors.HexColor("#E8F4EE") if i == 3 else PUTIH, tepi=AKSEN, ukuran=6.6)
        g.panah(x_b + kw / 2 + 1.35 * cm, yb + kh / 2, x_c, yb + kh / 2, "ya", AKSEN)

        # Turun ke lajur berikutnya lewat sisi kiri.
        g.panah(x_a + kw / 2, baris(i - 1), x_a + kw / 2, yb + kh, warna=AKSEN)

        # Naik ke koridor penolakan — digambar DI BAWAH kotak hasil supaya
        # garisnya tidak melintasi teks di dalam kotak.
        g.panah(x_b + kw / 2, yb - 0.10 * cm, koridor, yb - 0.10 * cm, None, MERAH, putus=True)
        if i == 1:
            g.teks(x_b + kw / 2 + 0.15 * cm, yb - 0.32 * cm, "tidak", "Sans-B", 6.2, MERAH)

    # Panah pertama: pemohon → ketua tim
    g.panah(x_b + kw / 2, baris(0), x_a + kw / 2 + 0.6 * cm, baris(1) + kh, warna=BIRU)

    # ── Koridor hijau: hasil akhir kembali ke pemohon ──────────────────
    g.panah(x_c + kw, baris(3) + kh / 2, koridor_hijau, baris(3) + kh / 2, None, AKSEN)
    g.panah(koridor_hijau, baris(3) + kh / 2, koridor_hijau, baris(0) + kh / 2, None, AKSEN)
    g.panah(koridor_hijau, baris(0) + kh / 2, x_c + kw, baris(0) + kh / 2, None, AKSEN)

    # ── Koridor merah: penolakan kembali ke pemohon ────────────────────
    g.panah(koridor, baris(1) - 0.10 * cm, koridor, baris(0) + kh + 0.22 * cm,
            None, MERAH, putus=True)
    g.panah(koridor, baris(0) + kh + 0.22 * cm, x_c + kw * 0.5, baris(0) + kh + 0.22 * cm,
            None, MERAH, putus=True)

    c.saveState()
    c.setFillColor(MERAH)
    c.setFont("Sans-B", 5.8)
    c.translate(koridor + 0.28 * cm, baris(2) + 0.55 * cm)
    c.rotate(90)
    c.drawString(0, 0, "ditolak")
    c.restoreState()


# ── Diagram 3 — Status permintaan ───────────────────────────────────────────

def d3(c, W, H):
    """Empat status jalur maju di baris atas, status penolakan di bawahnya.

    Keterangan tiap status ditaruh DI ATAS kotaknya supaya ruang di bawah
    kotak bebas dipakai jalur penolakan tanpa menimpa teks apa pun.
    """
    g = G(c)
    kw, kh = 3.15 * cm, 0.86 * cm
    jarak = (W - 4 * kw) / 3
    y = H - kh - 0.55 * cm

    langkah = [
        ("diajukan", "Menunggu Ketua Tim", BIRU),
        ("disetujui_katim", "Menunggu Kasubag TU", AKSEN),
        ("disetujui_kasubag", "Menunggu Pengelola Gudang", AKSEN),
        ("disetujui", "Final — SBBK dapat dicetak", AKSEN),
    ]
    pusat = []
    x = 0
    for kode, label, warna in langkah:
        g.teks(x + kw / 2, y + kh + 7, label, "Sans", 6.2, REDUP, tengah=True)
        g.kotak(x, y, kw, kh, kode, isi=PUTIH, tepi=warna, font="Mono", ukuran=7)
        pusat.append(x + kw / 2)
        x += kw + jarak
    for i in range(3):
        g.panah(pusat[i] + kw / 2, y + kh / 2, pusat[i + 1] - kw / 2, y + kh / 2,
                ["Ketua Tim", "Kasubag TU", "Gudang"][i], AKSEN)

    # Status penolakan
    ty = y - 2.05 * cm
    tx = pusat[1] - kw / 2
    g.kotak(tx, ty, kw, kh, "ditolak", isi=colors.HexColor("#FBECEC"), tepi=MERAH,
            font="Mono", ukuran=7)
    g.teks(pusat[1], ty - 11, "Dikembalikan ke pemohon beserta alasannya",
           "Sans", 6.2, MERAH, tengah=True)

    # Penolakan dari tiga tahap pertama — pangkalnya digeser ke kanan agar
    # tidak berimpit dengan jalur pengajuan ulang yang naik di sisi kiri.
    for i in (0, 1, 2):
        pangkal = pusat[i] + (0.62 * cm if i == 0 else 0)
        g.panah(pangkal, y, tx + kw * (0.22 + 0.28 * i), ty + kh, warna=MERAH, putus=True)

    # Pengajuan ulang kembali ke status diajukan, naik ke sisi bawah kotaknya.
    rx = pusat[0] - 0.75 * cm
    g.panah(tx, ty + kh / 2, rx, ty + kh / 2, warna=MERAH)
    g.panah(rx, ty + kh / 2, rx, y, warna=MERAH)
    g.teks((rx + tx) / 2, ty + kh / 2 - 10, "ajukan ulang + justifikasi",
           "Sans-B", 6.2, MERAH, tengah=True)

    # Status warisan
    wy = ty - 1.05 * cm
    g.kotak(pusat[2] - kw / 2, wy, kw + 2.2 * cm, 0.58 * cm,
            "disetujui_gudang — status lama, tidak lagi dihasilkan alur berjalan",
            isi=HALUS, tepi=GARIS, warna_teks=REDUP, ukuran=6.4)


# ── Diagram 4 — Barang masuk ────────────────────────────────────────────────

def d4(c, W, H):
    g = G(c)
    kw, kh = 3.5 * cm, 0.98 * cm
    baris1 = H - kh - 16
    g.teks(0, H - 6, "DUA JALUR MASUK", "Sans-B", 6.4, REDUP)

    g.kotak(0, baris1, kw, kh, "Form manual: item, jenis, jumlah, tanggal, lokasi, sumber",
            isi=PUTIH, tepi=BIRU, ukuran=6.7)
    g.kotak(0, baris1 - 1.25 * cm, kw, kh, "Impor Excel .xlsx (maks 5 MB) sesuai template",
            isi=PUTIH, tepi=BIRU, ukuran=6.7)

    vx = 4.3 * cm
    g.belah(vx + 1.15 * cm, baris1 - 0.35 * cm, 2.5 * cm, 1.5 * cm, "Nama & jumlah ≥ 1?")
    g.panah(kw, baris1 + kh / 2, vx, baris1 + kh / 2 - 0.2 * cm)
    g.panah(kw, baris1 - 1.25 * cm + kh / 2, vx, baris1 - 0.55 * cm)

    tx = 8.2 * cm
    g.kotak(tx, baris1, 3.9 * cm, kh, "Upsert item katalog (buat bila belum ada)",
            isi=PUTIH, tepi=AKSEN, ukuran=6.7)
    g.kotak(tx, baris1 - 1.25 * cm, 3.9 * cm, kh, "Buat lot: persediaan_masuk (sisa = jumlah)",
            isi=PUTIH, tepi=AKSEN, ukuran=6.7)
    g.panah(vx + 2.3 * cm, baris1 - 0.35 * cm, tx, baris1 + kh / 2, "ya", AKSEN)
    g.panah(vx + 2.3 * cm, baris1 - 0.35 * cm, tx, baris1 - 1.25 * cm + kh / 2, None, AKSEN)

    sx = 13.0 * cm
    g.silinder(sx, baris1 - 1.0 * cm, W - sx, 1.6 * cm, "persediaan_bmn.stok += jumlah")
    g.panah(tx + 3.9 * cm, baris1 + kh / 2, sx, baris1 - 0.1 * cm, warna=AKSEN)
    g.panah(tx + 3.9 * cm, baris1 - 1.25 * cm + kh / 2, sx, baris1 - 0.4 * cm, warna=AKSEN)

    gy = baris1 - 2.5 * cm
    g.kotak(vx - 0.6 * cm, gy, 4.6 * cm, 0.72 * cm,
            "Baris dilewati; kesalahan dilaporkan per nomor baris (maks 20)",
            isi=colors.HexColor("#FBECEC"), tepi=MERAH, ukuran=6.5)
    g.panah(vx + 1.15 * cm, baris1 - 1.1 * cm, vx + 1.15 * cm, gy + 0.72 * cm, "tidak", MERAH)


# ── Diagram 5 — Algoritme FIFO ──────────────────────────────────────────────

def d5(c, W, H):
    g = G(c)
    kw, kh = 6.6 * cm, 0.80 * cm
    jeda = 0.52 * cm
    x0 = 2.0 * cm                      # ruang kiri disisakan untuk panah perulangan
    y = H - kh - 4

    langkah = [
        ("Permintaan berstatus disetujui — tanda tangan Pengelola Gudang", AKSEN,
         colors.HexColor("#E8F4EE")),
        ("Untuk tiap item yang tidak ditolak: qty = jumlah_disetujui", TINTA, PUTIH),
        ("Ambil lot persediaan_masuk dengan sisa > 0, urut tanggal lalu id", BIRU, PUTIH),
        ("ambil = min(sisa lot, sisa kebutuhan); lot.sisa dikurangi", BIRU, PUTIH),
        ("Catat baris persediaan_keluar: lot, permintaan, jumlah, tanggal, lokasi", BIRU, PUTIH),
    ]
    ky = []
    for teks, warna, isi in langkah:
        g.kotak(x0, y, kw, kh, teks, isi=isi, tepi=warna, ukuran=6.9)
        ky.append(y)
        y -= kh + jeda
    for i in range(len(ky) - 1):
        g.panah(x0 + kw / 2, ky[i], x0 + kw / 2, ky[i + 1] + kh)

    # Percabangan
    bh = 1.25 * cm
    cy = ky[-1] - jeda - bh / 2
    g.belah(x0 + kw / 2, cy, 3.8 * cm, bh, "Kebutuhan terpenuhi?")
    g.panah(x0 + kw / 2, ky[-1], x0 + kw / 2, cy + bh / 2)

    # Perulangan kembali ke pengambilan lot (langkah ke-3)
    lx = 0.6 * cm
    g.panah(x0 + kw / 2 - 1.9 * cm, cy, lx, cy, warna=AMBAR)
    g.panah(lx, cy, lx, ky[2] + kh / 2, warna=AMBAR)
    g.panah(lx, ky[2] + kh / 2, x0, ky[2] + kh / 2, warna=AMBAR)
    g.teks(lx + 4, cy + 0.5 * cm, "belum — lot berikutnya", "Sans-B", 6.2, AMBAR)

    # Cabang "sudah" ke kanan
    rx = x0 + kw / 2 + 1.9 * cm
    g.panah(rx, cy, rx + 0.95 * cm, cy, "sudah", AKSEN)
    g.kotak(rx + 0.95 * cm, cy - 0.45 * cm, W - rx - 0.95 * cm, 0.9 * cm,
            "persediaan_bmn.stok dikurangi min(qty, stok) — tidak pernah negatif",
            isi=PUTIH, tepi=AKSEN, ukuran=6.6)

    # Cabang lot habis
    hy = cy - bh / 2 - jeda - 0.86 * cm
    g.kotak(x0 - 0.9 * cm, hy, kw + 1.8 * cm, 0.86 * cm,
            "Lot habis tetapi kebutuhan tersisa → satu baris persediaan_keluar tanpa lot, "
            "berketerangan \u201c(stok lot kurang)\u201d",
            isi=colors.HexColor("#FFF6E6"), tepi=AMBAR, ukuran=6.6)
    g.panah(x0 + kw / 2, cy - bh / 2, x0 + kw / 2, hy + 0.86 * cm, "lot habis", AMBAR)


# ── Diagram 6 — Relasi data ─────────────────────────────────────────────────

def d6(c, W, H):
    g = G(c)
    tw, th = 4.5 * cm, 1.5 * cm

    def tabel_kotak(x, y, nama, kolom, warna=BIRU):
        c.saveState()
        c.setFillColor(PUTIH)
        c.setStrokeColor(warna)
        c.setLineWidth(0.9)
        c.roundRect(x, y, tw, th, 4, stroke=1, fill=1)
        c.setFillColor(warna)
        c.roundRect(x, y + th - 0.42 * cm, tw, 0.42 * cm, 4, stroke=0, fill=1)
        c.rect(x, y + th - 0.42 * cm, tw, 0.2 * cm, stroke=0, fill=1)
        c.setFillColor(PUTIH)
        c.setFont("Mono", 6.8)
        c.drawCentredString(x + tw / 2, y + th - 0.31 * cm, nama)
        c.setFillColor(TINTA)
        c.setFont("Sans", 6.1)
        ay = y + th - 0.68 * cm
        for k in kolom:
            c.drawString(x + 5, ay, k)
            ay -= 7.6
        c.restoreState()

    x1, x2, x3 = 0, (W - tw) / 2, W - tw
    ya = H - th
    yb = ya - 2.0 * cm

    tabel_kotak(x2, ya, "persediaan_bmn",
                ["id · nama · kategori · kelompok", "satuan · lokasi · stok",
                 "stok_minimum · tanggal_kedaluwarsa"], AKSEN)
    tabel_kotak(x1, yb, "persediaan_masuk",
                ["id · persediaan_id · jenis", "jumlah · sisa · tanggal",
                 "lokasi · sumber · user_id"], BIRU)
    tabel_kotak(x3, yb, "persediaan_keluar",
                ["id · persediaan_id · masuk_id", "permintaan_id · jumlah",
                 "tanggal · lokasi · user_id"], BIRU)

    yc = yb - 2.0 * cm
    tabel_kotak(x2, yc, "permintaan_persediaan",
                ["id · nomor · kelompok · user_id", "ketua_tim_id · items (JSON) · status",
                 "approved_katim/kasubag/gudang_*"], AKSEN)
    tabel_kotak(x1, yc, "users",
                ["id · name · is_ketua_tim", "fungsi_ketua_tim",
                 "is_pengelola_gudang"], REDUP)

    g.panah(x2 + tw / 2 - 0.6 * cm, ya, x1 + tw / 2, yb + th, "1 : N", BIRU)
    g.panah(x2 + tw / 2 + 0.6 * cm, ya, x3 + tw / 2, yb + th, "1 : N", BIRU)
    g.panah(x1 + tw / 2 + 0.5 * cm, yb, x3 + tw / 2 - 0.5 * cm, yb, "lot dikonsumsi FIFO", AMBAR)
    g.panah(x2 + tw / 2, yc + th, x3 + tw / 2 - 0.4 * cm, yb, "1 : N", BIRU)
    g.panah(x1 + tw / 2, yc + th / 2, x2, yc + th / 2, "pemohon & ketua tim", REDUP)


# ── Diagram 7 — Dokumen SPB & SBBK ──────────────────────────────────────────

def d7(c, W, H):
    g = G(c)
    kw = (W - 1.2 * cm) / 2
    kh = H - 0.5 * cm

    for i, (judul, syarat, ttd, warna) in enumerate([
        ("SPB — Surat Permintaan Barang",
         "Dapat dicetak sejak permintaan dibuat",
         [("Pengelola Gudang", "QR tanda tangan elektronik"),
          ("Menyetujui — Ketua Tim / Fungsi", "QR tanda tangan elektronik")], BIRU),
        ("SBBK — Surat Bukti Barang Keluar",
         "Hanya untuk permintaan berstatus disetujui",
         [("Yang Menerima — pemohon", "QR tanda tangan elektronik"),
          ("Pengelola Gudang", "QR tanda tangan elektronik")], AKSEN),
    ]):
        x = i * (kw + 1.2 * cm)
        c.saveState()
        c.setFillColor(HALUS)
        c.setStrokeColor(warna)
        c.setLineWidth(1.0)
        c.roundRect(x, 0, kw, kh, 6, stroke=1, fill=1)
        c.setFillColor(warna)
        c.roundRect(x, kh - 0.62 * cm, kw, 0.62 * cm, 6, stroke=0, fill=1)
        c.rect(x, kh - 0.62 * cm, kw, 0.3 * cm, stroke=0, fill=1)
        c.setFillColor(PUTIH)
        c.setFont("Sans-B", 7.6)
        c.drawCentredString(x + kw / 2, kh - 0.43 * cm, judul)
        c.setFillColor(TINTA)
        c.setFont("Sans-I", 6.6)
        c.drawCentredString(x + kw / 2, kh - 1.05 * cm, syarat)
        c.restoreState()

        ay = kh - 1.5 * cm
        for nama, ket in ttd:
            g.kotak(x + 0.35 * cm, ay - 0.68 * cm, kw - 0.7 * cm, 0.68 * cm, nama,
                    isi=PUTIH, tepi=GARIS, ukuran=6.8)
            g.teks(x + kw / 2, ay - 0.98 * cm, ket, "Sans", 6.0, REDUP, tengah=True)
            ay -= 1.22 * cm

        g.teks(x + kw / 2, 0.46 * cm, "Akses cetak: pemohon, ketua tim,",
               "Sans", 6.0, REDUP, tengah=True)
        g.teks(x + kw / 2, 0.46 * cm - 8, "pengelola gudang, dan pimpinan",
               "Sans", 6.0, REDUP, tengah=True)


# ── Diagram 8 — Penomoran & pengelompokan ───────────────────────────────────

def d8(c, W, H):
    g = G(c)
    contoh = "001 / Persediaan / VII / 2026"
    c.saveState()
    c.setFont("Mono", 15)
    c.setFillColor(TINTA)
    lebar = pdfmetrics.stringWidth(contoh, "Mono", 15)
    x0 = (W - lebar) / 2
    y0 = H - 0.75 * cm
    c.drawString(x0, y0, contoh)
    c.restoreState()

    bagian = [
        ("001", "Nomor urut, ulang dari 1 tiap tahun"),
        ("Persediaan", "Penanda tetap jenis dokumen"),
        ("VII", "Bulan dalam angka Romawi"),
        ("2026", "Tahun pengajuan"),
    ]
    posisi = 0
    sudah = []
    for teks, ket in bagian:
        w = pdfmetrics.stringWidth(teks, "Mono", 15)
        depan = pdfmetrics.stringWidth(contoh[:posisi], "Mono", 15)
        cx = x0 + depan + w / 2
        # Keterangan diselang-seling dua tinggi agar tidak bertabrakan.
        selang = 0 if len(sudah) % 2 == 0 else 0.42 * cm
        g.panah(cx, y0 - 4, cx, y0 - 0.62 * cm - selang, warna=REDUP)
        c.saveState()
        c.setFont("Sans", 6.2)
        c.setFillColor(REDUP)
        baris = potong_teks(c, ket, "Sans", 6.2, 2.7 * cm)
        ay = y0 - 0.82 * cm - selang
        for b in baris:
            c.drawCentredString(cx, ay, b)
            ay -= 7.4
        c.restoreState()
        sudah.append(teks)
        posisi = contoh.index(teks, posisi) + len(teks) + 3

    # Penentuan kelompok
    gy = 0.15 * cm
    g.teks(0, gy + 1.62 * cm, "PENENTUAN KELOMPOK DOKUMEN", "Sans-B", 6.4, REDUP)
    g.belah(3.2 * cm, gy + 0.75 * cm, 5.9 * cm, 1.5 * cm,
            "Semua item tercatat berkelompok ATK?")
    g.kotak(7.6 * cm, gy + 0.95 * cm, 3.4 * cm, 0.62 * cm, "kelompok = ATK",
            isi=colors.HexColor("#E8F4EE"), tepi=AKSEN, font="Mono", ukuran=7)
    g.kotak(7.6 * cm, gy + 0.1 * cm, 3.4 * cm, 0.62 * cm, "kelompok = PSD",
            isi=HALUS, tepi=BIRU, font="Mono", ukuran=7)
    g.panah(6.15 * cm, gy + 0.75 * cm, 7.6 * cm, gy + 1.26 * cm, "ya", AKSEN)
    g.panah(6.15 * cm, gy + 0.75 * cm, 7.6 * cm, gy + 0.41 * cm, "tidak", BIRU)
    g.teks(11.3 * cm, gy + 1.1 * cm,
           "Item di luar katalog dianggap PSD.", "Sans", 6.2, REDUP)
    g.teks(11.3 * cm, gy + 0.72 * cm,
           "Kelompok tidak mengubah alur persetujuan;", "Sans", 6.2, REDUP)
    g.teks(11.3 * cm, gy + 0.34 * cm,
           "ia hanya menandai jenis permintaan.", "Sans", 6.2, REDUP)


# ── Diagram 9 — Peringatan stok & kedaluwarsa ───────────────────────────────

def d9(c, W, H):
    g = G(c)
    kw = (W - 1.0 * cm) / 2

    g.teks(0, H - 6, "PERINGATAN STOK", "Sans-B", 6.4, REDUP)
    g.kotak(0, H - 1.35 * cm, kw, 0.82 * cm,
            "stok ≤ stok_minimum  →  ditandai “menipis”",
            isi=colors.HexColor("#FFF6E6"), tepi=AMBAR, ukuran=7)
    g.teks(0, H - 1.62 * cm, "Ambang ditetapkan per item pada katalog.", "Sans", 6.2, REDUP)

    g.teks(kw + 1.0 * cm, H - 6, "STATUS KEDALUWARSA", "Sans-B", 6.4, REDUP)
    x = kw + 1.0 * cm
    bar_y = H - 1.15 * cm
    bar_h = 0.42 * cm
    segmen = [("Kedaluwarsa", MERAH, 0.30), ("Mendekati — ≤ 6 bulan", AMBAR, 0.40),
              ("Aman", AKSEN, 0.30)]
    sx = x
    for nama, warna, porsi in segmen:
        w = kw * porsi
        c.saveState()
        c.setFillColor(warna)
        c.setStrokeColor(warna)
        c.roundRect(sx, bar_y, w - 2, bar_h, 3, stroke=0, fill=1)
        c.setFillColor(PUTIH)
        c.setFont("Sans-B", 6.2)
        c.drawCentredString(sx + (w - 2) / 2, bar_y + bar_h / 2 - 2.2, nama)
        c.restoreState()
        sx += w
    g.teks(x, bar_y - 11, "hari ini", "Sans", 6.0, REDUP)
    g.teks(x + kw * 0.30, bar_y - 11, "+6 bulan", "Sans", 6.0, REDUP)
    g.teks(x, bar_y - 21,
           "Menu Kedaluwarsa menampilkan item bertanggal ≤ hari ini + 6 bulan.",
           "Sans", 6.2, REDUP)


# ── Halaman ─────────────────────────────────────────────────────────────────

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
        Spacer(1, 2.8 * cm),
        Paragraph(sp("Dokumen Alur Sistem"), S["eyebrow"]),
        Spacer(1, 4),
        Paragraph("Alur Sistem Modul Persediaan", S["sampul_judul"]),
        Paragraph("Persediaan Barang Milik Negara<br/>pada Sistem LENTERA Balai POM di Jember",
                  S["sampul_sub"]),
        Spacer(1, 1.3 * cm),
        garis(GARIS, 0.6, 0, 14),
        tabel(["Butir", "Keterangan"], [
            ["Modul", "Persediaan BMN — pengelolaan stok, permintaan, dan pengeluaran barang"],
            ["Sistem induk", "LENTERA — Layanan Elektronik Terpadu &amp; Terintegrasi"],
            ["Unit pemilik", "Fungsi Tata Usaha, Balai POM di Jember"],
            ["Isi dokumen", "Sembilan diagram alur beserta keterangan rinci tiap langkah"],
            ["Versi", f"{VERSI} ({TANGGAL})"],
            ["Sumber", "Kode yang berjalan: PersediaanBmnController, PersediaanExcelService, migrasi tabel persediaan, berkas cetak SPB &amp; SBBK"],
        ], [3.6 * cm, LEBAR_ISI - 3.6 * cm], ["sel_b", "sel"], zebra=False),
        Spacer(1, 1.0 * cm),
        catatan("Cara membaca dokumen",
                "Setiap diagram diberi kode D-1 sampai D-9 dan diikuti keterangan yang menjelaskan "
                "tiap kotak, percabangan, dan jalur panah. Nama tabel serta kolom basis data "
                "ditulis apa adanya sesuai skema, sehingga diagram dapat dipakai langsung sebagai "
                "acuan penelusuran kode maupun pemeriksaan data."),
        NextPageTemplate("isi"),
        PageBreak(),
    ]


def daftar_diagram():
    baris = [
        ("D-1", "Peta Modul Persediaan", "Empat proses utama, tabel penyimpan, dan keluaran dokumen"),
        ("D-2", "Alur Permintaan &amp; Persetujuan", "Lajur pemohon, ketua tim, kasubag, pengelola gudang"),
        ("D-3", "Diagram Status Permintaan", "Enam status beserta pemicu perpindahannya"),
        ("D-4", "Alur Barang Masuk", "Jalur manual dan impor Excel menjadi lot FIFO"),
        ("D-5", "Algoritme Pengurangan Stok FIFO", "Konsumsi lot tertua saat permintaan final"),
        ("D-6", "Relasi Data", "Lima tabel beserta kardinalitasnya"),
        ("D-7", "Dokumen SPB &amp; SBBK", "Syarat cetak dan penanda tangan tiap dokumen"),
        ("D-8", "Penomoran &amp; Pengelompokan", "Anatomi nomor dan penentuan ATK atau PSD"),
        ("D-9", "Peringatan Stok &amp; Kedaluwarsa", "Ambang stok menipis dan status kedaluwarsa"),
    ]
    data = [[Paragraph(k, S["kode_id"]), Paragraph(j, S["isi_bab"]), Paragraph(d, S["isi_sub"])]
            for k, j, d in baris]
    t = Table(data, colWidths=[1.3 * cm, 5.6 * cm, LEBAR_ISI - 6.9 * cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, -1), 0), ("RIGHTPADDING", (-1, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, GARIS),
    ]))
    return [
        Paragraph(sp("Isi Dokumen"), S["eyebrow"]),
        Paragraph("Daftar Diagram", S["bab"]),
        garis(AKSEN, 1.1, 3, 12),
        t,
        Spacer(1, 0.7 * cm),
        h2("Lambang yang dipakai"),
        tabel(["Lambang", "Arti"], [
            ["Kotak bersudut tumpul", "Langkah proses atau keadaan sistem"],
            ["Belah ketupat", "Percabangan keputusan; tiap cabang diberi label"],
            ["Silinder", "Tabel penyimpanan data"],
            ["Garis utuh", "Alur normal"],
            ["Garis putus-putus", "Alur penolakan atau pengecualian"],
            ["Warna hijau", "Jalur persetujuan yang berjalan maju"],
            ["Warna merah", "Penolakan dan pengembalian ke pemohon"],
            ["Warna kuning", "Percabangan, peringatan, dan kondisi tidak lazim"],
        ], [4.6 * cm, LEBAR_ISI - 4.6 * cm], ["sel_b", "sel"]),
        PageBreak(),
    ]


def bagian1():
    return [
        bab("1", "Gambaran Modul",
            "Modul Persediaan mengelola barang habis pakai milik negara — ATK, reagen, test kit, "
            "dan alat — mulai dari pencatatan barang masuk sampai penyerahan kepada pegawai."),

        bingkai_diagram(
            "D-1", "Peta Modul Persediaan",
            Diagram(LEBAR_ISI, 7.0 * cm, d1),
            "Empat proses utama berjalan di atas empat tabel. <b>Katalog</b> memuat master item beserta "
            "ambang stok minimum dan tanggal kedaluwarsa. <b>Transaksi Masuk</b> menambah stok sekaligus "
            "membentuk lot bertanggal yang dipakai perhitungan FIFO. <b>Permintaan Barang</b> menjalankan "
            "persetujuan berjenjang dan, pada tahap akhir, memotong stok. <b>Stock Opname</b> menyajikan "
            "stok terkini beserta riwayat barang keluar. Keluaran modul berupa dua dokumen cetak (SPB dan "
            "SBBK), berkas template serta impor Excel, dan peringatan stok menipis maupun mendekati "
            "kedaluwarsa."),

        h2("1.1 Peran dan Kewenangan"),
        tabel(["Peran", "Kewenangan pada modul"], [
            ["Pegawai ASN/PPPK", "Mengajukan permintaan, melihat permintaan miliknya, mencetak SPB dan SBBK miliknya."],
            ["Ketua Tim / Fungsi", "Menyetujui atau menolak tahap pertama pada permintaan yang ditujukan kepadanya; melihat permintaan tersebut."],
            ["Kasubag Tata Usaha", "Menyetujui tahap kedua; melihat seluruh permintaan; mengelola katalog, barang masuk, dan stock opname."],
            ["Pengelola Gudang", "Menyetujui tahap akhir (tanda tangan terakhir); mengelola katalog, barang masuk, impor Excel, dan stock opname."],
            ["Kepala Balai", "Melihat seluruh permintaan dan mencetak dokumen."],
            ["Superadmin", "Seluruh kewenangan di atas."],
        ], [3.6 * cm, LEBAR_ISI - 3.6 * cm], ["sel_b", "sel"]),

        Paragraph(
            "Penanda peran disimpan pada tabel pengguna: <font name='Mono' size='8'>is_ketua_tim</font> "
            "beserta <font name='Mono' size='8'>fungsi_ketua_tim</font> untuk ketua tim, dan "
            "<font name='Mono' size='8'>is_pengelola_gudang</font> untuk pengelola gudang. Seluruh "
            "titik akhir modul juga dibatasi peran pada tingkat rute.",
            S["body"]),
        PageBreak(),
    ]


def bagian2():
    return [
        bab("2", "Alur Permintaan dan Persetujuan",
            "Inti modul: permintaan pegawai melewati tiga tahap persetujuan berurutan sebelum barang "
            "dikeluarkan dari gudang."),

        bingkai_diagram(
            "D-2", "Alur Permintaan & Persetujuan Berjenjang",
            Diagram(LEBAR_ISI, 9.8 * cm, d2),
            "Pemohon mengisi daftar item beserta jumlah dan satuannya, menuliskan keperluan, dan "
            "<b>memilih sendiri Ketua Tim</b> yang akan menyetujui tahap pertama. Sistem lalu menerbitkan "
            "nomor dan menyimpan permintaan berstatus <font name='Mono' size='7.5'>diajukan</font>. "
            "Tiga penyetuju bekerja berurutan: Ketua Tim, Kasubag Tata Usaha, lalu Pengelola Gudang. "
            "Pada setiap tahap penyetuju boleh mengubah jumlah yang disetujui per item atau menolak "
            "sebagian item — bukan hanya menyetujui seluruhnya. Penolakan di tahap mana pun mengembalikan "
            "permintaan kepada pemohon; pemohon dapat merevisi daftar item, menuliskan justifikasi, lalu "
            "mengajukan ulang. Persetujuan Pengelola Gudang adalah tanda tangan terakhir: pada saat itu "
            "stok dipotong dan SBBK dapat dicetak."),

        h2("2.1 Rincian Tiap Tahap"),
        tabel(["No", "Pelaku", "Status", "Yang terjadi"], [
            ["1", "Pemohon", "diajukan", "Nomor diterbitkan; kelompok ditentukan; notifikasi dikirim ke Ketua Tim yang dipilih."],
            ["2", "Ketua Tim / Fungsi", "disetujui_katim", "Waktu dan pelaku persetujuan dicatat; notifikasi ke Kasubag TU."],
            ["3", "Kasubag Tata Usaha", "disetujui_kasubag", "Waktu dan pelaku dicatat; notifikasi ke seluruh Pengelola Gudang."],
            ["4", "Pengelola Gudang", "disetujui", "Stok dipotong FIFO; notifikasi ke pemohon; SBBK dapat dicetak."],
            ["—", "Penyetuju mana pun", "ditolak", "Alasan penolakan dicatat; permintaan kembali ke pemohon."],
        ], [1.1 * cm, 3.1 * cm, 3.5 * cm, LEBAR_ISI - 7.7 * cm],
           ["kode_id", "sel_b", "mono", "sel"]),

        catatan("Pengaman yang berlaku pada setiap tahap",
                "Sistem menolak persetujuan dari pihak yang bukan gilirannya — pemeriksaan dilakukan "
                "di server, bukan sekadar disembunyikan pada antarmuka. Permintaan yang sudah berstatus "
                "final (disetujui atau ditolak) tidak dapat diputuskan lagi. Pengajuan dibatasi 20 "
                "permintaan per menit per pengguna."),

        PageBreak(),

        bingkai_diagram(
            "D-3", "Diagram Status Permintaan",
            Diagram(LEBAR_ISI, 6.8 * cm, d3),
            "Enam status tersimpan pada kolom <font name='Mono' size='7.5'>status</font>. Empat status "
            "membentuk jalur maju, satu status menampung penolakan, dan satu status merupakan warisan "
            "rancangan lama. Saat permintaan diajukan ulang, seluruh kolom persetujuan "
            "(<font name='Mono' size='7.5'>approved_katim_*</font>, "
            "<font name='Mono' size='7.5'>approved_kasubag_*</font>, "
            "<font name='Mono' size='7.5'>approved_gudang_*</font>) dikosongkan kembali sehingga "
            "persetujuan lama tidak terbawa ke pengajuan baru."),

        h2("2.2 Kamus Status"),
        tabel(["Nilai tersimpan", "Tampil di layar", "Arti"], [
            ["diajukan", "Menunggu Ketua Tim", "Baru diajukan pemohon atau baru diajukan ulang."],
            ["disetujui_katim", "Menunggu Kasubag TU", "Ketua Tim sudah menyetujui."],
            ["disetujui_kasubag", "Menunggu Pengelola Gudang", "Kasubag TU sudah menyetujui."],
            ["disetujui", "Disetujui", "Final. Stok sudah dipotong; SBBK dapat dicetak."],
            ["ditolak", "Ditolak", "Dikembalikan ke pemohon beserta alasannya."],
            ["disetujui_gudang", "Menunggu Kasubag TU", "Warisan rancangan lama. Masih dikenali agar data lama tetap terbaca, tetapi tidak lagi dihasilkan alur yang berjalan."],
        ], [3.7 * cm, 3.5 * cm, LEBAR_ISI - 7.2 * cm], ["mono", "sel_b", "sel"]),
        PageBreak(),
    ]


def bagian3():
    return [
        bab("3", "Alur Stok: Masuk dan Keluar",
            "Stok tidak disimpan sebagai satu angka saja. Setiap penerimaan barang membentuk lot "
            "bertanggal, dan pengeluaran mengonsumsi lot tertua lebih dulu."),

        bingkai_diagram(
            "D-4", "Alur Barang Masuk",
            Diagram(LEBAR_ISI, 4.8 * cm, d4),
            "Barang masuk dicatat lewat dua jalur yang bermuara sama. <b>Jalur manual</b> mengisi satu "
            "transaksi: item katalog, jenis (pembelian atau transfer masuk), jumlah, tanggal, lokasi, "
            "dan sumber atau pemasok. <b>Jalur impor</b> membaca berkas Excel sesuai template — nama "
            "kolomnya dikenali tanpa memandang huruf besar-kecil, dan beberapa nama alternatif diterima "
            "(misalnya “Nama Item”, “Nama”, atau “Nama Barang”). Baris yang tidak memuat nama item atau "
            "jumlah minimal satu akan dilewati, dan kesalahannya dilaporkan lengkap dengan nomor baris. "
            "Setiap transaksi yang lolos membentuk satu lot pada "
            "<font name='Mono' size='7.5'>persediaan_masuk</font> dengan "
            "<font name='Mono' size='7.5'>sisa</font> sama dengan jumlahnya, lalu menambah "
            "<font name='Mono' size='7.5'>stok</font> pada katalog. Impor juga membuat item katalog baru "
            "bila namanya belum ada."),

        bingkai_diagram(
            "D-5", "Algoritme Pengurangan Stok FIFO",
            Diagram(LEBAR_ISI, 10.4 * cm, d5),
            "Pengurangan stok terjadi <b>sekali saja</b>, yaitu ketika Pengelola Gudang memberikan "
            "persetujuan terakhir. Untuk setiap item yang tidak ditolak, sistem mengambil jumlah yang "
            "disetujui, lalu mengonsumsi lot dengan tanggal masuk paling tua lebih dulu. Setiap potongan "
            "dicatat sebagai satu baris <font name='Mono' size='7.5'>persediaan_keluar</font> yang "
            "menyimpan lot asalnya, sehingga jejak “barang ini berasal dari pembelian tanggal berapa” "
            "tetap dapat ditelusuri. Bila seluruh lot habis namun kebutuhan belum terpenuhi, sisanya "
            "tetap dicatat sebagai satu baris tanpa lot berketerangan “(stok lot kurang)” — kekurangan "
            "tidak disembunyikan. Stok katalog dikurangi sebesar jumlah yang disetujui, dibatasi agar "
            "tidak pernah menjadi negatif. Item yang diketik bebas dan tidak ada di katalog tidak "
            "memotong stok apa pun."),
        PageBreak(),

        bingkai_diagram(
            "D-6", "Relasi Data",
            Diagram(LEBAR_ISI, 7.0 * cm, d6),
            "Katalog menjadi induk bagi lot masuk dan baris keluar. Setiap baris keluar menunjuk lot "
            "asalnya melalui <font name='Mono' size='7.5'>masuk_id</font> dan menunjuk permintaan "
            "pemicunya melalui <font name='Mono' size='7.5'>permintaan_id</font>; keduanya boleh kosong "
            "— <font name='Mono' size='7.5'>masuk_id</font> kosong pada kasus lot kurang. Daftar item "
            "pada permintaan disimpan sebagai JSON sehingga keputusan per item (jumlah disetujui, "
            "penolakan sebagian, keterangan) menempel pada permintaan itu sendiri."),

        h2("3.1 Kamus Tabel"),
        tabel(["Tabel", "Isi", "Kunci penting"], [
            ["persediaan_bmn", "Master item persediaan", "nama · kategori · kelompok · satuan · lokasi · stok · stok_minimum · tanggal_kedaluwarsa"],
            ["persediaan_masuk", "Lot penerimaan barang", "persediaan_id · jenis · jumlah · sisa · tanggal · sumber"],
            ["persediaan_keluar", "Rincian pengeluaran per lot", "persediaan_id · masuk_id · permintaan_id · jumlah · tanggal"],
            ["permintaan_persediaan", "Dokumen permintaan", "nomor · kelompok · user_id · ketua_tim_id · items (JSON) · status · kolom persetujuan"],
        ], [4.0 * cm, 3.0 * cm, LEBAR_ISI - 7.0 * cm], ["mono", "sel_b", "sel"]),
        PageBreak(),
    ]


def bagian4():
    return [
        bab("4", "Dokumen, Penomoran, dan Peringatan"),

        bingkai_diagram(
            "D-7", "Dokumen SPB & SBBK",
            Diagram(LEBAR_ISI, 5.3 * cm, d7),
            "Modul menerbitkan dua dokumen cetak. <b>SPB</b> menjadi bukti permintaan dan dapat dicetak "
            "sejak permintaan dibuat. <b>SBBK</b> menjadi bukti barang keluar, sehingga hanya dapat "
            "dicetak setelah permintaan berstatus disetujui — sistem menolak permintaan cetak SBBK pada "
            "status lain. Tanda tangan pada kedua dokumen berupa kode QR yang dibangkitkan dari akun "
            "penanda tangan, bukan gambar tanda tangan yang ditempelkan."),

        bingkai_diagram(
            "D-8", "Penomoran & Pengelompokan",
            Diagram(LEBAR_ISI, 5.0 * cm, d8),
            "Nomor dibentuk saat permintaan pertama kali diajukan dan tidak berubah sesudahnya, "
            "termasuk ketika permintaan ditolak lalu diajukan ulang. Urutannya dihitung dari nomor urut "
            "tertinggi pada tahun berjalan ditambah satu, sehingga penomoran dimulai kembali dari 001 "
            "setiap pergantian tahun. Kelompok dokumen ditentukan otomatis: bernilai ATK hanya bila "
            "seluruh item yang diminta tercatat berkelompok ATK pada katalog; bila ada satu saja item "
            "di luar itu — termasuk item yang diketik bebas dan tidak ada pada katalog — dokumen "
            "dikelompokkan sebagai PSD."),

        bingkai_diagram(
            "D-9", "Peringatan Stok & Kedaluwarsa",
            Diagram(LEBAR_ISI, 2.5 * cm, d9),
            "Dua peringatan berjalan otomatis. Item ditandai <b>menipis</b> ketika stoknya sama dengan "
            "atau di bawah ambang minimum yang ditetapkan pada katalog item tersebut. Status kedaluwarsa "
            "dihitung terhadap tanggal hari ini: telah lewat berarti <b>kedaluwarsa</b>, jatuh dalam "
            "enam bulan ke depan berarti <b>mendekati</b>, selebihnya <b>aman</b>. Menu Kedaluwarsa "
            "menampilkan seluruh item yang tanggalnya jatuh sampai enam bulan ke depan, terurut dari "
            "yang paling dekat."),
        PageBreak(),
    ]


def bagian5():
    return [
        bab("5", "Titik Akhir dan Pembatasan"),

        h2("5.1 Titik Akhir API"),
        Paragraph(
            "Seluruh titik akhir berada di bawah prefiks "
            "<font name='Mono' size='8'>/api/persediaan-bmn</font> dan dibatasi pada peran superadmin, "
            "kepala balai, kepala subag TU, serta pegawai ASN/PPPK. Sebagian titik akhir dibatasi lebih "
            "lanjut kepada pengelola gudang saja.",
            S["body"]),
        tabel(["Metode", "Alamat", "Akses", "Fungsi"], [
            ["GET", "/katalog", "Semua peran modul", "Daftar item beserta ringkasan stok"],
            ["POST", "/", "Pengelola", "Tambah item katalog"],
            ["PATCH", "/{id}", "Pengelola", "Ubah item katalog"],
            ["DELETE", "/{id}", "Pengelola", "Hapus item katalog"],
            ["GET", "/kedaluwarsa", "Semua peran modul", "Item yang mendekati atau melewati tanggal kedaluwarsa"],
            ["GET", "/ketua-tim", "Semua peran modul", "Daftar Ketua Tim beserta fungsinya"],
            ["GET", "/permintaan", "Semua peran modul", "Daftar permintaan sesuai kewenangan"],
            ["POST", "/permintaan", "Pemohon", "Ajukan permintaan — 20 per menit"],
            ["PATCH", "/permintaan/{id}/putuskan", "Penyetuju giliran", "Setujui atau tolak"],
            ["PATCH", "/permintaan/{id}/ajukan-ulang", "Pemohon", "Revisi dan ajukan ulang"],
            ["GET", "/permintaan/{id}/spb", "Terkait permintaan", "Cetak SPB"],
            ["GET", "/permintaan/{id}/sbbk", "Terkait permintaan", "Cetak SBBK — hanya status disetujui"],
            ["GET", "/masuk", "Pengelola", "Riwayat barang masuk"],
            ["POST", "/masuk", "Pengelola", "Catat barang masuk — 60 per menit"],
            ["GET", "/masuk-template", "Pengelola", "Unduh template Excel"],
            ["POST", "/masuk-import", "Pengelola", "Impor Excel — 20 per menit, maks 5 MB"],
            ["GET", "/stock-opname", "Pengelola", "Stok terkini dan riwayat barang keluar"],
        ], [1.5 * cm, 4.9 * cm, 2.7 * cm, LEBAR_ISI - 9.1 * cm],
           ["sel_b", "mono", "sel_redup", "sel"]),

        h2("5.2 Cakupan Pandangan Data"),
        tabel(["Pengguna", "Permintaan yang terlihat"], [
            ["Pimpinan dan Kasubag TU", "Seluruh permintaan"],
            ["Pengelola Gudang", "Seluruh permintaan"],
            ["Ketua Tim", "Permintaan miliknya sendiri dan permintaan yang ditujukan kepadanya"],
            ["Pegawai lain", "Hanya permintaan miliknya sendiri"],
        ], [5.2 * cm, LEBAR_ISI - 5.2 * cm], ["sel_b", "sel"]),

        h2("5.3 Jejak Audit"),
        Paragraph(
            "Tiga peristiwa dicatat pada jejak audit sistem: pengajuan permintaan "
            "(<font name='Mono' size='8'>persediaan.ajukan</font>), pencatatan barang masuk "
            "(<font name='Mono' size='8'>persediaan.masuk</font>), dan impor Excel "
            "(<font name='Mono' size='8'>persediaan.import</font>). Selain itu, setiap tahap "
            "persetujuan menyimpan pelaku dan waktunya pada kolom permintaan, dan setiap pengeluaran "
            "barang menyimpan petugas yang memprosesnya.",
            S["body"]),

        Spacer(1, 0.8 * cm),
        garis(GARIS, 0.6, 0, 10),
        Paragraph(
            "Dokumen ini disusun dari kode modul Persediaan BMN pada sistem LENTERA Balai POM di "
            f"Jember, versi {VERSI}, {TANGGAL}. Diagram dibangkitkan ulang oleh "
            "scripts/buat-dokumen-alur-persediaan.py agar tetap sejalan dengan kode.",
            S["body_redup"]),
    ]


def bangun(keluaran):
    dok = BaseDocTemplate(
        keluaran, pagesize=A4,
        leftMargin=MARGIN_X, rightMargin=MARGIN_X,
        topMargin=MARGIN_ATAS, bottomMargin=MARGIN_BAWAH,
        title="Alur Sistem — Modul Persediaan BMN",
        author="Balai POM di Jember",
        subject="Diagram alur dan keterangan modul Persediaan BMN pada sistem LENTERA",
    )
    bingkai = Frame(MARGIN_X, MARGIN_BAWAH, LEBAR_ISI,
                    A4[1] - MARGIN_ATAS - MARGIN_BAWAH, id="isi",
                    leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    dok.addPageTemplates([
        PageTemplate(id="sampul", frames=[bingkai], onPage=halaman_sampul),
        PageTemplate(id="isi", frames=[bingkai], onPage=halaman_isi),
    ])

    cerita = sampul() + daftar_diagram() + bagian1() + bagian2() + bagian3() + bagian4() + bagian5()
    dok.build(cerita)
    print(f"selesai: {keluaran}")


if __name__ == "__main__":
    import sys
    bangun(sys.argv[1] if len(sys.argv) > 1 else "Alur-Sistem-Modul-Persediaan.pdf")
