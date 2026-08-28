/*
 * Service worker LENTERA.
 *
 * Dua tugasnya:
 *   1. Memenuhi syarat pemasangan PWA. Chrome hanya menawarkan "Pasang
 *      aplikasi" bila ada service worker DAN halaman tetap memberi jawaban
 *      saat jaringan mati. Tanpa keduanya yang terpasang cuma pintasan
 *      peramban — berikon favicon dan berlencana Chrome, bukan ikon LENTERA.
 *   2. Menampilkan halaman "tidak ada koneksi" yang rapi, bukan galat bawaan.
 *
 * Yang TIDAK dilakukan: menyimpan salinan halaman atau jawaban API. Penyimpanan
 * agresif pernah membuat pembaruan aplikasi tidak muncul di perangkat pengguna,
 * jadi setiap permintaan selalu diambil dari jaringan lebih dulu. Isi cache
 * hanya berkas cadangan luring yang jumlahnya tetap.
 */

const CACHE = 'lentera-luring-v1';

// Berkas cadangan saat jaringan mati. Semuanya statis dan jarang berubah.
const BERKAS_LURING = ['/offline.html', '/logo-mark-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(BERKAS_LURING);
      // Versi baru langsung menggantikan yang lama tanpa menunggu tab ditutup.
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Bersihkan cache dari versi terdahulu, sisakan yang sedang dipakai.
      const kunci = await caches.keys();
      await Promise.all(kunci.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const permintaan = event.request;

  // Hanya GET satu asal yang ditangani; unggahan dan permintaan lintas-asal
  // (mis. ubin peta OpenStreetMap) dibiarkan lewat apa adanya.
  if (permintaan.method !== 'GET') return;
  if (new URL(permintaan.url).origin !== self.location.origin) return;

  // Perpindahan halaman: jaringan dulu, lalu halaman luring sebagai cadangan.
  if (permintaan.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(permintaan);
        } catch {
          const cache = await caches.open(CACHE);
          const luring = await cache.match('/offline.html');

          return luring ?? new Response('Jaringan tidak tersedia.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      })()
    );

    return;
  }

  // Berkas lain: jaringan dulu; bila gagal, pakai salinan cadangan bila ada.
  event.respondWith(
    (async () => {
      try {
        return await fetch(permintaan);
      } catch {
        const tersimpan = await caches.match(permintaan);

        return tersimpan ?? new Response('', {
          status: 504,
          statusText: 'Jaringan tidak tersedia',
        });
      }
    })()
  );
});
