import type { MetadataRoute } from "next";

/**
 * Manifest aplikasi web LENTERA.
 *
 * Sengaja dibuat sebagai konvensi berkas `app/manifest.ts`, bukan berkas statis
 * di `public/`. Next.js yang menyajikannya memastikan tajuk `Content-Type:
 * application/manifest+json` selalu benar — manifest yang tersaji sebagai
 * `text/plain` atau `text/html` diabaikan diam-diam oleh Chrome, dan akibatnya
 * aplikasi terpasang sebagai pintasan peramban berikon monogram domain,
 * bukan sebagai aplikasi berikon LENTERA.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LENTERA BPOM Jember",
    short_name: "LENTERA",
    description:
      "Layanan Elektronik Terpadu & Terintegrasi Balai POM di Jember — presensi, perizinan, pengawasan, dan layanan masyarakat.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0b1f3a",
    lang: "id",
    dir: "ltr",
    categories: ["government", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Ikon maskable dipakai Android untuk memotong sesuai bentuk ikon sistem.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
