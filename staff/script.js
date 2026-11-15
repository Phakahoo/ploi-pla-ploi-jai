'use strict';
const ASSET = '../assets/images/';
const FISH_FILE = { eel: 'ปลาไหล.png', perch: 'ปลาหมอ.png', snakehead: 'ปลาช่อน.png', carp: 'ปลาตะเพียน.png', tilapia: 'ปลานิล.png' };
const ACC_FILES = new Set(['สายสะพาย.png', 'เสื้อลายดอก.png', 'เสื้อสายเดี่ยว.png', 'หมวกตำรวจ.png', 'หมูปิ้ง.png', 'สร้อยทอง.png', 'สร้อยไข่มุข.png', 'แว่นตา.png', 'เสื้อวิน.png', 'ผงฟรุ้งฟริ้ง.png', 'ดอกไม้.png']);
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const imgSrc = f => ASSET + encodeURIComponent(f);
const fmt = ts => (ts ? new Date(ts).toLocaleString('th-TH') : '-');
const qLabel = n => '#' + String(n || 0).padStart(3, '0');
const accList = rec => (Array.isArray(rec.accessories) ? rec.accessories : Object.values(rec.accessories || {})).filter(Boolean).slice(0, 2);

let records = [], filter = 'all', busy = false, queueRef = null;

/* ---------- Firebase / auth ---------- */
if (typeof FIREBASE_READY === 'undefined' || !FIREBASE_READY) {
  showLoginErr('ยังไม่ได้ตั้งค่า Firebase ในไฟล์ firebase-config.js');
  $('loginBtn').disabled = true;
} else {
  firebase.initializeApp(FIREBASE_CONFIG);
  firebase.database().ref('.info/connected').on('value', s => {
    const b = $('conn'); b.className = 'badge ' + (s.val() ? 'ok' : 'bad'); b.textContent = s.val() ? 'เชื่อมต่อ Firebase แล้ว' : 'ขาดการเชื่อมต่อ';
  });
  firebase.auth().onAuthStateChanged(user => (user ? startApp() : showLogin()));
}
function showLoginErr(m) { const e = $('loginErr'); e.hidden = !m; e.textContent = m || ''; }
function showLogin() {
  if (queueRef) { queueRef.off(); queueRef = null; }
  $('app').hidden = true; $('login').hidden = false;
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  showLoginErr('');
  $('loginBtn').disabled = true;

  try {
    await firebase.auth().signInWithEmailAndPassword(
      $('email').value.trim(),
      $('password').value
    );
    $('password').value = '';
  } catch (err) {
    console.error('Firebase Login Error:', err);
    showLoginErr(err.code + ': ' + err.message);
  }

  $('loginBtn').disabled = false;
});

$('signOut').addEventListener('click', () => firebase.auth().signOut());

function startApp() {
  $('login').hidden = true; $('app').hidden = false;
  if (queueRef) queueRef.off();
  queueRef = firebase.database().ref('fish_queue');
  queueRef.orderByChild('created_at').on('value', snap => {
    records = [];
    snap.forEach(c => { const v = c.val(); if (v && typeof v === 'object') records.push(Object.assign({ key: c.key }, v)); });
    records.sort((a, b) => (a.created_at || 0) - (b.created_at || 0) || (a.key < b.key ? -1 : 1));
    records.forEach((r, i) => (r.queue_number = i + 1)); // queue number = position in created_at order (never stored)
    $('dbErr').hidden = true; $('loading').hidden = true; render();
  }, err => { $('loading').hidden = true; $('dbErr').hidden = false; $('dbErr').textContent = 'อ่านข้อมูลไม่ได้: ' + err.message + ' (ตรวจสอบ Security Rules และอีเมลสตาฟ)'; });
}

/* ---------- Rendering ---------- */
function fishPreview(rec) {
  const box = el('div', 'fishbox');
  const f = FISH_FILE[rec.fish_id];
  if (f) { const i = el('img', 'fish'); i.src = imgSrc(f); i.alt = rec.fish_type || ''; box.appendChild(i); }
  accList(rec).forEach(a => {
    if (!ACC_FILES.has(a.file)) return; // only known asset files are ever loaded
    const d = el('div', 'acc'); d.style.left = a.x * 100 + '%'; d.style.top = a.y * 100 + '%'; d.style.width = a.w * 100 + '%';
    const i = el('img'); i.src = imgSrc(a.file); i.alt = a.id || ''; d.appendChild(i); box.appendChild(d);
  });
  return box;
}
function card(rec, actions) {
  const c = el('article', 'card'), top = el('div', 'top');
  top.append(el('span', 'q', qLabel(rec.queue_number)), el('span', 'tag ' + rec.status, { pending: 'Pending', released: 'Released', cancelled: 'Cancelled' }[rec.status] || rec.status));
  c.append(top, fishPreview(rec), el('strong', '', rec.fish_type || '-'));
  c.appendChild(el('p', 'meta', 'ของตกแต่ง: ' + (accList(rec).map(a => String(a.file || '').replace('.png', '')).filter(Boolean).join(', ') || 'ไม่มี')));
  c.appendChild(el('p', 'meta', 'ปล่อยเมื่อ: ' + fmt(rec.created_at)));
  if (rec.status === 'released') c.appendChild(el('p', 'meta', 'สตาฟยืนยันเมื่อ: ' + fmt(rec.completed_at)));
  if (rec.status === 'cancelled') c.appendChild(el('p', 'meta', 'ยกเลิกเมื่อ: ' + fmt(rec.cancelled_at)));
  if (actions) {
    const row = el('div', 'row'), ok = el('button', 'btn primary', 'ปล่อยปลาแล้ว'), del = el('button', 'btn', 'ลบออกจากคิว');
    ok.dataset.act = 'released'; del.dataset.act = 'cancelled'; row.append(ok, del); c.appendChild(row);
    c.dataset.key = rec.key;
  }
  return c;
}
function render() {
  const by = s => records.filter(r => r.status === s);
  $('stTotal').textContent = records.length; $('stPending').textContent = by('pending').length;
  $('stReleased').textContent = by('released').length; $('stCancelled').textContent = by('cancelled').length;
  $('queue').replaceChildren(...by('pending').map(r => card(r, true)));
  $('queueEmpty').hidden = by('pending').length > 0;
  const term = $('search').value.trim().toLowerCase().replace('#', '');
  const arch = records.filter(r => r.status !== 'pending' && (filter === 'all' || r.status === filter) &&
    (!term || String(r.queue_number).padStart(3, '0').includes(term) || String(r.fish_type || '').toLowerCase().includes(term) || String(r.fish_id || '').includes(term)))
    .sort((a, b) => (b.completed_at || b.cancelled_at || b.created_at || 0) - (a.completed_at || a.cancelled_at || a.created_at || 0));
  $('archive').replaceChildren(...arch.map(r => card(r, false)));
  $('archiveEmpty').hidden = arch.length > 0;
}

/* ---------- Actions ---------- */
function ask(msg) {
  return new Promise(res => { const d = $('dlg'); $('dlgMsg').textContent = msg; d.returnValue = ''; d.onclose = () => res(d.returnValue === 'ok'); d.showModal(); });
}
async function changeStatus(key, status) {
  if (busy) return;
  const rec = records.find(r => r.key === key); if (!rec || rec.status !== 'pending') return;
  const ok = await ask(status === 'released' ? `ยืนยันว่าทำปลา ${qLabel(rec.queue_number)} และปล่อยลง TouchDesigner เรียบร้อยแล้ว?` : `ยืนยันลบปลา ${qLabel(rec.queue_number)} ออกจากคิว? (ข้อมูลจะยังเก็บไว้ในประวัติ)`);
  if (!ok) return;
  busy = true; document.body.classList.add('busy');
  try {
    const t = firebase.database.ServerValue.TIMESTAMP;
    await queueRef.child(key).update(status === 'released' ? { status, completed_at: t } : { status, cancelled_at: t });
  } catch (err) { $('dbErr').hidden = false; $('dbErr').textContent = 'บันทึกไม่สำเร็จ: ' + err.message; }
  busy = false; document.body.classList.remove('busy');
}
$('queue').addEventListener('click', e => {
  const b = e.target.closest('button[data-act]'), c = e.target.closest('.card');
  if (b && c) changeStatus(c.dataset.key, b.dataset.act);
});
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
  $('viewQueue').hidden = b.dataset.tab !== 'queue'; $('viewArchive').hidden = b.dataset.tab !== 'archive';
}));
document.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
  filter = b.dataset.f; document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); render();
}));
$('search').addEventListener('input', render);
setInterval(() => ($('clock').textContent = new Date().toLocaleString('th-TH')), 1000);
$('clock').textContent = new Date().toLocaleString('th-TH');
document.addEventListener('error', e => { // missing-image fallback
  const i = e.target; if (!i || i.tagName !== 'IMG' || i.dataset.fb) return;
  i.dataset.fb = 1; i.replaceWith(el('span', 'fallback', i.alt || '…'));
}, true);
