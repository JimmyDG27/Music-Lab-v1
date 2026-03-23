// components/calendarDrawer.js
// Google Calendar drawer — FullCalendar 6.x + Google Calendar API.

import {
  requestCalendarAccess, disconnectCalendar,
  isCalendarConnected, getSavedEmail,
  fetchEvents, createEvent, updateEvent, deleteEvent,
  preloadGIS, isGISReady,
  validateCalendarOwner, setCurrentUid,
} from '../services/googleCalendar.js';
import { showToast }     from './toast.js';
import { confirmDelete } from './modal.js';

// ── State ──────────────────────────────────────────────────────────────────
const S = {
  token:       null,
  form:        null,        // null | { mode:'create'|'edit', event?:{}, date?, hour? }
  eventsCache: new Map(),   // 'startDate|endDate' → Promise<rawItems[]>
};

let fcInstance = null;

// ── Events cache helpers ───────────────────────────────────────────────────
function evCacheKey(start, end) {
  return `${new Date(start).toISOString().slice(0,10)}|${new Date(end).toISOString().slice(0,10)}`;
}

function prefetchEvents(token) {
  // Pre-fetch the current week (FullCalendar's initial view)
  const today = new Date();
  const dow   = today.getDay();
  const mon   = new Date(today);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const nextMon = new Date(mon);
  nextMon.setDate(mon.getDate() + 7);

  const key = evCacheKey(mon, nextMon);
  if (!S.eventsCache.has(key)) {
    S.eventsCache.set(key, fetchEvents(token, mon, nextMon).catch(() => []));
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDateInput(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function fmtTimeInput(dt) {
  const d = new Date(dt);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Load FullCalendar from CDN ─────────────────────────────────────────────
let fcPromise = null;
function ensureFullCalendar() {
  if (window.FullCalendar) return Promise.resolve();
  if (fcPromise) return fcPromise;
  fcPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src   = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js';
    s.async = false;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return fcPromise;
}

// ── FullCalendar init ──────────────────────────────────────────────────────
function initFullCalendar() {
  const el = document.getElementById('ml-cal-fc-container');
  if (!el || !window.FullCalendar) return;

  fcInstance = new window.FullCalendar.Calendar(el, {
    initialView:       window.innerWidth < 640 ? 'timeGridDay' : 'timeGridWeek',
    locale:            'bg',
    firstDay:          1,
    height:            '100%',
    nowIndicator:      true,
    allDaySlot:        true,
    slotMinTime:       '00:00:00',
    slotMaxTime:       '24:00:00',
    slotDuration:      '00:30:00',
    headerToolbar:     false,
    dayMaxEvents:      3,
    fixedWeekCount:    false,
    eventBackgroundColor: '#4f46e5',
    eventBorderColor:     '#4338ca',
    eventTextColor:       '#ffffff',
    buttonText: {
      today: 'Днес',
      month: 'Месец',
      week:  'Седмица',
      day:   'Ден',
    },
    events: async (info, success, failure) => {
      if (!S.token) { success([]); return; }
      const key = evCacheKey(info.start, info.end);
      try {
        if (!S.eventsCache.has(key)) {
          S.eventsCache.set(key, fetchEvents(S.token, info.start, info.end));
        }
        const items = await S.eventsCache.get(key);
        success(items.map(ev => ({
          id:    ev.id,
          title: ev.summary || '(без заглавие)',
          start: ev.start?.dateTime || ev.start?.date,
          end:   ev.end?.dateTime   || ev.end?.date,
          allDay: !ev.start?.dateTime,
          extendedProps: { raw: ev },
        })));
      } catch (err) {
        S.eventsCache.delete(key); // don't cache errors
        if (err.message === 'TOKEN_EXPIRED' || err.message === 'INSUFFICIENT_SCOPES') {
          S.token = null;
          sessionStorage.removeItem('ml_gcal_token');
          sessionStorage.removeItem('ml_gcal_expiry');
          showToast('Необходим е повторен достъп до Google Calendar. Моля, свържи се отново.', 'warning');
          setTimeout(() => {
            requestCalendarAccess(true)
              .then(token => { S.token = token; fcInstance?.refetchEvents(); })
              .catch(() => renderConnectScreen());
          }, 1500);
        } else {
          showToast('Грешка при зареждане на събитията.', 'danger');
        }
        failure(err);
      }
    },
    datesSet: () => updatePeriodLabel(),
    dateClick: (info) => {
      S.form = { mode: 'create', date: fmtDateInput(info.date), hour: info.date.getHours() };
      showForm();
    },
    eventClick: (info) => {
      S.form = { mode: 'edit', event: info.event.extendedProps.raw };
      showForm();
    },
  });

  fcInstance.render();

  // Scroll to 8am (slot height 36px × 2 slots/hr = 72px/hr)
  requestAnimationFrame(() => {
    const scroller = el.querySelector('.fc-timegrid-body')?.closest('.fc-scroller')
      ?? el.querySelector('.fc-scroller-liquid-absolute')
      ?? el.querySelector('.fc-scroller');
    if (scroller) scroller.scrollTop = 8 * 72 - 20;
  });
}

// ── Toolbar helpers ────────────────────────────────────────────────────────
function updatePeriodLabel() {
  const label = document.getElementById('ml-cal-period-label');
  if (label && fcInstance) label.textContent = fcInstance.view.title;
}

// ── Container toggle ──────────────────────────────────────────────────────
function showCalendar() {
  document.getElementById('ml-cal-fc-container')?.style.removeProperty('display');
  document.getElementById('ml-cal-toolbar')?.style.removeProperty('display');
  document.getElementById('ml-cal-form-container')?.style.setProperty('display', 'none');
}

function showForm() {
  document.getElementById('ml-cal-fc-container')?.style.setProperty('display', 'none');
  document.getElementById('ml-cal-toolbar')?.style.setProperty('display', 'none');
  const fc = document.getElementById('ml-cal-form-container');
  if (fc) { fc.style.removeProperty('display'); renderEventForm(fc); }
}

// ── Event form ─────────────────────────────────────────────────────────────
function renderEventForm(fc) {
  const { mode, event: ev } = S.form;
  const isEdit   = mode === 'edit';
  const isAllDay = isEdit && ev.start?.date && !ev.start?.dateTime;

  const defDate  = isEdit
    ? fmtDateInput(new Date(ev.start?.dateTime || ev.start?.date))
    : (S.form.date || fmtDateInput(new Date()));
  const defEndDate = isEdit && isAllDay
    ? fmtDateInput(new Date(new Date(ev.end.date).getTime() - 86400000)) // GCal end is exclusive
    : defDate;
  const defStart = isEdit && !isAllDay
    ? fmtTimeInput(ev.start.dateTime)
    : (S.form.hour !== undefined ? `${pad(S.form.hour)}:00` : '09:00');
  const defEnd = isEdit && !isAllDay
    ? fmtTimeInput(ev.end.dateTime)
    : (S.form.hour !== undefined ? `${pad(S.form.hour + 1)}:00` : '10:00');

  fc.innerHTML = `
    <div class="ml-cal-form-wrap">
      <div class="ml-cal-form-topbar">
        <button id="cal-form-back" class="ml-cal-form-back" aria-label="Назад">
          <i class="bi bi-x-lg"></i>
        </button>
        <div class="ml-cal-form-topbar-actions">
          ${isEdit ? `<button id="cal-ev-delete" class="ml-cal-form-del-btn" title="Изтрий">
            <i class="bi bi-trash3"></i>
          </button>` : ''}
          <button id="cal-ev-save" class="btn btn-primary btn-sm px-4">Запази</button>
        </div>
      </div>

      <div class="ml-cal-form-scroll">
        <!-- Title -->
        <div class="ml-cal-form-title-wrap">
          <input id="cal-ev-title" type="text" class="ml-cal-form-title-input"
                 placeholder="Добави заглавие"
                 value="${isEdit ? (ev.summary || '') : ''}" autofocus>
          <div class="ml-cal-form-title-underline"></div>
        </div>

        <!-- Date / Time / All-day -->
        <div class="ml-cal-form-section">
          <div class="ml-cal-form-icon-col">
            <i class="bi bi-clock"></i>
          </div>
          <div class="ml-cal-form-field-col">
            <!-- All-day toggle -->
            <label class="ml-cal-allday-toggle">
              <input type="checkbox" id="cal-ev-allday" ${isAllDay ? 'checked' : ''}>
              <span class="ml-cal-allday-track"></span>
              <span class="ml-cal-allday-label">Целодневно</span>
            </label>
            <!-- Time fields (hidden when all-day) -->
            <div id="cal-time-fields" class="ml-cal-time-fields${isAllDay ? ' ml-cal-hidden' : ''}">
              <div class="ml-cal-datetime-row">
                <input id="cal-ev-date"  type="date" class="ml-cal-date-input" value="${defDate}">
                <span class="ml-cal-time-sep">·</span>
                <input id="cal-ev-start" type="time" class="ml-cal-time-input" value="${defStart}">
                <span class="ml-cal-time-sep">–</span>
                <input id="cal-ev-end"   type="time" class="ml-cal-time-input" value="${defEnd}">
              </div>
            </div>
            <!-- Date-only fields (shown when all-day) -->
            <div id="cal-allday-fields" class="ml-cal-allday-fields${isAllDay ? '' : ' ml-cal-hidden'}">
              <div class="ml-cal-datetime-row">
                <input id="cal-ev-allday-start" type="date" class="ml-cal-date-input" value="${defDate}">
                <span class="ml-cal-time-sep">–</span>
                <input id="cal-ev-allday-end"   type="date" class="ml-cal-date-input" value="${defEndDate}">
              </div>
            </div>
          </div>
        </div>

        <!-- Location -->
        <div class="ml-cal-form-section">
          <div class="ml-cal-form-icon-col">
            <i class="bi bi-geo-alt"></i>
          </div>
          <div class="ml-cal-form-field-col">
            <input id="cal-ev-location" type="text" class="ml-cal-plain-input"
                   placeholder="Добави местоположение"
                   value="${isEdit ? (ev.location || '') : ''}">
          </div>
        </div>

        <!-- Description -->
        <div class="ml-cal-form-section ml-cal-form-section--top">
          <div class="ml-cal-form-icon-col">
            <i class="bi bi-card-text"></i>
          </div>
          <div class="ml-cal-form-field-col">
            <textarea id="cal-ev-desc" class="ml-cal-plain-input ml-cal-plain-textarea"
                      rows="3" placeholder="Добави описание">${isEdit ? (ev.description || '') : ''}</textarea>
          </div>
        </div>
      </div>
    </div>`;

  // All-day toggle
  fc.querySelector('#cal-ev-allday')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    fc.querySelector('#cal-time-fields')?.classList.toggle('ml-cal-hidden', checked);
    fc.querySelector('#cal-allday-fields')?.classList.toggle('ml-cal-hidden', !checked);
  });

  fc.querySelector('#cal-form-back')?.addEventListener('click', () => {
    S.form = null; showCalendar();
  });
  fc.querySelector('#cal-ev-save')?.addEventListener('click', saveEvent);
  fc.querySelector('#cal-ev-delete')?.addEventListener('click', () => removeEvent(S.form.event.id));
}

// ── Token refresh helper ───────────────────────────────────────────────────
async function refreshToken() {
  try {
    S.token = await requestCalendarAccess(false);
    return true;
  } catch {
    S.token = null;
    return false;
  }
}

// ── CRUD ───────────────────────────────────────────────────────────────────
async function saveEvent() {
  const title    = document.getElementById('cal-ev-title')?.value.trim();
  const desc     = document.getElementById('cal-ev-desc')?.value.trim();
  const location = document.getElementById('cal-ev-location')?.value.trim();
  const allDay   = document.getElementById('cal-ev-allday')?.checked;

  if (!title) { document.getElementById('cal-ev-title')?.focus(); return; }

  if (!S.token) {
    const ok = await refreshToken();
    if (!ok) { showToast('Сесията изтече. Моля, свържи се отново с Google.', 'warning'); return; }
  }

  let startObj, endObj;
  if (allDay) {
    const startDate = document.getElementById('cal-ev-allday-start')?.value;
    const endDateRaw = document.getElementById('cal-ev-allday-end')?.value;
    // Google Calendar end date is exclusive — add 1 day
    const endExcl = new Date(endDateRaw);
    endExcl.setDate(endExcl.getDate() + 1);
    startObj = { date: startDate };
    endObj   = { date: fmtDateInput(endExcl) };
  } else {
    const date  = document.getElementById('cal-ev-date')?.value;
    const start = document.getElementById('cal-ev-start')?.value;
    const end   = document.getElementById('cal-ev-end')?.value;
    const tz    = Intl.DateTimeFormat().resolvedOptions().timeZone;
    startObj = { dateTime: `${date}T${start}:00`, timeZone: tz };
    endObj   = { dateTime: `${date}T${end}:00`,   timeZone: tz };
  }

  const body = {
    summary:     title,
    description: desc || undefined,
    location:    location || undefined,
    start:       startObj,
    end:         endObj,
  };

  const btn = document.getElementById('cal-ev-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Записва…'; }

  try {
    if (S.form.mode === 'edit') {
      await updateEvent(S.token, S.form.event.id, body);
    } else {
      await createEvent(S.token, body);
    }
    S.form = null;
    S.eventsCache.clear();
    showCalendar();
    fcInstance?.refetchEvents();
  } catch (err) {
    console.error('[Calendar] save:', err.message);
    if (err.message === 'TOKEN_EXPIRED' || err.message === 'INSUFFICIENT_SCOPES') {
      S.token = null;
      sessionStorage.removeItem('ml_gcal_token');
      sessionStorage.removeItem('ml_gcal_expiry');
      showToast('Необходим е повторен достъп. Моля, разреши достъпа до Calendar отново.', 'warning');
      requestCalendarAccess(true).then(token => { S.token = token; }).catch(() => {});
    } else {
      showToast('Грешка при запис на събитието.', 'danger');
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Запази'; }
  }
}

async function removeEvent(eventId) {
  const confirmed = await confirmDelete({
    title:        'Изтрий събитие',
    message:      'Събитието ще бъде изтрито от Google Calendar.',
    confirmLabel: 'Изтрий',
  });
  if (!confirmed) return;
  try {
    await deleteEvent(S.token, eventId);
    S.form = null;
    S.eventsCache.clear();
    showCalendar();
    fcInstance?.refetchEvents();
  } catch (err) {
    console.error('[Calendar] delete:', err.message);
    showToast('Грешка при изтриване на събитието.', 'danger');
  }
}

// ── Screens ────────────────────────────────────────────────────────────────
function renderConnectScreen() {
  const body = document.getElementById('ml-cal-body');
  body.innerHTML = `
    <div class="ml-cal-connect">
      <div class="ml-cal-connect-icon"><i class="bi bi-calendar3"></i></div>
      <h3 class="ml-cal-connect-title">Свържи Google Calendar</h3>
      <p class="ml-cal-connect-desc">Влез с твоя Google акаунт, за да управляваш събитията си директно тук.</p>
      <button id="ml-cal-connect-btn" class="btn btn-primary ml-cal-connect-btn">
        <i class="bi bi-google me-2"></i>Свържи с Google
      </button>
    </div>`;

  body.querySelector('#ml-cal-connect-btn')?.addEventListener('click', () => {
    if (!isGISReady()) { setTimeout(() => connectFlow(true), 600); return; }
    body.innerHTML = `
      <div class="ml-cal-loading">
        <div class="spinner-border text-primary"></div>
        <p class="mt-3 text-muted small">Свързване…</p>
      </div>`;
    connectFlow(true);
  });
}

function renderCalendarScreen() {
  const body = document.getElementById('ml-cal-body');
  body.innerHTML = `
    <div class="ml-cal-account-bar">
      <span class="ml-cal-email"><i class="bi bi-google me-1"></i>${getSavedEmail()}</span>
      <button id="ml-cal-disconnect-btn" class="ml-cal-disconnect-btn">Прекъсни</button>
    </div>
    <div id="ml-cal-toolbar" class="ml-cal-toolbar">
      <div class="ml-cal-nav">
        <button class="ml-cal-nav-btn" id="cal-prev"><i class="bi bi-chevron-left"></i></button>
        <button class="ml-cal-nav-btn" id="cal-today">Днес</button>
        <button class="ml-cal-nav-btn" id="cal-next"><i class="bi bi-chevron-right"></i></button>
      </div>
      <span id="ml-cal-period-label" class="ml-cal-period-label"></span>
      <div class="ml-cal-view-toggle">
        <button class="ml-cal-vt-btn ml-cal-vt-day" data-view="timeGridDay">Ден</button>
        <button class="ml-cal-vt-btn" data-view="timeGridWeek">Седмица</button>
        <button class="ml-cal-vt-btn" data-view="dayGridMonth">Месец</button>
      </div>
    </div>
    <div id="ml-cal-fc-container" class="ml-cal-fc-container"></div>
    <div id="ml-cal-form-container" class="ml-cal-form-container" style="display:none"></div>`;

  body.querySelector('#ml-cal-disconnect-btn')?.addEventListener('click', () => {
    disconnectCalendar();
    S.token = null;
    S.eventsCache.clear();
    if (fcInstance) { fcInstance.destroy(); fcInstance = null; }
    renderConnectScreen();
  });

  body.querySelector('#cal-prev')?.addEventListener('click',  () => { fcInstance?.prev();  updatePeriodLabel(); });
  body.querySelector('#cal-next')?.addEventListener('click',  () => { fcInstance?.next();  updatePeriodLabel(); });
  body.querySelector('#cal-today')?.addEventListener('click', () => { fcInstance?.today(); updatePeriodLabel(); });

  body.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fcInstance?.changeView(btn.dataset.view);
    });
  });

  // Mark correct active view button
  const initView = window.innerWidth < 640 ? 'timeGridDay' : 'timeGridWeek';
  body.querySelectorAll('[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === initView);
  });

  initFullCalendar();
  updatePeriodLabel();
}

async function connectFlow(forceConsent = false) {
  try {
    S.token = await requestCalendarAccess(forceConsent);
    prefetchEvents(S.token); // start API call while FC initialises
    renderCalendarScreen();
  } catch (err) {
    console.error('[Calendar] auth:', err.message);
    renderConnectScreen();
  }
}

// ── Open / Close ───────────────────────────────────────────────────────────
export function openDrawer() {
  document.getElementById('ml-cal-drawer')?.classList.add('ml-cal-drawer--open');
  document.getElementById('ml-cal-overlay')?.classList.add('ml-cal-overlay--visible');
  document.body.style.overflow = 'hidden';

  // Destroy old instance before rebuilding DOM
  if (fcInstance) { fcInstance.destroy(); fcInstance = null; }
  S.form = null;

  if (!isCalendarConnected()) {
    renderConnectScreen();
    return;
  }

  // Show loading while getting token + loading FC library in parallel
  document.getElementById('ml-cal-body').innerHTML = `
    <div class="ml-cal-loading">
      <div class="spinner-border text-primary"></div>
      <p class="mt-3 text-muted small">Зареждане…</p>
    </div>`;

  // requestCalendarAccess is called synchronously here (important for GIS popup)
  const tokenPromise = requestCalendarAccess(false);
  const libPromise   = ensureFullCalendar();

  Promise.all([tokenPromise, libPromise])
    .then(([token]) => {
      S.token = token;
      prefetchEvents(token); // start API call while FC initialises
      renderCalendarScreen();
    })
    .catch(() => renderConnectScreen());
}

export function closeDrawer() {
  document.getElementById('ml-cal-drawer')?.classList.remove('ml-cal-drawer--open');
  document.getElementById('ml-cal-overlay')?.classList.remove('ml-cal-overlay--visible');
  document.body.style.overflow = '';
}

// ── Init ───────────────────────────────────────────────────────────────────
export function initCalendarDrawer(uid) {
  if (uid) {
    setCurrentUid(uid);
    validateCalendarOwner(uid);
  }
  preloadGIS();
  ensureFullCalendar(); // preload script in background

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="ml-cal-overlay" class="ml-cal-overlay" aria-hidden="true"></div>
    <div id="ml-cal-drawer" class="ml-cal-drawer" role="dialog" aria-modal="true" aria-label="Google Calendar">
      <div class="ml-cal-drawer-header">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-calendar3"></i>
          <span class="ml-cal-drawer-title">Google Calendar</span>
        </div>
        <button id="ml-cal-close" class="ml-cal-close" aria-label="Close">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <div id="ml-cal-body" class="ml-cal-drawer-body"></div>
    </div>`;
  document.body.appendChild(wrapper);

  document.getElementById('ml-cal-close')?.addEventListener('click', closeDrawer);
  document.getElementById('ml-cal-overlay')?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
}
