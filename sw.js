const CACHE = 'budget-tracker-v1';

const STATIC = [
  '/budgeting-app/',
  '/budgeting-app/index.html',
  '/budgeting-app/manifest.json',
  '/budgeting-app/icon-192.png',
  '/budgeting-app/icon-512.png',
  '/budgeting-app/src/main.js',
  '/budgeting-app/src/App.js',
  '/budgeting-app/src/context.js',
  '/budgeting-app/src/db.js',
  '/budgeting-app/src/utils.js',
  '/budgeting-app/src/googleDrive.js',
  '/budgeting-app/src/config.js',
  '/budgeting-app/src/data/defaults.js',
  '/budgeting-app/src/data/seedData.js',
  '/budgeting-app/src/components/Home.js',
  '/budgeting-app/src/components/Navigation.js',
  '/budgeting-app/src/components/ExpenseList.js',
  '/budgeting-app/src/components/ExpenseForm.js',
  '/budgeting-app/src/components/ExpenseDetail.js',
  '/budgeting-app/src/components/Charts.js',
  '/budgeting-app/src/components/Settings.js',
  '/budgeting-app/src/components/LoginScreen.js',
  '/budgeting-app/src/components/SearchableDropdown.js',
  '/budgeting-app/src/components/SupplierAvatar.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first for CDN and Google APIs
  if (url.hostname !== self.location.hostname) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for local static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
