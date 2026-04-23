const DB_NAME = 'BudgetTracker';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data');
      }
    };
  });
}

export async function saveData(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('data', 'readwrite');
    const store = tx.objectStore('data');
    const req = store.put(data, 'appData');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadData() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('data', 'readonly');
    const store = tx.objectStore('data');
    const req = store.get('appData');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
