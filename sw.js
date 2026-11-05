// الملف القديم كان خدمة تشغيل للتطبيق على الجذر. التطبيق انتقل إلى /app/، فهذا الملف يمسح الكاش القديم ويلغي نفسه.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(cs => cs.forEach(c => c.navigate(c.url)))
  );
});
