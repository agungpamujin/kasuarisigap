var BOOT = KSAPI.boot();
var N = { sess: '', user: null, data: null, page: 'home', tab: 'ALL', ptab: 'list', pfilter: 'AKTIF', q: '', timer: null, info: null, detail: null };
var root = document.getElementById('root'), modalRoot = document.getElementById('modalRoot');
var COL = { MONITOR: '#1F9D63', REVIEW: '#E3A21A', PRIORITY: '#D23C3C', NO_RESPONSE: '#7B5CC4' };
var SLBL = { MONITOR: 'Normal', REVIEW: 'Perlu Ditinjau', PRIORITY: 'Prioritas', NO_RESPONSE: 'Tidak Respon' };
var NS_LABEL = { NEW: 'Baru', UNDER_REVIEW: 'Ditinjau', CONTACTED: 'Dihubungi', FOLLOW_UP_COMPLETED: 'Follow-up selesai', CLOSED: 'Ditutup' };
var TASK_LABEL = { PENDING: 'Terjadwal', OPEN: 'Jendela cek', REMINDER_DUE: 'Perlu pengingat', REMINDED: 'Sudah diingatkan', NO_RESPONSE: 'Tidak respon', COMPLETED: 'Selesai', RESOLVED: 'Ditangani', CANCELLED: 'Batal' };
var MONTH = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

/* ---------------- util ---------------- */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function call(fn){
  var args = Array.prototype.slice.call(arguments, 1);
  return new Promise(function(res, rej){
    /* v4.0: panggilan ke API Apps Script lewat fetch (lihat js/api.js) */
    KSAPI.call(fn, args).then(function(x){ if (x && x.ok) res(x.data); else rej(new Error((x && x.error) || 'Terjadi kesalahan.')); }, rej);
  }).catch(function(e){ if ((e.message || '').indexOf('AUTH:') === 0) logoutLocal(e.message.replace('AUTH:','').trim()); throw e; });
}
function toast(msg, err){ if (!msg) return; document.querySelectorAll('.toast').forEach(function(x){ x.remove(); }); var t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.setAttribute('role', err ? 'alert' : 'status'); t.innerHTML = icon(err ? 'alert' : 'checkc', 'sm') + '<span>' + esc(msg) + '</span>'; t.onclick = function(){ t.remove(); }; document.body.appendChild(t); setTimeout(function(){ t.remove(); }, err ? 5500 : 2800); }
function sget(k){ try { return sessionStorage.getItem(k) || ''; } catch(e){ return ''; } }
function sset(k, v){ try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch(e){} }
/* ================= v3.0 KILAT ================= */
call = KS.wrap(call);
N.dcache = {}; N.pcache = {};
function saveDash(){ if (N.data && N.sess) KS.set('ks_dash', { s: N.sess, d: N.data }, true); }
/* v3.10: umur laporan ("menunggu … menit") & status lewat target dihitung di browser dari waktu server,
   sehingga server bisa menjawab "tidak berubah" tanpa mengirim ulang seluruh data. */
function tms(s){ var t = Date.parse(String(s || '').replace(' ', 'T') + 'Z'); return isNaN(t) ? 0 : t; }
function ageList(list, now, sla){
  sla = sla || {}; var n = 0;
  (list || []).forEach(function(r){ var t = tms(r.time); r.ageMin = t ? Math.max(0, Math.round((now - t) / 60000)) : 0;
    r.overdue = !r.rv && r.nurseStatus !== 'CLOSED' && r.ageMin > (sla[r.status] || 1440); if (r.overdue) n++; });
  return n;
}
function ageFix(d){
  if (!d || !d.reports) return d;
  var now = tms(d.serverTime) || Date.now();
  d.kpi.overdue = ageList(d.reports, now, d.sla);
  if (N.arch && N.arch.list) ageList(N.arch.list, now, d.sla);
  return d;
}
function setData(d){ N.data = ageFix(d); N.dataAt = Date.now(); saveDash(); }
function quietRender(){ if (N.changed === false) return; if (!N.data || N.page === 'detail' || modalRoot.innerHTML || !KS.quiet()) return; KS.keepScroll(render); }
function prefetchReport(id){ if (!id || N.dcache[id] || N.pf === id) return Promise.resolve(); N.pf = id; return call('nReportDetail', N.sess, id, true).then(function(d){ N.dcache[id] = d; }).catch(function(){}).then(function(){ N.pf = ''; }); }
/* Pra-muat 5 laporan terbuka paling mendesak saat perawat diam → klik pertama langsung tampil */
function prefetchTop(){
  if (N.prefetched || !N.data) return; N.prefetched = true;
  var ids = (N.data.reports || []).filter(function(r){ return r.nurseStatus !== 'CLOSED'; }).slice(0, 5).map(function(r){ return r.id; });
  (function next(){ var id = ids.shift(); if (!id) return; setTimeout(function(){ prefetchReport(id).then(next); }, 250); })();
}
/* v3.19 (PF-2): pra-muat hanya bila kursor berhenti ±150 ms di satu baris, maks. 10 per menit (tidak lagi 1 panggilan per baris yang dilewati) */
var PF_HOVER = { t: 0, el: null, n: 0, w: 0 };
document.addEventListener('mouseover', function(e){ var t = e.target.closest && e.target.closest('tr.clk[data-id],.kc[data-id]'); if (t === PF_HOVER.el) return; clearTimeout(PF_HOVER.t); PF_HOVER.el = t; if (!t) return;
  PF_HOVER.t = setTimeout(function(){ var now = Date.now(); if (now - PF_HOVER.w > 60000){ PF_HOVER.w = now; PF_HOVER.n = 0; } if (PF_HOVER.n >= 10 || N.dcache[t.dataset.id]) return; PF_HOVER.n++; prefetchReport(t.dataset.id); }, 150); });
document.addEventListener('touchstart', function(e){ var t = e.target.closest && e.target.closest('tr.clk[data-id],.kc[data-id]'); if (t) prefetchReport(t.dataset.id); }, { passive: true });
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible' && N.sess && N.data && Date.now() - (N.dataAt || 0) > 30000) refresh(true).then(quietRender); });
KS.onOnline = function(){ if (N.sess && N.data) refresh(true).then(quietRender); };
function fmtD(s){ if (!s) return '-'; var d = String(s); return Number(d.slice(8,10)) + ' ' + MONTH[Number(d.slice(5,7)) - 1] + ' ' + d.slice(0,4); }
function fmtDT(s){ if (!s) return '-'; return fmtD(s) + ' ' + String(s).slice(11,16); }
function fmtShort(s){ var d = String(s); return Number(d.slice(8,10)) + ' ' + MONTH[Number(d.slice(5,7)) - 1]; }
function age(m){ if (m < 60) return m + ' mnt'; if (m < 1440) return Math.floor(m/60) + ' jam'; return Math.floor(m/1440) + ' hari'; }
function badge(s, l){ var cls = s === 'NO_RESPONSE' ? 'NR' : s; return '<span class="badge b-' + esc(cls) + '"><span class="dot" style="background:' + (COL[s] || '#8899A6') + '"></span>' + esc(l || SLBL[s] || s) + '</span>'; }
function nsBadge(s){ var c = { NEW: 'TEAL', FOLLOW_UP_COMPLETED: 'MONITOR' }[s] || 'GREY'; return '<span class="badge b-' + c + '">' + esc(NS_LABEL[s] || s) + '</span>'; }
function modal(html, wide){
  modalRoot.innerHTML = '<div class="overlay" id="ov"><div class="modal" style="max-width:' + (wide ? '1100px' : '640px') + '">' + html + '</div></div>';
  document.getElementById('ov').addEventListener('mousedown', function(e){ if (e.target.id === 'ov') closeModal(); });
  modalRoot.querySelectorAll('.x').forEach(function(x){ x.onclick = closeModal; });
}
function closeModal(){ modalRoot.innerHTML = ''; }
function xbtn(){ return '<button class="x" aria-label="Tutup">' + icon('x','sm') + '</button>'; }
function busy(btn, on, label){ if (!btn) return; btn.disabled = on; if (on){ btn.dataset.l = btn.innerHTML; btn.innerHTML = '<div class="spinner"></div>'; } else btn.innerHTML = label || btn.dataset.l; }
function val(id){ var e = document.getElementById(id); return e ? e.value.trim() : ''; }
function $(id){ return document.getElementById(id); }
function empty(ic, t){ return '<div class="empty">' + icon(ic) + '<p>' + esc(t) + '</p></div>'; }
function canWrite(){ return N.user && N.user.role !== 'VIEWER'; }
function compress(file, maxPx){
  return new Promise(function(res, rej){
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function(){ var s = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight)); var c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.85)); };
    img.onerror = function(){ rej(new Error('Foto tidak dapat dibaca.')); }; img.src = url;
  });
}
/* v3.19 (PF-3): pustaka QR dimuat hanya saat kartu/poster dibuka (tidak lagi menahan pemuatan halaman) */
function loadQR(cb){
  if (window.QRCode) return cb();
  var srcs = ['https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'];
  (function next(i){ if (i >= srcs.length) return cb(); var sc = document.createElement('script'); sc.src = srcs[i]; sc.onload = function(){ cb(); }; sc.onerror = function(){ next(i + 1); }; document.head.appendChild(sc); })(0);
}
/* v3.19: nama pasien HURUF BESAR ditampilkan Kapital Awal (hanya tampilan; data tidak diubah) */
function nm(s){ s = String(s == null ? '' : s); return s && s === s.toUpperCase() && /[A-Z]{3}/.test(s) ? s.toLowerCase().replace(/(^|[\s.'(-])([a-z])/g, function(m, a, b){ return a + b.toUpperCase(); }) : s; }
/* v3.19 (AX-1/2): elemen yang diklik (menu, baris, kartu) bisa dibuka dengan Enter / Spasi */
document.addEventListener('keydown', function(e){ if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.hasAttribute && e.target.hasAttribute('data-kbd')){ e.preventDefault(); e.target.click(); } });
function setDemo(info){ var d = $('demo'); if (info && info.demoBanner){ d.textContent = info.demoBanner; d.classList.remove('hidden'); } else d.classList.add('hidden'); }

/* ================= LOGIN ================= */
function showLogin(msg){
  if (N.timer) clearInterval(N.timer);
  var steps = [['scan','SCAN'],['clipcheck','CHECK'],['camera','SNAP'],['ai','AI-CARE'],['usercheck','FOLLOW-UP']];
  root.innerHTML = '<div class="login fade-in"><div class="brand"><img class="logo" src="' + (ASSET.hero || ASSET.kasuari) + '" alt="KASUARI – Instalasi Onkologi RS Kariadi">' +
    wordmarkHtml({s: .95}) +
    '<div class="tag">“Kenali Lebih Awal, Tangani Lebih Cepat.”</div>' +
    '<div class="flowline">' + steps.map(function(s){ return '<div><span>' + icon(s[0]) + '</span>' + s[1] + '</div>'; }).join('') + '</div></div>' +
    '<div class="form"><div class="box"><div class="logo-kemenkes" style="margin-bottom:26px"><img src="' + ASSET.kemenkes + '" alt=""><div class="t">Kemenkes<b>RS Kariadi</b></div></div>' +
    '<h1>Login Perawat</h1><p class="muted small">Dashboard pemantauan ekstravasasi pascakemoterapi · Ruang Kasuari Lantai 3</p>' +
    (msg ? '<div class="alert warn">' + icon('info') + '<div>' + esc(msg) + '</div></div>' : '') +
    '<form id="fLogin"><label class="lbl" for="lu">Username</label><div class="input-ic">' + icon('user','sm') + '<input type="text" id="lu" autocomplete="username" autocapitalize="none"></div>' +
    '<label class="lbl" for="lp">Password</label>' + pwInput('lp', 'current-password') +
    '<div style="text-align:right;margin-top:6px"><button type="button" class="linkb" id="bForgot">Lupa password?</button></div>' +
    '<button class="btn block lg" id="bLogin" style="margin-top:14px">Masuk</button></form>' +
    '<p class="tiny muted" style="margin-top:18px;display:flex;gap:6px">' + icon('shield','sm') + 'Akses terbatas untuk petugas berwenang. Seluruh aktivitas tercatat di audit log.</p></div></div></div>';
  $('bForgot').onclick = function(){ showForgot(val('lu')); };
  $('fLogin').onsubmit = function(e){
    e.preventDefault(); var b = $('bLogin'); busy(b, true);
    call('nLogin', val('lu'), $('lp').value).then(function(r){
      N.sess = r.session; N.user = r.user; N.info = r.info; sset('pw_sess', r.session); setDemo(r.info);
      if (r.dash) setData(r.dash);
      if (r.mustChange) showChangePw(true); else initShell();
    }).catch(function(e){ busy(b, false, 'Masuk'); toast(e.message, true); });
  };
}
/* v3.9: Lupa password – kode dikirim ke email yang terdaftar di 06_USERS */
/* v3.9.1: semua kolom password punya tombol mata (tampil/sembunyikan) */
if (typeof ICON !== 'undefined' && !ICON.eyeoff) ICON.eyeoff = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>';
function pwInput(id, ac){
  return '<div class="input-ic pw">' + icon('lock','sm') + '<input type="password" id="' + id + '" autocomplete="' + ac + '" autocapitalize="none" spellcheck="false">' +
    '<button type="button" class="pw-eye" data-for="' + id + '" aria-label="Tampilkan password" aria-pressed="false">' + icon('eye','sm') + '</button></div>';
}
document.addEventListener('click', function(e){
  var b = e.target.closest && e.target.closest('.pw-eye'); if (!b) return;
  var inp = document.getElementById(b.getAttribute('data-for')); if (!inp) return;
  var show = inp.type === 'password'; inp.type = show ? 'text' : 'password';
  b.innerHTML = icon(show ? 'eyeoff' : 'eye', 'sm'); b.setAttribute('aria-pressed', show ? 'true' : 'false');
  b.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
  try { inp.focus({ preventScroll: true }); var n = inp.value.length; inp.setSelectionRange(n, n); } catch (x) {}
});
function showForgot(user){
  var box = document.querySelector('.login .form .box'); if (!box) return;
  box.innerHTML = '<div class="logo-kemenkes" style="margin-bottom:26px"><img src="' + ASSET.kemenkes + '" alt=""><div class="t">Kemenkes<b>RS Kariadi</b></div></div>' +
    '<h1>Lupa password</h1><p class="muted small">Kode reset dikirim ke email yang terdaftar untuk akun Anda.</p>' +
    '<form id="fFp1"><label class="lbl" for="fpU">Username</label><div class="input-ic">' + icon('user','sm') + '<input type="text" id="fpU" autocomplete="username" autocapitalize="none" value="' + esc(user || '') + '"></div>' +
    '<button class="btn block lg" id="bFp1" style="margin-top:16px">Kirim kode ke email</button></form>' +
    '<div id="fpStep2" class="hidden"><div class="alert info" id="fpMsg" style="margin-top:14px"></div>' +
    '<form id="fFp2"><label class="lbl" for="fpC">Kode 6 angka dari email</label><input type="text" id="fpC" inputmode="numeric" maxlength="6" autocomplete="one-time-code">' +
    '<label class="lbl" for="fpN" style="margin-top:10px">Password baru</label>' + pwInput('fpN', 'new-password') + '' +
    '<label class="lbl" for="fpN2" style="margin-top:10px">Ulangi password baru</label>' + pwInput('fpN2', 'new-password') + '' +
    '<p class="tiny muted" style="margin:6px 0 0">Minimal 8 karakter, berisi huruf dan angka.</p>' +
    '<button class="btn block lg" id="bFp2" style="margin-top:14px">Simpan password baru</button></form></div>' +
    '<p class="small muted" style="margin-top:16px">Belum punya email terdaftar? Minta admin/kepala ruangan mereset password lewat menu spreadsheet.</p>' +
    '<button type="button" class="linkb" id="bFpBack" style="margin-top:6px">' + icon('back','sm') + ' Kembali ke login</button>';
  $('bFpBack').onclick = function(){ showLogin(''); };
  $('fFp1').onsubmit = function(e){ e.preventDefault(); var b = $('bFp1'), u = val('fpU');
    if (!u) return toast('Isi username.', true);
    busy(b, true);
    call('nForgotPassword', u).then(function(r){ busy(b, false, 'Kirim ulang kode'); $('fpMsg').textContent = r.msg; $('fpStep2').classList.remove('hidden'); $('fpC').focus(); })
      .catch(function(e){ busy(b, false, 'Kirim kode ke email'); toast(e.message, true); }); };
  $('fFp2').onsubmit = function(e){ e.preventDefault(); var b = $('bFp2');
    if ($('fpN').value !== $('fpN2').value) return toast('Password baru tidak sama.', true);
    busy(b, true);
    call('nResetPassword', val('fpU'), val('fpC'), $('fpN').value).then(function(){ var u = val('fpU'); showLogin('Password berhasil diganti. Silakan masuk dengan password baru.'); $('lu').value = u; $('lp').focus(); })
      .catch(function(e){ busy(b, false, 'Simpan password baru'); toast(e.message, true); }); };
  if (user) $('fpU').value = user;
}
/* v3.19 (BG-3): hapus foto pasien yang tersimpan di browser saat logout (komputer ruangan dipakai bergantian) */
function clearNursePhotos(){
  Object.keys(N.phIds || {}).forEach(function(id){ try { KS.photo('n_' + id, ''); } catch(e){} });
  N.phIds = {};
  try { for (var i = sessionStorage.length - 1; i >= 0; i--){ var k = sessionStorage.key(i); if (k && k.indexOf('ph_n_') === 0) sessionStorage.removeItem(k); } } catch(e){}
}
function logoutLocal(msg){ clearNursePhotos(); KNav.clear(); sset('pw_sess', null); KS.set('ks_dash', null, true); N.data = null; N.arch = null; N.pall = null; N.dcache = {}; N.pcache = {}; N.sess = ''; closeModal(); showLogin(msg); }
function showChangePw(forced){
  modal('<div class="modal-head"><h2>' + (forced ? 'Ganti password awal' : 'Ganti password') + '</h2>' + (forced ? '' : xbtn()) + '</div>' +
    (forced ? '<div class="alert info">' + icon('shield') + '<div>Demi keamanan, ganti password sementara Anda sebelum melanjutkan.</div></div>' : '') +
    '<label class="lbl">Password lama</label>' + pwInput('op', 'current-password') + '<label class="lbl">Password baru (min. 8 karakter, huruf + angka)</label>' + pwInput('np', 'new-password') + '' +
    '<label class="lbl">Ulangi password baru</label>' + pwInput('np2', 'new-password') + '<button class="btn block" id="bCp" style="margin-top:16px">Simpan</button>');
  $('bCp').onclick = function(){
    if ($('np').value !== $('np2').value) return toast('Password baru tidak sama.', true);
    var b = this; busy(b, true);
    call('nChangePassword', N.sess, $('op').value, $('np').value).then(function(r){ closeModal(); toast('Password diperbarui.'); if (r && r.dash) setData(r.dash); if (forced) initShell(); })
      .catch(function(e){ busy(b, false, 'Simpan'); toast(e.message, true); });
  };
}

/* ================= SHELL ================= */
var MENU = [['home','home','Beranda'],['patients','users','Pasien'],['reports','file','Laporan'],['follow','kanban','Tindak Lanjut'],['schedule','calendar','Jadwal'],['analytics','chart','Analitik'],['settings','sliders','Pengaturan']];
var TITLES = { home: ['Laporan hari ini','Antrean laporan pasien · paling mendesak di atas'], patients: ['Daftar Pasien ODC','Episode kemoterapi & papan monitoring'], reports: ['Laporan Pasien','Semua laporan self-monitoring'],
  follow: ['Tindak Lanjut','Kasus REVIEW & PRIORITY yang masih terbuka'], schedule: ['Jadwal & Tidak Respon','Pengingat WhatsApp dan jadwal cek hari ini'], analytics: ['Analitik','KPI / success metrics'], settings: ['Pengaturan','Konfigurasi sistem & pengguna'], detail: ['Detail Laporan Pasien',''] };
/* v3.5: halaman pertama setelah login/refresh – halaman terakhir di tab ini, atau Beranda */
function startNurseRoute(){
  var r = (typeof NAV_SAVED_N !== 'undefined' && NAV_SAVED_N) || (N.page && N.page !== 'detail' ? N.page : 'home');
  NAV_SAVED_N = null;
  renderNurseRoute(r);
}
var CLICK_BOUND = false;
function initShell(){
  root.innerHTML = '<div class="shell"><aside class="side" id="side"><div class="brandrow"><img src="' + ASSET.kasuari + '" alt=""><div class="t">KASUARI SIGAP<span>EKSTRAVASASI</span></div></div>' +
    '<nav class="nav" id="nav">' + MENU.map(function(m){ return '<a data-p="' + m[0] + '" tabindex="0" role="button" data-kbd>' + icon(m[1]) + '<span>' + m[2] + '</span><span class="cnt hidden" id="c-' + m[0] + '"></span></a>'; }).join('') +
    '<a id="navOut" tabindex="0" role="button" data-kbd>' + icon('logout') + '<span>Logout</span></a></nav>' +
    '<div class="foot"><img src="' + ASSET.kemenkes + '" alt="" style="width:32px;height:32px;border-radius:50%;vertical-align:middle;margin-right:8px">Ruang Kasuari Lantai 3<br>RSUP Dr. Kariadi Semarang</div></aside>' +
    '<div class="main"><header class="tb"><button class="btn icon ghost hamb" id="hamb" aria-label="Menu">' + icon('menu') + '</button><div class="grow"><h1 id="tTitle"></h1><div class="sub" id="tSub"></div></div>' +
    '<span class="tiny muted" id="upd"></span><button class="btn icon ghost" id="bRef" title="Muat ulang">' + icon('refresh','sm') + '</button>' +
    '<button class="btn sm" id="bJump" style="display:none">' + icon('message','sm') + '<span class="lbl"> Balas</span></button>' +
    (canWrite() ? '<button class="btn sm" id="bNew" aria-label="Pasien baru">' + icon('plus','sm') + '<span class="lbl"> Pasien Baru</span></button>' : '') +
    '<div class="userchip"><span class="av">' + icon('user','sm') + '</span><span id="uName"></span></div></header><main id="page"></main></div></div>';
  watchTables();
  $('nav').querySelectorAll('a[data-p]').forEach(function(a){ a.onclick = function(){ go(a.dataset.p); $('side').classList.remove('open'); }; });
  $('navOut').onclick = function(){ call('nLogout', N.sess).finally(function(){ logoutLocal('Anda telah keluar.'); }); };
  $('hamb').onclick = function(e){ e.stopPropagation(); $('side').classList.toggle('open'); };
  if (!CLICK_BOUND){ CLICK_BOUND = true; document.addEventListener('click', function(e){ var s = $('side'); if (s && s.classList.contains('open') && !s.contains(e.target)) s.classList.remove('open'); }); }
  $('bRef').onclick = function(){ refresh(); };
  var bn = $('bNew'); if (bn) bn.onclick = showRegister;
  /* v3.0: tampil seketika dari data terakhir (login / sesi ini), lalu diperbarui diam-diam */
  if (!N.data){ var c = KS.get('ks_dash', true); if (c && c.s === N.sess) { N.data = ageFix(c.d); N.dataAt = 0; } }
  if (N.data){ paintShell(N.data); startNurseRoute(); if (Date.now() - (N.dataAt || 0) > 15000) refresh(true).then(quietRender).then(prefetchTop); else prefetchTop(); }
  else { $('page').innerHTML = KS.skel('dash'); refresh().then(function(){ startNurseRoute(); prefetchTop(); }); }
  if (N.timer) clearInterval(N.timer);
  N.timer = setInterval(function(){ if (document.visibilityState !== 'hidden') refresh(true).then(quietRender); }, 60000);
}
function paintShell(d){
  N.user = d.user; N.info = d.info; setDemo(d.info);
  if ($('upd')) $('upd').textContent = 'Diperbarui ' + String(d.serverTime || '').slice(11,16);
  if ($('uName')) $('uName').textContent = d.user.name + ' · ' + d.user.role;
  setCount('reports', d.kpi.newReports); setCount('follow', d.kpi.priorityOpen + d.kpi.reviewOpen); setCount('schedule', d.kpi.noResponse + d.kpi.reminderDue);
  var sc = document.querySelector('#nav a[data-p="schedule"]'); if (sc) sc.style.display = d.freeMode ? 'none' : '';
}
function refresh(silent){
  KS.sync(true);
  return call('nDashboard', N.sess, (N.data && N.data.v) || '').then(function(d){
    if (d && d.same && N.data){ /* v3.10: data tidak berubah → hanya perbarui waktu & umur laporan */
      N.data.serverTime = d.serverTime; ageFix(N.data); N.dataAt = Date.now(); paintShell(N.data);
      N.changed = N.page === 'home' || N.page === 'reports' || N.page === 'follow';
      if (!silent) render(); return;
    }
    var changed = !N.data || N.data.v !== d.v;
    if (changed){ N.arch = null; N.pall = null; }
    setData(d); paintShell(d);
    N.changed = changed;
    if (!silent) render();
  }).catch(function(e){ N.changed = false; if (String(e.message).indexOf('AUTH:') === 0) return logoutLocal(e.message.replace('AUTH:', '').trim()); if (!silent) toast(e.message, true); })
    .then(function(){ KS.sync(false); });
}
function setCount(p, n){ var e = $('c-' + p); if (!e) return; e.textContent = n; e.classList.toggle('hidden', !n); }
/* v2.8: label kolom untuk tampilan kartu di HP */
function labelTables(){
  document.querySelectorAll('.tablebox table').forEach(function(t){
    var hs = [].map.call(t.querySelectorAll('thead th'), function(th){ return th.textContent.trim(); });
    if (!hs.length) return;
    t.querySelectorAll('tbody tr').forEach(function(tr){ [].forEach.call(tr.children, function(td, i){ if (!td.hasAttribute('data-label')){ if (i === 0 || !hs[i]) td.className += ' nolab'; td.setAttribute('data-label', hs[i] || ''); } }); });
  });
}
/* v3.19 (PF-4): hanya mengamati area halaman (#page), bukan seluruh dokumen */
var LBL_OBS = null;
function watchTables(){ var pg = $('page'); if (!pg || !window.MutationObserver) return; if (LBL_OBS) LBL_OBS.disconnect(); var q = false;
  LBL_OBS = new MutationObserver(function(){ if (q) return; q = true; requestAnimationFrame(function(){ q = false; labelTables(); }); }); LBL_OBS.observe(pg, { childList: true, subtree: true }); }
function go(p){ if (p !== 'detail') N.lastList = p; N.page = p; render(); window.scrollTo(0, 0); }
function render(){
  if (!N.data) return;
  var bn = $('bNew'); if (bn) bn.style.display = ''; /* v3.3 (UX-12) */
  var bj = $('bJump'); if (bj) bj.style.display = 'none';
  var t = TITLES[N.page] || ['',''];
  $('tTitle').textContent = t[0]; $('tSub').textContent = t[1];
  $('nav').querySelectorAll('a[data-p]').forEach(function(a){ a.classList.toggle('on', a.dataset.p === N.page || (N.page === 'detail' && a.dataset.p === 'reports')); });
  ({ home: pgHome, patients: pgPatients, reports: pgReports, follow: pgFollow, schedule: pgSchedule, analytics: pgAnalytics, settings: pgSettings, detail: function(){ openReport(N.detail); } })[N.page]();
}

/* ================= CHARTS ================= */
function trendChart(trend){
  var W = 560, H = 230, pl = 34, pr = 8, pt = 10, pb = 28, keys = ['MONITOR','REVIEW','PRIORITY'];
  var max = Math.max(4, Math.max.apply(null, trend.map(function(d){ return d.MONITOR + d.REVIEW + d.PRIORITY; })));
  var step = Math.ceil(max / 4); max = step * 4;
  var iw = W - pl - pr, ih = H - pt - pb, bw = Math.min(40, iw / trend.length * 0.5);
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Tren laporan 7 hari">';
  for (var g = 0; g <= 4; g++){ var y = pt + ih - ih * g / 4; s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" stroke="#E8EEF3" stroke-width="1"/><text x="' + (pl - 8) + '" y="' + (y + 4) + '" font-size="11" fill="#6B7F90" text-anchor="end">' + step * g + '</text>'; }
  trend.forEach(function(d, i){
    var cx = pl + iw * (i + 0.5) / trend.length, y = pt + ih, top = keys.filter(function(k){ return d[k] > 0; }).pop();
    keys.forEach(function(k){
      if (!d[k]) return; var h = ih * d[k] / max, yy = y - h, r = k === top ? 4 : 0;
      s += '<path d="' + roundTop(cx - bw/2, yy, bw, h, r) + '" fill="' + COL[k] + '" stroke="#fff" stroke-width="2"/>';
      y = yy;
    });
    s += '<text x="' + cx + '" y="' + (H - 8) + '" font-size="11" fill="#6B7F90" text-anchor="middle">' + fmtShort(d.date) + '</text>';
    s += '<rect class="hit" data-i="' + i + '" x="' + (cx - iw / trend.length / 2) + '" y="' + pt + '" width="' + (iw / trend.length) + '" height="' + ih + '" fill="transparent"/>';
  });
  s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (pt + ih) + '" y2="' + (pt + ih) + '" stroke="#C9D5DF"/></svg>';
  return '<div class="legend">' + keys.map(function(k){ return '<span><i class="sw" style="background:' + COL[k] + '"></i>' + SLBL[k] + '</span>'; }).join('') + '</div><div class="chart-wrap" id="trendWrap">' + s + '</div>';
}
function roundTop(x, y, w, h, r){ r = Math.min(r, h, w / 2); return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z'; }
function bindTrendTips(trend){
  var wrap = $('trendWrap'); if (!wrap) return;
  var tip = document.createElement('div'); tip.className = 'tip hidden'; wrap.appendChild(tip);
  wrap.querySelectorAll('.hit').forEach(function(h){
    h.onmouseenter = function(){ var d = trend[Number(h.dataset.i)], b = h.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      tip.innerHTML = '<b>' + fmtD(d.date) + '</b>' + ['PRIORITY','REVIEW','MONITOR'].map(function(k){ return '<div class="r"><i class="sw" style="background:' + COL[k] + '"></i>' + SLBL[k] + ': <b>' + d[k] + '</b></div>'; }).join('');
      tip.style.left = (b.left - w.left + b.width / 2) + 'px'; tip.style.top = (b.top - w.top + 20) + 'px'; tip.classList.remove('hidden'); h.setAttribute('fill', 'rgba(14,156,154,.06)'); };
    h.onmouseleave = function(){ tip.classList.add('hidden'); h.setAttribute('fill', 'transparent'); };
  });
}
/* v3.19 (BG-5): grafik donat dihapus – tidak pernah ditampilkan */
/* ================= HALAMAN: BERANDA ================= */
var AI_LBL = { LOW: 'Rendah', MEDIUM: 'Sedang', HIGH: 'Tinggi' };
function pgHome(){
  var d = N.data, k = d.kpi, hr = Number(d.replyHours || 24), tab = N.htab || 'NEW';
  var open = d.reports.filter(function(r){ return r.nurseStatus !== 'CLOSED'; });
  var list = tab === 'NEW' ? open.filter(function(r){ return r.nurseStatus === 'NEW' || r.nurseStatus === 'UNDER_REVIEW'; }) : open;
  /* v3.19 (AX-4): di HP antrean ditampilkan 15 dulu agar halaman tidak sangat panjang */
  var listAll = list.length, hlim = window.innerWidth < 761 ? (N.hlim || 15) : 0; if (hlim && list.length > hlim) list = list.slice(0, hlim);
  var kp = [['bell','t-bad b-bad',k.priorityOpen,'Prioritas – segera','follow'],['alert','t-warn b-warn',k.reviewOpen,'Perlu ditinjau','follow'],['phone','t-nr sec',k.igdPending || 0,'Dianjurkan IGD – belum datang',''],['message','t-navy sec',k.unreadReplies || 0,'Balasan belum dibaca > 24 jam','']];
  var nNew = open.filter(function(r){ return r.nurseStatus === 'NEW' || r.nurseStatus === 'UNDER_REVIEW'; }).length;
  $('page').innerHTML = '<div class="fade-in">' + (k.selfReg24h ? '<div class="alert info">' + icon('users') + '<div class="grow"><b>' + k.selfReg24h + ' pasien mendaftar mandiri</b> dalam 24 jam terakhir. Periksa kebenaran nama, No. RM, dan tanggal lahirnya.</div><button class="btn sm soft" data-go="patients">Lihat</button></div>' : '') +
    '<div class="kpis k4">' + kp.map(function(x){ return '<div class="kpi ' + x[1] + '"' + (x[4] ? ' data-go="' + x[4] + '"' : ' style="cursor:default"') + '><span class="ib">' + icon(x[0]) + '</span><div><div class="n">' + x[2] + '</div><div class="l">' + x[3] + '</div></div></div>'; }).join('') + '</div>' +
    '<div class="panel"><div class="ph"><h3>' + icon('bell','sm') + 'Antrean laporan · paling mendesak di atas</h3><div class="tabs"><button class="tab' + (tab === 'NEW' ? ' on' : '') + '" data-ht="NEW">Belum dibalas <span class="c">' + nNew + '</span></button><button class="tab' + (tab === 'ALL' ? ' on' : '') + '" data-ht="ALL">Semua terbuka <span class="c">' + open.length + '</span></button></div></div>' +
      (list.length ? '<div class="tablebox qtab"><table><thead><tr><th>STATUS</th><th>PASIEN</th><th>KELUHAN</th>' + (list.some(function(x){ return x.ai; }) ? '<th>AI FOTO</th>' : '') + '<th>MENUNGGU · BATAS ' + hr + ' JAM</th><th></th></tr></thead><tbody>' + list.map(function(r){
        var late = r.ageMin > hr * 60;
        return '<tr class="clk row-' + esc(r.status) + '" data-id="' + esc(r.id) + '" tabindex="0" data-kbd aria-label="Buka laporan ' + esc(nm(r.name)) + '"><td>' + badge(r.status) + '</td><td class="who"><b>' + esc(nm(r.name)) + '</b><span>RM ' + esc(r.rm) + (r.drugs ? ' · ' + esc(r.drugs) + (r.vesicant ? ' <b class="ves">vesikan</b>' : '') : '') + '</span></td>' +
          '<td class="small">' + (r.condition === 'CHANGE' ? esc((r.pain ? ['Nyeri ' + r.pain] : []).concat((r.symptoms || []).filter(function(x){ return x !== 'Nyeri'; })).slice(0, 4).join(' · ') || 'Ada perubahan') : '<span class="muted">Tidak ada perubahan</span>') + '</td>' +
          (list.some(function(x){ return x.ai; }) ? '<td><span class="chipx ai-' + esc(r.ai || 'NONE') + '">' + esc(AI_LBL[r.ai] || '–') + '</span></td>' : '') +
          '<td class="nowrap ' + (late ? 'late' : '') + '">' + age(r.ageMin) + (late ? ' · lewat batas' : '') + '</td><td><button class="btn sm line" tabindex="-1">Tinjau</button></td></tr>';
      }).join('') + '</tbody></table></div>' + (hlim && listAll > list.length ? '<div class="center" style="margin-top:12px"><button class="btn sm ghost" id="bMoreH">Tampilkan semua · ' + list.length + ' dari ' + listAll + '</button></div>' : '') : empty('checkc', tab === 'NEW' ? 'Semua laporan sudah dibalas.' : 'Tidak ada kasus terbuka.')) + '</div>' +
    '<div class="grid2e" style="margin-top:16px"><div class="panel"><h3>' + icon('phone','sm') + 'Dianjurkan ke IGD – belum datang</h3><div class="mini-list">' +
      ((d.igdPending || []).length ? d.igdPending.slice(0, 6).map(function(x){ return '<div class="it"><div class="grow"><b>' + esc(nm(x.name)) + '</b> · menjawab “' + esc({ BELUM: 'Belum', TIDAK: 'Tidak' }[x.answer] || x.answer) + '” · ' + esc(fmtD(x.time)) + '</div>' + (x.phone ? '<a class="btn sm ghost" href="tel:' + esc(x.phone) + '">' + icon('phone','sm') + ' Telepon</a>' : '') + '<button class="btn sm soft" data-rep="' + esc(x.reportId) + '">Buka</button></div>'; }).join('') : empty('checkc', 'Tidak ada.')) + '</div></div>' +
    '<div class="panel"><h3>' + icon('message','sm') + 'Balasan belum dibaca pasien &gt; 24 jam</h3><div class="mini-list">' +
      ((d.unreadReplies || []).length ? d.unreadReplies.slice(0, 6).map(function(x){ return '<div class="it"><div class="grow"><b>' + esc(nm(x.name)) + '</b> · dibalas ' + esc(fmtDT(x.time)) + '</div>' + (x.wa ? '<a class="btn sm ghost" target="_blank" href="' + esc(x.wa) + '">' + icon('message','sm') + ' WhatsApp</a>' : '') + '<button class="btn sm soft" data-rep="' + esc(x.reportId) + '">Buka</button></div>'; }).join('') : empty('checkc', 'Semua balasan sudah dibaca.')) + '</div></div></div>' +
    (d.chatAlerts && d.chatAlerts.length ? '<div class="panel" style="margin-top:16px"><h3>' + icon('alert','sm') + 'Tanda bahaya disebut di chat (2 hari)</h3><div class="mini-list">' + d.chatAlerts.slice(0, 5).map(function(c){ return '<div class="it"><div class="grow"><b>' + esc(nm(c.name || c.code)) + '</b> · ' + esc(fmtDT(c.time)) + '<div class="tiny muted">' + esc(c.message) + '</div></div>' + (c.phone ? '<a class="btn sm danger" href="tel:' + esc(c.phone) + '">' + icon('phone','sm') + ' Telepon</a>' : '') + '</div>'; }).join('') + '</div></div>' : '') + '</div>';
  bindGo(); bindRows();
  $('page').querySelectorAll('[data-ht]').forEach(function(b){ b.onclick = function(){ N.htab = b.dataset.ht; pgHome(); }; });
  var bmh = $('bMoreH'); if (bmh) bmh.onclick = function(){ N.hlim = 9999; KS.keepScroll(pgHome); };
  $('page').querySelectorAll('[data-rep]').forEach(function(b){ b.onclick = function(){ N.detail = b.dataset.rep; go('detail'); }; });
}
function bindGo(){ $('page').querySelectorAll('[data-go]').forEach(function(e){ e.onclick = function(){ go(e.dataset.go); }; }); }
function bindRows(){ $('page').querySelectorAll('tr.clk').forEach(function(tr){ tr.onclick = function(){ N.detail = tr.dataset.id; go('detail'); }; }); }
/* v3.10: daftar panjang ditampilkan bertahap (150 baris) agar halaman tetap ringan */
var PAGE_ROWS = 150;
function moreBtn(shown, total, id){ return shown < total ? '<div class="center" style="margin-top:12px"><button class="btn sm ghost" id="' + id + '">Tampilkan ' + Math.min(PAGE_ROWS, total - shown) + ' lagi · ' + shown + ' dari ' + total + '</button></div>' : ''; }
function reportTable(list, compact, limit){
  if (!list.length) return empty('checkc', 'Tidak ada laporan pada daftar ini.');
  var total = list.length; if (limit && total > limit) list = list.slice(0, limit);
  return '<div class="tablebox"><table><thead><tr><th>Status</th><th>Pasien</th><th>Waktu</th>' + (compact ? '' : '<th>Hari</th><th>Kondisi</th><th>Foto</th>') + '<th>Perawat</th></tr></thead><tbody>' +
    list.map(function(r){
      return '<tr class="clk row-' + esc(r.status) + '" data-id="' + esc(r.id) + '" tabindex="0" data-kbd aria-label="Buka laporan ' + esc(nm(r.name)) + '"><td>' + badge(r.status) + '</td><td class="who"><b>' + esc(nm(r.name)) + '</b><span>' + esc(r.code) + ' · ' + esc(r.id) + '</span></td>' +
        '<td class="nowrap">' + esc(fmtDT(r.time)) + '<div class="tiny ' + (r.overdue ? 'overdue' : 'muted') + '">' + (r.overdue ? '⏱ lewat target · ' : '') + age(r.ageMin) + ' lalu</div></td>' +
        (compact ? '' : '<td>H' + esc(r.day) + '</td><td>' + (r.condition === 'CHANGE' ? 'Ada perubahan' : 'Tidak ada') + '</td><td>' + (r.photos ? r.photos + ' foto' : (r.photoRequired ? '<span class="overdue">tanpa foto</span>' : '–')) + '</td>') +
        '<td>' + nsBadge(r.nurseStatus) + '</td></tr>';
    }).join('') + '</tbody></table></div>' + (limit ? moreBtn(list.length, total, 'bMoreR') : '');
}

/* ================= HALAMAN: LAPORAN ================= */
function allReports(){
  var r = N.data.reports; if (!N.arch || !N.arch.list) return r;
  var seen = {}; r.forEach(function(x){ seen[x.id] = 1; });
  return r.concat(N.arch.list.filter(function(x){ return !seen[x.id]; })).sort(function(a, b){ var ca = a.nurseStatus === 'CLOSED' ? 1 : 0, cb = b.nurseStatus === 'CLOSED' ? 1 : 0; return ca - cb || (ca ? String(b.time).localeCompare(String(a.time)) : 0); });
}
function needArchive(){ return N.data && N.data.meta && !(N.arch && N.arch.list) && (N.tab === 'CLOSED' || N.q); }
function loadArchive(){
  if (N.arch && (N.arch.list || N.arch.loading)) return;
  N.arch = { loading: true }; var v = N.data.v;
  call('nReportsArchive', N.sess).then(function(list){ if (!N.data || N.data.v !== v){ N.arch = null; return; } ageList(list, tms(N.data.serverTime) || Date.now(), N.data.sla); N.arch = { list: list }; if (N.page === 'reports' && KS.quiet()) KS.keepScroll(pgReports); })
    .catch(function(e){ N.arch = null; toast('Arsip laporan belum termuat: ' + e.message, true); });
}
function pgReports(){
  var d = N.data, r = allReports(), open = d.reports.filter(function(x){ return x.nurseStatus !== 'CLOSED'; });
  var closedN = d.meta ? Math.max(d.meta.closed60, r.length - open.length) : r.length - open.length;
  var c = { ALL: open.length + closedN, NEW: r.filter(function(x){ return x.nurseStatus === 'NEW'; }).length, REVIEW: open.filter(function(x){ return x.status === 'REVIEW'; }).length, PRIORITY: open.filter(function(x){ return x.status === 'PRIORITY'; }).length, CLOSED: closedN };
  var tabs = [['ALL','Semua'],['NEW','Baru'],['REVIEW','Review'],['PRIORITY','Prioritas'],['CLOSED','Ditutup']];
  var t = N.tab, q = N.q.toLowerCase();
  if (needArchive()) loadArchive();
  var lk = t + '|' + q; if (N.rlimKey !== lk){ N.rlimKey = lk; N.rlim = PAGE_ROWS; }
  var list = r.filter(function(x){ if (t === 'NEW') return x.nurseStatus === 'NEW'; if (t === 'CLOSED') return x.nurseStatus === 'CLOSED'; if (t === 'ALL') return true; return x.status === t && x.nurseStatus !== 'CLOSED'; })
    .filter(function(x){ return !q || (x.name + ' ' + x.code + ' ' + x.rm + ' ' + x.id).toLowerCase().indexOf(q) >= 0; });
  var bulk = t === 'NEW' ? list.filter(function(x){ return x.status === 'MONITOR' && x.condition === 'NO_CHANGE'; }) : [];
  $('page').innerHTML = '<div class="fade-in panel"><div class="ph"><div class="tabs">' + tabs.map(function(x){ return '<button class="tab ' + (t === x[0] ? 'on' : '') + '" data-t="' + x[0] + '">' + x[1] + '<span class="c">' + c[x[0]] + '</span></button>'; }).join('') + '</div>' +
    '<div class="input-ic" style="width:280px;max-width:100%">' + icon('search','sm') + '<input type="search" id="q" placeholder="Cari nama, kode, RM, laporan…" value="' + esc(N.q) + '"></div></div>' +
    (bulk.length && canWrite() ? '<div class="alert info">' + icon('info') + '<div class="grow">' + bulk.length + ' laporan MONITOR tanpa perubahan dapat ditutup sekaligus setelah Anda tinjau.</div><button class="btn sm" id="bBulk">Tutup ' + bulk.length + ' laporan</button></div>' : '') +
    (N.arch && N.arch.loading ? '<p class="tiny muted" role="status" style="margin:0 0 8px">Memuat laporan yang ditutup dalam 60 hari terakhir…</p>' : '') +
    reportTable(list, false, N.rlim) +
    (t === 'ALL' && !q && !(N.arch && (N.arch.list || N.arch.loading)) && d.meta && d.meta.closed60 > (d.reports.length - open.length) && list.length <= N.rlim ?
      '<div class="center" style="margin-top:12px"><button class="btn sm ghost" id="bArch">Tampilkan juga laporan ditutup ' + (d.meta.reportDays + 1) + '–60 hari lalu (' + (d.meta.closed60 - (d.reports.length - open.length)) + ')</button></div>' : '') + '</div>';
  var ba0 = $('bArch'); if (ba0) ba0.onclick = function(){ loadArchive(); KS.keepScroll(pgReports); };
  $('page').querySelectorAll('[data-t]').forEach(function(b){ b.onclick = function(){ N.tab = b.dataset.t; pgReports(); }; });
  var bm = $('bMoreR'); if (bm) bm.onclick = function(){ N.rlim += PAGE_ROWS; KS.keepScroll(pgReports); };
  $('q').oninput = function(){ N.q = this.value; clearTimeout(N.qt); N.qt = setTimeout(function(){ var e0 = $('q'), p = e0 ? e0.selectionStart : 0; pgReports(); var e = $('q'); if (e){ e.focus(); e.setSelectionRange(p, p); } }, 160); }; /* v3.0: debounce pencarian */
  bindRows();
  var bb = $('bBulk'); if (bb) bb.onclick = function(){
    if (!confirm('Tutup ' + bulk.length + ' laporan MONITOR tanpa perubahan?')) return; busy(bb, true);
    call('nBulkCloseMonitor', N.sess, bulk.map(function(x){ return x.id; })).then(function(n){ toast(n + ' laporan ditutup.'); refresh(); }).catch(function(e){ busy(bb, false); toast(e.message, true); });
  };
}

/* ================= HALAMAN: PASIEN ================= */
function allPatients(){ return (N.pall && N.pall.list) || N.data.patients; }
function findPatient(id){ return allPatients().filter(function(x){ return x.patientId === id; })[0] || N.data.patients.filter(function(x){ return x.patientId === id; })[0]; }
function loadPatientsAll(){
  if (N.pall && (N.pall.list || N.pall.loading)) return;
  N.pall = { loading: true }; var v = N.data.v;
  call('nPatientsAll', N.sess).then(function(list){ if (!N.data || N.data.v !== v){ N.pall = null; return; } N.pall = { list: list }; if (N.page === 'patients' && KS.quiet()) KS.keepScroll(pgPatients); })
    .catch(function(e){ N.pall = null; toast('Daftar pasien lengkap belum termuat: ' + e.message, true); });
}
function pgPatients(){
  var d = N.data, q = N.q.toLowerCase();
  var partial = d.meta && d.meta.patientsPartial && !(N.pall && N.pall.list);
  if (partial && N.ptab === 'list' && (N.pfilter !== 'AKTIF' || q)) loadPatientsAll();
  var lk = N.pfilter + '|' + q; if (N.plimKey !== lk){ N.plimKey = lk; N.plim = PAGE_ROWS; }
  var head = '<div class="ph"><div class="tabs"><button class="tab ' + (N.ptab === 'list' ? 'on' : '') + '" data-pt="list">' + icon('file','sm') + 'Daftar Pasien</button><button class="tab ' + (N.ptab === 'board' ? 'on' : '') + '" data-pt="board">' + icon('grid','sm') + 'Papan Monitoring<span class="c">' + d.board.length + '</span></button></div>' +
    '<div class="row"><div class="input-ic" style="width:260px;max-width:100%">' + icon('search','sm') + '<input type="search" id="q" placeholder="Cari nama, kode, atau nomor RM…" value="' + esc(N.q) + '"></div>' + '<button class="btn sm ghost" id="bPoster">' + icon('printer','sm') + ' Poster QR</button>' + (canWrite() ? '<button class="btn sm" id="bAdd">' + icon('plus','sm') + ' Tambah Pasien</button>' : '') + '</div></div>';
  var body = '';
  if (N.ptab === 'list'){
    var list = allPatients().filter(function(p){ return N.pfilter === 'SEMUA' || p.status === N.pfilter; }).filter(function(p){ return !q || (p.name + ' ' + p.code + ' ' + p.rm).toLowerCase().indexOf(q) >= 0; });
    var ptotal = list.length; list = list.slice(0, N.plim);
    body = '<div class="tabs" style="margin-bottom:12px">' + ['AKTIF','SELESAI','DIHENTIKAN','SEMUA'].map(function(f){ return '<button class="tab ' + (N.pfilter === f ? 'on' : '') + '" data-pf="' + f + '">' + f.charAt(0) + f.slice(1).toLowerCase() + '</button>'; }).join('') + '</div>' +
      (list.length ? '<div class="tablebox"><table><thead><tr><th>Kode</th><th>Nama Pasien</th><th>RM</th><th>Tgl Kemoterapi</th><th>Akses</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(function(p){
        var st = { AKTIF: 'b-MONITOR', SELESAI: 'b-GREY', DIHENTIKAN: 'b-PRIORITY' }[p.status] || 'b-GREY';
        return '<tr><td class="b">' + esc(p.code) + '</td><td>' + esc(nm(p.name)) + (p.isDummy ? ' <span class="badge b-GREY">DUMMY</span>' : '') + (p.selfReg ? ' <span class="badge b-TEAL" title="Didaftarkan sendiri oleh pasien">Mandiri</span>' : '') + (p.ctxUnverified || p.drugsUnconfirmed ? ' <span class="badge b-GREY" title="Tanggal kemo atau obat sesi terbaru belum diketahui">data kemo belum lengkap</span>' : '') + '</td><td>' + esc(p.rm) + '</td><td class="nowrap">' + esc(fmtD(p.chemoDate)) + '</td><td class="small">' + esc(p.accessType) + ' – ' + esc(p.accessSite) + '</td>' +
          '<td><span class="badge ' + st + '">' + esc(p.status.charAt(0) + p.status.slice(1).toLowerCase()) + '</span></td><td class="right nowrap">' + (canWrite() ? '<button class="btn sm ghost" data-edit="' + esc(p.patientId) + '" title="Ubah data">' + icon('sliders','sm') + ' Ubah</button> ' : '') + (canWrite() && p.status === 'AKTIF' ? '<button class="btn sm soft" data-card="' + esc(p.patientId) + '">' + icon('scan','sm') + ' QR</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' + moreBtn(list.length, ptotal, 'bMoreP') : (N.pall && N.pall.loading ? '' : empty('users', 'Tidak ada pasien pada filter ini.')));
    if (N.pall && N.pall.loading && (N.pfilter !== 'AKTIF' || q)) body = body.replace('<div class="tabs" style="margin-bottom:12px">', '<p class="tiny muted" role="status" style="margin:0 0 8px">Memuat daftar semua pasien…</p><div class="tabs" style="margin-bottom:12px">');
  } else {
    var b = d.board.filter(function(p){ return !q || (p.name + ' ' + p.code + ' ' + p.rm).toLowerCase().indexOf(q) >= 0; });
    body = b.length ? '<div class="board">' + b.map(function(p){
      return '<div class="pcard w-' + esc(p.worstOpen) + '"><div class="row" style="flex-wrap:nowrap"><div class="who grow"><b>' + esc(nm(p.name)) + (p.isDummy ? ' <span class="badge b-GREY">DUMMY</span>' : '') + '</b><span>' + esc(p.code) + ' · RM ' + esc(p.rm) + (p.selfReg ? ' · <b style="display:inline;color:var(--teal-700)">daftar mandiri</b>' : '') + '</span></div>' + (p.worstOpen ? badge(p.worstOpen) : '<span class="badge b-MONITOR">Aman</span>') + '</div>' +
        '<div class="small muted" style="margin-top:6px">Kemo ' + esc(fmtD(p.chemoDate)) + ' · ' + esc(p.accessType) + ' – ' + esc(p.accessSite) + '</div>' +
        '<div class="chips">' + p.tasks.map(function(t){ return '<span class="chip ' + esc(t.status) + '" title="' + esc(t.name + ' – ' + (TASK_LABEL[t.status] || t.status)) + '">H' + esc(t.day) + '</span>'; }).join('') + '</div>' +
        '<div class="tiny muted">' + (p.consent ? '✔ persetujuan' : '✖ belum persetujuan') + ' · ' + (p.education ? '✔ edukasi' : '✖ edukasi') + ' · ' + (p.baseline ? '✔ foto dasar' : '✖ foto dasar') + ' · kasus terbuka ' + p.openCases + '</div>' +
        '<div class="row" style="margin-top:12px;gap:6px">' + (p.lastReport ? '<button class="btn sm ghost" data-rep="' + esc(p.lastReport.id) + '">Laporan terakhir</button>' : '') +
        (canWrite() ? '<button class="btn sm soft" data-card="' + esc(p.patientId) + '">' + icon('scan','sm') + ' QR</button><label class="btn sm ghost">' + icon('camera','sm') + ' Foto dasar<input type="file" accept="image/*" capture="environment" class="sr" data-base="' + esc(p.patientId) + '"></label>' +
          '<button class="btn sm ghost" data-end="' + esc(p.patientId) + '" data-name="' + esc(p.name) + '">Akhiri</button>' : '') + '</div></div>';
    }).join('') + '</div>' : empty('users', 'Belum ada pasien aktif.');
  }
  $('page').innerHTML = '<div class="fade-in panel">' + head + body + '</div>';
  var pg = $('page');
  pg.querySelectorAll('[data-pt]').forEach(function(e){ e.onclick = function(){ N.ptab = e.dataset.pt; pgPatients(); }; });
  pg.querySelectorAll('[data-pf]').forEach(function(e){ e.onclick = function(){ N.pfilter = e.dataset.pf; pgPatients(); }; });
  $('q').oninput = function(){ N.q = this.value; clearTimeout(N.qt); N.qt = setTimeout(function(){ var e0 = $('q'), p = e0 ? e0.selectionStart : 0; pgPatients(); var e = $('q'); if (e){ e.focus(); e.setSelectionRange(p, p); } }, 160); }; /* v3.0: debounce pencarian */
  var ba = $('bAdd'); if (ba) ba.onclick = showRegister;
  $('bPoster').onclick = showPoster;
  pg.querySelectorAll('[data-edit]').forEach(function(e){ e.onclick = function(){ showEdit(findPatient(e.dataset.edit)); }; });
  var bmp = $('bMoreP'); if (bmp) bmp.onclick = function(){ N.plim += PAGE_ROWS; KS.keepScroll(pgPatients); };
  pg.querySelectorAll('[data-card]').forEach(function(e){ e.onclick = function(){ showCard(e.dataset.card); }; });
  pg.querySelectorAll('[data-rep]').forEach(function(e){ e.onclick = function(){ N.detail = e.dataset.rep; go('detail'); }; });
  pg.querySelectorAll('[data-base]').forEach(function(x){ x.onchange = function(){
    var f = x.files[0]; if (!f) return; toast('Mengunggah foto dasar…');
    compress(f, 1600).then(function(u){ return call('nUploadBaseline', N.sess, x.dataset.base, u); }).then(function(){ toast('Foto dasar tersimpan.'); refresh(); }).catch(function(e){ toast(e.message, true); });
  }; });
  pg.querySelectorAll('[data-end]').forEach(function(x){ x.onclick = function(){
    modal('<div class="modal-head"><h2>Akhiri pemantauan</h2>' + xbtn() + '</div><p>' + esc(x.dataset.name) + '</p>' +
      '<label class="lbl">Status</label><select id="es"><option value="SELESAI">SELESAI – pemantauan tuntas</option><option value="DIHENTIKAN">DIHENTIKAN – akses pasien dinonaktifkan</option></select>' +
      '<label class="lbl">Alasan</label><textarea id="er"></textarea><button class="btn danger block" id="bEnd" style="margin-top:14px">Akhiri pemantauan</button>');
    $('bEnd').onclick = function(){ var bb = this; busy(bb, true);
      call('nEndMonitoring', N.sess, x.dataset.end, val('es'), val('er')).then(function(){ closeModal(); toast('Pemantauan diakhiri.'); refresh(); }).catch(function(e){ busy(bb, false); toast(e.message, true); }); };
  }; });
}

/* ================= HALAMAN: TINDAK LANJUT (kanban) ================= */
function pgFollow(){
  var open = N.data.reports.filter(function(r){ return r.nurseStatus !== 'CLOSED' && r.status !== 'MONITOR'; });
  var cols = [['NEW','Baru'],['UNDER_REVIEW','Sedang Ditinjau'],['CONTACTED','Sudah Dihubungi'],['FOLLOW_UP_COMPLETED','Siap Ditutup']];
  $('page').innerHTML = '<div class="fade-in"><div class="alert info">' + icon('info') + '<div>Alur: <b>Baru → Ditinjau → Dihubungi → Follow-up selesai → Ditutup</b>. Kasus REVIEW/PRIORITY wajib memiliki catatan follow-up sebelum ditutup.</div></div><div class="kanban">' +
    cols.map(function(c){ var l = open.filter(function(r){ return r.nurseStatus === c[0]; });
      return '<div class="col"><h4>' + c[1] + '<span class="badge b-GREY">' + l.length + '</span></h4>' + (l.length ? l.map(function(r){
        return '<div class="kc ' + esc(r.status) + '" data-id="' + esc(r.id) + '" tabindex="0" data-kbd role="button"><div class="row" style="justify-content:space-between;flex-wrap:nowrap">' + badge(r.status) + '<span class="tiny ' + (r.overdue ? 'overdue' : 'muted') + '">' + age(r.ageMin) + '</span></div>' +
          '<div class="b" style="margin-top:8px;color:var(--navy)">' + esc(nm(r.name)) + '</div><div class="tiny muted">' + esc(r.code) + ' · ' + esc(r.id) + ' · H' + esc(r.day) + '</div></div>'; }).join('') : '<div class="tiny muted center" style="padding:20px 0">Kosong</div>') + '</div>';
    }).join('') + '</div></div>';
  $('page').querySelectorAll('.kc').forEach(function(k){ k.onclick = function(){ N.detail = k.dataset.id; go('detail'); }; });
}

/* ================= HALAMAN: JADWAL ================= */
function pgSchedule(){
  var d = N.data, list = d.attention, today = d.serverTime.slice(0, 10);
  var todays = []; d.board.forEach(function(p){ p.tasks.forEach(function(t){ if (t.date === today) todays.push({ p: p, t: t }); }); });
  $('page').innerHTML = '<div class="fade-in stack"><div class="panel"><div class="ph"><h3>' + icon('bell','sm') + 'Perlu Pengingat & Tidak Respon</h3></div>' +
    '<p class="small muted" style="margin-top:-6px">Jadwal lewat → <b>Perlu pengingat</b> (kirim WhatsApp) → bila tetap tidak melapor → <b>Tidak respon</b> → hubungi & tandai ditangani.</p>' +
    (list.length ? '<div class="tablebox"><table><thead><tr><th>Status</th><th>Pasien</th><th>Jadwal</th><th>Berakhir</th><th>Tindakan</th></tr></thead><tbody>' + list.map(function(t, i){
      return '<tr><td>' + badge(t.status === 'NO_RESPONSE' ? 'NO_RESPONSE' : 'REVIEW', TASK_LABEL[t.status]) + '</td><td class="who"><b>' + esc(nm(t.name)) + '</b><span>' + esc(t.code) + ' · RM ' + esc(t.rm) + '</span></td><td class="small">' + esc(t.schedule.replace('[DUMMY] ','')) + (t.reminderAt ? '<div class="tiny muted">Diingatkan ' + esc(fmtDT(t.reminderAt)) + '</div>' : '') + '</td><td class="nowrap small">' + esc(fmtDT(t.windowEnd)) + '</td><td class="nowrap">' +
        (canWrite() ? (t.wa ? '<button class="btn sm" data-wa="' + i + '" data-who="patient" title="WhatsApp pasien">' + icon('message','sm') + ' Pasien</button> ' : '') + (t.waCaregiver ? '<button class="btn sm ghost" data-wa="' + i + '" data-who="caregiver">' + icon('message','sm') + ' Keluarga</button> ' : '') +
          (t.phone ? '<a class="btn sm ghost icon" href="tel:' + esc(t.phone) + '" title="Telepon">' + icon('phone','sm') + '</a> ' : '') + '<button class="btn sm navy" data-res="' + i + '">Ditangani</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : empty('checkc', 'Semua jadwal cek terpenuhi.')) + '</div>' +
    '<div class="panel"><h3>' + icon('calendar','sm') + 'Jadwal Cek Hari Ini · ' + esc(fmtD(today)) + '</h3>' + (todays.length ? todays.map(function(x){
      return '<div class="row" style="padding:10px 0;border-bottom:1px solid var(--line-2);flex-wrap:nowrap"><div class="who grow"><b>' + esc(nm(x.p.name)) + '</b><span>' + esc(x.p.code) + ' · ' + esc(x.t.name.replace('[DUMMY] ','')) + '</span></div><span class="chip ' + esc(x.t.status) + '">' + esc(TASK_LABEL[x.t.status] || x.t.status) + '</span></div>'; }).join('') : empty('calendar', 'Tidak ada jadwal cek hari ini.')) + '</div></div>';
  var pg = $('page');
  pg.querySelectorAll('[data-wa]').forEach(function(b){ b.onclick = function(){
    var t = list[Number(b.dataset.wa)], who = b.dataset.who; window.open(who === 'caregiver' ? t.waCaregiver : t.wa, '_blank');
    call('nMarkReminder', N.sess, t.id, who).then(function(){ toast('Pengingat dicatat.'); refresh(); }).catch(function(e){ toast(e.message, true); });
  }; });
  pg.querySelectorAll('[data-res]').forEach(function(b){ b.onclick = function(){
    var t = list[Number(b.dataset.res)];
    modal('<div class="modal-head"><h2>Tandai ditangani</h2>' + xbtn() + '</div><p class="small">' + esc(t.name) + ' · ' + esc(t.schedule) + '</p><label class="lbl">Hasil penanganan</label><textarea id="rn" placeholder="mis. Sudah ditelepon, pasien lupa mengisi, tidak ada keluhan."></textarea>' +
      '<p class="tiny muted">Bila ada keluhan, minta pasien mengirim laporan agar dinilai rule engine.</p><button class="btn block" id="bRn">Simpan</button>');
    $('bRn').onclick = function(){ var bb = this; busy(bb, true); call('nResolveTask', N.sess, t.id, val('rn')).then(function(){ closeModal(); toast('Dicatat.'); refresh(); }).catch(function(e){ busy(bb, false); toast(e.message, true); }); };
  }; });
}

/* ================= HALAMAN: ANALITIK ================= */
function pgAnalytics(){
  if (N.pcache.analytics) paintAnalytics(N.pcache.analytics); else $('page').innerHTML = KS.skel('dash');
  call('nAnalytics', N.sess).then(function(list){ var ch = !KS.same(list, N.pcache.analytics); N.pcache.analytics = list; if (ch && N.page === 'analytics') paintAnalytics(list); }).catch(function(e){ toast(e.message, true); });
}
function paintAnalytics(list){
  (function(){
    var ics = ['users','checkc','file','eye','clock','clipcheck','shield','bell','sparkle'];
    $('page').innerHTML = '<div class="fade-in"><div class="kpis">' + list.map(function(r, i){ return '<div class="kpi t-' + (['teal','ok','navy','teal','warn','ok','navy','nr','teal'][i] || 'navy') + '" style="cursor:default"><span class="ib">' + icon(ics[i] || 'chart') + '</span><div><div class="n" style="font-size:1.45rem">' + esc(r.VALUE) + '</div><div class="l">' + esc(r.METRIC) + '</div></div></div>'; }).join('') + '</div>' +
      '<div class="grid2"><div class="panel"><h3>' + icon('chart','sm') + 'Tren Laporan 7 Hari</h3>' + trendChart(N.data.trend) + '</div><div class="panel"><h3>' + icon('info','sm') + 'Definisi</h3>' +
      list.map(function(r){ return '<div style="padding:7px 0;border-bottom:1px solid var(--line-2)"><div class="small b">' + esc(r.METRIC) + ' <span class="muted" style="font-weight:600">' + esc(r.NUMERATOR) + (r.DENOMINATOR ? ' / ' + esc(r.DENOMINATOR) : '') + '</span></div><div class="tiny muted">' + esc(r.DEFINITION) + '</div></div>'; }).join('') + '</div></div>' +
      '<p class="tiny muted" style="margin-top:12px">Tersimpan juga di sheet 12_ANALYTICS. </p></div>';
    bindTrendTips(N.data.trend);
  })();
}

/* ================= HALAMAN: PENGATURAN ================= */
function pgSettings(){
  if (N.pcache.settings) paintSettings(N.pcache.settings); else $('page').innerHTML = KS.skel('list');
  call('nSettings', N.sess).then(function(s){ var ch = !KS.same(s, N.pcache.settings); N.pcache.settings = s; if (ch && N.page === 'settings' && !modalRoot.innerHTML) paintSettings(s); }).catch(function(e){ toast(e.message, true); });
}
function paintSettings(s){
  (function(){
    var c = s.counts;
    $('page').innerHTML = '<div class="fade-in"><div class="kpis">' + [['sliders','t-navy','AKTIF','Status sistem'],['shield','t-teal',c.rules,'Rule klinis aktif'],['book','t-teal',c.content,'Konten panduan aktif'],['calendar','t-teal',c.schedule,'Jadwal monitoring'],['clipcheck','t-teal',c.questions,'Pertanyaan aktif']]
      .map(function(x){ return '<div class="kpi ' + x[1] + '" style="cursor:default"><span class="ib">' + icon(x[0]) + '</span><div><div class="n" style="font-size:1.3rem">' + esc(x[2]) + '</div><div class="l">' + x[3] + '</div></div></div>'; }).join('') + '</div>' +
      '<div class="grid2"><div class="panel"><div class="ph"><h3>' + icon('sliders','sm') + 'Konfigurasi (01_CONFIG)</h3>' + (s.sheetUrl ? '<a class="btn sm soft" target="_blank" href="' + esc(s.sheetUrl) + '">' + icon('external','sm') + ' Buka Spreadsheet</a>' : '') + '</div>' +
      '<p class="small muted" style="margin-top:-6px">Konfigurasi, pertanyaan, rule, konten, dan jadwal diubah oleh admin langsung di Google Sheets.</p><div class="tablebox"><table><thead><tr><th>Key</th><th>Nilai</th></tr></thead><tbody>' +
      s.config.map(function(x){ return '<tr><td class="b small">' + esc(x.key) + '<div class="tiny muted" style="font-weight:500">' + esc(x.desc) + '</div></td><td class="small" style="max-width:380px;word-break:break-word">' + esc(x.value) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="panel"><h3>' + icon('user','sm') + 'Akun Saya</h3><div class="kv"><div>Nama</div><div class="b">' + esc(N.user.name) + '</div><div>Peran</div><div>' + esc(N.user.role) + '</div><div>Versi aplikasi</div><div>v' + esc(s.version) + '</div></div>' +
      '<button class="btn soft block" id="bPw" style="margin-top:14px">' + icon('key','sm') + ' Ganti password</button>' +
      (s.isAdmin ? '<h3 style="margin-top:22px">' + icon('users','sm') + 'Pengguna</h3>' + s.users.map(function(u){ return '<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line-2);flex-wrap:nowrap"><div class="who grow"><b>' + esc(u.name) + '</b><span>' + esc(u.username) + ' · ' + esc(u.role) + (u.lastLogin ? ' · login ' + esc(fmtDT(u.lastLogin)) : '') + '</span></div><span class="badge ' + (u.active ? 'b-MONITOR' : 'b-GREY') + '">' + (u.active ? 'Aktif' : 'Nonaktif') + '</span></div>'; }).join('') +
        '<p class="tiny muted" style="margin-top:10px">Tambah/reset pengguna: Spreadsheet → menu 🩺 KASUARI SIGAP → Tambah / reset password pengguna.</p>' : '') + '</div></div></div>';
    $('bPw').onclick = function(){ showChangePw(false); };
  })();
}

/* ================= DETAIL LAPORAN ================= */
/* v3.0: detail tampil seketika bila sudah pernah dibuka / dipra-muat; data terbaru menyusul */
function openReport(id){
  var c = N.dcache[id];
  if (c) renderDetail(c); else $('page').innerHTML = KS.skel('detail');
  KS.sync(true);
  call('nReportDetail', N.sess, id).then(function(d){
    var changed = !KS.same(d, c); N.dcache[id] = d;
    if (N.page !== 'detail' || N.detail !== id || !changed) return;
    var typed = ['fPmsg','fArea','fAss','fAct','fNote','fNext'].some(function(k){ var e = $(k); return e && e.value; });
    if (!c || (!typed && KS.quiet() && !modalRoot.innerHTML)) KS.keepScroll(function(){ renderDetail(d); });
  }).catch(function(e){ if (!c){ toast(e.message, true); go('reports'); } }).then(function(){ KS.sync(false); });
}
var CTCAE = [['0','Tidak ada','Tidak tampak tanda ekstravasasi'],['2','Derajat 2','Eritema + gejala (edema, nyeri, indurasi, flebitis)'],['3','Derajat 3','Ulkus / nekrosis; kerusakan jaringan berat; perlu tindakan operasi'],['4','Derajat 4','Mengancam jiwa; perlu intervensi segera']];
var MSG_TPL = ['Terima kasih, foto sudah kami tinjau. Lanjutkan kompres sesuai petunjuk dan pantau terus.', 'Mohon segera datang ke IGD RSUP Dr. Kariadi hari ini untuk diperiksa.', 'Kami akan menelepon Anda sebentar lagi. Mohon HP tetap aktif.'];
/* v3.11: sumber data klinis – "diisi pasien" perlu diverifikasi perawat */
function srcB(src){ return src === 'PASIEN' ? ' <span class="badge b-GREY" title="Diisi sendiri oleh pasien – verifikasi lewat Ubah data pasien">diisi pasien</span>' : ''; }
function renderDetail(d){
  var bn = $('bNew'); if (bn) bn.style.display = 'none'; /* v3.3 (UX-12) */
  var bj = $('bJump'); if (bj){ bj.style.display = d.canWrite && d.report.nurseStatus !== 'CLOSED' ? 'inline-flex' : 'none'; bj.onclick = function(){ var rb = $('replyBox'); if (rb){ rb.scrollIntoView({ block: 'start', behavior: 'smooth' }); var m = $('fPmsg'); if (m) setTimeout(function(){ m.focus({ preventScroll: true }); }, 350); } }; }
  var r = d.report, p = d.patient, w = d.canWrite && r.nurseStatus !== 'CLOSED', hr = Number(r.replyHours || 24);
  var ves = d.drugInfo.filter(function(x){ return /VESIKAN/i.test(x.tissue); }).length > 0;
  var drugs = d.drugInfo.map(function(x){ return x.name; }).join(', ') || d.drugOther || 'obat belum diisi';
  $('tTitle').textContent = nm(p.name); $('tSub').textContent = 'RM ' + p.rm + (p.age !== '' ? ' · ' + p.age + ' th' : '') + ' · kemo terakhir ' + fmtD(p.chemoDate) + ' · ' + drugs + (ves ? ' (vesikan)' : '') + ' · ' + [p.accessType, p.accessSite].filter(Boolean).join(', ');
  var yes = [], no = [], info = [], txt = '';
  d.answers.forEach(function(a){
    if (a.code === 'OVERALL_CONDITION' || a.code === 'OTHER_COMPLAINT') return;
    if (a.code === 'PAIN_SCORE') return;
    if (a.code === 'OTHER_TEXT'){ txt = a.value; return; }
    if (a.raw === 'YA') yes.push(a.code === 'PAIN' ? 'Nyeri ' + ((d.answers.filter(function(x){ return x.code === 'PAIN_SCORE'; })[0] || {}).value || '?') + '/10' : a.question);
    else if (a.raw === 'TIDAK') no.push(a.question.toLowerCase());
    else info.push(a.question + ': ' + String(a.value).toLowerCase());
  });
  var ai = d.aiCompanion, CONF = { LOW: 'rendah', MEDIUM: 'sedang', HIGH: 'tinggi' }, URG = { URGENT: 'perlu segera', SOON: 'perlu ditinjau segera', ROUTINE: 'rutin' };
  var aiHtml = ai && ai.likelihood ? '<div style="font-size:.95rem"><b>Kemungkinan komplikasi: ' + esc(AI_LBL[ai.likelihood] || ai.likelihood) + '</b>' + (ai.confidence ? ' · yakin: ' + esc(CONF[ai.confidence] || ai.confidence) : '') + (ai.urgency ? ' · ' + esc(URG[ai.urgency] || ai.urgency) : '') + '</div>' +
      ((ai.findings || []).length ? '<ul class="small" style="margin:6px 0;padding-left:18px">' + ai.findings.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + (ai.est_size_cm ? '<li>Perkiraan luas ± ' + esc(ai.est_size_cm) + ' cm</li>' : '') + '</ul>' : '') +
      (ai.nurse_note ? '<div class="small" style="color:var(--ink-2)">' + esc(ai.nurse_note) + '</div>' : '') + (/RAISED/.test(r.aiStatus) ? '<div class="tiny" style="color:var(--bad-700);margin-top:4px">Status dinaikkan otomatis berdasarkan bacaan foto.</div>' : '')
    : '<div class="small muted">' + (r.aiVisual === 'DISABLED' ? 'AI foto nonaktif (sesuai konfigurasi).' : ai ? 'AI tidak memberi tingkat kemungkinan.' : 'Tidak ada bacaan AI.') + '</div>';
  var why = d.rules.length ? d.rules.map(function(x){ return x.name; }).filter(Boolean).join('; ') : 'tidak ada aturan cocok – status cadangan';
  var shown = d.care && d.care.content ? '<b>' + esc(d.care.content.title) + '</b>' + (d.care.content.actions && d.care.content.actions.length ? ': ' + esc(d.care.content.actions.slice(0, 3).join('; ')) + '…' : '') : (d.guidance ? esc(d.guidance.title) : 'Panduan umum');
  var last = d.followUps[d.followUps.length - 1] || {};
  var tabs = [['hist','Riwayat'],['pat','Pasien'],['chat','Chat AI (' + d.chat.filter(function(c){ return c.role === 'user'; }).length + ')'],['care','Saran'],['drug','Obat']];
  $('page').innerHTML = '<div class="fade-in"><div class="row drow"><button class="btn sm ghost" id="bBack">' + icon('back','sm') + ' Antrean</button>' + badge(r.status) + nsBadge(r.nurseStatus) +
    '<span class="tiny muted meta">Laporan ' + esc(fmtDT(r.time)) + ' · diisi ' + esc(r.reportedBy === 'KELUARGA' ? 'keluarga' : 'pasien') + (r.reporterName ? ' (' + esc(r.reporterName) + ')' : '') + ' · menunggu ' + age(r.ageMin) + (r.ageMin > hr * 60 ? ' <b class="late">· lewat batas ' + hr + ' jam</b>' : '') + '</span>' +
    (w && r.nurseStatus === 'NEW' ? '<button class="btn sm soft" id="bRev">' + icon('eye','sm') + ' Tandai sedang ditinjau</button>' : '') + (p.phone ? '<a class="btn sm ghost" href="tel:' + esc(p.phone) + '">' + icon('phone','sm') + ' Telepon pasien</a>' : '') + (p.waPhone ? '<a class="btn sm ghost" target="_blank" href="' + esc(p.waPhone) + '">' + icon('message','sm') + ' WhatsApp</a>' : '') +
    '<button class="btn sm ghost icon" id="bRe" title="Muat ulang">' + icon('refresh','sm') + '</button></div>' +
    '<div class="dgrid"><div class="dcol">' +
      '<div class="panel o1"><div class="ph"><h3>' + icon('image','sm') + 'Foto · ' + esc(fmtDT(r.time)) + '</h3>' + (ai && ai.photo_quality ? '<span class="tiny b" style="color:' + (ai.photo_quality === 'GOOD' ? 'var(--ok-700)' : 'var(--warn-700)') + '">Kualitas foto ' + (ai.photo_quality === 'GOOD' ? 'baik' : 'kurang') + '</span>' : '') + '</div>' +
        (d.photos.length ? '<div class="photo-main" id="phMain"><div class="spinner"></div></div><div class="phstrip">' + d.photos.map(function(ph, i){ return '<button data-ph="' + i + '" class="' + (i ? '' : 'on') + '">Foto ' + (i + 1) + '</button>'; }).join('') + (d.baseline ? '<button data-base="1">Foto dasar</button>' : '') + '<button id="bAll">' + icon('grid','sm') + ' Bandingkan semua</button></div>'
          : '<div class="alert warn">' + icon('image') + '<div>Tidak ada foto.' + (r.photoSkip ? ' Alasan pasien: ' + esc(r.photoSkip) : '') + '</div></div>') + '</div>' +
      (w ? '<div class="panel o3 assess"><div class="ph"><h3>' + icon('shield','sm') + 'Pengkajian perawat</h3><span class="tiny muted">Diisi setelah meninjau foto / menelepon</span></div>' +
          '<label class="flab">Derajat ekstravasasi – CTCAE v5.0 (Infusion site extravasation)</label><div class="sel4" id="fGrade">' + CTCAE.map(function(c){ return '<button type="button" data-v="' + c[0] + '" class="' + (last.ctcae === c[0] ? 'on' : '') + '"><b>' + c[1] + '</b><span>' + c[2] + '</span></button>'; }).join('') + '</div>' +
          '<div class="tiny muted" style="margin:6px 0 14px">CTCAE tidak mendefinisikan derajat 1 untuk ekstravasasi.</div>' +
          '<div class="g2" style="grid-template-columns:150px minmax(0,1fr)"><div><label class="flab" for="fArea">Luas area (cm)</label><input type="text" id="fArea" inputmode="decimal" value="' + esc(last.area || (ai && ai.est_size_cm) || '') + '"></div>' +
          '<div><label class="flab">Kesimpulan perawat</label><div class="pills" id="fConcl">' + (d.conclusions || []).map(function(c){ return '<button type="button" data-v="' + esc(c) + '" class="' + (last.conclusion === c ? 'on' : '') + '">' + esc(c) + '</button>'; }).join('') + '</div></div></div></div>' : '') +
      '<div class="panel o5"><div class="dtabs">' + tabs.map(function(t, i){ return '<button data-tb="' + t[0] + '" class="' + (i ? '' : 'on') + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>' +
        '<div class="dtab" data-tp="hist">' + (d.followUps.length ? d.followUps.map(function(f){
          return '<div class="fu"><div class="row" style="justify-content:space-between"><b>' + esc(fmtD(f.date)) + ' ' + esc(f.time) + '</b><span class="tiny muted">' + esc(f.nurse) + ' · ' + esc(f.method) + '</span></div>' +
            (f.patientMessage ? '<div style="margin-top:4px;padding:6px 8px;border-radius:8px;background:var(--teal-50)"><span class="muted">Pesan ke pasien:</span> ' + esc(f.patientMessage) + '</div><div class="tiny" style="margin-top:4px;font-weight:700;color:' + (f.readAt ? 'var(--ok-700)' : 'var(--muted)') + '">' + (f.readAt ? '✔ Dibaca pasien ' + esc(f.readAt.slice(0, 16)) : '○ Belum dibaca pasien') + '</div>' : '') +
            (f.nextAction ? '<div><span class="muted">Anjuran:</span> ' + esc(f.nextAction) + '</div>' : '') +
            ([f.conclusion, f.ctcae !== '' ? (f.ctcae === '0' ? 'CTCAE: tidak ada' : 'CTCAE derajat ' + f.ctcae) : '', f.area ? 'luas ' + f.area + ' cm' : '', f.igdAdvised === 'YA' ? 'dianjurkan IGD' : ''].filter(Boolean).length ? '<div><span class="muted">Pengkajian:</span> ' + esc([f.conclusion, f.ctcae !== '' ? (f.ctcae === '0' ? 'CTCAE: tidak ada' : 'CTCAE derajat ' + f.ctcae) : '', f.area ? 'luas ' + f.area + ' cm' : '', f.igdAdvised === 'YA' ? 'dianjurkan ke IGD' : ''].filter(Boolean).join(' · ')) + '</div>' : '') +
            (f.assessment ? '<div><span class="muted">Catatan pengkajian:</span> ' + esc(f.assessment) + '</div>' : '') + (f.action ? '<div><span class="muted">Tindakan:</span> ' + esc(f.action) + '</div>' : '') +
            (f.escalation === 'YA' ? '<div><span class="muted">Eskalasi:</span> ' + esc(f.escalationTo) + '</div>' : '') + (f.note ? '<div><span class="muted">Catatan:</span> ' + esc(f.note) + '</div>' : '') + '</div>';
        }).join('') : '<p class="small muted">Belum ada balasan/tindak lanjut.</p>') +
          (r.igdAnswer ? '<div class="alert ' + (r.igdAnswer === 'YA' ? 'info' : 'warn') + '" style="margin-top:8px">' + icon('phone') + '<div>Jawaban pasien “sudah ke IGD?”: <b>' + esc({ YA: 'Ya, sudah', BELUM: 'Belum', TIDAK: 'Tidak' }[r.igdAnswer] || r.igdAnswer) + '</b></div></div>' : '') +
          '<div class="lbl3" style="margin-top:14px">TIMELINE PASIEN</div><div class="tl">' + d.timeline.map(function(t){ return '<div class="it ' + esc(t.kind) + (t.current ? ' cur' : '') + '"><span class="tiny muted">' + esc(fmtDT(t.time)) + '</span><br>' + esc(t.text) + '</div>'; }).join('') + '</div></div>' +
        '<div class="dtab hidden" data-tp="pat">' + (p.profilePhotoId ? '<div class="row" style="margin-bottom:10px;flex-wrap:nowrap"><div id="pAv" class="pav"><div class="spinner dark"></div></div><div class="small muted">Foto profil dipasang sendiri oleh pasien</div></div>' : '') +
          '<div class="kv"><div>Tgl lahir</div><div>' + esc(fmtD(p.dob)) + (p.age !== '' ? ' (' + p.age + ' th)' : '') + '</div><div>Kemo terakhir</div><div>' + esc(fmtD(p.chemoDate)) + srcB(d.ctx && d.ctx.chemo.src) + '</div><div>Obat</div><div>' + esc(drugs) + srcB(d.ctx && d.ctx.drugs.src) + (d.ctx && d.ctx.drugs.status === 'PERLU_KONFIRMASI' ? ' <span class="badge b-REVIEW">belum dikonfirmasi untuk kemo ' + esc(fmtD(p.chemoDate)) + '</span>' : '') + '</div><div>Akses</div><div>' + esc([p.accessType, p.accessSite].filter(Boolean).join(' – ')) + srcB(d.ctx && d.ctx.access.src) + '</div>' +
          (d.event && (d.event.site || d.event.chemo || d.event.session) ? '<div>Saat laporan ini</div><div>' + esc(['area: ' + (d.event.site || 'tidak disebut') + (d.event.point ? ' (' + d.event.point + ')' : '') + (d.event.scope ? ' – ' + d.event.scope : ''), d.event.session ? d.event.session : (d.event.chemo ? 'kemo ' + fmtD(d.event.chemo) : ''), d.event.drugs ? 'obat: ' + d.event.drugs.replace(/ \[(PERAWAT|PASIEN)\]$/, '') : '', d.event.unsure ? 'pasien tidak yakin info kemo terbarunya' : ''].filter(Boolean).join(' · ')) + '</div>' : '') +
          '<div>HP pasien</div><div>' + esc(p.phone || '–') + '</div><div>Keluarga</div><div>' + (esc(p.caregiverName) || '–') + ' ' + esc(p.caregiverPhone) + '</div></div></div>' +
        '<div class="dtab hidden" data-tp="chat">' + (d.chat.length ? '<div class="chatlog">' + d.chat.map(function(c){ return '<div class="cl ' + esc(c.role) + (c.red ? ' red' : '') + '"><span class="tiny muted">' + esc(fmtDT(c.time)) + ' · ' + (c.role === 'user' ? 'Pasien' : 'NURSE.AI') + '</span><div>' + esc(c.text).replace(/\n/g, '<br>') + '</div></div>'; }).join('') + '</div>' : '<p class="small muted">Belum ada percakapan.</p>') + '</div>' +
        '<div class="dtab hidden" data-tp="care">' + (d.care ? '<div class="carebox t-' + esc(d.care.thermal) + '"><b>' + esc(d.care.content ? d.care.content.title : d.care.code) + '</b><div class="tiny">' + esc(d.care.reason) + '</div></div>' + (d.care.content && d.care.content.actions ? '<ol class="small" style="margin:10px 0 0;padding-left:18px">' + d.care.content.actions.map(function(a){ return '<li>' + esc(a) + '</li>'; }).join('') + '</ol>' : '') : '<p class="small muted">Tidak ada instruksi kompres (tidak ada perubahan / status aman).</p>') +
          (d.aiCare ? '<div class="lbl3" style="margin-top:14px">SARAN AI YANG DITERIMA PASIEN</div><div class="md small" style="max-height:340px;overflow:auto;background:#F7FAFB;border:1px solid var(--line);border-radius:12px;padding:10px 12px">' + mdLite(d.aiCare.text) + refsHtml(d.aiCare.sources) + '</div>' : '') + '</div>' +
        '<div class="dtab hidden" data-tp="drug">' + (d.drugInfo.length ? '<div class="tablebox" style="max-height:none"><table><thead><tr><th>Obat</th><th>Tipe</th><th>Kompres</th><th>Antidot / catatan</th></tr></thead><tbody>' +
          d.drugInfo.map(function(x){ return '<tr><td><b>' + esc(x.name) + '</b><div class="tiny muted">' + esc(x.group) + (x.highRisk ? ' · <span style="color:var(--bad-700)">risiko tinggi</span>' : '') + '</div></td><td>' + esc(x.tissue) + '</td><td><span class="therm t-' + esc(x.thermal) + '">' + esc(THERM_LBL[x.thermal] || x.thermal) + '</span></td><td class="small">' + esc(x.antidote) + (x.notes ? '<div class="tiny muted">' + esc(x.notes) + '</div>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div><p class="tiny muted" style="margin-top:8px">Mengacu ONS/ASCO 2025 & ESMO-EONS 2012 (sheet 15_DRUGS).</p>'
          : '<p class="small muted">Obat belum diisi' + (d.drugOther ? ' (tertulis: ' + esc(d.drugOther) + ')' : '') + '. Lengkapi lewat Pasien → Ubah.</p>') + '</div>' +
      '</div></div>' +
    '<div class="dcol dright">' +
      '<div class="panel o2"><h3>' + icon('clipcheck','sm') + 'Ringkasan laporan</h3><div class="grid2e" style="gap:16px"><div><div class="lbl3">DILAPORKAN PASIEN</div>' +
        (yes.length || info.length ? '<div class="ychips">' + yes.map(function(x){ return '<span class="ychip">' + esc(x) + '</span>'; }).join('') + info.map(function(x){ return '<span class="ychip i">' + esc(x) + '</span>'; }).join('') + '</div>' : '<div class="small">' + (d.answers.some(function(a){ return a.raw === 'NO_CHANGE'; }) ? 'Tidak ada perubahan' : '–') + '</div>') +
        (txt ? '<div class="small" style="margin-top:8px">“' + esc(txt) + '”</div>' : '') + (no.length ? '<div class="tiny muted" style="margin-top:8px">Tidak: ' + esc(no.join(', ')) + '</div>' : '') + '</div>' +
        '<div><div class="lbl3">BACAAN AI FOTO (PEMBANDING)</div>' + aiHtml + '</div></div>' +
        '<div class="tiny muted" style="margin:10px 0">Alasan status sistem: ' + esc(why) + '</div>' +
        '<div class="shown"><b>Sudah ditampilkan ke pasien:</b> ' + shown + ' Pasien diminta menunggu balasan (janji ' + (hr % 24 === 0 ? (hr / 24) + '×24 jam' : hr + ' jam') + ').</div></div>' +
      (w ? '<div class="panel replybox o4" id="replyBox"><h3>' + icon('message','sm') + 'Balas pasien</h3>' +
          '<div class="pills tpl" style="margin-bottom:12px">' + MSG_TPL.map(function(t, i){ return '<button type="button" data-tpl="' + i + '">' + esc(['Sudah ditinjau, lanjutkan kompres', 'Mohon ke IGD hari ini', 'Kami akan menelepon'][i]) + '</button>'; }).join('') + '</div>' +
          '<label class="flab" for="fPmsg">Pesan untuk pasien <span class="muted" style="font-weight:500">– tampil di HP pasien</span></label><textarea id="fPmsg" maxlength="500" placeholder="Gunakan bahasa awam, mis. Terima kasih, foto sudah kami tinjau…"></textarea>' +
          '<div class="g2" style="margin-top:12px"><div><label class="flab" for="fNext">Anjuran</label><input type="text" id="fNext" placeholder="mis. Kompres dingin 15–20 mnt, 4×/hari, 2 hari"></div>' +
          '<div><label class="flab">Anjurkan ke IGD?</label><div class="pills" id="fIgd"><button type="button" data-v="YA">Ya</button><button type="button" data-v="TIDAK" class="on">Tidak</button></div></div></div>' +
          '<details class="doc" id="docDet" style="margin-top:14px"><summary>' + icon('file','sm') + ' Dokumentasi lengkap (metode kontak, pengkajian, tindakan, eskalasi) – opsional</summary><div class="in">' + fuForm(r.status) + '</div></details>' +
          '<div class="row" style="margin-top:14px;flex-wrap:nowrap"><button class="btn grow" id="bFu">' + icon('send','sm') + ' Kirim balasan · tetap dipantau</button><button class="btn line grow" id="bClose">' + icon('checkc','sm') + ' Kirim &amp; tutup kasus</button></div>' +
          '<p class="tiny muted" style="margin:8px 0 0">Setelah dibalas, pasien bisa mengirim laporan berikutnya. Dokumentasi klinis resmi tetap di RME.</p></div>'
        : (r.nurseStatus === 'CLOSED' ? '<div class="panel"><div class="alert info" style="margin:0">' + icon('checkc') + '<div>Ditutup oleh <b>' + esc(r.closedBy) + '</b> pada ' + esc(fmtDT(r.closedAt)) + '<br>' + esc(r.closureNote) + '</div></div></div>' : '<div class="panel"><p class="muted small" style="margin:0">Hanya-baca.</p></div>')) +
    '</div></div></div>';

  $('bBack').onclick = function(){ go(N.lastList || 'home'); };
  $('bRe').onclick = function(){ openReport(r.id); };
  $('page').querySelectorAll('[data-tb]').forEach(function(b){ b.onclick = function(){
    $('page').querySelectorAll('[data-tb]').forEach(function(x){ x.classList.toggle('on', x === b); });
    $('page').querySelectorAll('[data-tp]').forEach(function(x){ x.classList.toggle('hidden', x.dataset.tp !== b.dataset.tb); }); }; });
  function single(id){ var g = $(id); if (g) g.querySelectorAll('button').forEach(function(b){ b.onclick = function(){ var on = !b.classList.contains('on'); g.querySelectorAll('button').forEach(function(x){ x.classList.remove('on'); }); if (on || id === 'fIgd') b.classList.add('on'); }; }); }
  function pick(id){ var g = $(id), b = g && g.querySelector('button.on'); return b ? b.dataset.v : ''; }
  single('fGrade'); single('fConcl'); single('fIgd');
  $('page').querySelectorAll('[data-tpl]').forEach(function(b){ b.onclick = function(){ var i = Number(b.dataset.tpl), m = $('fPmsg'); m.value = MSG_TPL[i]; if (i === 1){ $('fIgd').querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x.dataset.v === 'YA'); }); } m.focus(); }; });
  var br = $('bRev'); if (br) br.onclick = function(){ /* v3.0: langsung berubah, disimpan di latar belakang */
    var snap = JSON.parse(JSON.stringify(d)); d.report.nurseStatus = 'UNDER_REVIEW'; d.report.reviewedBy = N.user.name; N.dcache[r.id] = d;
    (N.data.reports || []).forEach(function(x){ if (x.id === r.id && x.nurseStatus === 'NEW') x.nurseStatus = 'UNDER_REVIEW'; });
    KS.keepScroll(function(){ renderDetail(d); }); toast('Ditandai sedang ditinjau.');
    KS.bg(function(){ return call('nStartReview', N.sess, r.id); }, { ok: function(){ refresh(true); }, fail: function(e){ N.dcache[r.id] = snap; if (N.detail === r.id) renderDetail(snap); toast('Belum tersimpan: ' + e.message, true); } });
  };
  if (p.profilePhotoId) (N.phIds = N.phIds || {})[p.profilePhotoId] = 1;
  if (p.profilePhotoId) call('nGetPhoto', N.sess, p.profilePhotoId).then(function(ph){ KS.photo('n_' + p.profilePhotoId, ph.dataUrl); var e = $('pAv'); if (e) e.innerHTML = '<img src="' + ph.dataUrl + '" alt="Foto profil">'; }).catch(function(){ var e = $('pAv'); if (e) e.innerHTML = icon('user'); });
  if (d.photos.length){
    loadPhoto(d.photos[0].id, 'phMain');
    $('page').querySelectorAll('[data-ph],[data-base]').forEach(function(b){ b.onclick = function(){
      $('page').querySelectorAll('.phstrip button').forEach(function(x){ x.classList.remove('on'); }); b.classList.add('on');
      loadPhoto(b.dataset.base ? d.baseline.id : d.photos[Number(b.dataset.ph)].id, 'phMain'); }; });
    $('bAll').onclick = function(){ gallery(d); };
  }
  ['fDate', 'fTime'].forEach(function(k){ var e = $(k); if (e) e.oninput = e.onchange = function(){ this.dataset.dirty = '1'; }; });
  if (!N.fuReq || N.fuReqFor !== r.id){ N.fuReq = 'fu' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); N.fuReqFor = r.id; }   /* v3.19 (BG-1): satu kunci per balasan */
  var ef = $('fEsc'); if (ef) ef.onchange = function(){ $('fEscTo').disabled = this.value !== 'YA'; };
  function form(st){
    /* v3.19 (BG-2): tanggal/jam hanya dikirim bila perawat mengubahnya – selain itu server memakai jam server (WIB) */
    var dtSet = ($('fDate') && $('fDate').dataset.dirty) || ($('fTime') && $('fTime').dataset.dirty);
    return { REQ_ID: N.fuReq || '', FOLLOWUP_DATE: dtSet ? val('fDate') : '', FOLLOWUP_TIME: dtSet ? val('fTime') : '', CONTACT_METHOD: $('docDet').open ? val('fMethod') : '', CONTACT_STATUS: $('docDet').open ? val('fContact') : '', PATIENT_CONDITION: $('docDet').open ? val('fCond') : '', NURSE_ASSESSMENT: val('fAss'),
      ACTION_TAKEN: val('fAct'), ESCALATION: val('fEsc'), ESCALATION_TO: val('fEscTo'), FOLLOWUP_NOTE: val('fNote'), PATIENT_MESSAGE: val('fPmsg'), NEXT_ACTION: val('fNext'), NEXT_FOLLOWUP: val('fNextAt'), STATUS: st || val('fStatus'),
      IGD_ADVISED: pick('fIgd'), CTCAE_GRADE: pick('fGrade'), AREA_CM: val('fArea'), NURSE_CONCLUSION: pick('fConcl') };
  }
  var bs = $('bFu'); if (bs) bs.onclick = function(){
    busy(bs, true);
    call('nSaveFollowUp', N.sess, r.id, form(), true).then(function(res){
      var id = res && res.id ? res.id : res; N.fuReq = '';
      toast('Balasan terkirim ke pasien (' + id + ').'); delete N.dcache[r.id]; refresh(true);
      if (res && res.detail && N.page === 'detail' && N.detail === r.id){ N.dcache[r.id] = res.detail; KS.keepScroll(function(){ renderDetail(res.detail); }); } else openReport(r.id);   /* v3.19 (PF-6) */
    }).catch(function(e){ busy(bs, false); toast(e.message, true); });
  };
  var bc = $('bClose'); if (bc) bc.onclick = function(){
    var f = form('FOLLOW_UP_COMPLETED'), note = f.PATIENT_MESSAGE || f.NURSE_ASSESSMENT || f.FOLLOWUP_NOTE;
    if (!note){
      modal('<div class="modal-head"><h2>Tutup kasus</h2>' + xbtn() + '</div><label class="lbl">Ringkasan penutupan (wajib)</label><textarea id="cn"></textarea>' +
        (r.status !== 'MONITOR' ? '<p class="tiny muted">Laporan ' + esc(SLBL[r.status] || r.status) + ' wajib memiliki minimal satu balasan/tindak lanjut tersimpan.</p>' : '') + '<button class="btn navy block" id="bCl" style="margin-top:12px">' + icon('checkc','sm') + ' Tutup Kasus</button>');
      $('bCl').onclick = function(){ var bb = this; busy(bb, true);
        call('nCloseCase', N.sess, r.id, val('cn')).then(function(){ closeModal(); toast('Kasus ditutup.'); delete N.dcache[r.id]; refresh(true); openReport(r.id); }).catch(function(e){ busy(bb, false); toast(e.message, true); }); };
      return;
    }
    busy(bc, true);
    call('nFollowUpClose', N.sess, r.id, f, note)
      .then(function(){ N.fuReq = ''; toast('Balasan terkirim & kasus ditutup.'); delete N.dcache[r.id]; refresh(true); openReport(r.id); }).catch(function(e){ busy(bc, false); toast(e.message, true); });
  };
}
function fuForm(status){
  var now = new Date(), pad = function(n){ return (n < 10 ? '0' : '') + n; };
  var d = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate()), t = pad(now.getHours()) + ':' + pad(now.getMinutes());
  function opt(a){ return a.map(function(x){ return '<option>' + x + '</option>'; }).join(''); }
  function row(l, inner){ return '<div class="frow"><label>' + l + '</label><div>' + inner + '</div></div>'; }
  return row('Tanggal & jam', '<div class="row" style="flex-wrap:nowrap"><input type="date" id="fDate" value="' + d + '"><input type="time" id="fTime" value="' + t + '" style="max-width:130px"></div>') +
    row('Metode kontak', '<select id="fMethod">' + opt(['Pesan aplikasi','Telepon','WhatsApp','Video call','Tatap muka','Lainnya']) + '</select>') +
    row('Status kontak', '<select id="fContact">' + opt(['Pesan terkirim','Berhasil dihubungi','Tidak terhubung','Nomor tidak aktif/salah','Pasien datang ke RS']) + '</select>') +
    row('Kondisi pasien', '<select id="fCond">' + opt(['Stabil','Membaik','Menetap','Memburuk','Tidak dapat dinilai']) + '</select>') +
    row('Catatan pengkajian', '<textarea id="fAss" placeholder="Temuan saat dihubungi / dinilai"></textarea>') +
    row('Tindakan', '<textarea id="fAct" placeholder="Edukasi / tindakan yang diberikan"></textarea>') +
    row('Eskalasi', '<div class="row" style="flex-wrap:nowrap"><select id="fEsc" style="max-width:110px"><option>TIDAK</option><option>YA</option></select><select id="fEscTo" disabled><option value="">– tujuan –</option>' + opt(['DPJP','Dokter jaga','Kepala ruang','IGD','Tim akses vaskular','Lainnya']) + '</select></div>') +
    row('Catatan internal', '<textarea id="fNote" placeholder="Tidak terlihat pasien"></textarea>') +
    row('Rencana cek berikutnya', '<input type="datetime-local" id="fNextAt" style="max-width:240px">') +
    row('Status setelahnya', '<select id="fStatus"><option value="CONTACTED">Masih dipantau</option><option value="FOLLOW_UP_COMPLETED">Tindak lanjut selesai</option></select>');
}
function loadPhoto(id, boxId){
  var box = $(boxId); if (!box) return;
  (N.phIds = N.phIds || {})[id] = 1;
  var hit = KS.photo('n_' + id);
  if (hit){ box.innerHTML = '<img src="' + hit + '" alt="' + esc(id) + '">'; box.querySelector('img').onclick = function(){ zoom(hit); }; return; }
  box.innerHTML = '<div class="sk" style="width:100%;height:100%;min-height:200px"></div>';
  call('nGetPhoto', N.sess, id).then(function(ph){ KS.photo('n_' + id, ph.dataUrl); box.innerHTML = '<img src="' + ph.dataUrl + '" alt="' + esc(id) + '">'; box.querySelector('img').onclick = function(){ zoom(ph.dataUrl); }; })
    .catch(function(e){ box.innerHTML = '<span class="small">' + esc(e.message) + '</span>'; });
}
function zoom(src){ var z = document.createElement('div'); z.className = 'zoom'; z.innerHTML = '<img class="fit" src="' + src + '">'; z.onclick = function(){ var im = z.querySelector('img'); if (im.classList.contains('fit')) im.classList.remove('fit'); else z.remove(); }; document.body.appendChild(z); }
function gallery(d){
  var items = d.photos.map(function(p, i){ return { id: p.id, label: 'Foto ' + (i + 1) + ' · ' + fmtDT(p.time) }; });
  if (d.baseline) items.push({ id: d.baseline.id, label: 'Foto dasar · ' + fmtDT(d.baseline.time) });
  modal('<div class="modal-head"><h2>Semua Foto – ' + esc(d.report.id) + '</h2>' + xbtn() + '</div><div class="gallery">' + items.map(function(it, i){ return '<div><div class="g" id="g' + i + '"><div class="spinner"></div></div><div class="tiny muted" style="margin-top:4px">' + esc(it.label) + '</div></div>'; }).join('') + '</div>', true);
  items.forEach(function(it, i){ loadPhoto(it.id, 'g' + i); });
}

/* ================= REGISTRASI & KARTU ================= */
function genderSel(id, v){ return '<div><label class="lbl" for="' + id + '">Jenis kelamin *</label><select id="' + id + '"><option value="">– pilih –</option><option value="L"' + (v === 'L' ? ' selected' : '') + '>Laki-laki (Bapak)</option><option value="P"' + (v === 'P' ? ' selected' : '') + '>Perempuan (Ibu)</option></select></div>'; }
function showRegister(){
  var t = new Date(), pad = function(n){ return (n < 10 ? '0' : '') + n; }, d = t.getFullYear() + '-' + pad(t.getMonth()+1) + '-' + pad(t.getDate());
  function f(id, label, type, extra){ return '<div><label class="lbl" for="' + id + '">' + label + '</label><input type="' + (type || 'text') + '" id="' + id + '" ' + (extra || '') + '></div>'; }
  modal('<div class="modal-head"><div><h2>Tambah Pasien</h2><div class="small muted">Satu episode = satu sesi kemoterapi. Jadwal cek dibuat otomatis.</div></div>' + xbtn() + '</div><div class="grid2e" style="gap:0 14px">' +
    f('rName','Nama pasien *') + genderSel('rGender', '') + f('rRm','No. RM *') + f('rDob','Tanggal lahir *','date') + f('rPhone','No. HP pasien (WhatsApp) *','tel','placeholder="08xxxxxxxxxx"') +
    f('rCgName','Nama keluarga') + f('rCgPhone','No. HP keluarga','tel') + f('rChemo','Tanggal kemoterapi *','date','value="' + d + '"') + f('rSess','Sesi/siklus','text','placeholder="Siklus 3"') +
    '<div style="grid-column:1/-1"><label class="lbl">Obat kemoterapi (pilih semua yang diberikan) – menentukan tindakan otomatis ke pasien</label>' + drugChips('rDrugs', '') + '</div>' +
    f('rAgent','Obat lain (bila tidak ada di daftar)') + '<div><label class="lbl">Golongan (sesuai pathway)</label><select id="rClass"><option value="">–</option><option>Vesikan</option><option>Iritan</option><option>Non-vesikan</option><option>Belum ditentukan</option></select></div>' +
    '<div><label class="lbl">Jenis akses *</label><select id="rAccT"><option>Perifer</option><option>Port-a-cath</option><option>PICC</option><option>CVC</option><option>Lainnya</option></select></div>' +
    f('rAccS','Lokasi akses *','text','placeholder="mis. vena sefalika lengan kiri"') + '</div>' +
    '<button class="btn block lg" id="bReg" style="margin-top:18px">' + icon('scan','sm') + ' Daftarkan & Buat Kartu QR</button>', true);
  bindChips('rDrugs');
  $('bReg').onclick = function(){
    var b = this; busy(b, true);
    call('nRegisterPatient', N.sess, { NAME: val('rName'), GENDER: val('rGender'), RM_NUMBER: val('rRm'), DOB: val('rDob'), PHONE: val('rPhone'), CAREGIVER_NAME: val('rCgName'), CAREGIVER_PHONE: val('rCgPhone'),
      CHEMO_DATE: val('rChemo'), CHEMO_SESSION: val('rSess'), CHEMO_AGENT: val('rAgent'), AGENT_CLASS: val('rClass'), ACCESS_TYPE: val('rAccT'), ACCESS_SITE: val('rAccS'), DRUG_CODES: chipVal('rDrugs') })
      .then(function(r){ if (r.warning) toast(r.warning); refresh(true).then(function(){ if (N.page !== 'detail') render(); }); showCard(r.patientId); })
      .catch(function(e){ busy(b, false); toast(e.message, true); });
  };
}
function showCard(pid){
  modal('<div class="loading"><div class="spinner dark"></div></div>');
  call('nPatientCard', N.sess, pid).then(function(c){
    var i = c.info;
    modal('<div class="modal-head no-print"><h2>Kartu Jadwal Pemantauan</h2>' + xbtn() + '</div>' +
      (!c.link ? '<div class="alert danger no-print">' + icon('alert') + '<div>URL web app belum diatur. Deploy web app lalu isi 01_CONFIG → WEBAPP_URL.</div></div>' : '') +
      '<div class="print-area"><div class="qrcard"><div class="hd"><img src="' + ASSET.kemenkes + '" alt=""><div style="text-align:center">' + wordmarkHtml({s: .42, sub: false}) + '</div><img src="' + ASSET.kasuari + '" alt=""></div>' +
      '<div class="tiny muted" style="margin-top:6px">' + esc(i.unitName) + '</div><div id="qrBox"></div>' +
      '<div style="font-size:1.15rem;font-weight:800;color:var(--navy)">' + esc(c.name) + '</div><div class="tiny muted">Kemoterapi ' + esc(fmtD(c.chemoDate)) + ' · pantau s.d. ' + esc(fmtD(c.monitoringEnd)) + '</div>' +
      '<div class="small" style="text-align:left;margin-top:12px;background:#F4F8FA;border-radius:10px;padding:10px"><b>Jadwal cek:</b><br>' + c.tasks.map(function(t){ return esc(fmtD(t.date)) + ' · ' + esc(t.start) + '–' + esc(t.end); }).join('<br>') + '</div>' +
      '<div class="tiny" style="text-align:left;margin-top:10px">Pindai QR untuk langsung masuk. Bisa juga membuka aplikasi lalu masuk dengan <b>nama, No. RM, dan tanggal lahir</b>.</div>' +
      '<div class="small b" style="margin-top:10px;color:var(--bad-700)">Darurat: Ruangan ' + esc(i.unitPhone) + ' · ' + esc(i.igdName) + ' ' + esc(i.igdPhone) + '</div><div class="tiny muted" style="margin-top:4px">Aplikasi ini bukan layanan gawat darurat.</div></div></div>' +
      '<div class="row no-print" style="margin-top:16px;justify-content:center"><button class="btn" id="bPrint">' + icon('printer','sm') + ' Cetak</button>' +
      (c.wa ? '<a class="btn ghost" target="_blank" href="' + esc(c.wa) + '">' + icon('message','sm') + ' Kirim via WhatsApp</a>' : '') + '<button class="btn ghost" id="bCopy">' + icon('file','sm') + ' Salin tautan</button></div>' +
      '<p class="tiny muted no-print center">QR/tautan ini langsung membuka data pasien tersebut. Jangan dibagikan ke grup.</p>');
    var qb = $('qrBox');
    qb.innerHTML = '<div class="spinner dark"></div>';
    loadQR(function(){ qb.innerHTML = ''; if (c.link && window.QRCode) new QRCode(qb, { text: c.link, width: 180, height: 180, colorDark: '#0D3B57', correctLevel: QRCode.CorrectLevel.M });
      else qb.innerHTML = '<div class="small muted" style="word-break:break-all">' + esc(c.link || 'QR tidak tersedia') + '</div>'; });
    $('bPrint').onclick = function(){ window.print(); };
    $('bCopy').onclick = function(){ var ta = document.createElement('textarea'); ta.value = c.link; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Tautan disalin.'); } catch(e){ prompt('Salin tautan:', c.link); } ta.remove(); };
  }).catch(function(e){ closeModal(); toast(e.message, true); });
}


/* ================= PILIH OBAT (katalog 15_DRUGS) ================= */
var THERM_LBL = { COLD: 'Dingin', WARM: 'Hangat', NONE: 'Tanpa', NURSE: 'Perawat' };
function drugChips(id, selected){
  selected = String(selected || '').split(',').filter(Boolean);
  var cat = (N.data && N.data.drugCatalog) || [];
  return '<div class="dchips" id="' + id + '">' + cat.map(function(d){ return '<button type="button" data-c="' + esc(d.code) + '" class="' + (selected.indexOf(d.code) >= 0 ? 'on' : '') + '" title="' + esc(d.group + ' · kompres ' + (THERM_LBL[d.thermal] || d.thermal)) + '">' + esc(d.name) + '<i class="t-' + esc(d.thermal) + '">' + esc(THERM_LBL[d.thermal] || '') + '</i></button>'; }).join('') + '</div>';
}
function bindChips(id){ var r = $(id); if (!r) return; r.querySelectorAll('button').forEach(function(b){ b.onclick = function(){ b.classList.toggle('on'); }; }); }
function chipVal(id){ var r = $(id); return r ? Array.prototype.map.call(r.querySelectorAll('button.on'), function(b){ return b.dataset.c; }) : []; }

/* ================= POSTER QR UMUM & UBAH DATA ================= */
function showPoster(){
  modal('<div class="loading"><div class="spinner dark"></div></div>');
  call('nPoster', N.sess).then(function(p){
    var i = p.info;
    modal('<div class="modal-head no-print"><h2>Poster QR Aplikasi</h2>' + xbtn() + '</div>' +
      (!p.appUrl ? '<div class="alert danger no-print">' + icon('alert') + '<div>URL web app belum diatur di 01_CONFIG → WEBAPP_URL.</div></div>' : '') +
      '<div class="print-area"><div class="qrcard" style="max-width:520px;padding:26px"><div class="hd"><img src="' + ASSET.kemenkes + '" alt="" style="width:64px;height:64px"><img src="' + ASSET.kasuari + '" alt="" style="width:64px;height:64px"></div>' +
      '<div style="margin-top:10px">' + wordmarkHtml({s: .9}) + '</div>' +
      '<p style="font-style:italic;color:var(--ink-2);margin:10px 0 4px">“Kenali Lebih Awal, Tangani Lebih Cepat.”</p>' +
      '<div class="b" style="margin-top:10px;color:var(--navy)">Pantau bekas infus kemoterapi Anda dari rumah</div><div id="qrBox"></div>' +
      '<div style="text-align:left;background:#F4F8FA;border-radius:12px;padding:12px 14px;font-size:.92rem"><b>1.</b> Pindai QR ini dengan kamera HP<br><b>2.</b> Masuk dengan <b>nama, No. RM, dan tanggal lahir</b><br><b>3.</b> Belum terdaftar? Tekan <b>Daftar Sekarang</b><br><b>4.</b> Lakukan cek mandiri sesuai jadwal & kirim foto bila ada perubahan</div>' +
      '<div class="small b" style="margin-top:12px;color:var(--bad-700)">Bila kondisi memberat: Ruangan ' + esc(i.unitPhone) + ' · ' + esc(i.igdName) + ' ' + esc(i.igdPhone) + '</div>' +
      '<div class="tiny muted" style="margin-top:6px">' + esc(i.unitName) + ' · ' + esc(i.hospital) + '<br>Aplikasi ini bukan layanan gawat darurat.</div></div></div>' +
      '<div class="row no-print" style="margin-top:16px;justify-content:center"><button class="btn" id="bPrint">' + icon('printer','sm') + ' Cetak Poster</button></div>', true);
    var qb = $('qrBox');
    qb.innerHTML = '<div class="spinner dark"></div>';
    loadQR(function(){ qb.innerHTML = ''; if (p.appUrl && window.QRCode) new QRCode(qb, { text: p.appUrl, width: 220, height: 220, colorDark: '#0D3B57', correctLevel: QRCode.CorrectLevel.M });
      else qb.innerHTML = '<div class="small muted" style="word-break:break-all">' + esc(p.appUrl || 'URL belum diatur') + '</div>'; });
    $('bPrint').onclick = function(){ window.print(); };
  }).catch(function(e){ closeModal(); toast(e.message, true); });
}
function showEdit(p){
  if (!p) return;
  function f(id, label, v, type){ return '<div><label class="lbl" for="' + id + '">' + label + '</label><input type="' + (type || 'text') + '" id="' + id + '" value="' + esc(v || '') + '"></div>'; }
  modal('<div class="modal-head"><div><h2>Ubah Data Pasien</h2><div class="small muted">' + esc(p.code) + (p.selfReg ? ' · didaftarkan mandiri oleh pasien' : '') + '</div></div>' + xbtn() + '</div><div class="grid2e" style="gap:0 14px">' +
    f('eName','Nama *', p.name) + genderSel('eGender', p.gender) + f('eRm','No. RM *', p.rm) + f('eDob','Tanggal lahir *', p.dob, 'date') + f('ePhone','No. HP pasien', p.phone, 'tel') +
    f('eCg','Nama keluarga', p.caregiverName) + f('eCgP','No. HP keluarga', p.caregiverPhone, 'tel') + f('eSess','Sesi/siklus', p.session) + f('eAgent','Obat lain', p.agent) +
    '<div style="grid-column:1/-1"><label class="lbl">Obat kemoterapi</label>' + drugChips('eDrugs', p.drugCodes) + '</div>' +
    f('eClass','Golongan (sesuai pathway)', p.agentClass) + f('eType','Jenis akses', p.accessType) + f('eSite','Lokasi akses', p.accessSite) + '</div>' +
    (p.ctxUnverified || p.drugsUnconfirmed ? '<label class="row small" style="margin:6px 0 4px;flex-wrap:nowrap;cursor:pointer;align-items:flex-start"><input type="checkbox" id="eVerify" style="width:20px;height:20px;margin-top:2px"><span>Tanggal kemo, obat, dan akses infus sudah saya cocokkan dengan catatan RS (tanda <b>diisi pasien</b> hilang).</span></label>' : '') +
    '<p class="tiny muted">Pasien masuk dengan nama + No. RM + tanggal lahir. Pastikan ketiganya benar.</p><button class="btn block" id="bSaveP" style="margin-top:10px">' + icon('check','sm') + ' Simpan</button>' +
    '<button class="btn ghost block" id="bRevoke" style="margin-top:10px">Cabut akses di semua HP</button><p class="tiny muted" style="margin:6px 0 0">Pakai bila HP pasien hilang atau tautan tersebar. Pasien masuk ulang dengan nama + No. RM + tanggal lahir; QR/kartu lama tidak berlaku.</p>', true);
  bindChips('eDrugs');
  $('bSaveP').onclick = function(){ var b = this; busy(b, true);
    call('nUpdatePatient', N.sess, p.patientId, { NAME: val('eName'), GENDER: val('eGender'), RM_NUMBER: val('eRm'), DOB: val('eDob'), PHONE: val('ePhone'), CAREGIVER_NAME: val('eCg'), CAREGIVER_PHONE: val('eCgP'),
      CHEMO_SESSION: val('eSess'), CHEMO_AGENT: val('eAgent'), AGENT_CLASS: val('eClass'), ACCESS_TYPE: val('eType'), ACCESS_SITE: val('eSite'), DRUG_CODES: chipVal('eDrugs'), VERIFY_CTX: !!($('eVerify') && $('eVerify').checked) })
      .then(function(n){ closeModal(); toast(n ? 'Data pasien diperbarui.' : 'Tidak ada perubahan.'); refresh(); }).catch(function(e){ busy(b, false); toast(e.message, true); }); };
  $('bRevoke').onclick = function(){ var b = this;
    if (!confirm('Cabut akses ' + (p.name || 'pasien ini') + ' di semua HP? Pasien harus masuk ulang, dan QR/kartu lama tidak berlaku.')) return;
    busy(b, true);
    call('nRevokeAccess', N.sess, p.patientId).then(function(){ closeModal(); toast('Akses dicabut. Pasien perlu masuk ulang.'); refresh(); }).catch(function(e){ busy(b, false); toast(e.message, true); }); };
}

/* =====================================================================
   v3.5 · NAVIGASI dashboard perawat: riwayat browser, tombol Back, refresh tetap di halaman yang sama.
   Yang disimpan hanya nama halaman (mis. "reports", "detail:RPT-00012") di sessionStorage tab ini.
   ===================================================================== */
var NAV_MENU = ['home', 'patients', 'reports', 'follow', 'analytics', 'settings', 'schedule'];
function nurseRoute(p){ return p === 'detail' ? 'detail:' + (N.detail || '') : p; }
function nurseNavKind(r){
  var cur = KNav.cur() || '', h = KNav.indexOf('home');
  if (r === 'home') return h >= 0 ? { to: h } : 'replace';
  if (r.indexOf('detail:') === 0) return 'push';
  if (cur === 'home') return 'push';
  if (cur.indexOf('detail:') === 0) return h >= 0 ? { after: h } : 'replace';
  return 'replace';
}
var _goRaw = go;
go = function(p){
  if (!KNav.isQuiet()) KNav.nav(nurseRoute(p), nurseNavKind(nurseRoute(p)));
  return _goRaw(p);
};
function replyDirty(){ var m = $('fPmsg'); return !!(m && m.value.trim()); }
function renderNurseRoute(r){
  r = String(r || 'home');
  if (r.indexOf('detail:') === 0 && r.length > 7){ N.detail = r.slice(7); return go('detail'); }
  go(NAV_MENU.indexOf(r) >= 0 ? r : 'home');
}
var NAV_SAVED_N = KNav.init({ scope: 'n', params: { page: 'nurse' }, onRoute: function(r, prev, delta){
  if (!N.sess || !N.data) return;                                     /* sudah keluar: tetap di layar login */
  if (prev && prev.indexOf('detail:') === 0 && r !== prev && replyDirty() && !confirm('Balasan untuk pasien belum dikirim. Tinggalkan halaman ini?')){ KNav.revert(delta); return; }
  closeModal();
  KNav.quiet(function(){ renderNurseRoute(r); });
} });

/* ---------------- start ---------------- */
(function(){ N.sess = sget('pw_sess'); if (N.sess) initShell(); else showLogin(''); })();
