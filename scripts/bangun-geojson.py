#!/usr/bin/env python3
"""Bangun batas kabupaten & kecamatan (5 kabupaten wilayah kerja BPOM Jember)
dari dataset batas desa Indonesia (turunan OpenStreetMap).

Berkas hasil sudah disertakan di repositori pada
apps/api/resources/sig/geojson/. Skrip ini disimpan agar data tersebut dapat
DIBANGUN ULANG kapan saja dan asal-usulnya dapat ditelusuri.

Sumber : https://github.com/pararawendy/border-desa-indonesia-geojson (ODbL)
Metode : gabungkan (dissolve) poligon desa per kecamatan dan per kabupaten,
         tutup celah antar-desa, buang lubang palsu, lalu sederhanakan.

Pemakaian:
    pip install shapely
    python3 scripts/bangun-geojson.py
    # hasil: apps/api/resources/sig/geojson/{kabupaten,kecamatan}.geojson
"""
import io
import json
import sys
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

from shapely.geometry import MultiPolygon, Polygon, mapping
from shapely.ops import unary_union

AKAR = Path(__file__).resolve().parent.parent
KELUARAN = AKAR / "apps/api/resources/sig/geojson"
UNDUHAN = AKAR / ".cache-geojson"
URL = ("https://raw.githubusercontent.com/pararawendy/border-desa-indonesia-geojson"
       "/master/indonesia_villages_border.geojson.zip")
SUMBER = "indonesia_villages_border.geojson"
TARGET = {
    "JEMBER": "Jember",
    "BANYUWANGI": "Banyuwangi",
    "BONDOWOSO": "Bondowoso",
    "SITUBONDO": "Situbondo",
    "LUMAJANG": "Lumajang",
}


def judul(s: str) -> str:
    """UPPERCASE -> Title Case dengan pengecualian kata sambung."""
    kecil = {"di", "ke", "dan"}
    kata = []
    for w in s.strip().split():
        lw = w.lower()
        kata.append(lw if lw in kecil and kata else lw.capitalize())
    return " ".join(kata)


def baca_terpilih(path):
    """Baca record satu per satu; hanya simpan yang termasuk 5 kabupaten target."""
    with open(path, encoding="utf-8") as f:
        teks = f.read()
    dec = json.JSONDecoder()
    i = teks.index("[") + 1
    n = len(teks)
    hasil = []
    total = 0
    while i < n:
        while i < n and teks[i] in " \t\r\n,":
            i += 1
        if i >= n or teks[i] == "]":
            break
        obj, ujung = dec.raw_decode(teks, i)
        i = ujung
        total += 1
        if obj.get("province") == "JAWA TIMUR" and obj.get("district") in TARGET:
            hasil.append(obj)
    print(f"  total record dibaca : {total}", file=sys.stderr)
    return hasil


def poligon(border):
    """Bentuk Polygon valid dari daftar titik [lng, lat]."""
    if not border or len(border) < 4:
        return None
    try:
        p = Polygon(border)
    except Exception:
        return None
    if not p.is_valid:
        p = p.buffer(0)
    if p.is_empty or p.area <= 0:
        return None
    return p


def bagian(g):
    return list(g.geoms) if g.geom_type == "MultiPolygon" else [g]


def rapikan(pol, toleransi, sisa_min=0.005):
    """Gabungkan poligon desa menjadi satu wilayah yang bersih.

    Batas desa antar-tetangga tidak selalu berimpit persis, sehingga hasil
    penggabungan mentah menyisakan celah rambut dan lubang palsu. Buffer
    maju-mundur menutup celah tersebut, lubang dalam dibuang (kabupaten dan
    kecamatan tidak memiliki enklave), dan serpihan sangat kecil dihapus.
    """
    g = unary_union(pol)
    g = g.buffer(0.0004).buffer(-0.0004)   # ±44 m: menutup celah rambut antar-desa
    if g.is_empty:
        return None

    utuh = [Polygon(p.exterior) for p in bagian(g) if p.area > 0]
    if not utuh:
        return None

    total = sum(p.area for p in utuh)
    utuh = [p for p in utuh if p.area >= total * sisa_min] or [max(utuh, key=lambda p: p.area)]

    g = utuh[0] if len(utuh) == 1 else MultiPolygon(utuh)
    g = g.simplify(toleransi, preserve_topology=True)

    return g if g.is_valid else g.buffer(0)


def bulatkan(o, n=5):
    """Bulatkan koordinat ke n desimal (~1 m) agar berkas jauh lebih ringan."""
    if isinstance(o, float):
        return round(o, n)
    if isinstance(o, (list, tuple)):
        return [bulatkan(x, n) for x in o]
    if isinstance(o, dict):
        return {k: bulatkan(v, n) for k, v in o.items()}
    return o


def fitur(geom, props):
    return {"type": "Feature", "properties": props, "geometry": bulatkan(mapping(geom))}


def siapkan_sumber() -> Path:
    """Unduh & bongkar dataset desa bila belum ada di cache lokal."""
    UNDUHAN.mkdir(parents=True, exist_ok=True)
    berkas = UNDUHAN / SUMBER
    if berkas.is_file():
        return berkas

    print(f"Mengunduh dataset desa (±45 MB) dari {URL} ...", file=sys.stderr)
    with urllib.request.urlopen(URL, timeout=600) as resp:
        isi = resp.read()
    with zipfile.ZipFile(io.BytesIO(isi)) as z:
        nama = next(n for n in z.namelist() if n.endswith(SUMBER) and "__MACOSX" not in n)
        berkas.write_bytes(z.read(nama))
    print(f"  tersimpan di {berkas}", file=sys.stderr)

    return berkas


def main():
    sumber = siapkan_sumber()
    print("Membaca dataset desa...", file=sys.stderr)
    baris = baca_terpilih(sumber)
    print(f"  desa terpilih       : {len(baris)}", file=sys.stderr)

    per_kab = defaultdict(list)
    per_kec = defaultdict(list)
    for r in baris:
        p = poligon(r.get("border"))
        if p is None:
            continue
        kab = TARGET[r["district"]]
        kec = judul(r.get("sub_district") or "")
        per_kab[kab].append(p)
        per_kec[(kab, kec)].append(p)

    catatan = (
        "Batas wilayah dibangun dengan menggabungkan poligon desa/kelurahan. "
        "Sumber data: https://github.com/pararawendy/border-desa-indonesia-geojson "
        "(turunan OpenStreetMap, lisensi ODbL). "
        "Catatan keterbatasan: kawasan yang tidak termasuk wilayah desa mana pun "
        "(mis. kawasan hutan negara dan taman nasional) tidak tercakup, sehingga "
        "luas poligon dapat lebih kecil daripada luas administratif resmi. "
        "Lapisan ini dipakai sebagai bantu visual peta, BUKAN batas administratif resmi."
    )

    # --- Kabupaten ---
    fitur_kab = []
    for kab in TARGET.values():
        pol = per_kab.get(kab)
        if not pol:
            print(f"  ! tidak ada poligon untuk {kab}", file=sys.stderr)
            continue
        g = rapikan(pol, 0.0006)
        if g is None:
            continue
        fitur_kab.append(fitur(g, {
            "nama": kab,
            "tingkat": "kabupaten",
            "kabupaten": kab,
            "jumlah_desa": len(pol),
            "sumber": "OpenStreetMap/ODbL via border-desa-indonesia-geojson",
        }))
        print(f"  kabupaten {kab:<12} {len(pol):>4} desa", file=sys.stderr)

    # --- Kecamatan ---
    fitur_kec = []
    for (kab, kec), pol in sorted(per_kec.items()):
        if not kec:
            continue
        g = rapikan(pol, 0.0003, sisa_min=0.02)
        if g is None:
            continue
        fitur_kec.append(fitur(g, {
            "nama": kec,
            "tingkat": "kecamatan",
            "kabupaten": kab,
            "jumlah_desa": len(pol),
            "sumber": "OpenStreetMap/ODbL via border-desa-indonesia-geojson",
        }))

    for nama, fitur_list in (("kabupaten", fitur_kab), ("kecamatan", fitur_kec)):
        fc = {
            "type": "FeatureCollection",
            "name": f"batas_{nama}_wilayah_kerja_bpom_jember",
            "catatan": catatan,
            "features": fitur_list,
        }
        KELUARAN.mkdir(parents=True, exist_ok=True)
        out = KELUARAN / f"{nama}.geojson"
        with open(out, "w", encoding="utf-8") as f:
            json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  tulis {out}: {len(fitur_list)} fitur "
              f"({out.stat().st_size // 1024} KB)", file=sys.stderr)


if __name__ == "__main__":
    main()
