/*
 * Service worker LENTERA.
 *
 * Tujuannya HANYA memenuhi syarat pemasangan PWA agar aplikasi terpasang
 * sebagai aplikasi sungguhan (memakai ikon LENTERA), bukan sekadar pintasan
 * peramban yang memakai favicon dan berlencana Chrome.
 *
 * Penanganan fetch sengaja dibuat "teruskan ke jaringan" tanpa menyimpan
 * salinan apa pun. Ini disengaja: penyimpanan agresif pernah membuat
 * pembaruan aplikasi tidak muncul di perangkat pengguna. Dengan pola ini,
 * setiap permintaan selalu mengambil versi terbaru dari server.
 */

self.addEventListener('install', () => {
  // Versi baru langsung menggantikan yang lama tanpa menunggu tab ditutup.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Bersihkan sisa cache dari versi terdahulu, bila ada.
      const kunci = await caches.keys();
      await Promise.all(kunci.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // Hanya permintaan GET yang ditangani; sisanya dibiarkan apa adanya.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      // Saat jaringan padam, tampilkan halaman terakhir yang masih tersimpan
      // peramban bila ada; jika tidak, biarkan peramban menampilkan galatnya.
      const tersimpan = await caches.match(event.request);
      if (tersimpan) return tersimpan;
      throw new Error('Jaringan tidak tersedia');
    })
  );
});
