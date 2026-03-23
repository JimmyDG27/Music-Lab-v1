// services/googleCalendar.js
// Google OAuth 2.0 (GIS) + Calendar API — read + write events.

const CLIENT_ID  = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES     = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'email',
  'profile',
].join(' ');

const EMAIL_KEY  = 'ml_google_email';
const UID_KEY    = 'ml_google_uid';
const TOKEN_KEY  = 'ml_gcal_token';
const EXPIRY_KEY = 'ml_gcal_expiry';

let tokenClient  = null;
let resolveAuth  = null;
let rejectAuth   = null;
let currentUid   = null;

export function setCurrentUid(uid) { currentUid = uid; }

// ── GIS ───────────────────────────────────────────────────────────────────────

function initTokenClient() {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope:     SCOPES,
    callback:  async (response) => {
      if (response.error) { rejectAuth?.(new Error(response.error)); return; }
      const expiry = Date.now() + (response.expires_in - 60) * 1000;
      sessionStorage.setItem(TOKEN_KEY,  response.access_token);
      sessionStorage.setItem(EXPIRY_KEY, String(expiry));
      if (!getSavedEmail()) {
        try {
          const r    = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` },
          });
          const data = await r.json();
          if (data.email) {
            localStorage.setItem(EMAIL_KEY, data.email);
            if (currentUid) localStorage.setItem(UID_KEY, currentUid);
          }
        } catch (_) {}
      }
      resolveAuth?.(response.access_token);
    },
  });
}

export function preloadGIS() {
  if (window.google?.accounts) { initTokenClient(); return; }
  const s  = document.createElement('script');
  s.src    = 'https://accounts.google.com/gsi/client';
  s.async  = true;
  s.onload = initTokenClient;
  document.head.appendChild(s);
}

export function isGISReady() { return tokenClient !== null; }

// ── Token ─────────────────────────────────────────────────────────────────────

function getStoredToken() {
  const token  = sessionStorage.getItem(TOKEN_KEY);
  const expiry = parseInt(sessionStorage.getItem(EXPIRY_KEY) || '0', 10);
  return (token && Date.now() < expiry) ? token : null;
}

export function getSavedEmail() {
  const v = localStorage.getItem(EMAIL_KEY);
  return (v && v !== 'undefined') ? v : null;
}

export function isCalendarConnected() { return !!getSavedEmail(); }

/** Call on app init — clears Google connection if it belongs to a different Supabase user. */
export function validateCalendarOwner(currentUid) {
  const savedUid = localStorage.getItem(UID_KEY);
  if (savedUid && savedUid !== currentUid) {
    disconnectCalendar();
  }
}

export function requestCalendarAccess(forceConsent = false) {
  const cached = getStoredToken();
  if (cached && !forceConsent) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject(new Error('GIS not ready')); return; }
    resolveAuth = resolve;
    rejectAuth  = reject;
    const prompt = (forceConsent || !isCalendarConnected()) ? 'consent' : '';
    tokenClient.requestAccessToken({ prompt });
  });
}

export function disconnectCalendar() {
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(UID_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getWeekStart(date = new Date()) {
  const d   = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

async function calendarFetch(accessToken, path, options = {}) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (res.status === 403) throw new Error('INSUFFICIENT_SCOPES');
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[Calendar] API error:', res.status, body);
    throw new Error(`Calendar API ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// ── API ───────────────────────────────────────────────────────────────────────

export async function fetchEvents(accessToken, timeMin, timeMax) {
  const params = new URLSearchParams({
    timeMin:      timeMin.toISOString(),
    timeMax:      timeMax.toISOString(),
    orderBy:      'startTime',
    singleEvents: 'true',
    maxResults:   '250',
  });
  const data = await calendarFetch(accessToken, `/calendars/primary/events?${params}`);
  return data.items || [];
}

export async function createEvent(accessToken, eventBody) {
  return calendarFetch(accessToken, '/calendars/primary/events', {
    method: 'POST',
    body:   JSON.stringify(eventBody),
  });
}

export async function updateEvent(accessToken, eventId, eventBody) {
  return calendarFetch(accessToken, `/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    body:   JSON.stringify(eventBody),
  });
}

export async function deleteEvent(accessToken, eventId) {
  return calendarFetch(accessToken, `/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
  });
}
