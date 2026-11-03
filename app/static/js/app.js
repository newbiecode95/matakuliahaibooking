'use strict';

const root = document.getElementById('root');
const modalRoot = document.getElementById('modal-root');
const toastRoot = document.getElementById('toast-root');
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const STATUS = {
  pending: { label: 'Menunggu', cls: 'pill-pending', icon: 'clock' },
  approved: { label: 'Disetujui', cls: 'pill-approved', icon: 'check-circle' },
  rejected: { label: 'Ditolak', cls: 'pill-rejected', icon: 'x-circle' },
  cancelled: { label: 'Dibatalkan', cls: 'pill-neutral', icon: 'x' },
};

const CATEGORIES = {
  terbuka: { label: 'Ruang Terbuka', days: [1, 2, 3, 4, 5, 6], daysText: 'Senin–Sabtu', icon: 'door', blurb: 'Aula & area kampus' },
  kelas: { label: 'Ruang Kelas', days: [6], daysText: 'Sabtu', icon: 'school', blurb: 'Lab komputer & studio' },
  fasilitas: { label: 'Ruang Diskusi', days: [1, 2, 3, 4, 5], daysText: 'Senin–Jumat', icon: 'layout', blurb: 'Perpustakaan & Ruang INBIS' },
};

const ICONS = {
  'home': '<path d="M3 10.7 12 3l9 7.7"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/>',
  'calendar': '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/>',
  'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  'users': '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c.6-3.6 3.1-5.6 6.5-5.6s5.9 2 6.5 5.6"/><path d="M16 5.2a3 3 0 0 1 0 5.8M18 14.7c2 .6 3.2 2.4 3.5 5"/>',
  'door': '<path d="M4 21h16"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M14 12h.01"/>',
  'school': '<path d="m3 9 9-5 9 5-9 5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M21 9v6"/>',
  'book': '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 0 4 23z"/><path d="M4 5.5V21"/><path d="M8 7h8M8 11h6"/>',
  'history': '<path d="M3 12a9 9 0 1 0 2.7-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  'plus': '<path d="M12 5v14M5 12h14"/>',
  'minus': '<path d="M5 12h14"/>',
  'arrow-right': '<path d="M4 12h16"/><path d="m15 7 5 5-5 5"/>',
  'arrow-left': '<path d="M20 12H4"/><path d="m9 7-5 5 5 5"/>',
  'chevron-right': '<path d="m9 5 7 7-7 7"/>',
  'check': '<path d="m5 12 4.5 4.5L19 7"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16 9.3"/>',
  'x': '<path d="M6 6l12 12M18 6 6 18"/>',
  'x-circle': '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  'alert': '<path d="M12 3.5 22 20H2z"/><path d="M12 9v4M12 16.5h.01"/>',
  'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  'file': '<path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5z"/><path d="M14 2.5v5h5"/><path d="M9 13h6M9 17h4"/>',
  'download': '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/>',
  'search': '<circle cx="11" cy="11" r="7"/><path d="m16.2 16.2 4.3 4.3"/>',
  'logout': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  'grid': '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  'clipboard': '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><path d="M9 10h6M9 14h6M9 18h4"/>',
  'layout': '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/>',
  'map': '<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  'sparkle': '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  'upload': '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/>',
  'trash': '<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>',
  'edit': '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  'lock': '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  'shield': '<path d="M12 2.5 20 6v6c0 5-3.4 8.5-8 9.5-4.6-1-8-4.5-8-9.5V6z"/><path d="m8.5 12 2.5 2.5 4.5-4.5"/>',
  'arrow-up-right': '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  'spark': '<path d="M13 2 4.5 13H11l-1 9 8.5-11H12z"/>',
  'phone': '<path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  'mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/>',
};

const state = {
  account: null,
  config: null,
  today: null,
  now: null,
  view: 'home',
  rooms: null,
  bookings: null,
  adminBookings: null,
  adminRooms: null,
  stats: null,
  wizard: null,
  lastBooking: null,
  filters: { history: 'all', admin: 'all', query: '' },
  modalOpen: false,
  lastFocus: null,
  routingReady: false,
  loggingIn: false,
  autoLoginTimer: null,
};

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data || {};
  }
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function icon(name, size = 18, cls = '') {
  const path = ICONS[name] || ICONS.info;
  return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function initials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function parseISO(iso) { return new Date(`${iso}T00:00:00`); }

function dateLong(iso) {
  const d = parseISO(iso);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function dateCompact(iso) {
  const d = parseISO(iso);
  return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function dateShort(iso) {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function dateMeta(iso) {
  const d = parseISO(iso);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: MONTHS_SHORT[d.getMonth()],
    monthLong: MONTHS[d.getMonth()],
    weekday: DAYS_SHORT[d.getDay()],
    weekdayLong: DAYS[d.getDay()],
  };
}

function addDaysISO(iso, days) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekdayOf(iso) { return parseISO(iso).getDay(); }
function isSaturday(iso) { return weekdayOf(iso) === 6; }
function hasServiceSlot(iso) {
  if (iso !== state.today) return true;
  return Math.ceil(nowMinutes() / 30) * 30 + 30 <= 18 * 60;
}
function categoryMeta(category) {
  return CATEGORIES[category] || CATEGORIES.terbuka;
}
function categoryLabel(category) {
  return categoryMeta(category).label;
}
function categoryDays(category) {
  return categoryMeta(category).days;
}
function categoryAllowedOn(category, iso) {
  return categoryDays(category).includes(weekdayOf(iso));
}
function nextAllowedDate(category, iso) {
  const allowed = categoryDays(category);
  let candidate = iso;
  for (let i = 0; i < 14; i += 1) {
    if (allowed.includes(weekdayOf(candidate)) && (candidate !== state.today || hasServiceSlot(candidate))) {
      return candidate;
    }
    candidate = addDaysISO(candidate, 1);
  }
  return iso;
}
function toMinutes(time) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
}
function fmtTime(minutes) {
  const m = Math.max(0, Math.min(24 * 60, minutes));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} jam ${m} menit`;
  if (h) return `${h} jam`;
  return `${m} menit`;
}

function formTimestamp(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Makassar',
    }).format(new Date(value)).replace(/\./g, ':');
  } catch (err) {
    return value;
  }
}

function statusPill(status) {
  const meta = STATUS[status] || STATUS.cancelled;
  return `<span class="pill ${meta.cls}"><span class="pill-dot"></span>${meta.label}</span>`;
}

function setButtonLoading(btn, loading, label = 'Memproses...') {
  if (!btn) return;
  if (loading) {
    if (!btn.dataset.original) btn.dataset.original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>${esc(label)}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.original) {
      btn.innerHTML = btn.dataset.original;
      delete btn.dataset.original;
    }
  }
}

async function api(path, options = {}) {
  const opts = { method: options.method || 'GET', credentials: 'same-origin', headers: { ...(options.headers || {}) } };
  if (options.body instanceof FormData) {
    opts.body = options.body;
  } else if (options.body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(options.body);
  }
  const res = await fetch(path, opts);
  if (res.status === 204) return null;
  const ctype = res.headers.get('content-type') || '';
  let data = null;
  if (ctype.includes('application/json')) data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError((data && data.error) || 'Terjadi kesalahan. Silakan coba lagi.', res.status, data || {});
  return data;
}

function toast(title, message = '', type = 'success') {
  const ic = type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check-circle';
  const el = document.createElement('div');
  el.className = `toast is-${type}`;
  el.innerHTML = `<span class="toast-ic">${icon(ic, 14)}</span><div><strong>${esc(title)}</strong>${message ? `<p>${esc(message)}</p>` : ''}</div>`;
  toastRoot.appendChild(el);
  window.setTimeout(() => {
    el.classList.add('is-leaving');
    window.setTimeout(() => el.remove(), 260);
  }, 4400);
}

function paint(html) {
  const viewRoot = $('#view-root');
  if (!viewRoot) return;
  viewRoot.innerHTML = html;
  viewRoot.classList.remove('view-enter');
  void viewRoot.offsetWidth;
  viewRoot.classList.add('view-enter');
}

function paintError(message, hint = '') {
  paint(`<div class="panel"><div class="empty-state"><div class="empty-icon">${icon('alert', 22)}</div><h3>Terjadi kesalahan</h3><p>${esc(message)}${hint ? '<br>' + esc(hint) : ''}</p><button class="btn btn-secondary" type="button" data-action="retry-route">Coba lagi</button></div></div>`);
}

/* ------------------------------------------------------------------ auth */

function loginMarkup() {
  return `
  <div class="auth">
    <aside class="auth-stage">
      <div class="stage-rings"></div>
      <div class="stage-arc"></div>
      <div class="stage-grid"></div>
      <div class="stage-campus" aria-hidden="true"><img src="/static/assets/campus.jpg" alt=""></div>
      <div class="stage-brand">
        <img src="/static/assets/logo.svg" alt="Logo SIMPENAN">
        <div class="brand-word">SIMPENAN<span>Sistem Peminjaman Ruangan</span></div>
      </div>
      <div class="stage-copy">
        <span class="stage-eyebrow"><span class="dot"></span>Portal resmi IDB Bali</span>
        <p class="stage-display">Peminjaman ruangan<br><em>kampus.</em></p>
        <p>Sistem informasi untuk mengajukan, memantau, dan mengonfirmasi peminjaman ruangan bagi organisasi mahasiswa di Institut Desain dan Bisnis Bali.</p>
      </div>
      <div class="stage-deck" aria-hidden="true">
        <div class="deck-card deck-a">
          <img src="/static/assets/rooms/photos/aula.jpg" alt="">
          <div class="deck-label"><div>Aula<small>Kapasitas 100 orang</small></div><span class="pill pill-light">Terbuka</span></div>
        </div>
        <div class="deck-card deck-b">
          <img src="/static/assets/rooms/photos/lab-imac.jpg" alt="">
          <div class="deck-label"><div>Lab iMac<small>Kapasitas 30 orang</small></div><span class="pill pill-light">Kelas</span></div>
        </div>
        <div class="deck-chip"><span class="pulse"></span>Ruangan kampus</div>
      </div>
      <div class="stage-foot">
        <span>${icon('clock', 13)} Senin–Sabtu · 08.00–18.00 WITA</span>
        <span>Institut Desain dan Bisnis Bali</span>
      </div>
    </aside>
    <main class="auth-panel" id="main">
      <div class="auth-panel-meta"><span style="width:5px;height:5px;border-radius:50%;background:var(--green)"></span>Portal resmi IDB Bali</div>
      <div class="auth-form" id="auth-form">
        <span class="eyebrow"><span class="dot"></span>Akses Sistem</span>
        <h1>Masuk ke<br>SIMPENAN.</h1>
        <p class="auth-sub">Masukkan passcode 4 digit organisasi atau BAA untuk mengakses sistem.</p>
        <form id="login-form" novalidate>
          <div class="field">
            <div class="field-label"><label for="code-1">Passcode</label><span class="optional">4 digit</span></div>
            <div class="code-inputs">
              ${[1, 2, 3, 4].map((n) => `<input class="code-digit" id="code-${n}" data-index="${n - 1}" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="1" pattern="[0-9]*" aria-label="Digit ${n} dari 4" ${n === 1 ? 'autofocus' : ''}>`).join('')}
            </div>
            <div class="code-hint">${icon('lock', 12)} Login otomatis setelah 4 digit terisi.</div>
            <div class="login-error" id="login-error" role="alert"></div>
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit" id="login-submit" style="margin-top:18px">
            Masuk ke sistem ${icon('arrow-right', 16)}
          </button>
        </form>
        <div class="demo-block">
          <div class="demo-label"><span>Akun demo</span><span>Pilih akun</span></div>
          <div class="demo-grid">
            <button class="demo-chip" type="button" data-code="1234"><strong>HMJ Bisnis Digital</strong><span>1234</span></button>
            <button class="demo-chip" type="button" data-code="4321"><strong>UKM Thunder</strong><span>4321</span></button>
            <button class="demo-chip" type="button" data-code="0000"><strong>BAA IDB Bali</strong><span>0000</span></button>
          </div>
        </div>
        <p class="auth-note">${icon('lock', 13)} Passcode bersifat rahasia. Hubungi BAA apabila passcode organisasi Anda tidak berfungsi.</p>
      </div>
    </main>
  </div>`;
}

function renderLogin() {
  document.body.className = 'is-login';
  state.account = null;
  state.wizard = null;
  state.lastBooking = null;
  closeModal(true);
  root.innerHTML = loginMarkup();
  bindCodeInputs();
  $('#login-form').addEventListener('submit', handleLogin);
  $$('.demo-chip').forEach((chip) => {
    chip.addEventListener('click', () => fillDemoCode(chip.dataset.code));
  });
  const first = $('#code-1');
  if (first) window.setTimeout(() => first.focus(), 60);
}

function bindCodeInputs() {
  const inputs = $$('.code-digit');
  const update = () => inputs.forEach((inp) => inp.classList.toggle('is-filled', Boolean(inp.value)));
  inputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(-1);
      update();
      if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
      scheduleAutoLogin();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus();
        inputs[index - 1].value = '';
        update();
        scheduleAutoLogin();
      }
      if (e.key === 'ArrowLeft' && index > 0) inputs[index - 1].focus();
      if (e.key === 'ArrowRight' && index < inputs.length - 1) inputs[index + 1].focus();
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
      digits.split('').forEach((digit, offset) => {
        if (inputs[offset]) inputs[offset].value = digit;
      });
      update();
      const nextEmpty = inputs.find((inp) => !inp.value);
      (nextEmpty || inputs[inputs.length - 1]).focus();
      scheduleAutoLogin();
    });
    input.addEventListener('focus', () => input.select());
  });
}

function fillDemoCode(code) {
  const inputs = $$('.code-digit');
  String(code).split('').forEach((digit, index) => {
    if (inputs[index]) inputs[index].value = digit;
  });
  inputs.forEach((inp) => inp.classList.toggle('is-filled', Boolean(inp.value)));
  showLoginError('');
  const submit = $('#login-submit');
  if (submit) submit.focus();
  scheduleAutoLogin(160);
}

function showLoginError(message) {
  const box = $('#login-error');
  if (!box) return;
  if (!message) {
    box.classList.remove('is-visible');
    box.innerHTML = '';
    return;
  }
  box.innerHTML = `${icon('alert', 14)}<span>${esc(message)}</span>`;
  box.classList.add('is-visible');
}

function scheduleAutoLogin(delay = 280) {
  window.clearTimeout(state.autoLoginTimer);
  if (state.loggingIn) return;
  const inputs = $$('.code-digit');
  if (!inputs.length) return;
  if (!inputs.every((input) => /^\d$/.test(input.value))) return;
  state.autoLoginTimer = window.setTimeout(() => {
    if (state.loggingIn) return;
    const current = $$('.code-digit').map((input) => input.value).join('');
    if (!/^\d{4}$/.test(current)) return;
    const form = $('#login-form');
    if (form) form.requestSubmit();
  }, delay);
}

function showLoginTransition(account) {
  const isBaa = account.role === 'baa';
  const overlay = document.createElement('div');
  overlay.className = 'login-transition';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-label', 'Login berhasil. Menyiapkan dashboard.');
  overlay.innerHTML = `
    <div class="lt-campus" aria-hidden="true"><img src="/static/assets/campus.jpg" alt=""></div>
    <div class="lt-rings" aria-hidden="true"></div>
    <div class="lt-arc" aria-hidden="true"></div>
    <div class="lt-content">
      <div class="lt-mark">
        <span class="lt-orbit" aria-hidden="true"></span>
        <img src="/static/assets/logo.svg" alt="">
      </div>
      <div class="lt-brand">SIMPENAN<span>Sistem Peminjaman Ruangan</span></div>
      <div class="lt-status">${icon('check', 13)} Login berhasil</div>
      <h2>Selamat datang,<br><span>${esc(account.short_name)}</span></h2>
      <p>${isBaa ? 'Menyiapkan panel BAA...' : 'Menyiapkan dashboard organisasi...'}</p>
      <div class="lt-progress" aria-hidden="true"><span></span></div>
      <div class="lt-foot">Institut Desain dan Bisnis Bali</div>
    </div>`;
  document.body.appendChild(overlay);
  document.documentElement.classList.add('is-transitioning');
  enterApp();
  window.setTimeout(() => {
    overlay.classList.add('is-leaving');
    window.setTimeout(() => {
      overlay.remove();
      document.documentElement.classList.remove('is-transitioning');
      state.loggingIn = false;
      const main = $('#main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        try { main.focus({ preventScroll: true }); } catch (err) { /* no-op */ }
        window.setTimeout(() => main.removeAttribute('tabindex'), 0);
      }
    }, 520);
  }, 2000);
}

async function handleLogin(e) {
  e.preventDefault();
  if (state.loggingIn) return;
  const code = $$('.code-digit').map((inp) => inp.value).join('');
  const btn = $('#login-submit');
  if (!/^\d{4}$/.test(code)) {
    showLoginError('Masukkan 4 digit passcode organisasi Anda.');
    shakeAuth();
    return;
  }
  showLoginError('');
  state.loggingIn = true;
  window.clearTimeout(state.autoLoginTimer);
  setButtonLoading(btn, true, 'Memeriksa...');
  try {
    const result = await api('/api/auth/login', { method: 'POST', body: { code } });
    state.account = result.account;
    state.bookings = null;
    state.adminBookings = null;
    state.adminRooms = null;
    state.stats = null;
    state.wizard = null;
    state.lastBooking = null;
    showLoginTransition(result.account);
  } catch (err) {
    state.loggingIn = false;
    showLoginError(err.message);
    shakeAuth();
    $$('.code-digit').forEach((inp) => { inp.value = ''; inp.classList.remove('is-filled'); });
    const first = $('#code-1');
    if (first) first.focus();
    setButtonLoading(btn, false);
    if (err.status === 429) {
      btn.disabled = true;
      window.setTimeout(() => { btn.disabled = false; }, 5000);
    }
  }
}

function shakeAuth() {
  const form = $('#auth-form');
  if (!form) return;
  form.classList.remove('is-shaking');
  void form.offsetWidth;
  form.classList.add('is-shaking');
}

function enterApp() {
  if (!state.routingReady) {
    window.addEventListener('hashchange', route);
    state.routingReady = true;
  }
  const isBaa = state.account.role === 'baa';
  const allowed = isBaa ? ['baa', 'baa/requests', 'baa/rooms'] : ['home', 'book', 'history'];
  const fallback = isBaa ? '#/baa' : '#/home';
  const current = (location.hash || '').replace(/^#\/?/, '');
  if (!allowed.includes(current)) history.replaceState(null, '', fallback);
  route();
}

async function logout() {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch (err) { /* no-op */ }
  state.account = null;
  state.wizard = null;
  state.lastBooking = null;
  state.stats = null;
  state.bookings = null;
  closeModal(true);
  history.replaceState(null, '', location.pathname);
  renderLogin();
}

/* ------------------------------------------------------------------ shell */

function navItems() {
  if (state.account.role === 'baa') {
    return [
      { key: 'baa', href: '#/baa', label: 'Ringkasan', icon: 'layout' },
      { key: 'baa/requests', href: '#/baa/requests', label: 'Permohonan', icon: 'clipboard', badge: true },
      { key: 'baa/rooms', href: '#/baa/rooms', label: 'Ruangan', icon: 'door' },
    ];
  }
  return [
    { key: 'home', href: '#/home', label: 'Beranda', icon: 'home' },
    { key: 'book', href: '#/book', label: 'Ajukan Peminjaman', icon: 'plus' },
    { key: 'history', href: '#/history', label: 'Riwayat', icon: 'history' },
  ];
}

function pendingCount() {
  return (state.stats && state.stats.counts && state.stats.counts.pending) || 0;
}

function sidebar(active) {
  const account = state.account;
  const isBaa = account.role === 'baa';
  const items = navItems();
  const pending = pendingCount();
  return `
  <aside class="sidebar" aria-label="Panel navigasi">
    <a class="side-brand" href="${isBaa ? '#/baa' : '#/home'}" aria-label="SIMPENAN">
      <img src="/static/assets/logo.svg" alt="">
      <div class="brand-word">SIMPENAN<span>Sistem Peminjaman Ruangan</span></div>
    </a>
    <div class="side-org">
      <div class="org-mark">${esc(initials(account.short_name))}</div>
      <div style="min-width:0">
        <strong>${esc(account.short_name)}</strong>
        <span>${isBaa ? 'Administrasi Akademik' : 'Organisasi Mahasiswa'}</span>
      </div>
    </div>
    <nav class="side-nav" aria-label="Navigasi utama">
      <div class="side-label">Menu</div>
      ${items.map((item) => `
        <a class="side-link ${active === item.key ? 'is-active' : ''}" href="${item.href}">
          ${icon(item.icon, 17)}
          <span>${item.label}</span>
          ${item.badge ? `<span class="badge-count ${pending ? '' : 'hidden'}" id="nav-badge-requests">${pending}</span>` : ''}
        </a>`).join('')}
    </nav>
    <div class="side-foot">
      <div class="side-help">
        <strong>${icon(isBaa ? 'shield' : 'info', 13)} ${isBaa ? 'Panel BAA' : 'Bantuan'}</strong>
        ${isBaa ? 'Gunakan menu untuk meninjau permohonan dan mengelola ruangan.' : 'Hubungi BAA di kantor Administrasi Akademik untuk informasi lebih lanjut.'}
      </div>
      <div class="side-account">
        <div class="avatar">${esc(account.initials || initials(account.short_name))}</div>
        <div class="who">
          <strong>${esc(account.name)}</strong>
          <span>${isBaa ? 'Passcode BAA' : 'Passcode organisasi'}</span>
        </div>
        <button class="btn-icon" type="button" data-action="logout" aria-label="Keluar">${icon('logout', 16)}</button>
      </div>
    </div>
  </aside>`;
}

function mobileBar() {
  const account = state.account;
  const isBaa = account.role === 'baa';
  return `
  <div class="mobile-bar">
    <a class="brand-mini" href="${isBaa ? '#/baa' : '#/home'}">
      <img src="/static/assets/logo.svg" alt="">
      <div><span class="bw">SIMPENAN</span><span class="bs">${isBaa ? 'Portal BAA' : 'Portal Organisasi'}</span></div>
    </a>
    <div class="bar-actions">
      <span class="pill ${isBaa ? 'pill-teal' : 'pill-neutral'}">${esc(account.short_name)}</span>
      <button class="btn-icon" type="button" data-action="logout" aria-label="Keluar">${icon('logout', 16)}</button>
    </div>
  </div>`;
}

function mobileNav(active) {
  return `
  <nav class="mobile-nav" aria-label="Navigasi seluler">
    ${navItems().map((item) => `
      <a href="${item.href}" class="${active === item.key ? 'is-active' : ''}">
        ${icon(item.icon, 18)}
        <span>${item.key === 'baa' ? 'Ringkasan' : item.key === 'book' ? 'Ajukan' : item.label}</span>
      </a>`).join('')}
  </nav>`;
}

function viewSkeleton() {
  return `
  <div class="page-head">
    <div style="width:min(420px,80%)">
      <div class="skeleton sk-line" style="width:110px;margin-bottom:12px"></div>
      <div class="skeleton sk-line" style="width:70%;height:30px;margin-bottom:8px"></div>
      <div class="skeleton sk-line" style="width:52%"></div>
    </div>
  </div>
  <div class="skeleton" style="height:290px;border-radius:28px;margin-bottom:22px"></div>
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
    <div class="skeleton sk-card"></div><div class="skeleton sk-card"></div>
  </div>`;
}

function renderShell(active) {
  document.body.className = 'is-app';
  root.innerHTML = `
    <div class="app-shell">
      ${sidebar(active)}
      <div class="app-main">
        ${mobileBar()}
        <main id="main" class="app-content"><div id="view-root" class="view-enter">${viewSkeleton()}</div></main>
      </div>
    </div>
    ${mobileNav(active)}`;
  updateNavBadge();
}

function updateNavBadge() {
  const badge = $('#nav-badge-requests');
  if (!badge) return;
  const count = pendingCount();
  badge.textContent = String(count);
  badge.classList.toggle('hidden', !count);
}

function closeModal(silent = false) {
  if (!modalRoot.innerHTML) {
    state.modalOpen = false;
    return;
  }
  modalRoot.innerHTML = '';
  document.body.classList.remove('modal-open');
  state.modalOpen = false;
  if (!silent && state.lastFocus && document.contains(state.lastFocus)) {
    try { state.lastFocus.focus(); } catch (err) { /* no-op */ }
  }
}

function openModal(inner, opts = {}) {
  state.lastFocus = document.activeElement;
  modalRoot.innerHTML = `<div class="modal-backdrop" data-modal-backdrop><div class="modal ${opts.wide ? 'is-wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.label || 'Detail')}">${inner}</div></div>`;
  document.body.classList.add('modal-open');
  state.modalOpen = true;
  const modal = $('.modal', modalRoot);
  const backdrop = $('[data-modal-backdrop]', modalRoot);
  if (backdrop) {
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) closeModal();
    });
  }
  window.setTimeout(() => {
    const focusTarget = modal.querySelector('[data-autofocus], input, textarea, select, button, a');
    if (focusTarget) focusTarget.focus();
  }, 40);
}

document.addEventListener('keydown', (e) => {
  if (!state.modalOpen) return;
  if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
  if (e.key !== 'Tab') return;
  const modal = $('.modal', modalRoot);
  if (!modal) return;
  const focusables = $$('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])', modal).filter((el) => el.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* ------------------------------------------------------------------ routing */

function route() {
  if (!state.account) return;
  const isBaa = state.account.role === 'baa';
  let path = (location.hash || '').replace(/^#\/?/, '');
  if (!path) path = isBaa ? 'baa' : 'home';
  const allowed = isBaa ? ['baa', 'baa/requests', 'baa/rooms'] : ['home', 'book', 'history'];
  if (!allowed.includes(path)) {
    path = allowed[0];
    history.replaceState(null, '', isBaa ? '#/baa' : '#/home');
  }
  state.view = path;
  closeModal(true);
  window.scrollTo({ top: 0, behavior: 'auto' });
  renderShell(path);
  if (isBaa) {
    if (path === 'baa') loadAdminDashboard();
    if (path === 'baa/requests') loadAdminRequests();
    if (path === 'baa/rooms') loadAdminRooms();
    if (path !== 'baa') syncStats();
  } else {
    if (path === 'home') loadHome();
    if (path === 'book') startBookingView();
    if (path === 'history') loadHistory();
  }
}

/* ------------------------------------------------------------------ home */

async function loadHome() {
  try {
    const [bookingsRes, roomsRes] = await Promise.all([api('/api/bookings/mine'), api('/api/rooms')]);
    state.bookings = bookingsRes.bookings;
    state.rooms = roomsRes.rooms;
    if (state.view !== 'home') return;
    paint(homeMarkup());
    updateNavBadge();
  } catch (err) {
    if (state.view === 'home') paintError(err.message);
  }
}

function homeMarkup() {
  const account = state.account;
  const bookings = state.bookings || [];
  const rooms = state.rooms || [];
  const pending = bookings.filter((b) => b.status === 'pending').length;
  const approved = bookings.filter((b) => b.status === 'approved').length;
  const upcoming = bookings
    .filter((b) => b.status === 'approved' && b.date >= state.today)
    .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`));
  const next = upcoming[0];
  const recent = bookings.slice(0, 3);
  const featured = rooms;
  const aula = rooms.find((r) => r.name === 'Aula') || rooms[0];
  const lab = rooms.find((r) => r.name === 'Lab iMac') || rooms[1];

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow"><span class="dot"></span>Beranda Organisasi</span>
      <h1 class="page-title">Selamat datang, ${esc(account.short_name)}.</h1>
      <p class="page-sub">Ajukan peminjaman ruangan dan pantau status permohonan organisasi Anda.</p>
    </div>
    <div class="top-meta">
      <span class="meta-chip">${icon('calendar', 14)} ${dateLong(state.today)}</span>
      <span class="meta-chip user-chip"><span class="avatar">${esc(account.initials)}</span>${esc(account.name)}</span>
    </div>
  </div>

  <section class="hero reveal">
    <div class="hero-copy">
      <span class="eyebrow"><span class="dot"></span>Layanan Peminjaman Ruangan</span>
      <h2 class="hero-heading">Peminjaman ruangan<br><span class="accent">kampus.</span></h2>
      <p>Pilih tanggal, waktu, jumlah peserta, dan ruangan yang tersedia. Permohonan akan ditinjau oleh Bagian Administrasi Akademik (BAA).</p>
      <div class="hero-actions hero-cta">
        <a class="btn btn-amber btn-lg" href="#/book">Ajukan peminjaman ${icon('arrow-right', 16)}</a>
        <a class="btn btn-outline-light btn-lg" href="#/history">Lihat riwayat</a>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><strong>${pending}</strong><span>Menunggu</span></div>
        <div class="hero-stat"><strong>${approved}</strong><span>Disetujui</span></div>
        <div class="hero-stat"><strong>${rooms.length}</strong><span>Ruangan tersedia</span></div>
      </div>
    </div>
    <div class="hero-visual" aria-hidden="true">
      ${aula ? `<div class="hero-shot a"><img src="${esc(aula.image)}" alt=""><span class="shot-label">${esc(aula.name)} · ${aula.capacity} orang</span></div>` : ''}
      ${lab ? `<div class="hero-shot b"><img src="${esc(lab.image)}" alt=""><span class="shot-label">${esc(lab.name)} · ${lab.capacity} orang</span></div>` : ''}
      <div class="hero-float">
        <span class="icon-wrap">${icon(next ? 'calendar' : 'spark', 14)}</span>
        <div>
          <strong>${next ? esc(next.room_name) : 'Belum ada jadwal'}</strong>
          <span>${next ? `${dateShort(next.date)} · ${next.start_time}–${next.end_time}` : 'Ajukan peminjaman untuk memulai'}</span>
        </div>
      </div>
    </div>
  </section>

  <div class="home-grid">
    <div class="home-main">
      <section class="section" style="margin-top:0">
        <div class="section-head">
          <div><h2 class="section-title">${icon('clipboard', 17)} Permohonan terbaru</h2><p class="section-sub">Status permohonan yang sedang diproses.</p></div>
          <a class="section-link" href="#/history">Semua riwayat ${icon('arrow-right', 13)}</a>
        </div>
        <div class="booking-list">
          ${recent.length ? recent.map(bookingMiniCard).join('') : `
            <div class="empty-state">
              <div class="empty-icon">${icon('calendar', 22)}</div>
              <h3>Belum ada permohonan</h3>
              <p>Ajukan permohonan pertama Anda untuk menggunakan ruangan kampus.</p>
              <a class="btn btn-primary btn-sm" href="#/book">Ajukan peminjaman ${icon('arrow-right', 14)}</a>
            </div>`}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div><h2 class="section-title">${icon('door', 17)} Daftar ruangan</h2><p class="section-sub">Semua ruangan aktif. Ruang terbuka Senin–Sabtu, ruang kelas Sabtu, ruang diskusi Senin–Jumat.</p></div>
          <a class="section-link" href="#/book">Cek ketersediaan ${icon('arrow-right', 13)}</a>
        </div>
        <div class="room-grid">
          ${featured.map(homeRoomCard).join('')}
        </div>
      </section>
    </div>

    <aside class="home-side">
      <div class="panel">
        <div class="section-head" style="margin-bottom:10px">
          <div><h2 class="section-title" style="font-size:15px">${icon('calendar', 16)} Jadwal disetujui</h2></div>
        </div>
        ${next ? `
          <div class="upcoming-card">
            <div class="date-tile"><span class="month">${dateMeta(next.date).month}</span><span class="day">${dateMeta(next.date).day}</span><span class="wd">${dateMeta(next.date).weekday}</span></div>
            <div class="booking-info">
              <h3>${esc(next.room_name)}</h3>
              <div class="booking-meta"><span>${icon('clock', 12)} ${next.start_time}–${next.end_time}</span><span>${icon('users', 12)} ${next.participants} orang</span></div>
            </div>
          </div>
          <div class="info-band" style="margin-top:12px">${icon('check-circle', 14)} Permohonan telah disetujui BAA. Surat konfirmasi tersedia pada menu Riwayat.</div>
        ` : `
          <div class="empty-state" style="padding:22px 16px">
            <div class="empty-icon">${icon('sparkle', 20)}</div>
            <h3>Belum ada jadwal disetujui</h3>
            <p>Jadwal yang telah disetujui BAA akan ditampilkan di sini.</p>
          </div>
        `}
        <a class="btn btn-secondary btn-block btn-sm" href="#/book" style="margin-top:12px">${icon('plus', 14)} Ajukan peminjaman</a>
      </div>

      <div class="panel">
        <h3 style="font-size:15px;margin-bottom:10px">Ketentuan peminjaman</h3>
        <div class="rule-list">
          <div class="rule-item">${icon('clock', 15)}<div><strong>Jam operasional</strong><span>08.00–18.00 WITA, Senin–Sabtu.</span></div></div>
          <div class="rule-item">${icon('school', 15)}<div><strong>Ruang kelas</strong><span>Hanya dapat dipinjam pada hari Sabtu.</span></div></div>
          <div class="rule-item">${icon('layout', 15)}<div><strong>Ruang diskusi</strong><span>Perpustakaan & Ruang INBIS, Senin–Jumat.</span></div></div>
          <div class="rule-item">${icon('file', 15)}<div><strong>Proposal kegiatan</strong><span>Lampiran PDF bersifat opsional, maksimal 5 MB.</span></div></div>
        </div>
      </div>

      <div class="panel-soft">
        <div class="section-title" style="font-size:13px;margin-bottom:6px">${icon('users', 15)} Kontak person</div>
        <p class="small muted" style="line-height:1.6">Setiap permohonan memerlukan satu kontak person. Pastikan nama, NIM, dan nomor WhatsApp aktif agar BAA dapat menghubungi.</p>
      </div>
    </aside>
  </div>`;
}

function bookingMiniCard(b) {
  const meta = dateMeta(b.date);
  return `
  <button type="button" class="booking-card" data-action="open-booking" data-id="${b.id}">
    <div class="date-tile"><span class="month">${meta.month}</span><span class="day">${meta.day}</span><span class="wd">${meta.weekday}</span></div>
    <div class="booking-info">
      <h3>${esc(b.room_name)}</h3>
      <div class="booking-meta">
        <span>${icon('clock', 12)} ${esc(b.start_time)}–${esc(b.end_time)}</span>
        <span>${icon('users', 12)} ${b.participants} orang</span>
        <span>${icon('layout', 12)} ${esc(b.category_label)}</span>
      </div>
    </div>
    <div class="booking-side">
      ${statusPill(b.status)}
      <span class="btn btn-secondary btn-sm">Detail ${icon('chevron-right', 12)}</span>
    </div>
  </button>`;
}

function homeRoomCard(room) {
  return `
  <button type="button" class="room-card" data-action="book-room" data-category="${esc(room.category)}" data-capacity="${room.capacity}">
    <div class="room-media">
      <img src="${esc(room.image)}" alt="${esc(room.name)}" loading="lazy">
      <span class="room-tag">${esc(room.category_label)}</span>
      <span class="room-cap">${icon('users', 12)} ${room.capacity}</span>
    </div>
    <div class="room-body">
      <h3>${esc(room.name)}</h3>
      <p>${esc(room.location)}</p>
    </div>
  </button>`;
}

/* ------------------------------------------------------------------ history */

async function loadHistory() {
  try {
    const res = await api('/api/bookings/mine');
    state.bookings = res.bookings;
    if (state.view !== 'history') return;
    paintHistory();
  } catch (err) {
    if (state.view === 'history') paintError(err.message);
  }
}

function paintHistory() {
  const bookings = state.bookings || [];
  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    approved: bookings.filter((b) => b.status === 'approved').length,
    rejected: bookings.filter((b) => b.status === 'rejected').length,
  };
  const active = state.filters.history;
  const filtered = active === 'all' ? bookings : bookings.filter((b) => b.status === active);
  paint(`
    <div class="page-head">
      <div>
        <span class="eyebrow"><span class="dot"></span>Riwayat organisasi</span>
        <h1 class="page-title">Riwayat peminjaman.</h1>
        <p class="page-sub">Semua permohonan ${esc(state.account.short_name)} — lengkap dengan status dan surat konfirmasi.</p>
      </div>
      <a class="btn btn-primary" href="#/book">${icon('plus', 15)} Ajukan peminjaman</a>
    </div>
    <div class="filter-bar">
      <div class="tabs" role="tablist" aria-label="Filter status">
        ${[['all', 'Semua'], ['pending', 'Menunggu'], ['approved', 'Disetujui'], ['rejected', 'Ditolak']].map(([key, label]) => `
          <button class="tab ${active === key ? 'is-active' : ''}" type="button" role="tab" aria-selected="${active === key}" data-action="filter-history" data-filter="${key}">${label}<span class="count">${counts[key]}</span></button>`).join('')}
      </div>
      <span class="muted small">${filtered.length} permohonan</span>
    </div>
    <h2 class="sr-only">Daftar riwayat peminjaman</h2>
    <div class="history-list">
      ${filtered.length ? filtered.map(historyCard).join('') : `
        <div class="empty-state">
          <div class="empty-icon">${icon('history', 22)}</div>
          <h3>${active === 'all' ? 'Belum ada riwayat permohonan' : 'Tidak ada permohonan pada filter ini'}</h3>
          <p>${active === 'all' ? 'Permohonan yang Anda ajukan akan ditampilkan di sini.' : 'Pilih filter lain untuk melihat permohonan lainnya.'}</p>
          <a class="btn btn-primary btn-sm" href="#/book">Ajukan peminjaman</a>
        </div>`}
    </div>`);
}

function historyCard(b) {
  const meta = dateMeta(b.date);
  return `
  <article class="history-card">
    <div class="date-tile"><span class="month">${meta.month}</span><span class="day">${meta.day}</span><span class="wd">${meta.weekday}</span></div>
    <div class="history-info">
      <div class="h-top">
        <h3>${esc(b.room_name)}</h3>
        ${statusPill(b.status)}
      </div>
      <span class="history-code">${esc(b.code)} · ${esc(b.category_label)}</span>
      <div class="booking-meta" style="margin-top:4px">
        <span>${icon('calendar', 12)} ${dateShort(b.date)}</span>
        <span>${icon('clock', 12)} ${esc(b.start_time)}–${esc(b.end_time)}</span>
        <span>${icon('users', 12)} ${b.participants} orang</span>
      </div>
      <p class="history-purpose">${esc(b.purpose)}</p>
    </div>
    <div class="history-actions">
      <button class="btn btn-secondary btn-sm" type="button" data-action="open-booking" data-id="${b.id}">Detail</button>
      ${b.status === 'approved' ? `<a class="btn btn-primary btn-sm" href="/api/bookings/${b.id}/confirmation.pdf">${icon('download', 13)} Konfirmasi</a>` : ''}
    </div>
  </article>`;
}

/* ------------------------------------------------------------------ booking wizard */

function nowMinutes() {
  return state.now ? toMinutes(state.now) : 0;
}

function defaultWizard() {
  let date = state.today || new Date().toISOString().slice(0, 10);
  let start = '08:00';
  const now = nowMinutes();
  for (let i = 0; i < 14; i += 1) {
    const candidate = addDaysISO(date, i);
    if (weekdayOf(candidate) === 0) continue;
    const earliest = candidate === state.today ? Math.ceil(now / 30) * 30 : 8 * 60;
    if (earliest + 30 <= 18 * 60) {
      date = candidate;
      start = fmtTime(Math.max(8 * 60, earliest));
      break;
    }
  }
  return {
    step: 1,
    date,
    start,
    duration: 120,
    participants: 20,
    category: 'terbuka',
    room: null,
    availability: null,
    availabilityLoading: false,
    availabilityError: null,
    file: null,
    purpose: '',
    contact_name: '',
    contact_nim: '',
    contact_wa: '',
  };
}

function startBookingView() {
  if (!state.wizard || state.lastBooking) state.wizard = defaultWizard();
  renderShell('book');
  paintBookingShell();
}

function paintBookingShell() {
  const viewRoot = $('#view-root');
  if (!viewRoot) return;
  viewRoot.innerHTML = `
    <a class="back-link" href="#/home">${icon('arrow-left', 14)} Kembali ke beranda</a>
    <div class="page-head" style="margin-bottom:18px">
      <div>
        <span class="eyebrow"><span class="dot"></span>Formulir peminjaman</span>
        <h1 class="page-title">Ajukan peminjaman.</h1>
        <p class="page-sub">Formulir terdiri dari empat langkah. Pastikan jadwal dan data kontak person sudah benar.</p>
      </div>
      <span class="meta-chip">${icon('users', 13)} ${esc(state.account.short_name)}</span>
    </div>
    <div class="wizard-layout">
      <div class="wizard-main">
        <div class="panel">
          <div class="stepper" id="wizard-stepper">${stepIndicator()}</div>
          <div id="wizard-step"></div>
        </div>
      </div>
      <aside class="wizard-aside">
        <div id="wizard-summary"></div>
        <div class="panel-soft">
          <div class="section-title" style="font-size:12.5px;margin-bottom:5px">${icon('info', 14)} Sebelum mengirim</div>
          <p class="small muted" style="line-height:1.6;margin:0">Permohonan diperiksa BAA. Anda dapat memantau status dan mengunduh surat konfirmasi setelah disetujui.</p>
        </div>
      </aside>
    </div>`;
  viewRoot.classList.add('view-enter');
  renderStep();
}

function stepIndicator() {
  const step = state.wizard ? state.wizard.step : 1;
  const labels = ['Jadwal', 'Ruangan', 'Detail', 'Tinjau'];
  return labels.map((label, index) => {
    const n = index + 1;
    const cls = step === n ? 'is-active' : step > n ? 'is-done' : '';
    return `
      ${index ? '<span class="step-line"></span>' : ''}
      <div class="step ${cls}">
        <span class="step-num">${step > n ? icon('check', 12) : n}</span>
        <span class="step-label">${label}</span>
      </div>`;
  }).join('');
}

function renderStep() {
  const wizard = state.wizard;
  if (!wizard) return;
  const stepper = $('#wizard-stepper');
  if (stepper) stepper.innerHTML = stepIndicator();
  const target = $('#wizard-step');
  if (!target) return;
  if (wizard.step === 1) target.innerHTML = step1Markup();
  else if (wizard.step === 2) target.innerHTML = step2Markup();
  else if (wizard.step === 3) { target.innerHTML = step3Markup(); bindStep3(); }
  else if (wizard.step === 4) { target.innerHTML = step4Markup(); bindStep4(); }
  renderSummary();
}

function dateRailMarkup() {
  const wizard = state.wizard;
  const allowed = categoryDays(wizard.category);
  const pills = [];
  for (let i = 0; i < 90; i += 1) {
    const iso = addDaysISO(state.today, i);
    if (!hasServiceSlot(iso)) continue;
    if (!allowed.includes(weekdayOf(iso))) continue;
    if (pills.length >= 10) break;
    const meta = dateMeta(iso);
    pills.push(`
      <button class="date-pill ${wizard.date === iso ? 'is-active' : ''}" type="button" data-action="select-date" data-date="${iso}">
        <span class="wd">${meta.weekday}</span><span class="d">${meta.day}</span><span class="m">${meta.month}</span>
      </button>`);
  }
  return pills.join('');
}

function startOptionsMarkup() {
  const wizard = state.wizard;
  const earliest = wizard.date === state.today ? Math.ceil(nowMinutes() / 30) * 30 : 8 * 60;
  const options = [];
  for (let m = Math.max(8 * 60, earliest); m <= 18 * 60 - 30; m += 30) options.push(m);
  if (!options.length) return '<option value="">Tidak ada jam tersedia</option>';
  if (!options.includes(toMinutes(wizard.start))) wizard.start = fmtTime(options[0]);
  return options.map((m) => `<option value="${fmtTime(m)}" ${wizard.start === fmtTime(m) ? 'selected' : ''}>${fmtTime(m)} WITA</option>`).join('');
}

function updateStartSelect() {
  const select = $('#wizard-start');
  if (!select || !state.wizard) return;
  select.innerHTML = startOptionsMarkup();
  select.value = state.wizard.start;
}

function durationOptionsMarkup() {
  const wizard = state.wizard;
  const max = 18 * 60 - toMinutes(wizard.start);
  const options = [];
  for (let d = 30; d <= Math.min(600, max); d += 30) options.push(d);
  if (!options.includes(wizard.duration)) wizard.duration = options[options.length - 1] || 30;
  return options.map((d) => `<option value="${d}" ${wizard.duration === d ? 'selected' : ''}>${fmtDuration(d)}</option>`).join('');
}

function step1Markup() {
  const wizard = state.wizard;
  const end = toMinutes(wizard.start) + wizard.duration;
  const meta = categoryMeta(wizard.category);
  return `
    <div class="panel-head">
      <div><span class="panel-kicker">Langkah 1 dari 4</span><h2>Jadwal dan peserta</h2><p>Tentukan klasifikasi ruangan, tanggal, waktu, durasi, dan jumlah peserta.</p></div>
      <span class="pill pill-teal">${icon('calendar', 12)} ${dateCompact(wizard.date)}</span>
    </div>

    <div class="field">
      <div class="field-label"><span>Klasifikasi ruangan</span><span class="optional">Pilih salah satu</span></div>
      <div class="type-grid">
        ${Object.entries(CATEGORIES).map(([value, item]) => `
          <button type="button" class="type-card ${wizard.category === value ? 'is-active' : ''}" data-action="set-category" data-category="${value}">
            <span class="type-icon">${icon(item.icon, 16)}</span>
            <strong>${item.label}</strong>
            <span>${item.blurb}</span>
            <span class="type-check">${icon('check', 11)}</span>
          </button>`).join('')}
      </div>
      <span class="field-hint">${meta.label} tersedia ${meta.daysText}, pukul 08.00–18.00 WITA.</span>
    </div>

    <div class="field" style="margin-top:18px">
      <div class="field-label"><label>Tanggal peminjaman</label><span class="optional">Pilih tanggal</span></div>
      <div class="date-rail" id="date-rail">${dateRailMarkup()}</div>
      <div class="date-custom">
        ${icon('calendar', 14)}
        <input class="input" type="date" id="wizard-date" min="${state.today}" value="${esc(wizard.date)}" aria-label="Tanggal peminjaman">
        <span class="field-hint">${wizard.category === 'kelas' ? 'Tanggal mengikuti hari Sabtu.' : `Hanya ${meta.daysText}.`}</span>
      </div>
    </div>

    <div class="form-grid" style="margin-top:16px">
      <div class="field">
        <label class="field-label" for="wizard-start">Jam mulai</label>
        <select class="select" id="wizard-start">${startOptionsMarkup()}</select>
      </div>
      <div class="field">
        <label class="field-label" for="wizard-duration">Durasi</label>
        <select class="select" id="wizard-duration">${durationOptionsMarkup()}</select>
      </div>
      <div class="field">
        <label class="field-label" for="wizard-participants">Jumlah peserta</label>
        <div class="stepper-input">
          <button type="button" data-action="participants-step" data-delta="-5" aria-label="Kurangi peserta">${icon('minus', 14)}</button>
          <input type="number" id="wizard-participants" value="${wizard.participants}" min="1" max="1000" inputmode="numeric" aria-label="Jumlah peserta">
          <button type="button" data-action="participants-step" data-delta="5" aria-label="Tambah peserta">${icon('plus', 14)}</button>
        </div>
      </div>
      <div class="field">
        <div class="field-label"><span>Perkiraan selesai</span></div>
        <div class="end-time-box">
          <span class="end-time" id="end-time">${fmtTime(end)}</span>
          <span class="field-hint">WITA · maksimal 18.00</span>
        </div>
      </div>
    </div>

    <div class="wizard-actions">
      <span class="field-hint">${icon('info', 13)} Jadwal dapat diubah sebelum permohonan dikirim.</span>
      <button class="btn btn-primary btn-lg" type="button" data-action="wizard-next">Cek ketersediaan ${icon('arrow-right', 16)}</button>
    </div>`;
}

function step2Markup() {
  const wizard = state.wizard;
  if (wizard.availabilityLoading) {
    return `
      <div class="panel-head"><div><span class="panel-kicker">Langkah 2 dari 4</span><h2>Memuat ketersediaan ruangan...</h2><p>Memeriksa ketersediaan pada jadwal yang dipilih.</p></div></div>
      <div class="room-grid">
        <div class="skeleton sk-room"></div><div class="skeleton sk-room"></div>
        <div class="skeleton sk-room"></div><div class="skeleton sk-room"></div>
      </div>`;
  }
  if (wizard.availabilityError) {
    return `
      <div class="panel-head"><div><span class="panel-kicker">Langkah 2 dari 4</span><h2>Ketersediaan ruangan</h2></div></div>
      <div class="error-banner">${icon('alert', 15)} ${esc(wizard.availabilityError)}</div>
      <div class="wizard-actions">
        <button class="btn btn-secondary" type="button" data-action="wizard-goto" data-step="1">${icon('arrow-left', 14)} Ubah jadwal</button>
        <button class="btn btn-primary" type="button" data-action="retry-availability">Coba lagi</button>
      </div>`;
  }
  const availability = wizard.availability;
  if (!availability) return '';
  const rooms = availability.rooms
    .filter((room) => room.category === wizard.category)
    .sort((a, b) => (Number(b.available) - Number(a.available)) || ((a.sort_order || 0) - (b.sort_order || 0)));
  const availableCount = rooms.filter((r) => r.available).length;
  const selected = wizard.room;
  const meta = categoryMeta(wizard.category);
  return `
    <div class="panel-head">
      <div><span class="panel-kicker">Langkah 2 dari 4</span><h2>Pilih ruangan.</h2><p>${availableCount} dari ${rooms.length} ruangan tersedia untuk jadwal ini.</p></div>
      <button class="btn btn-secondary btn-sm" type="button" data-action="wizard-goto" data-step="1">${icon('edit', 13)} Ubah jadwal</button>
    </div>
    <div class="availability-banner ${availableCount ? '' : 'is-warn'}">
      ${icon(availableCount ? 'check-circle' : 'alert', 15)}
      <span>${availableCount ? `Jadwal ${dateCompact(wizard.date)} pukul ${wizard.start}–${fmtTime(toMinutes(wizard.start) + wizard.duration)} tersedia di ${availableCount} ${meta.label.toLowerCase()}.` : 'Tidak ada ruangan yang sesuai. Ubah jam, durasi, jumlah peserta, atau tanggal.'}</span>
    </div>
    <div class="room-summary-strip">
      <span>${icon('calendar', 12)} ${dateCompact(wizard.date)}</span>
      <span>${icon('clock', 12)} ${wizard.start}–${fmtTime(toMinutes(wizard.start) + wizard.duration)}</span>
      <span>${icon('users', 12)} ${wizard.participants} peserta</span>
      <span>${icon(meta.icon, 12)} ${meta.label}</span>
    </div>
    ${rooms.length ? `<div class="room-grid">${rooms.map((room) => roomCard(room, selected && selected.id === room.id)).join('')}</div>` : `
      <div class="empty-state">
        <div class="empty-icon">${icon('door', 22)}</div>
        <h3>Belum ada ruangan</h3>
        <p>Klasifikasi ini belum memiliki ruangan aktif. Hubungi BAA untuk informasi lebih lanjut.</p>
        <button class="btn btn-secondary btn-sm" type="button" data-action="wizard-goto" data-step="1">Ubah pengaturan</button>
      </div>`}
    <div class="wizard-actions">
      <button class="btn btn-secondary" type="button" data-action="wizard-goto" data-step="1">${icon('arrow-left', 14)} Kembali</button>
      <button class="btn btn-primary btn-lg" type="button" data-action="wizard-next" ${selected ? '' : 'disabled'}>Lanjut ke detail ${icon('arrow-right', 16)}</button>
    </div>`;
}

function roomCard(room, selected) {
  const availabilityClass = room.available ? 'is-selectable' : 'is-unavailable';
  return `
  <button type="button" class="room-card ${availabilityClass} ${selected ? 'is-selected' : ''}" ${room.available ? `data-action="select-room" data-id="${room.id}"` : 'disabled'}>
    <div class="room-media">
      <img src="${esc(room.image)}" alt="${esc(room.name)}" loading="lazy">
      <span class="room-tag">${esc(room.category_label)}</span>
      <span class="room-cap">${icon('users', 12)} ${room.capacity} orang</span>
      <span class="room-pick">${icon('check', 13)}</span>
    </div>
    <div class="room-body">
      <h3>${esc(room.name)}</h3>
      <p>${esc(room.location)}</p>
      <div class="room-facilities">${(room.facilities || []).slice(0, 3).map((f) => `<span class="tag">${esc(f)}</span>`).join('')}</div>
      ${!room.available ? `<div class="room-reason">${icon('alert', 12)} <span>${esc((room.reasons || ['Tidak tersedia']).join(' · '))}</span></div>` : ''}
    </div>
  </button>`;
}

function step3Markup() {
  const wizard = state.wizard;
  return `
    <div class="panel-head">
      <div><span class="panel-kicker">Langkah 3 dari 4</span><h2>Detail kegiatan</h2><p>Isi tujuan peminjaman dan data kontak person yang dapat dihubungi BAA.</p></div>
      <span class="pill pill-teal">${icon('file', 12)} Lampiran opsional</span>
    </div>
    <div class="room-summary-strip">
      <span>${icon('door', 12)} ${esc(wizard.room ? wizard.room.name : 'Ruangan')}</span>
      <span>${icon('calendar', 12)} ${dateShort(wizard.date)}</span>
      <span>${icon('clock', 12)} ${wizard.start}–${fmtTime(toMinutes(wizard.start) + wizard.duration)}</span>
      <span>${icon('users', 12)} ${wizard.participants} peserta</span>
    </div>

    <div class="stack">
      <div class="field">
        <div class="field-label"><label for="purpose">Tujuan peminjaman</label><span class="optional"><span id="purpose-count">${(wizard.purpose || '').length}</span>/600</span></div>
        <textarea class="textarea" id="purpose" maxlength="600" placeholder="Contoh: Seminar nasional bisnis digital dengan 80 peserta, membutuhkan panggung dan sound system.">${esc(wizard.purpose)}</textarea>
        <span class="field-hint">Jelaskan kegiatan, kebutuhan ruangan, dan informasi lain yang relevan.</span>
        <div class="field-error" id="err-purpose"></div>
      </div>

      <div class="field">
        <div class="field-label"><span>Proposal kegiatan</span><span class="optional">PDF · opsional, maks. 5 MB</span></div>
        <div id="file-slot">${fileSlotContent()}</div>
        <div class="field-error" id="err-file"></div>
      </div>

      <div class="section-rule" style="margin:6px 0 2px">Kontak person</div>
      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="contact-name">Nama lengkap</label>
          <input class="input" id="contact-name" type="text" autocomplete="name" placeholder="Nama perwakilan organisasi" value="${esc(wizard.contact_name)}">
          <div class="field-error" id="err-contact-name"></div>
        </div>
        <div class="field">
          <label class="field-label" for="contact-nim">NIM</label>
          <input class="input" id="contact-nim" type="text" inputmode="numeric" autocomplete="off" placeholder="Contoh: 2023010234" value="${esc(wizard.contact_nim)}">
          <div class="field-error" id="err-contact-nim"></div>
        </div>
        <div class="field span-2">
          <label class="field-label" for="contact-wa">Nomor WhatsApp</label>
          <input class="input" id="contact-wa" type="tel" inputmode="tel" autocomplete="tel" placeholder="Contoh: 081234567890" value="${esc(wizard.contact_wa)}">
          <div class="field-error" id="err-contact-wa"></div>
        </div>
      </div>
    </div>

    <div class="wizard-actions">
      <button class="btn btn-secondary" type="button" data-action="wizard-goto" data-step="2">${icon('arrow-left', 14)} Kembali</button>
      <button class="btn btn-primary btn-lg" type="button" data-action="wizard-next">Tinjau permohonan ${icon('arrow-right', 16)}</button>
    </div>`;
}

function fileSlotContent() {
  const file = state.wizard && state.wizard.file;
  if (file) {
    const size = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    return `
      <div class="file-pill">
        <span class="file-ic">${icon('file', 16)}</span>
        <div style="min-width:0"><strong>${esc(file.name)}</strong><span>PDF · ${size} · siap dikirim</span></div>
        <button class="btn-icon" type="button" data-action="remove-file" aria-label="Hapus lampiran">${icon('x', 15)}</button>
      </div>`;
  }
  return `
    <div class="dropzone" id="dropzone" aria-label="Unggah proposal PDF">
      <input type="file" id="proposal-file" accept="application/pdf,.pdf" aria-label="Pilih proposal PDF">
      <span class="dz-icon">${icon('upload', 17)}</span>
      <strong>Tarik PDF ke sini atau klik untuk memilih</strong>
      <span>Lampiran bersifat opsional. Format PDF, maksimal 5 MB.</span>
    </div>`;
}

function bindStep3() {
  bindProposalInput();
  const purpose = $('#purpose');
  if (purpose) {
    purpose.addEventListener('input', () => {
      state.wizard.purpose = purpose.value;
      const counter = $('#purpose-count');
      if (counter) counter.textContent = String(purpose.value.length);
      purpose.classList.remove('is-invalid');
      const err = $('#err-purpose');
      if (err) err.textContent = '';
    });
  }
  const map = [
    ['contact-name', 'contact_name'],
    ['contact-nim', 'contact_nim'],
    ['contact-wa', 'contact_wa'],
  ];
  map.forEach(([id, key]) => {
    const input = $(`#${id}`);
    if (!input) return;
    input.addEventListener('input', () => {
      state.wizard[key] = input.value;
      input.classList.remove('is-invalid');
      const err = $(`#err-${id}`);
      if (err) err.textContent = '';
    });
  });
}

function bindProposalInput() {
  const input = $('#proposal-file');
  if (input) {
    input.addEventListener('change', () => {
      if (input.files && input.files[0]) acceptFile(input.files[0]);
    });
  }
  const dz = $('#dropzone');
  if (!dz) return;
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('is-dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('is-dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('is-dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) acceptFile(e.dataTransfer.files[0]);
  });
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (input) input.click(); }
  });
}

function acceptFile(file) {
  const err = $('#err-file');
  if (err) err.textContent = '';
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    if (err) err.textContent = 'Lampiran harus berformat PDF.';
    toast('Format tidak didukung', 'Unggah proposal dalam format PDF.', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    if (err) err.textContent = 'Ukuran PDF maksimal 5 MB.';
    toast('File terlalu besar', 'Maksimal ukuran proposal adalah 5 MB.', 'error');
    return;
  }
  state.wizard.file = file;
  const slot = $('#file-slot');
  if (slot) { slot.innerHTML = fileSlotContent(); bindProposalInput(); }
  const dz = $('#dropzone');
  if (dz) dz.classList.remove('is-invalid');
}

function step4Markup() {
  const wizard = state.wizard;
  const room = wizard.room || {};
  return `
    <div class="panel-head">
      <div><span class="panel-kicker">Langkah 4 dari 4</span><h2>Tinjau permohonan.</h2><p>Periksa kembali data permohonan sebelum dikirim ke BAA.</p></div>
      <span class="pill pill-pending">${icon('clock', 12)} Menunggu BAA</span>
    </div>

    <div class="review-grid">
      <div class="review-block" style="grid-column:1/-1">
        <div class="rb-label">Ruangan</div>
        <div class="review-room">
          ${room.image ? `<img src="${esc(room.image)}" alt="${esc(room.name)}">` : ''}
          <div>
            <div class="rb-value" style="font-size:14px">${esc(room.name || '—')}</div>
            <div class="rb-sub">${esc(room.location || '')} · ${esc(room.category_label || '')}</div>
            <div class="rb-sub">Kapasitas ${room.capacity || '—'} orang</div>
          </div>
        </div>
      </div>
      <div class="review-block">
        <div class="rb-label">Tanggal</div>
        <div class="rb-value">${dateLong(wizard.date)}</div>
      </div>
      <div class="review-block">
        <div class="rb-label">Waktu</div>
        <div class="rb-value">${wizard.start} – ${fmtTime(toMinutes(wizard.start) + wizard.duration)} WITA</div>
        <div class="rb-sub">${fmtDuration(wizard.duration)}</div>
      </div>
      <div class="review-block">
        <div class="rb-label">Jumlah peserta</div>
        <div class="rb-value">${wizard.participants} orang</div>
      </div>
      <div class="review-block">
        <div class="rb-label">Klasifikasi</div>
        <div class="rb-value">${categoryLabel(wizard.category)}</div>
      </div>
      <div class="review-block" style="grid-column:1/-1">
        <div class="rb-label">Tujuan peminjaman</div>
        <div class="rb-value" style="font-weight:500;color:var(--ink-2)">${esc(wizard.purpose)}</div>
      </div>
      <div class="review-block">
        <div class="rb-label">Kontak person</div>
        <div class="rb-value">${esc(wizard.contact_name)}</div>
        <div class="rb-sub">NIM ${esc(wizard.contact_nim)} · WhatsApp ${esc(wizard.contact_wa)}</div>
      </div>
      <div class="review-block">
        <div class="rb-label">Lampiran proposal</div>
        <div class="rb-value" style="word-break:break-all">${esc(wizard.file ? wizard.file.name : 'Tidak ada lampiran (opsional)')}</div>
        <div class="rb-sub">${wizard.file ? (wizard.file.size > 1024 * 1024 ? `${(wizard.file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(wizard.file.size / 1024))} KB`) : ''}</div>
      </div>
    </div>

    <label class="checkbox" style="margin-top:16px">
      <input type="checkbox" id="terms">
      <span>Saya menyatakan bahwa data di atas benar dan menyetujui ketentuan penggunaan ruangan IDB Bali. Saya bertanggung jawab atas kebersihan dan ketertiban ruangan.</span>
    </label>
    <div class="error-banner" id="submit-error" style="display:none;margin-top:14px"></div>

    <div class="wizard-actions">
      <button class="btn btn-secondary" type="button" data-action="wizard-goto" data-step="3">${icon('arrow-left', 14)} Kembali</button>
      <button class="btn btn-primary btn-lg" type="button" id="submit-booking" data-action="submit-booking" disabled>Kirim permohonan ${icon('arrow-right', 16)}</button>
    </div>`;
}

function bindStep4() {
  const terms = $('#terms');
  const submit = $('#submit-booking');
  if (terms && submit) {
    terms.addEventListener('change', () => { submit.disabled = !terms.checked; });
  }
}

function renderSummary() {
  const target = $('#wizard-summary');
  if (!target || !state.wizard) return;
  const wizard = state.wizard;
  const room = wizard.room;
  target.innerHTML = `
    <div class="summary-card">
      <span class="summary-label">Ringkasan permohonan</span>
      <h3>${room ? esc(room.name) : 'Ruangan belum dipilih'}</h3>
      <div class="summary-rows">
        <div class="summary-row"><span>Tanggal</span><strong>${dateShort(wizard.date)}</strong></div>
        <div class="summary-row"><span>Waktu</span><strong>${wizard.start}–${fmtTime(toMinutes(wizard.start) + wizard.duration)}</strong></div>
        <div class="summary-row"><span>Durasi</span><strong>${fmtDuration(wizard.duration)}</strong></div>
        <div class="summary-row"><span>Peserta</span><strong>${wizard.participants} orang</strong></div>
        <div class="summary-row"><span>Klasifikasi</span><strong>${categoryLabel(wizard.category)}</strong></div>
      </div>
      <div class="summary-divider"></div>
      ${room ? `
        <div class="summary-room">
          <img src="${esc(room.image)}" alt="">
          <div><strong>${esc(room.name)}</strong><span>${esc(room.location)} · ${room.capacity} orang</span></div>
        </div>` : `<div class="summary-row"><span>Ruangan</span><strong class="is-empty">Belum dipilih</strong></div>`}
      <div class="summary-tip">${icon('info', 14)}<span>${room ? 'Pastikan jadwal tidak bentrok dengan agenda organisasi Anda.' : 'Pilih tanggal dan jam, lalu tentukan ruangan yang tersedia.'}</span></div>
    </div>`;
}

function setWizardDate(value) {
  const wizard = state.wizard;
  if (!wizard) return;
  if (!value || value < state.today) {
    toast('Tanggal tidak valid', 'Pilih hari ini atau tanggal setelahnya.', 'error');
    return;
  }
  if (value === state.today && Math.ceil(nowMinutes() / 30) * 30 + 30 > 18 * 60) {
    toast('Jam layanan hari ini telah berakhir', 'Silakan pilih tanggal berikutnya.', 'error');
    return;
  }
  if (!categoryAllowedOn(wizard.category, value)) {
    const meta = categoryMeta(wizard.category);
    toast(`${meta.label} tidak tersedia pada tanggal tersebut`, `Pilih tanggal ${meta.daysText}.`, 'error');
    const dateInput = $('#wizard-date');
    if (dateInput) dateInput.value = wizard.date;
    return;
  }
  wizard.date = value;
  wizard.room = null;
  wizard.availability = null;
  const input = $('#wizard-date');
  if (input) input.value = value;
  const earliest = value === state.today ? Math.ceil(nowMinutes() / 30) * 30 : 8 * 60;
  if (toMinutes(wizard.start) < earliest) wizard.start = fmtTime(earliest);
  $$('.date-pill').forEach((pill) => pill.classList.toggle('is-active', pill.dataset.date === value));
  updateTypeCards();
  updateStartSelect();
  updateDurationSelect();
  updateEndTime();
  renderSummary();
}

function updateTypeCards() {
  const wizard = state.wizard;
  if (!wizard) return;
  $$('.type-card').forEach((card) => {
    card.classList.toggle('is-active', card.dataset.category === wizard.category);
  });
}

function updateDurationSelect() {
  const wizard = state.wizard;
  if (!wizard) return;
  const select = $('#wizard-duration');
  if (!select) return;
  select.innerHTML = durationOptionsMarkup();
  select.value = String(wizard.duration);
  updateEndTime();
}

function updateEndTime() {
  const wizard = state.wizard;
  const el = $('#end-time');
  if (!wizard || !el) return;
  el.textContent = fmtTime(toMinutes(wizard.start) + wizard.duration);
}

function syncStep1Fields() {
  const wizard = state.wizard;
  const start = $('#wizard-start');
  const duration = $('#wizard-duration');
  const participants = $('#wizard-participants');
  if (start) wizard.start = start.value;
  if (duration) wizard.duration = Number(duration.value) || wizard.duration;
  if (participants) wizard.participants = Math.max(1, Math.min(1000, Number(participants.value) || wizard.participants));
  const max = 18 * 60 - toMinutes(wizard.start);
  if (wizard.duration > max) wizard.duration = Math.max(30, Math.floor(max / 30) * 30);
}

function validateStep1() {
  const wizard = state.wizard;
  syncStep1Fields();
  const end = toMinutes(wizard.start) + wizard.duration;
  if (wizard.date === state.today && toMinutes(wizard.start) < nowMinutes()) {
    toast('Jam mulai sudah lewat', 'Pilih waktu setelah sekarang.', 'error');
    return false;
  }
  if (!wizard.start) {
    toast('Tidak ada jam tersedia', 'Pilih tanggal lain untuk jadwal ini.', 'error');
    return false;
  }
  if (end > 18 * 60) {
    toast('Melewati jam operasional', 'Kegiatan harus selesai paling lambat pukul 18.00 WITA.', 'error');
    return false;
  }
  if (end <= toMinutes(wizard.start) || wizard.duration < 30) {
    toast('Durasi tidak valid', 'Durasi minimal 30 menit.', 'error');
    return false;
  }
  if (wizard.participants < 1) {
    toast('Jumlah peserta tidak valid', 'Isi jumlah peserta minimal 1 orang.', 'error');
    return false;
  }
  if (!categoryAllowedOn(wizard.category, wizard.date)) {
    const meta = categoryMeta(wizard.category);
    toast(`${meta.label} tidak tersedia`, `Pilih tanggal ${meta.daysText}.`, 'error');
    return false;
  }
  return true;
}

async function loadAvailability() {
  const wizard = state.wizard;
  if (!wizard) return;
  wizard.availabilityLoading = true;
  wizard.availabilityError = null;
  wizard.step = 2;
  renderStep();
  scrollToWizardTop();
  const query = new URLSearchParams({
    date: wizard.date,
    start: wizard.start,
    duration: String(wizard.duration),
    participants: String(wizard.participants),
  });
  try {
    const data = await api(`/api/availability?${query.toString()}`);
    if (state.wizard !== wizard || state.view !== 'book') return;
    wizard.availability = data;
    wizard.availabilityLoading = false;
    scrollToWizardTop();
    if (wizard.room) {
      const fresh = data.rooms.find((room) => room.id === wizard.room.id);
      wizard.room = fresh && fresh.available ? fresh : null;
    }
    renderStep();
  } catch (err) {
    if (state.wizard !== wizard || state.view !== 'book') return;
    wizard.availabilityLoading = false;
    wizard.availabilityError = err.message;
    renderStep();
  }
}

function readStep3() {
  const wizard = state.wizard;
  const purpose = $('#purpose');
  const name = $('#contact-name');
  const nim = $('#contact-nim');
  const wa = $('#contact-wa');
  if (purpose) wizard.purpose = purpose.value.trim();
  if (name) wizard.contact_name = name.value.trim();
  if (nim) wizard.contact_nim = nim.value.trim();
  if (wa) wizard.contact_wa = wa.value.trim();
}

function clearFieldError(id) {
  const input = $(`#${id}`);
  if (input) input.classList.remove('is-invalid');
  const err = $(`#err-${id}`);
  if (err) err.textContent = '';
}

function markFieldError(id, message) {
  const input = $(`#${id}`);
  if (input) input.classList.add('is-invalid');
  const err = $(`#err-${id}`);
  if (err) err.textContent = message;
}

function validateStep3() {
  readStep3();
  const wizard = state.wizard;
  let ok = true;
  ['purpose', 'contact-name', 'contact-nim', 'contact-wa'].forEach(clearFieldError);
  const fileError = $('#err-file');
  if (fileError) fileError.textContent = '';

  if (!wizard.purpose || wizard.purpose.length < 10) {
    markFieldError('purpose', 'Tuliskan tujuan peminjaman minimal 10 karakter.');
    ok = false;
  }
  if (wizard.purpose.length > 600) {
    markFieldError('purpose', 'Tujuan peminjaman maksimal 600 karakter.');
    ok = false;
  }
  if (!wizard.contact_name || wizard.contact_name.length < 3) {
    markFieldError('contact-name', 'Nama kontak person minimal 3 karakter.');
    ok = false;
  }
  if (!/^\d{6,20}$/.test(wizard.contact_nim)) {
    markFieldError('contact-nim', 'NIM harus berupa 6–20 digit angka.');
    ok = false;
  }
  const waDigits = wizard.contact_wa.replace(/[^\d]/g, '');
  if (!/^\d{9,15}$/.test(waDigits)) {
    markFieldError('contact-wa', 'Nomor WhatsApp harus 9–15 digit angka.');
    ok = false;
  }
  if (!ok) toast('Lengkapi data terlebih dahulu', 'Periksa kembali kolom yang ditandai merah.', 'error');
  return ok;
}

async function submitBooking() {
  const wizard = state.wizard;
  if (!wizard || !wizard.room) return;
  const terms = $('#terms');
  if (!terms || !terms.checked) {
    toast('Setujui ketentuan', 'Centang pernyataan sebelum mengirim permohonan.', 'error');
    return;
  }
  const btn = $('#submit-booking');
  const errorBox = $('#submit-error');
  if (errorBox) errorBox.style.display = 'none';

  const formData = new FormData();
  formData.append('room_id', String(wizard.room.id));
  formData.append('date', wizard.date);
  formData.append('start', wizard.start);
  formData.append('duration', String(wizard.duration));
  formData.append('participants', String(wizard.participants));
  formData.append('purpose', wizard.purpose);
  formData.append('contact_name', wizard.contact_name);
  formData.append('contact_nim', wizard.contact_nim);
  formData.append('contact_wa', wizard.contact_wa);
  if (wizard.file) formData.append('attachment', wizard.file, wizard.file.name);

  setButtonLoading(btn, true, 'Mengirim permohonan...');
  try {
    const result = await api('/api/bookings', { method: 'POST', body: formData });
    state.lastBooking = result.booking;
    state.bookings = null;
    state.wizard = null;
    toast('Permohonan terkirim', 'BAA akan meninjau permohonan Anda.');
    paintSuccess(result.booking);
  } catch (err) {
    setButtonLoading(btn, false);
    if (errorBox) {
      errorBox.innerHTML = `${icon('alert', 15)} <span>${esc(err.message)}</span>`;
      errorBox.style.display = 'flex';
    }
    toast('Gagal mengirim', err.message, 'error');
  }
}

function paintSuccess(booking) {
  renderShell('book');
  const view = $('#view-root');
  if (!view) return;
  view.innerHTML = `
    <div class="success-wrap">
      <div class="success-mark">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg>
      </div>
      <span class="eyebrow" style="justify-content:center"><span class="dot"></span>Permohonan diterima</span>
      <h1>Permohonan berhasil dikirim.</h1>
      <p class="success-sub">Permohonan Anda telah diterima. Tim BAA akan melakukan peninjauan. Status dan surat konfirmasi dapat dilihat pada menu Riwayat.</p>
      <div class="success-code">${icon('file', 14)} ${esc(booking.code)}</div>
      <div class="success-details">
        <div class="panel">
          <div class="detail-grid" style="margin:0">
            <div class="detail-item"><div class="di-label">Ruangan</div><div class="di-value">${esc(booking.room_name)}</div><div class="di-value soft">${esc(booking.room_location || '')}</div></div>
            <div class="detail-item"><div class="di-label">Jadwal</div><div class="di-value">${dateLong(booking.date)}</div><div class="di-value soft">${esc(booking.start_time)}–${esc(booking.end_time)} WITA</div></div>
            <div class="detail-item"><div class="di-label">Peserta</div><div class="di-value">${booking.participants} orang</div></div>
            <div class="detail-item"><div class="di-label">Status</div><div class="di-value">${statusPill('pending')}</div></div>
          </div>
        </div>
      </div>
      <div class="success-actions">
        <a class="btn btn-primary btn-lg" href="#/history">${icon('history', 15)} Lihat riwayat</a>
        <button class="btn btn-secondary btn-lg" type="button" data-action="new-booking">Ajukan permohonan baru</button>
        <a class="btn btn-ghost btn-lg" href="#/home">Beranda</a>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ booking detail modal */

async function openBookingModal(id) {
  openModal(`
    <div class="modal-head">
      <div><span class="eyebrow">Memuat</span><h2>Detail peminjaman</h2></div>
      <button class="btn-icon" type="button" data-action="close-modal" aria-label="Tutup">${icon('x', 17)}</button>
    </div>
    <div class="modal-body">
      <div class="skeleton sk-line" style="width:42%;height:22px;margin-bottom:18px"></div>
      <div class="skeleton" style="height:120px;border-radius:14px;margin-bottom:16px"></div>
      <div class="skeleton sk-line" style="width:90%;margin-bottom:9px"></div>
      <div class="skeleton sk-line" style="width:70%"></div>
    </div>`, { wide: true, label: 'Detail peminjaman' });
  try {
    const result = await api(`/api/bookings/${id}`);
    const modal = $('.modal', modalRoot);
    if (!modal) return;
    modal.innerHTML = bookingDetailInner(result.booking);
    const closeBtn = $('.modal-head .btn-icon', modal);
    if (closeBtn) closeBtn.focus();
  } catch (err) {
    closeModal();
    toast('Gagal memuat detail', err.message, 'error');
  }
}

function bookingDetailInner(b) {
  const isAdmin = state.account.role === 'baa';
  const meta = dateMeta(b.date);
  const canDecide = isAdmin && b.status === 'pending';
  return `
    <div class="modal-head">
      <div>
        <span class="eyebrow">${esc(b.code)}</span>
        <h2>${esc(b.room_name)}</h2>
        <p>${esc(b.org_name)} · ${esc(b.category_label)}</p>
      </div>
      <button class="btn-icon" type="button" data-action="close-modal" aria-label="Tutup">${icon('x', 17)}</button>
    </div>
    <div class="modal-body">
      <div id="decision-error" class="error-banner" style="display:none"></div>
      <div class="detail-hero">
        <img src="${esc(b.room_image)}" alt="${esc(b.room_name)}">
        <div>
          <h3>${esc(b.room_name)}</h3>
          <div class="sub">${esc(b.room_location || 'IDB Bali')} · ${b.room_capacity} orang</div>
          <div style="margin-top:7px">${statusPill(b.status)}</div>
        </div>
      </div>
      <div class="detail-grid">
        <div class="detail-item"><div class="di-label">Tanggal</div><div class="di-value">${dateLong(b.date)}</div></div>
        <div class="detail-item"><div class="di-label">Waktu</div><div class="di-value">${esc(b.start_time)}–${esc(b.end_time)} WITA</div><div class="di-value soft">${fmtDuration(b.duration)}</div></div>
        <div class="detail-item"><div class="di-label">Jumlah peserta</div><div class="di-value">${b.participants} orang</div></div>
        <div class="detail-item"><div class="di-label">Klasifikasi</div><div class="di-value">${esc(b.category_label)}</div></div>
        <div class="detail-item"><div class="di-label">Kontak person</div><div class="di-value">${esc(b.contact_name)}</div></div>
        <div class="detail-item"><div class="di-label">NIM / WhatsApp</div><div class="di-value">${esc(b.contact_nim)} · ${esc(b.contact_wa)}</div></div>
      </div>
      <div class="detail-section">
        <div class="di-label">Tujuan peminjaman</div>
        <p class="detail-purpose">${esc(b.purpose)}</p>
      </div>
      <div class="detail-section">
        <div class="di-label">Lampiran proposal</div>
        ${b.attachment_url ? `
          <a class="attachment-row" href="${esc(b.attachment_url)}" target="_blank" rel="noopener">
            <span class="file-ic">${icon('file', 15)}</span>
            <div><strong>${esc(b.attachment_name || 'Proposal.pdf')}</strong><span>Buka dokumen PDF</span></div>
            ${icon('arrow-up-right', 14)}
          </a>` : `<p class="detail-purpose muted">Tidak ada lampiran.</p>`}
      </div>
      <div class="detail-section">
        <div class="di-label">Riwayat status</div>
        ${timelineMarkup(b)}
      </div>
      ${b.status === 'rejected' && b.rejection_reason ? `
        <div class="rejection-note">${icon('x-circle', 15)}<div><strong>Alasan penolakan</strong><br>${esc(b.rejection_reason)}</div></div>` : ''}
      <div class="reject-panel hidden" id="reject-panel">
        <div class="field">
          <label class="field-label" for="reject-reason">Alasan penolakan</label>
          <textarea class="textarea" id="reject-reason" maxlength="300" placeholder="Jelaskan alasan penolakan agar organisasi dapat memperbaiki permohonannya." style="min-height:90px"></textarea>
          <div class="field-error" id="err-reject-reason"></div>
        </div>
        <div class="reject-actions">
          <button class="btn btn-ghost btn-sm" type="button" data-action="cancel-reject">Batal</button>
          <button class="btn btn-danger btn-sm" type="button" data-action="confirm-reject" data-id="${b.id}">Kirim penolakan</button>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <span class="left small muted">Diajukan ${formTimestamp(b.created_at)}</span>
      ${canDecide ? `
        <button class="btn btn-danger" type="button" data-action="open-reject">${icon('x', 15)} Tolak</button>
        <button class="btn btn-success" type="button" data-action="approve-booking" data-id="${b.id}">${icon('check', 15)} Setujui</button>` : ''}
      ${b.status === 'approved' ? `<a class="btn btn-primary" href="/api/bookings/${b.id}/confirmation.pdf">${icon('download', 15)} Unduh konfirmasi</a>` : ''}
      ${!canDecide && b.status !== 'approved' ? `<button class="btn btn-secondary" type="button" data-action="close-modal">Tutup</button>` : ''}
    </div>`;
}

function timelineMarkup(b) {
  const isPending = b.status === 'pending';
  const isRejected = b.status === 'rejected';
  const thirdTitle = isPending ? 'Menunggu keputusan BAA' : isRejected ? 'Permohonan ditolak' : 'Permohonan disetujui';
  const thirdTime = isPending ? 'Dalam peninjauan' : b.decided_at ? formTimestamp(b.decided_at) : '—';
  return `
    <div class="timeline">
      <div class="tl-item">
        <span class="tl-dot is-done">${icon('check', 9)}</span>
        <div class="tl-info"><strong>Permohonan diajukan</strong><span>${formTimestamp(b.created_at)}</span></div>
      </div>
      <div class="tl-item">
        <span class="tl-dot ${isPending ? 'is-pending' : 'is-done'}">${icon(isPending ? 'clock' : 'check', 9)}</span>
        <div class="tl-info"><strong>Ditinjau oleh BAA</strong><span>${isPending ? 'Sedang menunggu pemeriksaan' : formTimestamp(b.decided_at)}</span></div>
      </div>
      <div class="tl-item">
        <span class="tl-dot ${isPending ? '' : isRejected ? 'is-reject' : 'is-done'}">${isPending ? '' : icon(isRejected ? 'x' : 'check', 9)}</span>
        <div class="tl-info"><strong>${thirdTitle}</strong><span>${thirdTime}</span></div>
      </div>
    </div>`;
}

function setDecisionError(message) {
  const box = $('#decision-error');
  if (!box) return;
  if (!message) { box.style.display = 'none'; box.innerHTML = ''; return; }
  box.innerHTML = `${icon('alert', 15)} <span>${esc(message)}</span>`;
  box.style.display = 'flex';
}

async function decideBooking(id, action, reason, btn) {
  setDecisionError('');
  setButtonLoading(btn, true, action === 'approve' ? 'Menyetujui...' : 'Menolak...');
  try {
    await api(`/api/admin/bookings/${id}/decision`, { method: 'POST', body: { action, reason } });
    closeModal();
    toast(action === 'approve' ? 'Permohonan disetujui' : 'Permohonan ditolak',
      action === 'approve' ? 'Organisasi dapat mengunduh surat konfirmasi.' : 'Organisasi akan melihat alasan penolakan.');
    state.stats = null;
    route();
  } catch (err) {
    setButtonLoading(btn, false);
    setDecisionError(err.message);
    toast('Gagal memproses', err.message, 'error');
  }
}

/* ------------------------------------------------------------------ BAA dashboard */

async function syncStats() {
  try {
    state.stats = await api('/api/admin/stats');
    updateNavBadge();
  } catch (err) { /* silent */ }
}

async function loadAdminDashboard() {
  try {
    const stats = await api('/api/admin/stats');
    state.stats = stats;
    if (state.view !== 'baa') return;
    paintAdminDashboard();
    updateNavBadge();
  } catch (err) {
    if (state.view === 'baa') paintError(err.message);
  }
}

function statCard(label, value, iconName, cls, note) {
  return `
    <div class="stat-card ${cls || ''}">
      <div class="stat-top"><span class="stat-ic">${icon(iconName, 16)}</span>${note ? `<span class="pill ${cls === 'is-primary' ? 'pill-light' : 'pill-neutral'}">${esc(note)}</span>` : ''}</div>
      <strong class="stat-num">${value}</strong>
      <span class="stat-label">${esc(label)}</span>
    </div>`;
}

function paintAdminDashboard() {
  const stats = state.stats || { counts: { pending: 0, approved: 0, rejected: 0, total: 0 }, active_rooms: 0, pending: [], upcoming: [] };
  const counts = stats.counts;
  const pending = stats.pending || [];
  const upcoming = stats.upcoming || [];
  paint(`
    <div class="page-head">
      <div>
        <span class="eyebrow"><span class="dot"></span>Ringkasan BAA</span>
        <h1 class="page-title">Ringkasan BAA.</h1>
        <p class="page-sub">Tinjau permohonan organisasi serta kelola jadwal dan ruangan kampus.</p>
      </div>
      <div class="top-meta">
        <span class="meta-chip">${icon('calendar', 14)} ${dateLong(state.today)}</span>
        <span class="meta-chip user-chip"><span class="avatar" style="background:linear-gradient(145deg,#2a4448,#122c31)">${esc(state.account.initials)}</span>${esc(state.account.name)}</span>
      </div>
    </div>

    <div class="stat-grid">
      ${statCard('Menunggu persetujuan', counts.pending, 'clock', 'is-primary', counts.pending ? 'Perlu ditinjau' : 'Tidak ada antrean')}
      ${statCard('Permohonan disetujui', counts.approved, 'check-circle', 'is-green')}
      ${statCard('Permohonan ditolak', counts.rejected, 'x-circle', 'is-red')}
      ${statCard('Ruangan aktif', stats.active_rooms, 'door', 'is-amber')}
    </div>

    <div class="admin-layout" style="margin-top:22px">
      <div class="admin-col">
        <div class="panel">
          <div class="section-head" style="margin-bottom:12px">
            <div><h2 class="section-title">${icon('clipboard', 17)} Antrean persetujuan</h2><p class="section-sub">Permohonan yang menunggu keputusan BAA.</p></div>
            <a class="section-link" href="#/baa/requests">Semua permohonan ${icon('arrow-right', 13)}</a>
          </div>
          <div class="queue-list">
            ${pending.length ? pending.map(queueItem).join('') : `
              <div class="empty-state" style="padding:24px 16px">
                <div class="empty-icon" style="background:var(--green-soft);color:var(--green)">${icon('check-circle', 22)}</div>
                <h3>Semua permohonan sudah ditinjau</h3>
                <p>Tidak ada permohonan yang menunggu. Permohonan baru akan ditampilkan di sini.</p>
              </div>`}
          </div>
        </div>

        <div class="panel">
          <div class="section-head" style="margin-bottom:8px">
            <div><h2 class="section-title">${icon('calendar', 17)} Jadwal disetujui</h2><p class="section-sub">Kegiatan yang telah disetujui dan akan dilaksanakan.</p></div>
          </div>
          <div class="upcoming-list">
            ${upcoming.length ? upcoming.map((b) => `
              <button class="upcoming-item" type="button" data-action="open-admin-booking" data-id="${b.id}" style="background:transparent;border:0;border-bottom:1px solid var(--line);text-align:left;width:100%;cursor:pointer;padding:9px 0">
                <div class="upcoming-date"><strong>${dateMeta(b.date).day}</strong><span>${dateMeta(b.date).month}</span></div>
                <div class="upcoming-info"><strong>${esc(b.room_name)} · ${esc(b.org_short)}</strong><span>${esc(b.start_time)}–${esc(b.end_time)} · ${b.participants} peserta</span></div>
                <span style="margin-left:auto">${icon('chevron-right', 14)}</span>
              </button>`).join('') : `<p class="small muted" style="padding:6px 0">Belum ada jadwal yang disetujui.</p>`}
          </div>
        </div>
      </div>

      <div class="admin-col">
        <div class="panel">
          <h3 style="font-size:15px;margin-bottom:10px">Akses cepat</h3>
          <div class="stack" style="gap:8px">
            <a class="btn btn-primary btn-block" href="#/baa/requests">${icon('clipboard', 15)} Tinjau permohonan</a>
            <button class="btn btn-secondary btn-block" type="button" data-action="add-room">${icon('plus', 15)} Tambah ruangan</button>
          </div>
          <div class="info-band" style="margin-top:12px">${icon('shield', 14)} Hanya BAA yang dapat menyetujui atau menolak permohonan.</div>
        </div>

        <div class="panel">
          <h3 style="font-size:15px;margin-bottom:10px">Ketentuan operasional</h3>
          <div class="rule-list">
            <div class="rule-item">${icon('clock', 15)}<div><strong>Jam layanan</strong><span>08.00–18.00 WITA.</span></div></div>
            <div class="rule-item">${icon('door', 15)}<div><strong>Ruang terbuka</strong><span>Senin–Sabtu.</span></div></div>
            <div class="rule-item">${icon('school', 15)}<div><strong>Ruang kelas</strong><span>Khusus hari Sabtu.</span></div></div>
            <div class="rule-item">${icon('layout', 15)}<div><strong>Ruang diskusi</strong><span>Perpustakaan & INBIS, Senin–Jumat.</span></div></div>
            <div class="rule-item">${icon('file', 15)}<div><strong>Proposal</strong><span>PDF opsional, maks. 5 MB.</span></div></div>
          </div>
        </div>

        <div class="panel-soft">
          <div class="section-title" style="font-size:13px;margin-bottom:5px">${icon('layout', 15)} Total permohonan</div>
          <p class="small muted" style="line-height:1.6;margin:0">${counts.total} permohonan tercatat di SIMPENAN. Semua riwayat tersimpan dan dapat ditinjau kapan saja.</p>
        </div>
      </div>
    </div>`);
}

function queueItem(b) {
  return `
  <button class="queue-item" type="button" data-action="open-admin-booking" data-id="${b.id}">
    <div class="avatar">${esc(initials(b.org_short))}</div>
    <div class="queue-info">
      <strong>${esc(b.org_short)} · ${esc(b.room_name)}</strong>
      <span>${dateShort(b.date)} · ${esc(b.start_time)}–${esc(b.end_time)} · ${b.participants} peserta</span>
    </div>
    <div class="queue-side">
      ${statusPill(b.status)}
      <span class="btn btn-secondary btn-sm">Tinjau</span>
    </div>
  </button>`;
}

/* ------------------------------------------------------------------ BAA requests */

async function loadAdminRequests() {
  try {
    const [bookingsRes, stats] = await Promise.all([api('/api/admin/bookings'), api('/api/admin/stats')]);
    state.adminBookings = bookingsRes.bookings;
    state.stats = stats;
    if (state.view !== 'baa/requests') return;
    paintAdminRequests();
    updateNavBadge();
  } catch (err) {
    if (state.view === 'baa/requests') paintError(err.message);
  }
}

function adminCounts() {
  const bookings = state.adminBookings || [];
  return {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    approved: bookings.filter((b) => b.status === 'approved').length,
    rejected: bookings.filter((b) => b.status === 'rejected').length,
  };
}

function filteredAdmin() {
  const bookings = state.adminBookings || [];
  const status = state.filters.admin;
  const query = state.filters.query.trim().toLowerCase();
  return bookings.filter((b) => {
    if (status !== 'all' && b.status !== status) return false;
    if (!query) return true;
    return [b.code, b.org_name, b.room_name, b.contact_name, b.purpose, b.date]
      .join(' ').toLowerCase().includes(query);
  });
}

function paintAdminRequests() {
  const counts = adminCounts();
  const active = state.filters.admin;
  const filtered = filteredAdmin();
  paint(`
    <div class="page-head">
      <div>
        <span class="eyebrow"><span class="dot"></span>Manajemen permohonan</span>
        <h1 class="page-title">Daftar permohonan.</h1>
        <p class="page-sub">Tinjau detail, periksa lampiran, lalu setujui atau tolak dengan alasan yang jelas.</p>
      </div>
      <span class="meta-chip">${icon('clock', 14)} ${counts.pending} menunggu tinjauan</span>
    </div>
    <div class="filter-bar">
      <div class="tabs" role="tablist" aria-label="Filter permohonan">
        ${[['all', 'Semua'], ['pending', 'Menunggu'], ['approved', 'Disetujui'], ['rejected', 'Ditolak']].map(([key, label]) => `
          <button class="tab ${active === key ? 'is-active' : ''}" type="button" role="tab" aria-selected="${active === key}" data-action="filter-admin" data-filter="${key}">${label}<span class="count">${counts[key]}</span></button>`).join('')}
      </div>
      <div class="row" style="gap:12px">
        <span class="muted small" id="admin-count">${filtered.length} permohonan</span>
        <div class="search-box">
          ${icon('search', 15)}
          <input class="input" id="admin-search" type="search" placeholder="Cari organisasi, ruangan..." value="${esc(state.filters.query)}" aria-label="Cari permohonan">
        </div>
      </div>
    </div>
    <div class="panel" style="padding:16px">
      <div class="data-table">
        <div class="table-head">
          <span>Organisasi</span><span>Ruangan</span><span>Jadwal</span><span>Peserta</span><span>Status</span><span></span>
        </div>
        <div class="table-body" id="admin-table-body">${adminRowsMarkup()}</div>
      </div>
    </div>`);
}

function adminRowsMarkup() {
  const filtered = filteredAdmin();
  if (!filtered.length) {
    return `<div class="empty-state" style="padding:34px 18px">
      <div class="empty-icon">${icon('search', 22)}</div>
      <h3>Tidak ada permohonan</h3>
      <p>Coba ubah filter status atau kata kunci pencarian.</p>
    </div>`;
  }
  return filtered.map((b) => `
    <button class="table-row" type="button" data-action="open-admin-booking" data-id="${b.id}">
      <span class="table-org">
        <span class="avatar">${esc(initials(b.org_short))}</span>
        <span style="min-width:0"><strong>${esc(b.org_short)}</strong><span>${esc(b.code)}</span></span>
      </span>
      <span class="table-cell cell-room"><strong>${esc(b.room_name)}</strong><span>${esc(b.category_label)}</span></span>
      <span class="table-cell cell-date"><strong>${dateShort(b.date)}</strong><span>${esc(b.start_time)}–${esc(b.end_time)}</span></span>
      <span class="table-cell cell-participants"><strong>${b.participants}</strong><span>orang</span></span>
      <span class="table-cell cell-status">${statusPill(b.status)}</span>
      <span class="btn btn-secondary btn-sm">Tinjau</span>
    </button>`).join('');
}

function refreshAdminTable() {
  const body = $('#admin-table-body');
  if (body) body.innerHTML = adminRowsMarkup();
  const count = $('#admin-count');
  if (count) count.textContent = `${filteredAdmin().length} permohonan`;
}

/* ------------------------------------------------------------------ BAA rooms */

async function loadAdminRooms() {
  try {
    const [roomsRes, stats] = await Promise.all([api('/api/admin/rooms'), api('/api/admin/stats')]);
    state.adminRooms = roomsRes.rooms;
    state.stats = stats;
    if (state.view !== 'baa/rooms') return;
    paintAdminRooms();
    updateNavBadge();
  } catch (err) {
    if (state.view === 'baa/rooms') paintError(err.message);
  }
}

function paintAdminRooms() {
  const rooms = state.adminRooms || [];
  const terbuka = rooms.filter((r) => r.category === 'terbuka' && r.active).length;
  const kelas = rooms.filter((r) => r.category === 'kelas' && r.active).length;
  const fasilitas = rooms.filter((r) => r.category === 'fasilitas' && r.active).length;
  paint(`
    <div class="page-head">
      <div>
        <span class="eyebrow"><span class="dot"></span>Manajemen ruangan</span>
        <h1 class="page-title">Ruangan kampus.</h1>
        <p class="page-sub">Kelola data ruangan, kapasitas, dan status ketersediaan.</p>
      </div>
      <button class="btn btn-primary" type="button" data-action="add-room">${icon('plus', 15)} Tambah ruangan</button>
    </div>
    <div class="filter-bar">
      <div class="room-legend">
        <span>${icon('door', 13)} ${terbuka} ruang terbuka aktif</span>
        <span>${icon('school', 13)} ${kelas} ruang kelas aktif</span>
        <span>${icon('layout', 13)} ${fasilitas} ruang diskusi aktif</span>
        <span><span class="legend-dot"></span> Aktif</span>
        <span><span class="legend-dot off"></span> Nonaktif</span>
      </div>
      <span class="muted small">${rooms.length} ruangan terdaftar</span>
    </div>
    <h2 class="sr-only">Daftar ruangan kampus</h2>
    <div class="room-admin-grid">
      ${rooms.map(roomAdminCard).join('')}
      <button class="add-room-card" type="button" data-action="add-room">
        <span class="add-ic">${icon('plus', 18)}</span>
        <strong>Tambah ruangan baru</strong>
        <span class="small muted" style="font-size:9.5px">Atur nama, kapasitas, dan klasifikasi</span>
      </button>
    </div>`);
}

function roomAdminCard(room) {
  return `
  <article class="room-admin ${room.active ? '' : 'is-off'}">
    <div class="room-media">
      <img src="${esc(room.image)}" alt="${esc(room.name)}" loading="lazy">
      <span class="room-tag">${esc(room.category_label)}</span>
      <span class="room-cap">${icon('users', 12)} ${room.capacity}</span>
    </div>
    <div class="room-admin-body">
      <div class="room-admin-top">
        <div><h3>${esc(room.name)}</h3><p>${esc(room.location)}</p></div>
        ${room.active ? '<span class="pill pill-approved">Aktif</span>' : '<span class="pill pill-neutral">Nonaktif</span>'}
      </div>
      <div class="room-admin-meta">
        <span>${icon('clipboard', 12)} ${room.booking_count || 0} peminjaman</span>
        <span>${icon('users', 12)} ${room.capacity} orang</span>
      </div>
      <div class="room-admin-actions">
        <button class="btn btn-secondary btn-sm" type="button" data-action="edit-room" data-id="${room.id}">${icon('edit', 12)} Edit</button>
        ${room.active
          ? `<button class="btn btn-danger btn-sm" type="button" data-action="deactivate-room" data-id="${room.id}">${icon('x', 12)} Nonaktifkan</button>`
          : `<button class="btn btn-success btn-sm" type="button" data-action="activate-room" data-id="${room.id}">${icon('check', 12)} Aktifkan</button>`}
      </div>
    </div>
  </article>`;
}

function openRoomForm(room) {
  const isEdit = Boolean(room);
  const facilities = room && Array.isArray(room.facilities) ? room.facilities.join(', ') : '';
  openModal(`
    <div class="modal-head">
      <div><span class="eyebrow">${isEdit ? 'Edit ruangan' : 'Ruangan baru'}</span><h2>${isEdit ? esc(room.name) : 'Tambah ruangan'}</h2><p>${isEdit ? 'Perbarui informasi dan status ruangan.' : 'Ruangan baru langsung dapat dipilih pada formulir peminjaman.'}</p></div>
      <button class="btn-icon" type="button" data-action="close-modal" aria-label="Tutup">${icon('x', 17)}</button>
    </div>
    <form id="room-form" data-id="${isEdit ? room.id : ''}" data-active="${isEdit ? room.active : 1}" novalidate>
      <div class="modal-body">
        <div id="room-error" class="error-banner" style="display:none"></div>
        <div class="form-grid">
          <div class="field span-2">
            <label class="field-label" for="room-name">Nama ruangan</label>
            <input class="input" id="room-name" type="text" maxlength="80" value="${esc(isEdit ? room.name : '')}" placeholder="Contoh: Ruang Diskusi 1" required>
          </div>
          <div class="field">
            <label class="field-label" for="room-category">Klasifikasi</label>
            <select class="select" id="room-category">
              <option value="terbuka" ${isEdit && room.category === 'terbuka' ? 'selected' : ''}>Ruang Terbuka (Senin–Sabtu)</option>
              <option value="kelas" ${isEdit && room.category === 'kelas' ? 'selected' : ''}>Ruang Kelas (Sabtu)</option>
              <option value="fasilitas" ${isEdit && room.category === 'fasilitas' ? 'selected' : ''}>Ruang Diskusi (Senin–Jumat)</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="room-capacity">Kapasitas (orang)</label>
            <input class="input" id="room-capacity" type="number" min="1" max="1000" value="${isEdit ? room.capacity : 30}" required>
          </div>
          <div class="field span-2">
            <label class="field-label" for="room-location">Lokasi</label>
            <input class="input" id="room-location" type="text" maxlength="120" value="${esc(isEdit ? room.location : '')}" placeholder="Contoh: Gedung B · Lantai 2">
          </div>
          <div class="field span-2">
            <label class="field-label" for="room-facilities">Fasilitas <span class="optional">pisahkan dengan koma</span></label>
            <input class="input" id="room-facilities" type="text" maxlength="300" value="${esc(facilities)}" placeholder="Proyektor, AC, Whiteboard">
          </div>
          <div class="field span-2">
            <label class="field-label" for="room-description">Deskripsi singkat</label>
            <textarea class="textarea" id="room-description" maxlength="400" style="min-height:80px" placeholder="Deskripsi singkat mengenai ruangan dan penggunaannya.">${esc(isEdit ? room.description : '')}</textarea>
          </div>
        </div>
        <div class="info-band" style="margin-top:12px">${icon('info', 14)} Jam operasional 08.00–18.00 WITA. Hari ketersediaan mengikuti klasifikasi ruangan.</div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" type="button" data-action="close-modal">Batal</button>
        <button class="btn btn-primary" type="submit" id="room-save">${isEdit ? 'Simpan perubahan' : 'Tambah ruangan'}</button>
      </div>
    </form>`, { wide: true, label: isEdit ? 'Edit ruangan' : 'Tambah ruangan' });
}

async function saveRoom(form) {
  const id = form.dataset.id;
  const active = Number(form.dataset.active || 1);
  const payload = {
    name: ($('#room-name', form) || {}).value || '',
    category: ($('#room-category', form) || {}).value || 'terbuka',
    capacity: Number(($('#room-capacity', form) || {}).value || 0),
    location: ($('#room-location', form) || {}).value || '',
    facilities: ($('#room-facilities', form) || {}).value || '',
    description: ($('#room-description', form) || {}).value || '',
    active,
  };
  const errorBox = $('#room-error');
  if (errorBox) errorBox.style.display = 'none';
  if (payload.name.trim().length < 2) {
    if (errorBox) { errorBox.innerHTML = `${icon('alert', 15)} <span>Nama ruangan minimal 2 karakter.</span>`; errorBox.style.display = 'flex'; }
    return;
  }
  if (!(payload.capacity >= 1 && payload.capacity <= 1000)) {
    if (errorBox) { errorBox.innerHTML = `${icon('alert', 15)} <span>Kapasitas harus antara 1 dan 1000 orang.</span>`; errorBox.style.display = 'flex'; }
    return;
  }
  const btn = $('#room-save', form);
  setButtonLoading(btn, true, 'Menyimpan...');
  try {
    await api(id ? `/api/admin/rooms/${id}` : '/api/admin/rooms', {
      method: id ? 'PATCH' : 'POST',
      body: payload,
    });
    closeModal();
    toast(id ? 'Ruangan diperbarui' : 'Ruangan ditambahkan', `${payload.name} berhasil ${id ? 'diperbarui' : 'ditambahkan'}.`);
    state.adminRooms = null;
    route();
  } catch (err) {
    setButtonLoading(btn, false);
    if (errorBox) {
      errorBox.innerHTML = `${icon('alert', 15)} <span>${esc(err.message)}</span>`;
      errorBox.style.display = 'flex';
    }
  }
}

function openDeactivateModal(room) {
  openModal(`
    <div class="modal-head">
      <div><span class="eyebrow">Nonaktifkan ruangan</span><h2>${esc(room.name)}</h2><p>Ruangan tidak akan muncul di pilihan organisasi.</p></div>
      <button class="btn-icon" type="button" data-action="close-modal" aria-label="Tutup">${icon('x', 17)}</button>
    </div>
    <div class="modal-body">
      <p class="detail-purpose">Ruangan ini memiliki <strong>${room.booking_count || 0} peminjaman</strong> tercatat. Riwayat tetap tersimpan, tetapi ruangan tidak dapat dipinjam lagi sampai diaktifkan kembali.</p>
      <div class="info-band" style="margin-top:12px">${icon('info', 14)} Anda dapat mengaktifkan kembali ruangan ini kapan saja.</div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" type="button" data-action="close-modal">Batal</button>
      <button class="btn btn-danger" type="button" data-action="confirm-deactivate" data-id="${room.id}">Nonaktifkan ruangan</button>
    </div>`, { label: 'Nonaktifkan ruangan' });
}

async function deactivateRoom(id, btn) {
  setButtonLoading(btn, true, 'Menonaktifkan...');
  try {
    await api(`/api/admin/rooms/${id}`, { method: 'DELETE' });
    closeModal();
    toast('Ruangan dinonaktifkan', 'Ruangan tidak lagi tersedia untuk pengajuan.');
    state.adminRooms = null;
    route();
  } catch (err) {
    setButtonLoading(btn, false);
    toast('Gagal menonaktifkan', err.message, 'error');
  }
}

async function activateRoom(id, btn) {
  const room = (state.adminRooms || []).find((item) => item.id === id);
  if (!room) return;
  setButtonLoading(btn, true, 'Mengaktifkan...');
  try {
    await api(`/api/admin/rooms/${id}`, {
      method: 'PATCH',
      body: {
        name: room.name,
        category: room.category,
        capacity: room.capacity,
        location: room.location,
        facilities: (room.facilities || []).join(', '),
        description: room.description,
        active: 1,
      },
    });
    toast('Ruangan diaktifkan', `${room.name} kembali tersedia.`);
    state.adminRooms = null;
    route();
  } catch (err) {
    setButtonLoading(btn, false);
    toast('Gagal mengaktifkan', err.message, 'error');
  }
}

/* ------------------------------------------------------------------ events */

function scrollToWizardTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const id = Number(el.dataset.id);
  const wizard = state.wizard;

  switch (action) {
    case 'logout':
      e.preventDefault();
      logout();
      break;
    case 'close-modal':
      closeModal();
      break;
    case 'retry-route':
      route();
      break;
    case 'select-date':
      if (wizard) setWizardDate(el.dataset.date);
      break;
    case 'set-category': {
      if (!wizard) return;
      const category = el.dataset.category;
      wizard.category = category;
      wizard.room = null;
      wizard.availability = null;
      if (!categoryAllowedOn(category, wizard.date)) {
        const meta = categoryMeta(category);
        const adjusted = nextAllowedDate(category, wizard.date);
        wizard.date = adjusted;
        const earliest = adjusted === state.today ? Math.ceil(nowMinutes() / 30) * 30 : 8 * 60;
        if (toMinutes(wizard.start) < earliest) wizard.start = fmtTime(earliest);
        toast('Tanggal disesuaikan', `${meta.label} tersedia ${meta.daysText}.`, 'info');
      }
      renderStep();
      break;
    }
    case 'participants-step': {
      if (!wizard) return;
      const delta = Number(el.dataset.delta || 0);
      wizard.participants = Math.max(1, Math.min(1000, wizard.participants + delta));
      const input = $('#wizard-participants');
      if (input) input.value = String(wizard.participants);
      renderSummary();
      break;
    }
    case 'wizard-next':
      if (!wizard) return;
      if (wizard.step === 1) {
        if (!validateStep1()) return;
        loadAvailability();
      } else if (wizard.step === 2) {
        if (!wizard.room) { toast('Pilih ruangan', 'Pilih salah satu ruangan yang tersedia.', 'error'); return; }
        wizard.step = 3;
        renderStep();
        scrollToWizardTop();
      } else if (wizard.step === 3) {
        if (!validateStep3()) return;
        wizard.step = 4;
        renderStep();
        scrollToWizardTop();
      }
      break;
    case 'wizard-goto': {
      if (!wizard) return;
      const step = Number(el.dataset.step);
      if (step === 2) {
        if (!wizard.availability) { loadAvailability(); return; }
      }
      if (step === 1) { syncStep1Fields(); updateStartSelect(); updateDurationSelect(); }
      wizard.step = step;
      renderStep();
      scrollToWizardTop();
      break;
    }
    case 'retry-availability':
      loadAvailability();
      break;
    case 'select-room': {
      if (!wizard || !wizard.availability) return;
      const room = wizard.availability.rooms.find((r) => r.id === id);
      if (!room || !room.available) return;
      wizard.room = room;
      $$('.room-card').forEach((card) => card.classList.toggle('is-selected', Number(card.dataset.id) === id));
      renderSummary();
      const next = $('[data-action="wizard-next"]');
      if (next) next.disabled = false;
      break;
    }
    case 'remove-file':
      if (!wizard) return;
      wizard.file = null;
      const slot = $('#file-slot');
      if (slot) { slot.innerHTML = fileSlotContent(); bindProposalInput(); }
      break;
    case 'submit-booking':
      submitBooking();
      break;
    case 'open-booking':
      openBookingModal(id);
      break;
    case 'filter-history':
      state.filters.history = el.dataset.filter;
      paintHistory();
      break;
    case 'book-room': {
      state.wizard = defaultWizard();
      const category = el.dataset.category || 'terbuka';
      const capacity = Number(el.dataset.capacity || 0);
      state.wizard.category = category;
      if (capacity > 0) state.wizard.participants = Math.min(state.wizard.participants, capacity);
      if (!categoryAllowedOn(category, state.wizard.date)) {
        state.wizard.date = nextAllowedDate(category, state.wizard.date);
      }
      state.lastBooking = null;
      if (state.view === 'book') startBookingView();
      else location.hash = '#/book';
      break;
    }
    case 'new-booking':
      state.lastBooking = null;
      state.wizard = defaultWizard();
      if (state.view === 'book') startBookingView();
      else location.hash = '#/book';
      break;
    case 'open-admin-booking':
      openBookingModal(id);
      break;
    case 'filter-admin':
      state.filters.admin = el.dataset.filter;
      paintAdminRequests();
      break;
    case 'open-reject': {
      const panel = $('#reject-panel');
      const modal = $('.modal', modalRoot);
      if (panel) {
        panel.classList.remove('hidden');
        if (modal) modal.classList.add('is-rejecting');
        const reason = $('#reject-reason');
        if (reason) reason.focus();
        window.setTimeout(() => panel.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
      }
      break;
    }
    case 'cancel-reject': {
      const panel = $('#reject-panel');
      const modal = $('.modal', modalRoot);
      if (panel) panel.classList.add('hidden');
      if (modal) modal.classList.remove('is-rejecting');
      break;
    }
    case 'confirm-reject': {
      const reasonInput = $('#reject-reason');
      const reason = reasonInput ? reasonInput.value.trim() : '';
      const err = $('#err-reject-reason');
      if (reason.length < 5) {
        if (err) err.textContent = 'Alasan penolakan minimal 5 karakter.';
        if (reasonInput) reasonInput.classList.add('is-invalid');
        return;
      }
      if (err) err.textContent = '';
      decideBooking(id, 'reject', reason, el);
      break;
    }
    case 'approve-booking':
      decideBooking(id, 'approve', '', el);
      break;
    case 'add-room':
      openRoomForm(null);
      break;
    case 'edit-room': {
      const room = (state.adminRooms || []).find((r) => r.id === id);
      if (room) openRoomForm(room);
      break;
    }
    case 'deactivate-room': {
      const room = (state.adminRooms || []).find((r) => r.id === id);
      if (room) openDeactivateModal(room);
      break;
    }
    case 'confirm-deactivate':
      deactivateRoom(id, el);
      break;
    case 'activate-room':
      activateRoom(id, el);
      break;
    default:
      break;
  }
});

document.addEventListener('change', (e) => {
  const el = e.target;
  const wizard = state.wizard;
  if (!wizard) return;
  if (el.id === 'wizard-date') {
    setWizardDate(el.value);
  } else if (el.id === 'wizard-start') {
    wizard.start = el.value;
    wizard.room = null;
    updateDurationSelect();
    renderSummary();
  } else if (el.id === 'wizard-duration') {
    wizard.duration = Number(el.value) || wizard.duration;
    wizard.room = null;
    updateEndTime();
    renderSummary();
  } else if (el.id === 'wizard-participants') {
    wizard.participants = Math.max(1, Math.min(1000, Number(el.value) || 1));
    el.value = String(wizard.participants);
    renderSummary();
  }
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'admin-search') {
    state.filters.query = el.value;
    refreshAdminTable();
  }
  if (el.id === 'wizard-participants' && state.wizard) {
    const value = Number(el.value);
    if (Number.isFinite(value) && value >= 1) {
      state.wizard.participants = Math.min(1000, value);
      renderSummary();
    }
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'room-form') {
    e.preventDefault();
    saveRoom(e.target);
  }
});

/* ------------------------------------------------------------------ boot */

async function boot() {
  try {
    const config = await api('/api/config');
    state.config = config;
    state.today = config.today;
    state.now = config.now || '00:00';
  } catch (err) {
    state.today = new Date().toISOString().slice(0, 10);
    state.now = '00:00';
  }
  try {
    const me = await api('/api/me');
    state.account = me.account;
    enterApp();
  } catch (err) {
    renderLogin();
  }
}

boot();
