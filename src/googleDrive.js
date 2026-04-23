const SCOPES = 'openid profile email https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'budget-tracker-data.json';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

let tokenClient = null;
let accessToken = null;
let userInfo = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

export async function initAndSignIn(clientId) {
  if (!clientId) throw new Error('Google Client ID is required');
  await loadScript('https://accounts.google.com/gsi/client');

  return new Promise((resolve, reject) => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
        } else {
          accessToken = response.access_token;
          resolve(response.access_token);
        }
      }
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export function getToken() { return accessToken; }
export function getUserInfo() { return userInfo; }

export async function fetchUserInfo() {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  userInfo = await res.json();
  return userInfo;
}

export function signOut() {
  if (accessToken && window.google?.accounts?.oauth2) {
    google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  userInfo = null;
}

async function driveRequest(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Authorization': `Bearer ${accessToken}`, ...options.headers }
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Drive API error ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function findFile() {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const data = await driveRequest(
    `${DRIVE_API}/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)`
  );
  return data?.files?.[0] || null;
}

export async function syncToFile(data) {
  const payload = JSON.stringify({ ...data, lastModified: Date.now() });
  const file = await findFile();

  const metadata = {
    name: FILE_NAME,
    mimeType: 'application/json',
    ...(!file && { parents: ['appDataFolder'] })
  };

  const boundary = 'bt_bnd_7x9z';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    payload,
    `--${boundary}--`
  ].join('\r\n');

  const url = file
    ? `${UPLOAD_API}/files/${file.id}?uploadType=multipart`
    : `${UPLOAD_API}/files?uploadType=multipart`;

  await driveRequest(url, {
    method: file ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body
  });
}

export async function loadFromFile() {
  const file = await findFile();
  if (!file) return null;

  const res = await fetch(`${DRIVE_API}/files/${file.id}?alt=media`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) return null;
  return res.json();
}
