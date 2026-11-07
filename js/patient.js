var BOOT = KSAPI.boot();
var S = { token: '', info: null, home: null, draft: null, last: null };
var app = document.getElementById('app');
var MONTH = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
var DAYN = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

/* ---------------- util ---------------- */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function call(fn){
  var args = Array.prototype.slice.call(arguments, 1);
  return new Promise(function(res, rej){
    /* v4.0: panggilan ke API Apps Script lewat fetch (lihat js/api.js) */
    KSAPI.call(fn, args).then(function(x){ if (x && x.ok) res(x.data); else rej(new Error((x && x.error) || 'Terjadi kesalahan.')); }, rej);
  });
}
function toast(msg, err){ if (!msg) return; document.querySelectorAll('.toast').forEach(function(x){ x.remove(); }); var t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.setAttribute('role', err ? 'alert' : 'status'); t.innerHTML = icon(err ? 'alert' : 'checkc', 'sm') + '<span>' + esc(msg) + '</span>'; t.onclick = function(){ t.remove(); }; document.body.appendChild(t); setTimeout(function(){ t.remove(); }, err ? 5500 : 2800); }
function store(k, v){ try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch(e){} if (k === 'pw_token') tellShell(v); }
/* v2.7: bila aplikasi dibuka lewat alamat Vercel (01_CONFIG → WEBAPP_URL), kirim token ke halaman Vercel agar pasien tetap masuk */
var SHELL_ORIGIN = (function(){ try { var u = new URL(BOOT.appUrl); return /(^|\.)google\.com$/.test(u.hostname) ? '' : u.origin; } catch(e){ return ''; } })();
function tellShell(v){ if (!SHELL_ORIGIN || window.top === window) return; try { window.top.postMessage({ type: 'kasuari-token', token: v || '' }, SHELL_ORIGIN); } catch(e){} }
function load(k){ try { return localStorage.getItem(k) || ''; } catch(e){ return ''; } }
function pd(s){ var d = String(s).slice(0,10).split('-'); return new Date(Number(d[0]), Number(d[1])-1, Number(d[2])); }
function fmtDate(s){ if(!s) return '-'; var d = pd(s); return d.getDate() + ' ' + MONTH[d.getMonth()] + ' ' + d.getFullYear(); }
function fmtDT(s){ return s ? fmtDate(s) + ' · ' + String(s).slice(11,16) : '-'; }
function loading(msg){ app.innerHTML = '<div class="loading"><div class="spinner dark"></div>' + esc(msg || 'Memuat…') + '</div>'; }
function view(html){
  if (html.indexOf('class="tabbar') < 0) S.view = '';
  var b = document.body.classList; b.toggle('has-tabs', html.indexOf('class="tabbar') >= 0); b.toggle('is-land', html.indexOf('class="landwrap"') >= 0); b.toggle('is-wide', /class="(tp-wrap|chat)"/.test(html));
  app.innerHTML = '<div class="fade-in">' + html + '</div>'; window.scrollTo(0, 0);
}
function $(id){ return document.getElementById(id); }
function on(id, fn){ var e = $(id); if (e) e.onclick = fn; }
function tel(n){ return 'tel:' + String(n || '').replace(/[^\d+]/g, ''); }
function topbar(title){ return '<div class="topbar"><button class="iconbtn" id="bBack" aria-label="Kembali">' + icon('back') + '</button><div class="ttl grow">' + esc(title) + '</div></div>'; }
/* Bar logo di bagian paling atas: RS Kariadi (kiri) + Kasuari Lantai 3 (kanan) */
function kemenkes(){
  return '<div class="brandbar"><div class="bb"><img src="' + ASSET.kemenkes + '" alt="Kemenkes RS Kariadi"><div class="t">Kemenkes<b>RS Kariadi</b></div></div>' +
    '<span class="bdiv" aria-hidden="true"></span>' +
    '<div class="bb r"><div class="t">Ruang<b>Kasuari Lt. 3</b></div><img src="' + ASSET.kasuari + '" alt="Kasuari Lantai 3"></div></div>';
}
var STATUS_TXT = { MONITOR: 'Aman – pantau mandiri', REVIEW: 'Perlu ditinjau perawat', PRIORITY: 'Prioritas – segera' };
var STATUS_SHORT = { MONITOR: 'Normal', REVIEW: 'Perlu Ditinjau', PRIORITY: 'Prioritas' };
function handleErr(e){
  var m = e.message || String(e);
  if (m.indexOf('AUTH:') === 0){ store('pw_token', null); clearLocal(); S.token = ''; (S.eduSeen ? showLogin : function(x){ showLanding(function(){ showEduPage('pre', x); }); })(m.replace('AUTH:', '').trim().replace('Silakan masuk dengan Kode Pasien.', 'Silakan masuk dengan nama, No. RM, dan tanggal lahir.')); return; }
  toast(m, true);
}
function callButtons(){
  var i = S.info || {};
  return '<div class="callrow">' + (i.unitPhone ? '<a class="btn navy" href="' + tel(i.unitPhone) + '">' + icon('phone','sm') + ' Ruangan</a>' : '') +
    (i.igdPhone ? '<a class="btn danger" href="' + tel(i.igdPhone) + '">' + icon('phone','sm') + ' IGD</a>' : '') + '</div>';
}

/* ================= v3.0 KILAT: data lokal + pembaruan di latar belakang ================= */
call = KS.wrap(call);
function staticVer(){ var s = KS.get('ks_static'); return (s && s.ver && s.questions) ? s.ver : ''; }
/* Gabungkan paket statis (pertanyaan, konten, katalog obat) yang tersimpan di HP bila server tidak mengirim ulang */
function withStatic(h){
  if (!h) return null;
  if (h.questions && h.content){ KS.set('ks_static', { ver: h.staticVer, questions: h.questions, drugCatalog: h.drugCatalog, content: h.content }); return h; }
  var s = KS.get('ks_static');
  if (s && s.ver === h.staticVer){ h.questions = s.questions; h.drugCatalog = s.drugCatalog; h.content = s.content; return h; }
  return null; /* paket lokal hilang → minta lengkap */
}
function saveHome(){
  if (!S.home || !S.token) return;
  var h = {}; for (var k in S.home) if (['questions', 'drugCatalog', 'content'].indexOf(k) < 0) h[k] = S.home[k];
  KS.set('ks_home', { tok: S.token, t: Date.now(), h: h });
}
/* v3.1 (SEC-008): salinan data beranda di HP hanya berlaku 72 jam, lalu dihapus otomatis */
function cachedHome(){ var c = KS.get('ks_home'); if (c && (!c.t || Date.now() - c.t > 72 * 3600 * 1000)) { KS.set('ks_home', null); return null; } return (c && c.tok === S.token) ? withStatic(c.h) : null; }
function clearLocal(){ KS.set('ks_home', null); S.home = null; S.homeAt = 0; }
function fetchHome(){
  return call('pHome', S.token, staticVer()).then(function(h){
    var m = withStatic(h); if (m) return m;
    return call('pHome', S.token, '').then(withStatic);
  });
}
function setHome(h){ S.home = h; S.homeAt = Date.now(); saveHome(); }
/* Perbarui data di latar belakang; gambar ulang layar aktif hanya bila datanya berubah & pengguna tidak sedang mengetik */
function refreshHome(force){
  if (!S.token) return Promise.resolve();
  if (!force && S.homeAt && Date.now() - S.homeAt < 20000) return Promise.resolve();
  if (S.refreshing) return S.refreshing;
  KS.sync(true);
  var seq0 = S.wseq || 0, stale = false;
  S.refreshing = fetchHome().then(function(h){
    if ((S.wseq || 0) !== seq0 || (S.wpend || 0) > 0){ stale = true; return; } /* ada perubahan lokal yang lebih baru → abaikan, ambil ulang nanti */
    var before = S.home; setHome(h); syncAvatar();
    if (!before || !KS.same(strip(before), strip(h))) rerenderCurrent();
    if (S.view){ replyPopup(); igdPopup(); }
  }).catch(function(e){ if (String(e.message).indexOf('AUTH:') === 0) handleErr(e); }).then(function(){ S.refreshing = null; KS.sync(false); if (stale && !(S.wpend > 0)) refreshHome(true); });
  return S.refreshing;
}
function nowStr(){ var d = new Date(), p = function(n){ return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); }
/* Optimistic UI: ubah layar dulu, simpan di latar belakang; bila gagal → kembalikan + beri tahu */
function optimistic(apply, run, undo, okMsg){
  var snap = JSON.parse(JSON.stringify(S.home || {}));
  apply(); saveHome(); if (okMsg) toast(okMsg);
  S.wseq = (S.wseq || 0) + 1; S.wpend = (S.wpend || 0) + 1; /* v3.11: data beranda lama yang tiba setelah perubahan lokal tidak menimpa layar */
  KS.bg(run, { ok: function(){ S.wpend--; S.homeAt = 0; refreshHome(true); }, fail: function(e){ S.wpend--;
    if (String(e.message).indexOf('AUTH:') === 0) return handleErr(e);
    S.home = snap; saveHome(); if (undo) undo(); rerenderCurrent(); toast('Belum tersimpan: ' + e.message, true);
  } });
}
function strip(h){ var o = {}; for (var k in h) if (['questions', 'drugCatalog', 'content', 'serverTime'].indexOf(k) < 0) o[k] = h[k]; return o; }
var RERENDER = { home: function(){ showHome(); }, history: function(){ showHistory(); }, akun: function(){ showAccount(); } };
function rerenderCurrent(){
  if (!S.view || !RERENDER[S.view] || S.draft || !KS.quiet()) return;
  KS.keepScroll(RERENDER[S.view]);
}
KS.onOnline = function(){ refreshHome(true); };
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible' && S.home) refreshHome(false); });

/* ---------------- start ---------------- */
function start(){
  S.token = BOOT.token || load('pw_token');
  if (S.token) store('pw_token', S.token);
  if (BOOT.authError && BOOT.token){ store('pw_token', null); S.token = ''; clearLocal(); }
  if (BOOT.home && S.token){ var bh = withStatic(BOOT.home); if (bh) setHome(bh); }            /* data segar dari server (ikut halaman) */
  else if (S.token){ var ch = cachedHome(); if (ch){ S.home = ch; S.homeAt = 0; } refreshHome(true); } /* tampilkan data terakhir, perbarui diam-diam */
  var info = BOOT.info || KS.get('ks_info');
  if (info){ S.info = info; KS.set('ks_info', info); restoreOrLanding(); setTimeout(function(){ eduPhotos(); eduInfo(); }, 1200); if (!BOOT.info) call('pPublicInfo').then(function(i){ S.info = i; KS.set('ks_info', i); }).catch(function(){}); return; }
  view(KS.skel());
  call('pPublicInfo').then(function(i){ S.info = i; KS.set('ks_info', i); restoreOrLanding(); /* tab baru: halaman awal; refresh: halaman terakhir */ })
    .catch(function(e){ view('<div class="scr"><div class="alert danger">' + icon('alert') + '<div>Aplikasi tidak dapat dimuat: ' + esc(e.message) + '</div></div><button class="btn block" onclick="location.reload()">Coba lagi</button></div>'); });
}

/* 1 · Landing */
/* v3.6: halaman login perawat = deployment yang sama + ?page=nurse (routing doGet yang sudah ada) */
function nurseUrl(){
  var u = String(BOOT.execUrl || BOOT.appUrl || '').split('#')[0];
  if (!u) return '?page=nurse';
  u = u.replace(/([?&])(t|page)=[^&]*/g, '$1').replace(/[?&]+$/, '').replace(/\?&/, '?');
  return u + (u.indexOf('?') >= 0 ? '&' : '?') + 'page=nurse';
}
function showLanding(next){
  S.landed = true;
  var steps = [['scan','SCAN'],['clipcheck','CHECK'],['camera','SNAP'],['ai','AI-CARE'],['usercheck','FOLLOW-UP']];
  view('<div class="landwrap"><h1 class="sr-only">KASUARI SIGAP – Sistem Informasi Gejala dan Arahan Perawatan Ekstravasasi</h1><div class="landart"' + (window.EDU_HERO ? ' style="background-image:url(' + EDU_HERO + ')"' : '') + '><div class="cap"><small>INSTALASI KASUARI</small><b>Pusat Onkologi Terpadu</b><span>RSUP Dr. Kariadi Semarang</span></div></div><div class="land"><div class="land-top">' + kemenkes() + '<a class="nurse-link" id="lNurse" href="' + esc(nurseUrl()) + '" target="_top">' + icon('lock','sm') + '<span>Login Perawat</span></a></div>' +
    '<div class="land-id"><div class="hero-logo"><img src="' + (ASSET.hero || ASSET.kasuari) + '" alt="KASUARI – Instalasi Onkologi RS Kariadi"></div>' +
    wordmarkHtml() + '</div>' +
    '<p class="purpose">Pantau bekas infus kemoterapi Anda dari rumah.</p>' +
    '<p class="tag">“' + esc(S.info.tagline) + '”</p>' +
    '<div class="land-cta"><button class="btn block lg" id="bStart">Mulai ' + icon('chevron','sm') + '</button></div>' +
    '<div class="flow5">' + steps.map(function(s){ return '<div class="f"><span class="c">' + icon(s[0]) + '</span>' + s[1] + '</div>'; }).join('') + '</div>' +
    '<p class="powered" style="margin-top:24px">Powered by <b>' + esc(S.info.poweredBy || 'APNOVA') + '</b></p></div></div>');
  on('bStart', function(){ (next || function(){ showEduPage('pre'); })(); });
  heroHd();
}
/* Foto gedung tajam untuk layar lebar (dimuat setelah halaman tampil, tidak membebani HP) */
var HERO_HD = '';
var HERO_OK = '';
function heroHd(){
  /* v3.2 (PERF-001): halaman membawa foto kecil (±30 KB) saja; foto tajam dimuat dari Google Drive setelah tampil.
     Laptop: lebar 2400 px · HP: 1200 px. Cadangan laptop: lewat server (pHeroHd). */
  var desk = !!(window.matchMedia && matchMedia('(min-width:1024px)').matches);
  var put = function(u){ app.querySelectorAll('.landart, .edu-hero').forEach(function(el){ el.style.backgroundImage = 'url("' + u + '")'; }); };
  if (HERO_OK) return put(HERO_OK);
  var rpc = function(){
    if (!desk) return;
    if (!HERO_HD) try { HERO_HD = sessionStorage.getItem('ks_hero2') || ''; } catch (e) {}
    if (HERO_HD) return put(HERO_HD);
    call('pHeroHd').then(function(u){ if (!/^data:image\//.test(u)) return; HERO_HD = u; try { sessionStorage.setItem('ks_hero2', u); } catch (e) {} put(u); }).catch(function(){});
  };
  var url = S.info && S.info.heroUrl;
  if (!url) return rpc();
  var u = String(url).replace(/=w\d+$/, '=w' + (desk ? 2400 : 1200));
  var img = new Image();
  img.onload = function(){ if (img.naturalWidth >= 900){ HERO_OK = u; put(u); } else rpc(); };
  img.onerror = rpc;
  img.src = u;
}

/* 2 · Masuk: Nama + No. RM + Tanggal lahir (tanpa kode) */
function dobPicker(id, val){
  var v = String(val || '').split('-'), y0 = new Date().getFullYear(), d = '', m = '', y = '';
  for (var i = 1; i <= 31; i++) d += '<option value="' + (i < 10 ? '0' : '') + i + '"' + (v[2] == i ? ' selected' : '') + '>' + i + '</option>';
  MONTH.forEach(function(n, i){ var k = (i < 9 ? '0' : '') + (i + 1); m += '<option value="' + k + '"' + (v[1] === k ? ' selected' : '') + '>' + ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][i] + '</option>'; });
  for (var j = y0; j >= y0 - 100; j--) y += '<option' + (v[0] == j ? ' selected' : '') + '>' + j + '</option>';
  return '<div class="dob"><select id="' + id + 'D" aria-label="Tanggal"><option value="">Tgl</option>' + d + '</select><select id="' + id + 'M" aria-label="Bulan"><option value="">Bulan</option>' + m + '</select><select id="' + id + 'Y" aria-label="Tahun"><option value="">Tahun</option>' + y + '</select></div>';
}
function dobVal(id){ var d = $(id + 'D').value, m = $(id + 'M').value, y = $(id + 'Y').value; return d && m && y ? y + '-' + m + '-' + d : ''; }
function showLogin(msg, pre){
  pre = pre || {};
  var ph = S.info.rsPhone || S.info.unitPhone;
  view(topbar('Masuk') + '<div class="scr" style="padding-top:8px">' +
    '<h1 style="margin:0 0 6px">Selamat datang</h1><p class="muted" style="margin:0 0 16px;font-size:1rem;line-height:1.5">Isi 3 data di bawah. Datanya sama seperti yang tertulis di kartu berobat RS Kariadi.</p>' +
    (msg ? '<div class="alert warn">' + icon('info') + '<div>' + esc(msg) + '</div></div>' : '') +
    '<div class="card" style="padding:18px"><label class="lbl" for="lName">Nama lengkap</label><input type="text" id="lName" placeholder="Sesuai kartu berobat" autocomplete="name" value="' + esc(pre.name || '') + '">' +
    '<label class="lbl" for="lRm">No. Rekam Medis (RM)</label><input type="text" id="lRm" placeholder="Contoh: C123456" autocomplete="off" value="' + esc(pre.rm || '') + '"><div class="tiny muted" style="margin-top:4px">Nomor ini ada di kartu berobat / gelang pasien.</div>' +
    '<label class="lbl">Tanggal lahir</label>' + dobPicker('lDob', pre.dob) + '</div>' +
    '<button class="btn block lg" id="bLogin" style="margin-top:14px">Masuk</button>' +
    (S.info.selfReg ? '<div class="or">atau</div><button class="btn outline block lg" id="bReg">Belum pernah daftar? Daftar di sini</button><p class="center small muted" style="margin:8px 6px 0">Cukup daftar <b style="color:var(--navy)">satu kali</b>. Kemoterapi berikutnya tetap memakai akun yang sama.</p>' : '') +
    (ph ? '<a class="helpbox" href="' + tel(ph) + '">' + icon('phone') + '<span>Kesulitan masuk? Telepon RS Kariadi<br><b>' + esc(ph) + '</b></span></a>' : '') + '</div>');
  on('bBack', function(){ showLanding(); });
  function cur(){ return { name: $('lName').value.trim(), rm: $('lRm').value.trim(), dob: dobVal('lDob') }; }
  on('bReg', function(){ showRegister(cur()); });
  on('bLogin', function(){
    var c = cur(), b = this;
    if (!c.name || !c.rm || !c.dob) return toast('Lengkapi nama, No. RM, dan tanggal lahir.', true);
    b.disabled = true; b.innerHTML = '<div class="spinner"></div>';
    call('pLogin', c.name, c.rm, c.dob, staticVer()).then(function(r){
      if (r.token){ S.token = r.token; store('pw_token', r.token); var hh = withStatic(r.home); if (hh) setHome(hh); else clearLocal(); return loadHome(); }
      b.disabled = false; b.textContent = 'Masuk';
      if (r.notRegistered) return r.selfReg ? showRegister(c, 'Data Anda belum terdaftar. Silakan lengkapi pendaftaran di bawah ini.') : showLogin('Data Anda belum terdaftar. Silakan hubungi perawat.', c);
      if (r.ended) return r.selfReg ? showRegister(c, 'Masa pemantauan sebelumnya sudah selesai. Daftar lagi untuk kemoterapi terbaru.') : showLogin('Masa pemantauan Anda sudah selesai. Hubungi perawat bila masih ada keluhan.', c);
    }).catch(function(e){ b.disabled = false; b.textContent = 'Masuk'; toast(e.message, true); });
  });
}
/* Kompatibilitas: tautan/QR lama tetap bisa dipakai */

/* Daftar mandiri */
function showRegister(pre, msg){
  pre = pre || {};
  var chemoOpts = '', now = new Date();
  for (var i = 0; i <= 7; i++){ var d = new Date(now.getTime() - i * 86400000), k = d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    chemoOpts += '<option value="' + k + '">' + (i === 0 ? 'Hari ini' : i === 1 ? 'Kemarin' : i + ' hari lalu') + ' – ' + DAYN[d.getDay()] + ', ' + d.getDate() + ' ' + MONTH[d.getMonth()] + '</option>'; }
  var sites = ['Tangan kanan','Tangan kiri','Lengan kanan','Lengan kiri','Dada (port)','Lainnya'];
  var types = [['Perifer','Infus biasa','Jarum kecil di tangan/lengan, dilepas setelah kemo'],['Port-a-cath','Port','Alat kecil tertanam di bawah kulit dada'],['PICC','PICC','Selang panjang di lengan atas, dipakai berminggu-minggu'],['Tidak tahu','Tidak tahu','']];
  var c = S.info.consent;
  function num(n, t, opt){ return '<h4 class="num"><i>' + n + '</i>' + t + (opt ? '<span class="opt">' + opt + '</span>' : '') + '</h4>'; }
  S.regDp = drugPicker('dpReg', S.info.drugCatalog || [], [], '');
  view(topbar('Daftar') + '<div class="scr" style="padding-top:6px">' +
    '<h1 style="margin:0 0 4px">Daftar sekali saja</h1>' +
    (msg ? '<div class="alert info" style="margin-top:10px">' + icon('info') + '<div>' + esc(msg) + '</div></div>' : '<p class="muted" style="margin:0 0 12px">Isi sekitar 2 menit. Keluarga boleh membantu mengisi.</p>') +
    '<div class="card">' + num(1, 'Data diri') +
    '<label class="lbl" for="rName">Nama lengkap</label><input type="text" id="rName" value="' + esc(pre.name || '') + '" autocomplete="name">' +
    '<label class="lbl">Kami menyapa Anda</label><div class="gpick" id="rGender"><button type="button" data-v="L"><b>Bapak</b><span>Laki-laki</span></button><button type="button" data-v="P"><b>Ibu</b><span>Perempuan</span></button></div>' +
    '<label class="lbl" for="rRm">No. Rekam Medis (RM)</label><input type="text" id="rRm" value="' + esc(pre.rm || '') + '" placeholder="Ada di kartu berobat / gelang pasien">' +
    '<label class="lbl">Tanggal lahir</label>' + dobPicker('rDob', pre.dob) +
    '<label class="lbl" for="rPhone">No. HP / WhatsApp</label><input type="tel" id="rPhone" inputmode="tel" placeholder="08xx xxxx xxxx"><div class="tiny muted" style="margin-top:4px">Perawat akan menghubungi lewat nomor ini.</div></div>' +
    '<div class="card">' + num(2, 'Kemoterapi terakhir') + '<label class="lbl" for="rChemo">Tanggal</label><select id="rChemo">' + chemoOpts + '</select>' +
    '<label class="lbl">Bekas infus / akses ada di</label><div class="chipset" id="rSite">' + sites.map(function(x){ return '<button type="button" data-v="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>' +
    '<input type="text" id="rSiteOther" class="hidden" placeholder="Sebutkan lokasinya" style="margin-top:8px">' +
    '<label class="lbl">Jenis akses</label><div class="tlist" id="rType">' + types.map(function(x){ return '<button type="button" data-v="' + esc(x[0]) + '"><b>' + esc(x[1]) + '</b>' + (x[2] ? '<span>' + esc(x[2]) + '</span>' : '') + '</button>'; }).join('') + '</div></div>' +
    '<div class="card">' + num(3, 'Obat kemoterapi', 'boleh nanti') + '<p class="small muted" style="margin:0 0 10px">Agar saran kompres (dingin/hangat) sesuai obat Anda.</p>' + S.regDp.html +
      '<button type="button" class="dknow" id="rDrugNo">Saya tidak tahu – tanyakan ke perawat nanti</button></div>' +
    '<details class="card"><summary class="b nop" style="cursor:pointer;color:var(--navy);display:flex;align-items:center;gap:10px"><i style="width:28px;height:28px;border-radius:50%;background:var(--teal);color:#fff;font-style:normal;font-size:.86rem;display:flex;align-items:center;justify-content:center">4</i>Kontak keluarga <span class="tiny muted" style="font-weight:600">(opsional)</span></summary><label class="lbl" for="rCg">Nama keluarga</label><input type="text" id="rCg" placeholder="mis. Rina (anak)"><label class="lbl" for="rCgP">No. HP keluarga</label><input type="tel" id="rCgP" inputmode="tel"></details>' +
    '<div class="card">' + num(5, 'Persetujuan') + '<p class="small" style="margin:0 0 12px;color:var(--ink-2);line-height:1.55">' + esc(c ? c.message : 'Saya bersedia melaporkan kondisi area bekas infus dan mengirim foto kepada perawat untuk pemantauan. Aplikasi ini bukan layanan gawat darurat.') + '</p>' +
    '<label class="okbig"><input type="checkbox" id="rOk"> Saya setuju</label></div>' +
    '<button class="btn block lg" id="bDoReg" style="margin-top:6px">' + icon('check','sm') + ' Daftar & Mulai Pemantauan</button></div>');
  on('bBack', function(){ showLogin('', pre); });
  var sel = { site: '', type: '', gender: '' };
  function chips(id, key){ $(id).querySelectorAll('button').forEach(function(b){ b.onclick = function(){ sel[key] = b.dataset.v; $(id).querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x === b); }); if (key === 'site') $('rSiteOther').classList.toggle('hidden', b.dataset.v !== 'Lainnya'); }; }); }
  chips('rSite', 'site'); chips('rType', 'type'); chips('rGender', 'gender'); S.regDp.bind();
  on('rDrugNo', function(){ this.classList.toggle('on'); });
  on('bDoReg', function(){
    var site = sel.site === 'Lainnya' ? $('rSiteOther').value.trim() : sel.site, b = this;
    var f = { NAME: $('rName').value.trim(), GENDER: sel.gender, RM_NUMBER: $('rRm').value.trim(), DOB: dobVal('rDob'), PHONE: $('rPhone').value.trim(), CHEMO_DATE: $('rChemo').value,
      ACCESS_SITE: site, ACCESS_TYPE: sel.type || 'Tidak tahu', CAREGIVER_NAME: $('rCg').value.trim(), CAREGIVER_PHONE: $('rCgP').value.trim(), CONSENT: $('rOk').checked ? 'TRUE' : 'FALSE',
      DRUG_CODES: S.regDp.value().codes, CHEMO_AGENT: S.regDp.value().other };
    if (!f.NAME || !f.RM_NUMBER || !f.DOB) return toast('Lengkapi nama, No. RM, dan tanggal lahir.', true);
    if (!f.GENDER) return toast('Pilih sapaan: Bapak atau Ibu.', true);
    if (!f.PHONE) return toast('Isi No. HP / WhatsApp.', true);
    if (!f.ACCESS_SITE) return toast('Pilih lokasi bekas infus.', true);
    if (!$('rOk').checked) return toast('Centang “Saya setuju” untuk melanjutkan.', true);
    b.disabled = true; b.innerHTML = '<div class="spinner"></div>';
    call('pRegister', f, staticVer()).then(function(r){ S.token = r.token; store('pw_token', r.token); var hh = withStatic(r.home); if (hh) setHome(hh); else clearLocal(); toast(r.existing ? 'Data ditemukan, Anda sudah terdaftar.' : 'Pendaftaran berhasil.'); loadHome(); })
      .catch(function(e){ b.disabled = false; b.innerHTML = icon('check','sm') + ' Daftar & Mulai Pemantauan'; toast(e.message, true); });
  });
}

/* v3.0: Beranda tampil seketika dari data lokal; data terbaru diambil di latar belakang */
function loadHome(then, opt){
  opt = opt || {};
  if (!S.home) S.home = cachedHome();
  if (S.home && !opt.force){ routeHome(then); refreshHome(false); return; }
  view(KS.skel());
  fetchHome().then(function(h){ setHome(h); routeHome(then); }).catch(function(e){
    if (S.home && KS.isNet(e)){ routeHome(then); toast('Tidak ada koneksi – menampilkan data terakhir.', true); return; }
    handleErr(e);
  });
}
function routeHome(then){
  var h = S.home; syncAvatar();
  if (h.patient.eduNeeded && (S.eduSeen || load('pw_edu'))){ h.patient.eduNeeded = false; call('pEducationDone', S.token).catch(function(){}); }
  if (h.patient.eduNeeded) (S.landed ? showEduPage('post') : showLanding(function(){ showEduPage('post'); })); else if (h.patient.consentNeeded) showConsent(); else { (then || showHome)(); replyPopup(); igdPopup(); }
  startReplyPolling();
}

/* Persetujuan */
function showConsent(){
  var c = S.home.content.consent;
  view('<div class="scr">' + kemenkes() + '<div class="card" style="margin-top:20px;padding:20px"><div class="center" style="color:var(--teal)">' + icon('shield','xl') + '</div>' +
    '<h2 class="center" style="margin:8px 0 10px">' + esc(c ? c.title : 'Persetujuan penggunaan') + '</h2><p class="small" style="color:var(--ink-2)">' + esc(c ? c.message : '') + '</p>' +
    '<label class="row" style="margin:14px 0;cursor:pointer;flex-wrap:nowrap"><input type="checkbox" id="cOk" style="width:22px;height:22px;accent-color:var(--teal)"> <span class="small b">Saya telah membaca dan setuju.</span></label>' +
    '<button class="btn block lg" id="bCons" disabled>Lanjutkan</button></div></div>');
  $('cOk').onchange = function(){ $('bCons').disabled = !this.checked; };
  on('bCons', function(){ this.disabled = true; call('pConsent', S.token).then(function(){ S.home.patient.consentNeeded = false; showHome(); }).catch(handleErr); });
}

/* ---------------- Foto profil pasien ---------------- */
function avatarHtml(cls){ return '<div class="avatar js-av ' + (cls || '') + (S.avatar ? ' has' : '') + '">' + (S.avatar ? '<img src="' + S.avatar + '" alt="Foto profil">' : icon('user', cls === 'big' ? 'xl' : 'lg')) + '</div>'; }
function paintAvatar(){ app.querySelectorAll('.js-av').forEach(function(e){ var big = e.classList.contains('big'); e.outerHTML = avatarHtml(big ? 'big' : ''); }); }
function syncAvatar(){
  var a = (S.home && S.home.account) || {}, key = 'pw_av_' + S.home.patient.code, c = {};
  try { c = JSON.parse(load(key) || '{}'); } catch (e) {}
  if (!a.profilePhotoId){ S.avatar = ''; store(key, null); return; }
  if (c.id === a.profilePhotoId && c.url){ S.avatar = c.url; return; }
  S.avatar = c.url || '';
  call('pProfilePhoto', S.token).then(function(u){ S.avatar = u || ''; if (u) store(key, JSON.stringify({ id: a.profilePhotoId, url: u })); paintAvatar(); }).catch(function(){});
}
function cropSquare(file, px){
  return new Promise(function(res, rej){
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function(){ var s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas'); c.width = c.height = px;
      c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, px, px); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.85)); };
    img.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('Foto tidak dapat dibaca.')); }; img.src = url;
  });
}
function profilePhotoSheet(){
  var has = !!(S.home.account || {}).profilePhotoId;
  var o = sheet('<div class="center">' + avatarHtml('big') + '</div><h2 class="center" style="margin-top:10px">Foto profil</h2><p class="center small muted" style="margin:4px 0 14px">Foto wajah Anda membantu perawat mengenali Anda. Hanya perawat berwenang yang dapat melihatnya.</p>' +
    '<label class="btn block">' + icon('camera','sm') + ' Ambil foto<input type="file" accept="image/*" capture="user" class="sr" id="avCam"></label>' +
    '<label class="btn ghost block" style="margin-top:10px">' + icon('image','sm') + ' Pilih dari galeri<input type="file" accept="image/*" class="sr" id="avGal"></label>' +
    (has ? '<button class="btn link block" id="avDel" style="margin-top:8px;color:var(--bad)">' + icon('x','sm') + ' Hapus foto profil</button>' : ''));
  function up(f){
    if (!f) return; o.remove(); toast('Mengunggah foto profil…');
    cropSquare(f, 360).then(function(u){ return call('pSetProfilePhoto', S.token, u).then(function(id){ S.avatar = u; store('pw_av_' + S.home.patient.code, JSON.stringify({ id: id, url: u })); S.home.account.profilePhotoId = id; toast('Foto profil diperbarui.'); showAccount(); }); })
      .catch(function(e){ toast(e.message, true); });
  }
  o.querySelector('#avCam').onchange = function(){ up(this.files[0]); };
  o.querySelector('#avGal').onchange = function(){ up(this.files[0]); };
  var d = o.querySelector('#avDel'); if (d) d.onclick = function(){ o.remove();
    call('pRemoveProfilePhoto', S.token).then(function(){ S.avatar = ''; store('pw_av_' + S.home.patient.code, null); S.home.account.profilePhotoId = ''; toast('Foto profil dihapus.'); showAccount(); }).catch(function(e){ toast(e.message, true); }); };
}

/* ---------------- Navigasi bawah ---------------- */
/* v3.14: ikon menu bergambar (dari desain unit) */
/* v3.14.2: ikon bergambar menu Akun (Pasang di layar utama, Tanya-jawab, Nomor telepon penting) */
/* v3.14.5: ikon kontak dari desain unit (perawat, contact center, WhatsApp) */
/* v3.18: ikon diambil dari folder Google Drive ruangan (publik "siapa saja yang memiliki link") – halaman lebih ringan.
   Satu file "sprite" per kelompok ikon → hanya 4 unduhan kecil, lalu tersimpan di cache browser.
   Bila Drive tidak bisa diakses, ikon garis bawaan dipakai sehingga menu tetap berfungsi. */
var ICON_SPR = {
  nav: { id: '14quds9J-UZ2L16dy4suQ0xu8aWJ0djl8', k: ['home', 'history', 'chat', 'edu', 'akun'] },
  menu: { id: '1SKFiQjJuV7Jf7jNLm2hT6YVPk0iDScdF', k: ['install', 'faq', 'call'] },
  contact: { id: '1n6xib4pfjOsq0IQO7ZeheYiaM7A1YArG', k: ['nurse', 'center', 'wa'] },
  edu: { id: '1wWeLd7tHvZL0kDsjXqkMFEDnOsUXiEd4', k: ['signs', 'compress', 'measure', 'skin', 'port', 'nausea', 'fever', 'mouth', 'fatigue', 'hair', 'nerve', 'digest', 'food', 'water', 'home', 'meds', 'mind', 'igd'] }
};
var EDU_PIC = { eSigns: 'signs', eComp: 'compress', eSkin: 'skin', eIgd: 'igd' };
function sprUrl(set, alt){ var id = ICON_SPR[set].id; return alt ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w2000' : 'https://lh3.googleusercontent.com/d/' + id; }
function sprImg(set, key, cls, fb){
  var s = ICON_SPR[set], i = s.k.indexOf(key), n = s.k.length;
  if (i < 0 || s.dead) return fb ? icon(fb) : '';
  return '<img class="spr ' + (cls || '') + '" src="' + sprUrl(set) + '" alt="" style="object-position:' + (n > 1 ? Math.round(i / (n - 1) * 10000) / 100 : 0) + '% 0" data-set="' + set + '" data-fb="' + (fb || '') + '" onerror="sprErr(this)">';
}
/* v3.18.1: gambar tunggal dari Drive (diperkecil oleh Google lewat "=w192" agar ringan) */
var DRIVE_PIC = { reply: '1cmOPS0TJfgXUuY8W61N7wv7_i8kqq7jT', sent: '1HvvwfUoi_M6UECGVzrZjCmxlzktClr6d', tips: '1Nx-ppiexsonA8hVALNAApZEcvLDrNPk7', nurse: '1oAqLbA4mt9AVDuF5WTYa5IiwhKIYHs9x' }, DRIVE_DEAD = {};
/* v3.18.2: 3 tips foto dari satu gambar Drive (3 kotak berjajar, tulisan sudah ada di gambar) */
var TIPS_TXT = [['sparkle', 'Tempat terang'], ['scan', 'Jarak 1 jengkal'], ['eye', 'Tahan, tidak goyang']];
function tipsPlain(){ return '<div class="tip3">' + TIPS_TXT.map(function(t){ return '<div>' + icon(t[0]) + t[1] + '</div>'; }).join('') + '</div>'; }
function tipsHtml(){
  if (DRIVE_DEAD.tips) return tipsPlain();
  return '<div class="tip3 pics">' + TIPS_TXT.map(function(t, i){ return '<div><img class="dpic" src="https://lh3.googleusercontent.com/d/' + DRIVE_PIC.tips + '=w720" alt="' + t[1] + '" data-k="tips" style="object-position:' + (i * 50) + '% 0" onerror="dpicErr(this)"></div>'; }).join('') + '</div>';
}
function drivePic(k, fb, fbc){
  var id = DRIVE_PIC[k]; fbc = fbc || 'lg'; if (!id || DRIVE_DEAD[k]) return icon(fb, fbc);
  return '<img class="dpic" src="https://lh3.googleusercontent.com/d/' + id + '=w192" alt="" data-k="' + k + '" data-fb="' + fb + '" data-fbc="' + fbc + '" onerror="dpicErr(this)">';
}
function dpicErr(im){
  var k = im.getAttribute('data-k');
  if (!im.getAttribute('data-alt')){ im.setAttribute('data-alt', '1'); im.src = 'https://drive.google.com/thumbnail?id=' + DRIVE_PIC[k] + '&sz=' + (k === 'tips' ? 'w720' : 'w192'); return; }
  DRIVE_DEAD[k] = 1;
  if (k === 'tips'){ var box = im.closest('.tip3'); if (box) box.outerHTML = tipsPlain(); return; }
  var w = document.createElement('span'); w.innerHTML = icon(im.getAttribute('data-fb') || 'info', im.getAttribute('data-fbc') || 'lg');
  if (im.parentNode){ im.parentNode.classList.remove('pic'); im.parentNode.replaceChild(w.firstChild, im); }
}
function sprErr(im){
  if (!im.getAttribute('data-alt')){ im.setAttribute('data-alt', '1'); im.src = sprUrl(im.getAttribute('data-set'), 1); return; }
  var st = ICON_SPR[im.getAttribute('data-set')]; if (st) st.dead = true;   // Drive tidak terjangkau → layar berikutnya langsung pakai ikon cadangan
  var w = document.createElement('span'); w.innerHTML = icon(im.getAttribute('data-fb') || 'info'); if (im.parentNode) im.parentNode.replaceChild(w.firstChild, im);
}
function menuPic(k){ return sprImg('menu', k, 'aipic', { install: 'plus', faq: 'message', call: 'phone' }[k]); }
function aiPic(sz){ return sprImg('nav', 'chat', 'aipic' + (sz ? ' ' + sz : ''), 'ai'); } /* v3.14.1: ikon robot perawat NURSE.AI di semua tempat */
var TABS = [['home','home','Beranda'],['history','history','Riwayat'],['chat','ai','NURSE.AI'],['edu','book','Edukasi'],['akun','user','Akun']];
function unreadCount(){ var h = S.home; if (!h || !h.messages) return 0; return h.messages.filter(function(m){ return !m.readAt; }).length; }
/* Pop-up "Perawat sudah membalas" – wajib ditandai "Saya sudah membaca" */
function replyPopup(){
  var h = S.home; if (!h || S.replyOpen) return;
  var un = (h.messages || []).filter(function(m){ return !m.readAt; });
  if (!un.length) return;
  S.replyOpen = true;
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
  var unit = esc(S.info.unitName.split('–')[0].trim());
  var o = document.createElement('div'); o.className = 'rp-ov sheetm';
  o.innerHTML = '<div class="rp" role="dialog" aria-modal="true" aria-labelledby="rpT"><span class="grab"></span><div class="rp-hd"><span class="bell pic">' + drivePic('reply', 'usercheck') + '</span><div><b id="rpT">Perawat sudah membalas</b><span>' + unit + ' · ' + esc(fmtDT(un[0].time)) + '</span></div></div>' +
    un.map(function(m){
      var adv = String(m.advice || '').split(/\n|;\s+/).map(function(x){ return x.trim(); }).filter(Boolean);
      return '<div class="quote">“' + esc(m.message) + '”</div>' +
        (adv.length ? '<b style="color:var(--navy)">Anjuran perawat</b><ol class="nsteps advs" style="margin:10px 0 14px">' + adv.map(function(a){ return '<li>' + esc(a) + '</li>'; }).join('') + '</ol>' : '');
    }).join('') +
    '<div class="okline">' + icon('check','sm') + ' Anda sekarang bisa mengirim laporan baru bila ada perubahan.</div>' +
    '<button class="btn block lg" id="rpOk">Saya sudah membaca</button></div>';
  document.body.appendChild(o);
  o.querySelector('#rpOk').onclick = function(){
    var ids = un.map(function(m){ return m.id; }), t = nowStr();
    o.remove(); S.replyOpen = false;
    optimistic(function(){ (S.home.messages || []).forEach(function(m){ if (ids.indexOf(m.id) >= 0) m.readAt = t; }); }, function(){ return call('pMarkRead', S.token, ids); }, null, 'Terima kasih, pesan sudah dibaca.');
    rerenderCurrent(); igdPopup();
  };
}
/* Pertanyaan kepatuhan: "Apakah Anda sudah ke IGD?" – untuk laporan PRIORITAS yang sudah dibalas perawat (sekali saja) */
function igdPopup(){
  var h = S.home; if (!h || S.replyOpen || S.igdOpen) return;
  var q = h.patient && h.patient.igdAsk; if (!q) return;
  if ((h.messages || []).some(function(m){ return !m.readAt; })) return; // tampil setelah balasan dibaca
  S.igdOpen = true;
  var i = S.info, igd = i.igdPhone || i.unitPhone;
  var o = document.createElement('div'); o.className = 'rp-ov';
  o.innerHTML = '<div class="rp igdq" role="dialog" aria-modal="true" aria-labelledby="igT"><div class="ico">' + icon('shield','lg') + '</div><h2 id="igT">Apakah ' + esc(sapa()) + ' sudah ke IGD?</h2>' +
    '<p>' + (q.advised ? 'Pada laporan ' + esc(fmtDate(q.time)) + ', perawat menganjurkan ' + esc(sapa()) + ' segera diperiksa di IGD RS Kariadi.' : 'Laporan ' + esc(fmtDate(q.time)) + ' ditandai PRIORITAS. Jawaban ini membantu perawat memastikan ' + esc(sapa()) + ' mendapat penanganan yang tepat.') + '</p>' +
    '<div class="igdbtn stack"><button data-a="YA" class="btn">Ya, sudah ke IGD</button><button data-a="BELUM" class="btn ghost">Belum, akan segera</button><button data-a="TIDAK" class="btn ghost">Tidak ke IGD</button></div>' +
    (igd ? '<a class="tl" href="' + tel(igd) + '">' + icon('phone','sm') + ' Keluhan bertambah? Telepon IGD</a>' : '') + '</div>';
  document.body.appendChild(o);
  o.querySelectorAll('[data-a]').forEach(function(b){ b.onclick = function(){
    var a = b.dataset.a; o.remove(); S.igdOpen = false;
    optimistic(function(){ S.home.patient.igdAsk = null; }, function(){ return call('pAnswerIgd', S.token, q.reportId, a); }, null, a === 'YA' ? 'Terima kasih. Semoga lekas membaik.' : '');
    if (a !== 'YA') sheet('<h2>' + (a === 'BELUM' ? 'Segera ke IGD' : 'Kami sarankan tetap diperiksa') + '</h2><p class="small muted" style="margin:6px 0 12px">Hubungi perawat atau datang ke IGD RSUP Dr. Kariadi agar kondisi ' + esc(sapa()) + ' dapat diperiksa langsung. Bila keluhan bertambah, segera ke IGD.</p>' + callButtons());
  }; });
}
/* Cek balasan baru tiap 1 menit selama aplikasi terbuka */
function startReplyPolling(){
  if (S.replyTimer) return;
  S.replyTimer = setInterval(function(){
    if (!S.token || !S.home || S.draft || S.replyOpen || S.igdOpen || document.visibilityState === 'hidden') return;
    call('pCheckReplies', S.token).then(function(r){
      var known = {}; (S.home.messages || []).forEach(function(m){ known[m.id] = m; });
      (r.unread || []).forEach(function(m){ if (!known[m.id]) S.home.messages.unshift(m); });
      if (r.gate) S.home.patient.reportGate = r.gate;
      S.home.patient.igdAsk = r.igdAsk || null;
      if ((r.unread || []).length) replyPopup(); else igdPopup();
    }).catch(function(){});
  }, 90000); /* v3.15: cek balasan tiap 90 dtk (hasil di-cache server) */
}
function tabbar(active){
  var u = unreadCount();
  return '<nav class="tabbar' + (active === 'home' ? ' on-home' : '') + '" aria-label="Menu utama"><div class="sb-brand"><img src="' + ASSET.kasuari + '" alt=""><div><b>KASUARI <i>SIGAP</i></b><small>Ruang Kasuari Lt. 3 · RS Kariadi</small></div></div><div class="in">' + TABS.map(function(t){
    return '<button data-tab="' + t[0] + '" class="' + (t[0] === active ? 'on' : '') + '" aria-current="' + (t[0] === active ? 'page' : 'false') + '"><span class="ti">' + sprImg('nav', t[0], '', t[1]) + (t[0] === 'home' && u ? '<i class="nb">' + u + '</i>' : '') + '</span><span class="tl">' + t[2] + '</span><span class="tbar"></span></button>';
  }).join('') + '</div><div class="sb-sos"><b>' + icon('alert','sm') + ' Gawat darurat?</b><span>Lepuh, luka terbuka, nyeri hebat, atau demam ≥ 38 °C.</span>' + callButtons() + '</div><div class="sb-foot">Powered by <b>' + esc((S.info && S.info.poweredBy) || 'APNOVA') + '</b></div></nav>';
}
function tabView(active, html){
  S.view = active;
  view(html + tabbar(active));
  app.querySelectorAll('[data-tab]').forEach(function(b){ b.onclick = function(){ goTab(b.dataset.tab); }; });
}
function goTab(t){ if (t === 'home') showHome(); else if (t === 'history'){ showHistory(); refreshHome(false); } else if (t === 'chat') showChat(showHome); else if (t === 'edu') showEduHome(); else showAccount(); }

/* Konfirmasi keluar (logout) */
function sheet(html){ var o = document.createElement('div'); o.className = 'sheet-ov'; o.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><span class="grab"></span>' + html + '</div>'; o.addEventListener('click', function(e){ if (e.target === o) o.remove(); }); document.body.appendChild(o); return o; }
function confirmLogout(){
  var o = sheet('<div class="sheet-ic">' + icon('logout','lg') + '</div><h2 class="center">Keluar dari aplikasi?</h2><p class="center small muted" style="margin:6px 8px 16px">Untuk masuk lagi, Anda perlu mengisi nama, No. RM, dan tanggal lahir. Laporan Anda tetap tersimpan.</p>' +
    '<div class="row" style="flex-wrap:nowrap"><button class="btn ghost grow" id="lgNo">Batal</button><button class="btn danger grow" id="lgYes">' + icon('logout','sm') + ' Keluar</button></div>');
  o.querySelector('#lgNo').onclick = function(){ o.remove(); };
  o.querySelector('#lgYes').onclick = function(){ var t = S.token; o.remove(); if (t) call('pLogout', t).catch(function(){});
    if (S.home) store('pw_av_' + S.home.patient.code, null); store('pw_token', null); clearLocal(); S.token = ''; S.home = null; S.avatar = ''; S.eduSeen = false; toast('Anda telah keluar.'); showLanding(); };
}

/* 3 · Beranda */
function miniHead(){ return '<div class="mini"><img src="' + ASSET.kasuari + '" alt="Ruang Kasuari"><div class="t">KASUARI <b>SIGAP</b></div><img class="r" src="' + ASSET.kemenkes + '" alt="Kemenkes RS Kariadi"></div>'; }
function replyTxt(){ var hr = Number((S.home && S.home.patient && S.home.patient.replyHours) || 24); return hr % 24 === 0 ? (hr / 24) + '×24 jam' : hr + ' jam'; }
/* =====================================================================
   v3.11 · KONTEKS PERAWATAN SAYA
   Ringkasan data klinis tercatat (akses, kemo terakhir, obat, pemeriksaan terakhir) + sumbernya.
   Pasien tidak perlu membuka Akun untuk memfoto atau bertanya ke NURSE.AI.
   ===================================================================== */
function ctx(){ return (S.home && S.home.patient && S.home.patient.ctx) || null; }
function srcTxt(src){ return ''; } /* v3.12.2: data diisi pasien sendiri sudah sah – tanpa label "belum dicek perawat" */
function dShort(t){ if (!t) return ''; var d = pd(t); return d.getDate() + ' ' + MONTH[d.getMonth()] + ' ' + d.getFullYear(); }
function drugsTxt(c){ return c.drugs.names.concat(c.drugs.other ? [c.drugs.other] : []).join(', '); }
function ctxCard(){
  var c = ctx(); if (!c) return '';
  var ask = askNewHtml(c, 'x');
  if (!ask && c.needs.indexOf('KONFIRMASI_OBAT') >= 0) ask = '<div class="ask"><b>Obat kemo sesi ' + esc(c.chemo.date ? dShort(c.chemo.date) : 'terbaru') + ' sama seperti sebelumnya?</b><div class="small muted" style="margin-top:2px">' + esc((c.drugs.prevNames || []).join(', ')) + '</div><div class="row" style="flex-wrap:wrap"><button class="btn sm grow" id="xSame">Sama</button><button class="btn ghost sm grow" id="xDiff">Berbeda</button><button class="btn ghost sm grow" id="xUnk">Tidak tahu</button></div></div>';
  var acc = [c.access.type, c.access.site].filter(Boolean).join(' – ');
  var chemo = c.chemo.date ? '<b>' + esc(dShort(c.chemo.date)) + '</b>' + (c.sessions > 1 ? ' <span class="tiny muted">· sesi ke-' + c.chemo.no + '</span>' : '') + srcTxt(c.chemo.src)
    : c.chemo.dateStatus === 'TIDAK_TAHU' ? '<b>Sesi baru · tanggal belum diketahui</b><span class="src pas">dilaporkan sendiri · <button class="linkbtn" id="xDate">isi tanggal</button></span>' : '<b>–</b>';
  var drug = c.drugs.status === 'KOSONG' ? '<span class="muted">Belum diisi · <button class="linkbtn" id="xDrug">isi (boleh nanti)</button></span>'
    : c.drugs.status === 'PERLU_KONFIRMASI' ? '<b>Belum diketahui</b><span class="src pas">perlu konfirmasi untuk sesi ini · <button class="linkbtn" id="xDrug">isi bila sudah tahu</button></span>'
    : '<b>' + esc(drugsTxt(c)) + '</b>' + srcTxt(c.drugs.src);
  var last = c.lastReport ? esc(dShort(c.lastReport.time)) + (c.lastReport.siteLabel ? ' · ' + esc(c.lastReport.siteLabel) : '') + (c.lastReport.photos ? ' · ' + c.lastReport.photos + ' foto' : '') : 'Belum ada';
  return '<div class="ctxc" id="ctxCard"><div class="hd"><span class="grow"><b>Konteks Perawatan Saya</b></span><button class="btn ghost sm" id="xUpd">Perbarui konteks</button></div>' + ask +
    '<div class="it"><span>Akses infus</span><div><b>' + esc(acc || '–') + '</b>' + (acc ? srcTxt(c.access.src) : '') + '</div></div>' +
    '<div class="it"><span>Kemo terakhir</span><div>' + chemo + '</div></div>' +
    '<div class="it"><span>Obat kemo</span><div>' + drug + '</div></div>' +
    '<div class="it"><span>Pemeriksaan terakhir</span><div>' + last + '</div></div>' +
    '<p class="tiny muted" style="margin:6px 0 0">Info yang diisi sendiri ditandai sampai dicek perawat. Dipakai otomatis saat memfoto dan saat bertanya ke NURSE.AI.</p></div>';
}
function setCtx(c){ if (c && S.home && S.home.patient){ S.home.patient.ctx = c; saveHome(); } }
/* v3.12: pertanyaan "baru kemoterapi?" – 3 pilihan, tidak berupa modal berulang */
function askNewHtml(c, pfx){
  if (!c || c.needs.indexOf('CEK_SESI_BARU') < 0) return '';
  var since = c.exam && c.exam.last ? 'pemeriksaan terakhir (' + dShort(c.exam.last.time) + ')' : 'kemoterapi ' + dShort(c.chemo.date);
  return '<div class="ask"><b>Apakah Anda baru menjalani kemoterapi sejak ' + esc(since) + '?</b><div class="askopts">' +
    '<button type="button" id="' + pfx + 'Yes">' + icon('calendar','sm') + ' Ya, saya baru menjalani kemoterapi</button>' +
    '<button type="button" id="' + pfx + 'No">' + icon('check','sm') + ' Tidak, saya memeriksa bekas akses yang sama</button>' +
    '<button type="button" id="' + pfx + 'Unk">' + icon('info','sm') + ' Saya tidak yakin dengan tanggal atau info perawatan saya</button></div></div>';
}
function confirmCtx(kind, msg){
  optimistic(function(){ var c = ctx(); if (!c) return; c.needs = c.needs.filter(function(n){ return n !== 'CEK_SESI_BARU' && n !== 'KONFIRMASI_OBAT'; });
      if (kind === 'DRUGS_SAME'){ c.drugs.status = 'OK'; c.drugs.names = c.drugs.prevNames || []; c.drugs.src = 'PASIEN'; } },
    function(){ return call('pConfirmContext', S.token, kind).then(setCtx); }, null, msg);
}
function bindAsk(pfx, after){
  on(pfx + 'Yes', function(){ ctxSheet(after, { newChemo: true }); });
  on(pfx + 'No', function(){ confirmCtx('NO_NEW_CHEMO', 'Baik, data sesi yang tercatat tetap dipakai.'); after(); });
  on(pfx + 'Unk', function(){ if (S.draft) S.draft.ctxUnsure = true; confirmCtx('UNSURE', 'Tidak apa-apa – Anda tetap bisa melanjutkan. Perawat akan memastikan informasinya.'); after(); });
}
/* v3.12.1: data kemo yang belum ada → ditanyakan NURSE.AI di awal chat */
function missingCtx(){
  var c = ctx(); if (!c) return ['Obat kemoterapi apa yang diberikan', 'Jenis dan lokasi infus (infus biasa di tangan/lengan, PORT, atau PICC)', 'Tanggal kemoterapi terakhir'];
  var m = [];
  if (c.drugs.status !== 'OK') m.push('Obat kemoterapi apa yang diberikan pada sesi terakhir');
  if (!c.access.type && !c.access.site) m.push('Jenis dan lokasi infus (infus biasa di tangan/lengan, PORT, atau PICC)');
  if (!c.chemo.date) m.push('Tanggal kemoterapi terakhir');
  return m;
}

/* ---------- komponen pilihan (chip) ---------- */
function chips(id, items, sel){
  return '<div class="sitepick" id="' + id + '" role="group">' + items.map(function(x){ return '<button type="button" data-v="' + esc(x[0]) + '" class="' + (sel === x[0] ? 'on' : '') + '" aria-pressed="' + (sel === x[0]) + '">' + esc(x[1]) + (x[2] ? '<span class="chs">' + esc(x[2]) + '</span>' : '') + '</button>'; }).join('') + '</div>';
}
function bindChips(root, id, cb){
  var r = root.querySelector('#' + id); if (!r) return;
  r.querySelectorAll('button').forEach(function(b){ b.onclick = function(){ r.querySelectorAll('button').forEach(function(x){ var y = x === b; x.classList.toggle('on', y); x.setAttribute('aria-pressed', y); }); cb(b.dataset.v); }; });
}
function siteOptsFor(t){ var so = (S.home && S.home.siteOpts) || {}; return ((so.sites || {})[t || 'TIDAK_YAKIN'] || (so.sites || {}).TIDAK_YAKIN || []); }
function accOpts(){ return ((S.home && S.home.siteOpts && S.home.siteOpts.access) || [['PERIFER','Perifer (infus biasa)'],['PORT','PORT (port-a-cath)'],['PICC','PICC'],['TIDAK_YAKIN','Tidak yakin jenisnya']]); }
function siteLbl(code){ var all = siteOptsFor('TIDAK_YAKIN').concat(siteOptsFor('PORT'), siteOptsFor('PICC'), siteOptsFor('PERIFER')); for (var i = 0; i < all.length; i++) if (all[i][0] === code) return all[i][1]; return code === 'LENGAN_KIRI' ? 'Lengan/tangan kiri' : code === 'LENGAN_KANAN' ? 'Lengan/tangan kanan' : ''; }
function newReq(){ return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
/* Akses + lokasi (dipakai formulir sesi, perbarui akses, dan pemeriksaan) */
function accessBlock(pfx, type, site, extra){
  return '<p class="small b" style="margin:14px 0 6px">Jenis infus</p>' + chips(pfx + 'T', (extra || []).concat(accOpts()), type) +
    '<div id="' + pfx + 'SBox">' + (type && type !== 'SAMA' && type !== 'KEEP' ? siteBlock(pfx, type, site) : '') + '</div>';
}
function siteBlock(pfx, type, site){
  return '<p class="small b" style="margin:10px 0 6px">Lokasi infus</p>' + chips(pfx + 'S', siteOptsFor(type), site) +
    (type === 'TIDAK_YAKIN' ? '<p class="tiny muted" style="margin:0">Tidak yakin jenis aksesnya? Tidak apa-apa – konfirmasi dengan perawat saat kontrol.</p>' : '');
}
function bindAccess(root, pfx, st){
  bindChips(root, pfx + 'T', function(v){ st.type = v; st.site = ''; var box = root.querySelector('#' + pfx + 'SBox'); box.innerHTML = v === 'SAMA' || v === 'KEEP' ? '' : siteBlock(pfx, v, ''); bindChips(root, pfx + 'S', function(s){ st.site = s; }); });
  bindChips(root, pfx + 'S', function(s){ st.site = s; });
}
/* v3.16.2 (FN-02): tanggal "hari ini" mengikuti jam server (WIB), bukan jam HP yang mungkin salah */
function serverNow(){
  var t = S.home && S.home.serverTime; if (!t || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(t)) return new Date();
  var d = new Date(+t.slice(0,4), +t.slice(5,7) - 1, +t.slice(8,10), +t.slice(11,13), +t.slice(14,16), +(t.slice(17,19) || 0));
  return new Date(d.getTime() + Math.max(0, Date.now() - (S.homeAt || Date.now())));
}
function dateOpts(cur, unknownSel){
  var now = serverNow(), out = '', seen = false;
  for (var i = 0; i <= 30; i++){ var d = new Date(now.getTime() - i * 86400000), k = d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    if (k === cur) seen = true;
    out += '<option value="' + k + '"' + (k === cur && !unknownSel ? ' selected' : '') + '>' + (i === 0 ? 'Hari ini' : i === 1 ? 'Kemarin' : i + ' hari lalu') + ' – ' + DAYN[d.getDay()] + ', ' + d.getDate() + ' ' + MONTH[d.getMonth()] + '</option>'; }
  if (cur && !seen) out = '<option value="' + esc(cur) + '"' + (unknownSel ? '' : ' selected') + '>' + esc(fmtDate(cur)) + ' (tercatat)</option>' + out;
  return '<option value="__U"' + (unknownSel ? ' selected' : '') + '>Belum tahu tanggal pastinya</option>' + out;
}
function applySessReply(r){
  if (!r || !S.home) return;
  if (r.ctx) S.home.patient.ctx = r.ctx;
  if (r.sessions) S.home.sessions = r.sessions;
  var p = S.home.patient; p.chemoUnknown = !!r.chemoUnknown;
  if (r.chemoDate){ p.chemoDate = r.chemoDate; var t = serverNow(), today = new Date(t.getFullYear(), t.getMonth(), t.getDate()); p.dayIndex = Math.round((today - pd(r.chemoDate)) / 86400000); if (S.home.account) S.home.account.chemoDate = r.chemoDate; }
  if (r.ctx && S.home.account){ S.home.account.drugCodes = r.ctx.drugs.codes || []; }
  saveHome(); S.homeAt = 0;
}
/* Simpan sesi: menunggu server (data klinis divalidasi di server: tanggal, urutan sesi, kepemilikan). reqId mencegah data dobel. */
function saveSess(btn, fn, args, okMsg, done){
  if (btn.disabled) return;
  btn.disabled = true; var old = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> Menyimpan…';
  call.apply(null, [fn, S.token].concat(args)).then(function(r){ applySessReply(r); toast(okMsg); done(r); refreshHome(true); })
    .catch(function(e){ if (String(e.message).indexOf('AUTH:') === 0) return handleErr(e); btn.disabled = false; btn.innerHTML = old; toast('Belum tersimpan: ' + e.message, true); });
}
/* Formulir sesi kemoterapi: mode 'new' (sesi baru) | 'edit' (koreksi / lengkapi sesi yang ada) */

function showHome(){
  var h = S.home, p = h.patient, free = p.freeMode !== false;
  var total = Math.max(p.totalDays, 0) + 1, day = free ? Math.max(p.dayIndex, 0) + 1 : Math.min(Math.max(p.dayIndex, 0), total - 1) + 1;
  var msgs = h.messages || [], unread = unreadCount(), gate = p.reportGate || { waiting: false };
  var H = new Date().getHours(), salam = H < 11 ? 'Selamat pagi' : H < 15 ? 'Selamat siang' : H < 18 ? 'Selamat sore' : 'Selamat malam';
  var chemoD = pd(p.chemoDate), chemoTxt = p.chemoDate ? chemoD.getDate() + ' ' + MONTH[chemoD.getMonth()] : '-';
  var main;
  if (gate.waiting){
    var lr = (h.history || []).filter(function(x){ return x.id === gate.lastId; })[0] || h.history[0] || {};
    var lt = lr.time || gate.lastTime || '';
    main = '<div class="waitcard"><div class="hd"><span class="ib">' + icon('clock') + '</span><div><b>Laporan sedang ditinjau</b><span>Dikirim ' + (lt ? esc(DAYN[pd(lt).getDay()] + ', ' + fmtDate(lt) + ' · ' + String(lt).slice(11,16)) : '') + '</span></div></div>' +
      '<div class="vtrack"><div class="st done"><i>' + icon('check') + '</i>Laporan terkirim</div><div class="st cur"><i></i>Perawat meninjau ' + (lr.photos ? 'foto' : 'laporan') + ' Anda</div><div class="st"><i></i>Perawat membalas</div></div>' +
      '<div class="note">Balasan muncul di aplikasi ini. Perawat membalas dalam <b>' + replyTxt() + '</b>. Laporan baru bisa dikirim setelah perawat membalas.</div></div>' +
      '<div class="sos"><div class="t">' + icon('alert') + '<span><b>Makin parah sebelum dibalas?</b> Tidak perlu menunggu – telepon sekarang.</span></div>' + callButtons() + '<button class="all" id="bHelp">Semua nomor penting ›</button></div>';
  } else {
    main = '<div class="hero"><div class="d">' + icon('calendar','sm') + (free ? (p.chemoUnknown ? 'Sesi kemoterapi baru · tanggal belum diketahui' : 'Hari ke-' + day + ' setelah kemoterapi · ' + esc(chemoTxt)) : 'Hari ke-' + day + ' dari ' + total + ' hari pemantauan') + '</div>' +
      '<h2>Ada perubahan di bekas infus Anda?</h2><p>Nyeri, bengkak, merah, panas, atau lepuh – laporkan sekarang, kapan saja.</p>' +
      '<button class="go" id="bCheck">' + icon('clipcheck') + ' Mulai Pemeriksaan</button><small>3 langkah · ± 2 menit</small></div>' +
      '<div class="sos"><div class="t">' + icon('alert') + '<span><b>Lepuh, luka terbuka, atau nyeri hebat?</b> Jangan menunggu – telepon sekarang.</span></div>' + callButtons() + '<button class="all" id="bHelp">Semua nomor penting ›</button></div>';
  }
  var today = h.today[0] || h.next;
  var rows = [];
  if (gate.waiting) rows.push('<button class="rw" id="qAsk"><span class="ib aib">' + aiPic() + '</span><span class="grow"><b>Tanya NURSE.AI sambil menunggu</b><span class="s">Kompres, nyeri, perawatan kulit</span></span>' + icon('chevron','sm') + '</button>');
  if (msgs.length) rows.push('<button class="rw" id="bMsg"><span class="ib">' + icon('message') + '</span><span class="grow"><b>Pesan dari perawat' + (unread ? '<i class="pill">' + unread + ' baru</i>' : '') + '</b><span class="s">' + esc(msgs[0].message.length > 60 ? msgs[0].message.slice(0, 60) + '…' : msgs[0].message) + '</span></span>' + icon('chevron','sm') + '</button>');
  if (p.genderNeeded) rows.push('<button class="rw" id="bGen"><span class="dotw"></span><span class="grow"><b>Pilih sapaan: Bapak atau Ibu</b><span class="s">Agar sapaan di aplikasi sesuai</span></span>' + icon('chevron','sm') + '</button>');
  if (!gate.waiting) rows.push('<button class="rw" id="qAsk"><span class="ib aib">' + aiPic() + '</span><span class="grow"><b>Konsultasi NURSE.AI</b><span class="s">Langsung tanya – data perawatan Anda sudah terbaca</span></span>' + icon('chevron','sm') + '</button>');
  if (!free && today) rows.push('<button class="rw" id="bSched"><span class="ib">' + icon('clock') + '</span><span class="grow"><b>' + (h.today[0] ? 'Jadwal hari ini' : 'Jadwal berikutnya') + '</b><span class="s">' + esc(fmtDate(today.date)) + ' · ' + esc(today.start + ' – ' + today.end) + '</span></span>' + icon('chevron','sm') + '</button>');
  if (S.info.knowUrl) rows.push('<a class="rw" target="_blank" rel="noopener" href="' + esc(S.info.knowUrl) + '"><img class="k" src="' + ASSET.knowIcon + '" alt="KNOW"><span class="grow"><b>Daftar kontrol berikutnya</b><span class="s">Lewat KNOW RS Kariadi</span></span>' + icon('external','sm') + '</a>');
  tabView('home', '<div class="scr">' + miniHead() +
    '<div class="greet"><div class="s">' + salam + ',</div><h1>' + esc(sapa()) + ' ' + esc(p.firstName) + '</h1></div><div class="hgrid"><div class="hmain">' + main + '</div>' +
    '<div class="hside">' + (rows.length ? '<div class="rows">' + rows.join('') + '</div>' : '') + '</div></div></div>');
  on('bCheck', startCheck); on('bSched', showSchedule); on('bHelp', showHelp); on('bGen', function(){ editGender(showHome); });
  on('bMsg', showMessages); on('qAsk', function(){ showChat(showHome); }); /* v3.12.1: konteks hanya di Mulai Pemeriksaan */
}

/* Sapaan sesuai jenis kelamin */
function sapa(){ var p = S.home && S.home.patient; return (p && p.sapaan) || 'Bapak/Ibu'; }
function genderPick(id, v){ return '<div class="gpick" id="' + id + '"><button type="button" data-v="L" class="' + (v === 'L' ? 'on' : '') + '"><b>Bapak</b><span>Laki-laki</span></button><button type="button" data-v="P" class="' + (v === 'P' ? 'on' : '') + '"><b>Ibu</b><span>Perempuan</span></button></div>'; }
function bindGender(id, then, onDone){
  var r = $(id); if (!r) return;
  r.querySelectorAll('button').forEach(function(b){ b.onclick = function(){
    r.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x === b); });
    var g = b.dataset.v, sp = g === 'L' ? 'Bapak' : 'Ibu';
    optimistic(function(){ S.home.patient.gender = g; S.home.patient.sapaan = sp; S.home.patient.genderNeeded = false; if (S.home.account) S.home.account.gender = g; },
      function(){ return call('pUpdateGender', S.token, g); }, null, 'Terima kasih, ' + sp + '.');
    if (onDone) onDone(); (then || showHome)();
  }; });
}
function editGender(then){
  var o = sheet('<h2>Bagaimana kami menyapa Anda?</h2><p class="small muted" style="margin:4px 0 12px">Dipakai untuk sapaan di aplikasi dan pesan perawat.</p>' + genderPick('sG', (S.home.account || {}).gender));
  bindGender('sG', typeof then === 'function' ? then : showAccount, function(){ o.remove(); });
}

/* Pesan dari perawat */
function showMessages(){
  var m = S.home.messages || [];
  view(topbar('Pesan dari Perawat') + '<div class="scr">' + (m.length ? m.map(function(x){
    return '<div class="bubble"><div class="who"><span class="av' + (DRIVE_DEAD.nurse ? '' : ' pic') + '">' + drivePic('nurse', 'usercheck', 'sm') + '</span><b>Perawat ' + esc(S.info.unitName.split('–')[0].trim()) + '</b><span class="tiny muted">' + esc(fmtDT(x.time)) + '</span></div><p>' + esc(x.message) + '</p>' + (x.advice ? '<p class="small" style="margin:4px 0;padding:8px 10px;border-radius:10px;background:var(--teal-50)"><b>Anjuran:</b> ' + esc(x.advice) + '</p>' : '') +
      '<div class="tiny" style="color:' + (x.readAt ? 'var(--ok-700)' : 'var(--bad-700)') + ';font-weight:700;margin:4px 0">' + (x.readAt ? '✔ Sudah dibaca' : '● Belum dibaca') + '</div>' +
      '<button class="btn link small" data-rep="' + esc(x.reportId) + '">Lihat laporan ' + esc(x.reportId) + ' ' + icon('chevron','sm') + '</button></div>';
  }).join('') : '<div class="card center muted">' + icon('message','xl') + '<p>Belum ada pesan.</p></div>') +
    '<p class="tiny muted center">Pesan ini bukan layanan gawat darurat. Bila kondisi memberat, hubungi ruangan atau IGD.</p></div>');
  on('bBack', showHome);
  app.querySelectorAll('[data-rep]').forEach(function(b){ b.onclick = function(){ showReportDetail(b.dataset.rep, showMessages); }; });
  replyPopup();
}

/* Detail satu laporan (dari Riwayat/Beranda) */
function showReportDetail(id, back){
  var r = (S.home.history || []).filter(function(x){ return x.id === id; })[0];
  if (!r) return toast('Laporan tidak ditemukan.', true);
  var msgs = (S.home.messages || []).filter(function(m){ return m.reportId === id; });
  var steps = [['NEW','Terkirim'],['UNDER_REVIEW','Ditinjau'],['CONTACTED','Dihubungi'],['CLOSED','Selesai']];
  var order = { NEW: 0, UNDER_REVIEW: 1, CONTACTED: 2, FOLLOW_UP_COMPLETED: 2, CLOSED: 3 }, cur = order[r.nurseStatus] || 0;
  view(topbar('Laporan ' + r.id) + '<div class="scr">' +
    '<div class="status-card ' + esc(r.status) + '"><div class="small muted b">Status laporan</div><div class="status-pill">' + esc(STATUS_TXT[r.status] || r.status) + '</div><div class="small">' + esc(fmtDT(r.time)) + ' · ' + esc(r.condition) + (r.siteLabel ? ' · ' + esc(r.siteLabel) : '') + (r.photos ? ' · ' + r.photos + ' foto' : '') + '</div>' + (r.session ? '<div class="tiny muted" style="margin-top:4px">' + esc(r.session) + '</div>' : '') + '</div>' +
    '<div class="card"><h4>Tindak lanjut perawat</h4><div class="track">' + steps.map(function(s, i){ return '<div class="' + (i <= cur ? 'on' : '') + '"><i></i><span>' + s[1] + '</span></div>'; }).join('') + '</div><p class="small" style="margin:10px 0 0">' + esc(r.nurseLabel) + '</p></div>' +
    (r.careCode && S.home.content.care && S.home.content.care[r.careCode] ? careCard((function(c){ return { thermal: { 'CARE-COLD': 'COLD', 'CARE-WARM': 'WARM', 'CARE-NONE': 'NONE' }[r.careCode] || 'NURSE', title: c.title, message: c.message, steps: c.actions, safety: c.safety, drugs: r.careReason && r.careReason.indexOf('Obat: ') === 0 ? [r.careReason.slice(6)] : [] }; })(S.home.content.care[r.careCode]), true) : '') +
    (r.photoId ? '<div class="card"><h4>Foto yang Anda kirim</h4><div class="ph-one" id="phOne"><div class="spinner dark"></div></div></div>' : '') +
    (msgs.length ? msgs.map(function(x){ return '<div class="bubble"><div class="who"><span class="av' + (DRIVE_DEAD.nurse ? '' : ' pic') + '">' + drivePic('nurse', 'usercheck', 'sm') + '</span><b>Pesan perawat</b><span class="tiny muted">' + esc(fmtDT(x.time)) + '</span></div><p>' + esc(x.message) + '</p></div>'; }).join('') : '') +
    '<button class="btn soft block" id="bRAsk" style="margin-top:12px">' + aiPic('sm') + ' Tanya NURSE.AI tentang pemeriksaan ini</button>' +
    callButtons() + '</div>');
  on('bBack', back || function(){ showHistory(); });
  on('bRAsk', function(){ showChat(function(){ showReportDetail(id, back); }, null, id); });
  on('bTimer', function(){ compressTimer({ 'CARE-COLD': 'COLD', 'CARE-WARM': 'WARM' }[r.careCode]); });
  if (r.photoId && KS.photo(r.photoId)) $('phOne').innerHTML = '<img src="' + KS.photo(r.photoId) + '" alt="Foto laporan">';
  else if (r.photoId) call('pPhotoThumb', S.token, r.photoId).then(function(u){ KS.photo(r.photoId, u); var e = $('phOne'); if (e) e.innerHTML = '<img src="' + u + '" alt="Foto laporan">'; }).catch(function(){ var e = $('phOne'); if (e) e.innerHTML = '<span class="small muted">Foto tidak dapat dimuat.</span>'; });
}

/* Tanya-jawab */
function showFaq(back){
  var f = (S.home && S.home.content.faq) || [];
  view(topbar('Tanya-jawab') + '<div class="scr"><p class="small muted">Pertanyaan yang sering diajukan pasien dan keluarga.</p>' +
    (f.length ? f.map(function(x, i){ return '<details class="faq"' + (i ? '' : ' open') + '><summary>' + esc(x.title) + '<span class="chev">' + icon('chevron','sm') + '</span></summary><p>' + esc(x.message) + '</p></details>'; }).join('') : '<div class="card muted">Belum ada tanya-jawab.</div>') +
    '<div class="card center" style="margin-top:14px"><div class="small muted">Masih ada pertanyaan?</div><button class="btn soft block" id="fCall" style="margin-top:8px">' + icon('phone','sm') + ' Hubungi perawat</button></div></div>');
  on('bBack', typeof back === 'function' ? back : showHome); on('fCall', showHelp);
}

/* Akun & Pengaturan */
function showAccount(){
  var a = S.home.account || {}, p = S.home.patient, i = S.info;
  function kv(k, v){ return '<div class="kv"><span>' + k + '</span><b>' + esc(v || '–') + '</b></div>'; }
  tabView('akun', '<div class="scr"><h1 class="sr-only">Akun</h1>' + kemenkes() +
    '<div class="profile"><button class="avbtn" id="aAv" aria-label="Ubah foto profil">' + avatarHtml('big') + '<span class="cam">' + icon('camera','sm') + '</span></button><div class="grow"><h2>' + esc(a.name || (sapa() + ' ' + p.firstName)) + '</h2><div class="small muted">RM ' + esc(a.rm || '-') + ' · lahir ' + esc(a.dob ? fmtDate(a.dob) : '-') + '</div></div></div>' +
    '<h3 class="sec">Data diri</h3><div class="card">' + kv('Nama', a.name) + '<div class="kv"><span>Jenis kelamin</span><b>' + (a.gender === 'L' ? 'Laki-laki' : a.gender === 'P' ? 'Perempuan' : '–') + ' <button class="linkbtn" id="aGender">Ubah</button></b></div>' + kv('No. RM', a.rm) + kv('Tanggal lahir', a.dob ? fmtDate(a.dob) : '') + kv('Terdaftar melalui', a.regSource === 'MANDIRI' ? 'Daftar mandiri' : 'Perawat') +
      '<p class="tiny muted" style="margin:8px 0 0">Nama, No. RM, atau tanggal lahir salah? Hubungi perawat untuk memperbaiki.</p></div>' +
    '<h3 class="sec">Kontak</h3><div class="card">' + kv('No. HP / WhatsApp', a.phone) + kv('Keluarga', [a.caregiverName, a.caregiverPhone].filter(Boolean).join(' · ')) +
      '<button class="btn soft block" id="aEdit" style="margin-top:10px">' + icon('sliders','sm') + ' Ubah No. HP & kontak keluarga</button></div>' +
    '<h3 class="sec">Persetujuan & edukasi</h3><div class="card">' + kv('Persetujuan diberikan', a.consentAt ? fmtDT(a.consentAt) : 'Belum') + kv('Edukasi dibaca', a.educationAt ? fmtDT(a.educationAt) : 'Belum') +
      '<div class="row" style="margin-top:10px;flex-wrap:nowrap"><button class="btn ghost sm grow" id="aCons">' + icon('shield','sm') + ' Lihat persetujuan</button><button class="btn ghost sm grow" id="aEdu">' + icon('book','sm') + ' Baca edukasi</button></div></div>' +
    '<h3 class="sec">Lainnya</h3><div class="menu-list">' +
      '<button class="mi" id="aHome"><span class="ib aib">' + menuPic('install') + '</span>Pasang di layar utama HP<span class="chev">' + icon('chevron','sm') + '</span></button>' +
      '<button class="mi" id="aAsk"><span class="ib aib">' + aiPic() + '</span>KASUARI NURSE.AI<span class="chev">' + icon('chevron','sm') + '</span></button>' +
      (S.info.knowUrl ? '<a class="mi" target="_blank" rel="noopener" href="' + esc(S.info.knowUrl) + '"><span class="ib" style="background:none;padding:0"><img class="kicon" src="' + ASSET.knowIcon + '" alt="KNOW"></span>Pendaftaran online (KNOW RS Kariadi)<span class="chev">' + icon('external','sm') + '</span></a>' : '') +
      '<button class="mi" id="aFaq"><span class="ib aib">' + menuPic('faq') + '</span>Tanya-jawab<span class="chev">' + icon('chevron','sm') + '</span></button>' +
      (p.freeMode === false ? '<button class="mi" id="aSched"><span class="ib">' + icon('calendar') + '</span>Jadwal pemantauan<span class="chev">' + icon('chevron','sm') + '</span></button>' : '') +
      '<button class="mi" id="aCall"><span class="ib aib">' + menuPic('call') + '</span>Nomor telepon penting<span class="chev">' + icon('chevron','sm') + '</span></button></div>' +
    '<button class="btn block logout" id="aOut">' + icon('logout','sm') + ' Keluar dari aplikasi</button>' +
    '<p class="tiny muted center" style="margin-top:12px">' + esc(i.fullName) + ' · v' + esc(i.version) + '<br>' + esc(i.unitName) + '</p></div>');
  on('aAv', profilePhotoSheet); on('aEdit', editContact); on('aGender', editGender); on('aCons', showConsentText); on('aEdu', showEduHome); on('aHome', showInstall);
  on('aAsk', function(){ showChat(showAccount); }); on('aFaq', function(){ showFaq(showAccount); }); on('aSched', showSchedule); on('aCall', showHelp); on('aOut', confirmLogout);
}
function editContact(){
  var a = S.home.account || {};
  var o = sheet('<h2>Ubah kontak</h2><p class="small muted" style="margin:4px 0 6px">Nomor ini dipakai perawat untuk menghubungi Anda.</p>' +
    '<label class="lbl" for="cPh">No. HP / WhatsApp</label><input type="tel" id="cPh" inputmode="tel" value="' + esc(a.phone) + '">' +
    '<label class="lbl" for="cCg">Nama keluarga (opsional)</label><input type="text" id="cCg" value="' + esc(a.caregiverName) + '" placeholder="mis. Rina (anak)">' +
    '<label class="lbl" for="cCgP">No. HP keluarga (opsional)</label><input type="tel" id="cCgP" inputmode="tel" value="' + esc(a.caregiverPhone) + '">' +
    '<div class="row" style="margin-top:16px;flex-wrap:nowrap"><button class="btn ghost grow" id="cNo">Batal</button><button class="btn grow" id="cYes">' + icon('check','sm') + ' Simpan</button></div>');
  o.querySelector('#cNo').onclick = function(){ o.remove(); };
  o.querySelector('#cYes').onclick = function(){
    var f = { PHONE: $('cPh').value.replace(/[^\d+]/g, ''), CAREGIVER_NAME: $('cCg').value.trim(), CAREGIVER_PHONE: $('cCgP').value.replace(/[^\d+]/g, '') };
    if (f.PHONE.replace(/\D/g, '').length < 9) return toast('No. HP/WhatsApp belum benar.', true);
    if (f.CAREGIVER_PHONE && f.CAREGIVER_PHONE.replace(/\D/g, '').length < 9) return toast('No. HP keluarga belum benar.', true);
    o.remove();
    optimistic(function(){ var ac = S.home.account || (S.home.account = {}); ac.phone = f.PHONE; ac.caregiverName = f.CAREGIVER_NAME; ac.caregiverPhone = f.CAREGIVER_PHONE; },
      function(){ return call('pUpdateContact', S.token, f); }, null, 'Kontak diperbarui.');
    showAccount(); };
}
function showConsentText(){
  var c = S.home.content.consent, a = S.home.account || {};
  sheet('<div class="sheet-ic">' + icon('shield','lg') + '</div><h2 class="center">' + esc(c ? c.title : 'Persetujuan') + '</h2><p class="small" style="color:var(--ink-2);margin:10px 0">' + esc(c ? c.message : '') + '</p>' +
    '<div class="alert info">' + icon('checkc') + '<div>Disetujui pada ' + esc(a.consentAt ? fmtDT(a.consentAt) : '–') + '</div></div>');
}
function showInstall(){
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  function steps(list){ return '<ol class="steps">' + list.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ol>'; }
  var and = steps(['Buka aplikasi ini di <b>Google Chrome</b>.', 'Ketuk tombol <b>⋮</b> (titik tiga) di kanan atas.', 'Pilih <b>Tambahkan ke layar utama</b> / <b>Add to Home screen</b>.', 'Ketuk <b>Tambahkan</b>. Ikon aplikasi muncul di layar utama HP.']);
  var iph = steps(['Buka aplikasi ini di <b>Safari</b>.', 'Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas) di bawah layar.', 'Gulir lalu pilih <b>Tambah ke Layar Utama</b>.', 'Ketuk <b>Tambah</b> di kanan atas.']);
  view(topbar('Pasang di Layar Utama') + '<div class="scr"><div class="card center"><div class="sheet-ic">' + icon('grid','lg') + '</div><h2>Buka lebih cepat</h2><p class="small muted">Pasang ikon aplikasi di layar utama HP agar tidak perlu mencari tautan lagi.</p></div>' +
    '<div class="seg" style="margin:14px 0 10px"><button id="tA" class="' + (ios ? '' : 'on') + '">Android</button><button id="tI" class="' + (ios ? 'on' : '') + '">iPhone</button></div><div class="card" id="stp">' + (ios ? iph : and) + '</div>' +
    '<p class="tiny muted center">Setelah dipasang, buka lewat ikon tersebut. Anda tetap masuk selama belum menekan Keluar.</p></div>');
  on('bBack', showAccount);
  on('tA', function(){ $('stp').innerHTML = and; $('tA').classList.add('on'); $('tI').classList.remove('on'); });
  on('tI', function(){ $('stp').innerHTML = iph; $('tI').classList.add('on'); $('tA').classList.remove('on'); });
}


/* Edukasi awal ekstravasasi (wajib dibaca sebelum laporan pertama) */
function eduArt(){
  return '<svg viewBox="0 0 320 170" width="100%" role="img" aria-label="Ilustrasi obat keluar dari pembuluh darah ke jaringan">' +
    '<rect x="0" y="0" width="320" height="170" rx="16" fill="#FBEFE7"/>' +
    '<rect x="0" y="0" width="320" height="34" rx="16" fill="#F3D5C2"/><rect x="0" y="18" width="320" height="16" fill="#F3D5C2"/>' +
    '<text x="12" y="23" font-size="11" fill="#8A5A44" font-weight="700">Kulit</text>' +
    '<rect x="0" y="92" width="320" height="34" fill="#E9A0A0"/><rect x="0" y="92" width="320" height="34" fill="url(#vg)"/>' +
    '<defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D96C6C" stop-opacity=".35"/><stop offset="1" stop-color="#B84A4A" stop-opacity=".25"/></linearGradient></defs>' +
    '<text x="12" y="146" font-size="11" fill="#9E3A3A" font-weight="700">Pembuluh darah (vena)</text>' +
    '<g fill="#7B5CC4"><circle cx="210" cy="104" r="4"/><circle cx="238" cy="112" r="4"/><circle cx="262" cy="103" r="4"/><circle cx="290" cy="114" r="4"/></g>' +
    '<line x1="70" y1="0" x2="168" y2="98" stroke="#5B6B7F" stroke-width="7" stroke-linecap="round"/><line x1="70" y1="0" x2="168" y2="98" stroke="#C9D5DF" stroke-width="3" stroke-linecap="round"/>' +
    '<g fill="#7B5CC4" opacity=".85"><circle cx="150" cy="70" r="5"/><circle cx="133" cy="58" r="4"/><circle cx="160" cy="54" r="4.5"/><circle cx="178" cy="68" r="4"/><circle cx="145" cy="44" r="3.5"/><circle cx="172" cy="46" r="3"/></g>' +
    '<path d="M186 58 C 205 50, 215 48, 232 50" fill="none" stroke="#533A94" stroke-width="1.5" stroke-dasharray="3 3"/>' +
    '<text x="238" y="48" font-size="10.5" fill="#533A94" font-weight="800">Obat keluar</text><text x="238" y="62" font-size="10.5" fill="#533A94" font-weight="800">ke jaringan</text>' +
    '<text x="232" y="160" font-size="10" fill="#533A94"><tspan>● obat kemoterapi</tspan></text></svg>';
}

/* Halaman edukasi ekstravasasi – tampil sebelum masuk (pre), sesudah masuk bila belum dibaca (post), atau dari menu (review) */
var SIGN_ICON = [['nyeri','bolt'],['panas','flame'],['bengkak','swell'],['merah','drop'],['semut','tingle'],['warna','palette'],['lepuh','bubble']];
function signIcon(t){ t = String(t).toLowerCase(); for (var i = 0; i < SIGN_ICON.length; i++) if (t.indexOf(SIGN_ICON[i][0]) >= 0) return SIGN_ICON[i][1]; return 'alert'; }
/* v3.4: foto contoh edukasi dimuat terpisah (tidak memperlambat pembukaan pertama) */
var EDU_PH_P = null;
function eduPhotos(){
  if (window.EDU_PHOTOS) return Promise.resolve(window.EDU_PHOTOS);
  if (EDU_PH_P) return EDU_PH_P;
  try { var c = sessionStorage.getItem('ks_eduph'); if (c){ window.EDU_PHOTOS = JSON.parse(c); return Promise.resolve(window.EDU_PHOTOS); } } catch (e) {}
  EDU_PH_P = call('pEduPhotos').then(function(a){ window.EDU_PHOTOS = Array.isArray(a) ? a : []; try { sessionStorage.setItem('ks_eduph', JSON.stringify(window.EDU_PHOTOS)); } catch (e) {} return window.EDU_PHOTOS; })
    .catch(function(){ EDU_PH_P = null; return []; });
  return EDU_PH_P;
}
/* v3.7: infografis edukasi (anatomi, tanda, perkembangan) dimuat terpisah */
var EDU_INFO_P = null;
function eduInfo(){
  if (window.EDU_INFO) return Promise.resolve(window.EDU_INFO);
  if (EDU_INFO_P) return EDU_INFO_P;
  try { var c = sessionStorage.getItem('ks_eduinfo'); if (c){ window.EDU_INFO = JSON.parse(c); return Promise.resolve(window.EDU_INFO); } } catch (e) {}
  EDU_INFO_P = call('pEduInfo').then(function(o){ window.EDU_INFO = (o && typeof o === 'object') ? o : {}; try { sessionStorage.setItem('ks_eduinfo', JSON.stringify(window.EDU_INFO)); } catch (e) {} return window.EDU_INFO; })
    .catch(function(){ EDU_INFO_P = null; return {}; });
  return EDU_INFO_P;
}
function infImg(src, alt){ return '<button type="button" class="infimg" aria-label="Perbesar gambar: ' + esc(alt) + '"><img src="' + src + '" alt="' + esc(alt) + '" loading="lazy"></button><p class="infhint">' + icon('search','sm') + ' Ketuk gambar untuk memperbesar</p>'; }
function showEduPage(mode, msg, anchor){
  var seq = S.eduSeq = (S.eduSeq || 0) + 1;
  var rer = function(){ if (S.eduSeq === seq && app.querySelector('.edu-page')) KS.keepScroll(function(){ showEduPage(mode, msg); }); };
  if (!window.EDU_PHOTOS) eduPhotos().then(function(a){ if (a && a.length) rer(); });
  if (!window.EDU_INFO) eduInfo().then(function(o){ if (o && (o.anatomi || o.tanda || o.kembang)) rer(); });
  var EI = window.EDU_INFO || {};
  var ed = (mode === 'pre' ? S.info.education : (S.home && S.home.content.eduSlides)) || S.info.education || [];
  if (!ed.length){ return mode === 'pre' ? showLogin(msg || '') : mode === 'review' ? showEduHome() : afterEdu(); }
  var by = {}; ed.forEach(function(x){ by[x.code] = x; });
  var intro = by['EDU-01'], signs = by['EDU-02'], grow = by['EDU-03'], act = by['EDU-04'];
  var rest = ed.filter(function(x){ return ['EDU-01','EDU-02','EDU-03','EDU-04'].indexOf(x.code) < 0; });
  var photos = window.EDU_PHOTOS || [];
  var html = '<div class="edu-page">' +
    '<div class="edu-hero"' + (window.EDU_HERO ? ' style="background-image:url(' + EDU_HERO + ')"' : '') + ' role="img" aria-label="Gedung RSUP Dr. Kariadi Semarang">' + (false ? '' : '<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><img src="' + ASSET.kemenkes + '" alt="Kemenkes RS Kariadi" class="lg-k"><img src="' + ASSET.kasuari + '" alt="Kasuari Lantai 3" class="lg-k"></div>') +
      '<div class="spacer"></div><span class="eyebrow">' + icon('stetho','sm') + ' EDUKASI EKSTRAVASASI</span>' +
      '<h1>' + esc(intro ? intro.title : 'Apa itu ekstravasasi?') + '</h1><div class="for">KASUARI SIGAP</div></div>' +
    (intro ? '<section class="ecard">' + (EI.anatomi ? infImg(EI.anatomi, 'Ilustrasi: kateter infus berada di dalam pembuluh darah; obat kemoterapi keluar ke jaringan sekitar (ekstravasasi).') : eduArt()) + '<p class="lead">' + esc(intro.message) + '</p>' + (intro.actions && intro.actions.length ? '<ul class="todo">' + intro.actions.map(function(a){ return '<li>' + icon('checkc','sm') + '<span>' + esc(a) + '</span></li>'; }).join('') + '</ul>' : '') + '</section>' : '') +
    (signs && EI.tanda ? '<section class="ecard infsec" id="eduSigns"><h2 class="sr-only">' + esc(signs.title) + '</h2>' + infImg(EI.tanda, esc(signs.title) + ': ' + (signs.actions || []).join(', ')) + '</section>' : '') +
    (signs && !EI.tanda ? '<section class="ecard" id="eduSigns"><h2>' + esc(signs.title) + '</h2><p class="esub">' + esc(signs.message) + '</p><div class="signs">' +
      (signs.actions || []).map(function(a){ return '<div class="sign"><span class="si">' + icon(signIcon(a)) + '</span><span>' + esc(a) + '</span></div>'; }).join('') + '</div></section>' : '') +
    (photos.length ? '<section class="ecard flush"><div class="pad"><h2>Contoh foto ekstravasasi</h2><p class="esub">Foto berikut menampilkan luka. Ketuk foto untuk melihatnya.</p></div><div class="gal" id="gal">' +
      photos.map(function(p, i){ return '<figure class="gp"><button class="gimg" data-i="' + i + '" aria-label="Tampilkan foto contoh ' + (i + 1) + '"><img src="' + p.src + '" alt="Contoh ekstravasasi ' + (i + 1) + '" style="object-position:' + esc(p.pos || 'center') + '"><span class="veil">' + icon('eye') + '<b>Foto luka</b><small>Ketuk untuk melihat</small></span></button>' +
        '<figcaption><span class="badge b-REVIEW">' + esc(p.tag || ('Contoh ' + (i + 1))) + '</span><span>' + esc(p.caption) + '</span>' + (p.source ? '<small>Sumber: ' + esc(p.source) + '</small>' : '') + '</figcaption></figure>'; }).join('') +
      '</div><div class="pad"><div class="gdots">' + photos.map(function(_, i){ return '<i class="' + (i ? '' : 'on') + '"></i>'; }).join('') + '</div><p class="tiny muted" style="margin:8px 0 0">Tampilan bisa berbeda pada setiap orang. Jangan menilai sendiri – laporkan setiap perubahan melalui aplikasi.</p></div></section>' : '') +
    (grow ? '<section class="ecard' + (EI.kembang ? ' infsec' : '') + '"><h2' + (EI.kembang ? ' class="sr-only"' : '') + '>' + esc(grow.title) + '</h2>' + (EI.kembang ? infImg(EI.kembang, 'Tanda bisa berkembang: awal tampak ringan; beberapa hari kemudian dapat berkembang (lebih merah, bengkak, panas); pantau setelah pulang (kemerahan meluas, perubahan warna, lepuh).') : '<div class="prog"><div class="bar"></div><div class="st"><i></i><b>Awal</b><span>Tampak ringan</span></div><div class="st"><i></i><b>Beberapa hari</b><span>Dapat berkembang</span></div><div class="st"><i></i><b>Pantau</b><span>Setelah pulang</span></div></div>') + '<p class="lead" style="margin-top:14px">' + esc(grow.message) + '</p></section>' : '') +
    (act ? '<section class="ecard navy"><div class="ai">' + icon('clipcheck','lg') + '</div><h2>' + esc(act.title) + '</h2><p>' + esc(act.message) + '</p>' + (act.safety ? '<div class="hot">' + icon('alert','sm') + '<b>' + esc(act.safety) + '</b></div>' : '') + '</section>' : '') +
    rest.map(function(x){ return '<section class="ecard"><h2>' + esc(x.title) + '</h2><p class="lead">' + esc(x.message) + '</p>' + (x.actions && x.actions.length ? '<ul class="todo">' + x.actions.map(function(a){ return '<li>' + icon('checkc','sm') + '<span>' + esc(a) + '</span></li>'; }).join('') + '</ul>' : '') + '</section>'; }).join('') +
    (false ? '<button class="card faqlink" id="eFaq0"><span class="ib">' + icon('info') + '</span><span class="grow"><b>Tanya-jawab</b><span class="small muted">Pertanyaan yang sering diajukan</span></span>' + icon('chevron','sm') + '</button>' : '') +
    '<p class="motto">“' + esc(S.info.tagline.replace(/\.$/, '')) + '.”</p><p class="tiny muted center" style="margin:0 12px">Informasi umum ini tidak menggantikan penjelasan dokter/perawat Anda.</p></div>' +
    (mode === 'review' ? '' : '<div class="sticky"><div class="in"><button class="btn block lg cta" id="eGo">MULAI PEMANTAUAN ' + icon('chevron','sm') + '</button></div></div>');
  setTimeout(heroHd, 0); /* v3.2: foto gedung tajam untuk kepala halaman edukasi */
  if (mode === 'review'){ tabView('edu', topbar('Edukasi') + html); on('bBack', showEduHome); if (anchor){ var an = $(anchor); if (an) setTimeout(function(){ an.scrollIntoView({ block: 'start' }); }, 60); } } else view(html);
  app.querySelectorAll('.infimg').forEach(function(b){ b.onclick = function(){ zoomImg(b.querySelector('img').src); }; });
  app.querySelectorAll('.gimg').forEach(function(b){ b.onclick = function(){ if (b.classList.contains('open')) zoomImg(b.querySelector('img').src); else b.classList.add('open'); }; });
  var gal = $('gal'); if (gal) gal.onscroll = function(){ var i = Math.round(gal.scrollLeft / (gal.firstChild.offsetWidth + 12)); app.querySelectorAll('.gdots i').forEach(function(d, k){ d.classList.toggle('on', k === i); }); };
  on('eGo', function(){
    if (mode === 'review') return showEduHome();
    S.eduSeen = true; store('pw_edu', '1');
    if (mode === 'pre') return S.token ? loadHome() : showLogin(msg || '');
    var b = this; b.disabled = true; b.innerHTML = '<div class="spinner"></div>';
    call('pEducationDone', S.token).then(afterEdu).catch(function(e){ b.disabled = false; b.textContent = 'MULAI PEMANTAUAN'; handleErr(e); });
  });
}
function afterEdu(){ if (S.home){ S.home.patient.eduNeeded = false; if (S.home.patient.consentNeeded) return showConsent(); } showHome(); }
function zoomImg(src){ var z = document.createElement('div'); z.className = 'zoomp'; z.innerHTML = '<img src="' + src + '" alt=""><button class="x" aria-label="Tutup">' + icon('x') + '</button>'; z.onclick = function(){ z.remove(); }; document.body.appendChild(z); }

/* Jadwal */
function showSchedule(){
  var t = S.home.tasks;
  view(topbar('Jadwal Pemantauan') + '<div class="scr"><p class="small muted">Pemantauan sampai ' + esc(fmtDate(S.home.patient.monitoringEnd)) + '. Anda tetap boleh melapor kapan saja bila ada perubahan.</p><div class="card">' +
    (t.length ? t.map(function(x){
      var d = pd(x.date), st = x.status === 'COMPLETED' || x.status === 'RESOLVED' ? 'b-MONITOR' : x.status === 'OPEN' ? 'b-TEAL' : ['REMINDER_DUE','REMINDED','NO_RESPONSE'].indexOf(x.status) >= 0 ? 'b-REVIEW' : 'b-GREY';
      return '<div class="tl-task"><div class="d"><span>' + DAYN[d.getDay()] + '</span><b>' + d.getDate() + '</b><span>' + MONTH[d.getMonth()] + '</span></div><div class="grow"><div class="b">' + esc(x.name.replace('[DUMMY] ','')) + '</div><div class="small muted">' + esc(x.start + ' – ' + x.end) + '</div></div><span class="badge ' + st + '">' + esc(x.label) + '</span></div>';
    }).join('') : '<p class="muted">Belum ada jadwal.</p>') + '</div></div>');
  on('bBack', showHome);
}

/* Edukasi */
function eduRow(id, ic, tone, t, s){ var pk = EDU_PIC[id] || (id.indexOf('eT_') === 0 ? id.slice(3) : ''), pic = pk && ICON_SPR.edu.k.indexOf(pk) >= 0;
  return '<button class="rw" id="' + id + '"><span class="ib ' + (pic ? 'aib epic' : tone) + '">' + (pic ? sprImg('edu', pk, 'aipic', ic) : icon(ic)) + '</span><span class="grow"><b>' + esc(t) + '</b><span class="s">' + esc(s) + '</span></span>' + icon('chevron','sm') + '</button>'; }
function showEduHome(){
  var A = eduRow('eSigns', 'eye', 'warn', 'Tanda yang perlu diperhatikan', 'dengan foto contoh · 2 menit') + eduRow('eComp', 'snow', 'blue', 'Kompres dingin atau hangat?', 'tergantung obat · 2 menit') +
    eduTopicRows('A').replace(/(<button class="rw" id="eT_port")/, eduRow('eSkin', 'shield', '', 'Merawat kulit bekas infus', '1 menit') + '$1');
  var C = eduTopicRows('C') + eduRow('eIgd', 'alert', 'red', 'Kapan harus ke IGD', '1 menit');
  var n = 5 + EDU_TOPICS.length;
  tabView('edu', '<div class="scr"><h1 style="margin:6px 0 4px">Edukasi</h1><p class="muted" style="margin:0 0 14px">' + n + ' bacaan singkat untuk pasien kemoterapi dan keluarga.</p>' +
    '<div class="etop' + (videoCardHtml('eVideo') ? '' : ' one') + '"><button class="feat" id="eIntro"><span class="tg">MULAI DARI SINI · 1 menit</span><b>Apa itu ekstravasasi?</b><span class="s">Obat kemo yang merembes keluar dari pembuluh darah ke kulit sekitar infus. Makin cepat dikenali, makin mudah ditangani.</span></button>' +
    (videoCardHtml('eVideo') ? '<div class="evid"><div class="grp-h"><i>▶</i>Video</div><div style="margin-top:8px">' + videoCardHtml('eVideo') + '</div></div>' : '') + '</div><div class="egrid">' +
    '<div class="egrp"><div class="grp-h"><i>A</i>' + esc(EDU_GROUPS[0][1]) + '</div><div class="rows">' + A + '</div></div>' +
    '<div class="egrp"><div class="grp-h"><i>B</i>' + esc(EDU_GROUPS[1][1]) + '</div><div class="rows">' + eduTopicRows('B') + '</div></div>' +
    '<div class="egrp"><div class="grp-h"><i>C</i>' + esc(EDU_GROUPS[2][1]) + '</div><div class="rows">' + C + '</div></div></div>' +
    '<div class="rows">' + eduRow('eFaq', 'info', 'grey', 'Tanya jawab (FAQ)', 'pertanyaan yang sering diajukan') + '</div></div>');
  on('eIntro', function(){ showEduPage('review'); }); on('eSigns', function(){ showEduPage('review', '', 'eduSigns'); });
  on('eComp', showCompressInfo); on('eSkin', showSkinCare); on('eIgd', showIgdInfo); on('eFaq', function(){ showFaq(showEduHome); });
  bindEduTopics(showEduHome); on('eVideo', function(){ showVideo(showEduHome); });
}
function showCompressInfo(){
  var care = (S.home.content && S.home.content.care) || {}, drugs = (S.home.account && S.home.account.drugs) || [];
  var mine = drugs.length ? drugs.map(function(d){ return esc(d.name) + ' → ' + ({ COLD: 'kompres dingin', WARM: 'kompres hangat', NONE: 'tanpa kompres khusus', NURSE: 'tanya perawat' }[d.thermal] || 'tanya perawat'); }).join('<br>') : '';
  view(topbar('Kompres dingin atau hangat?') + '<div class="scr"><div class="tp-art" style="margin-bottom:12px">' + eduArtImg('compress') + '</div><div class="note" style="margin-bottom:12px">Jenis kompres <b>mengikuti obat kemoterapi</b>, bukan kebiasaan. Kompres yang salah bisa memperberat kerusakan kulit.</div>' +
    (mine ? '<div class="card"><h4>Obat ' + esc(sapa()) + '</h4><p class="small" style="margin:6px 0 0">' + mine + '</p></div>' : '<div class="card"><h4>Obat belum diisi</h4><p class="small muted" style="margin:6px 0 10px">Lengkapi nama obat agar aplikasi dapat menunjukkan kompres yang tepat.</p><button class="btn soft block" id="ciDrug">' + icon('clipcheck','sm') + ' Isi obat kemoterapi</button></div>') +
    ['CARE-COLD', 'CARE-WARM'].map(function(k){ var c = care[k]; if (!c) return ''; return careCard({ thermal: k === 'CARE-COLD' ? 'COLD' : 'WARM', title: c.title, steps: c.actions, message: c.message }, false); }).join('') + '</div>');
  on('bBack', showEduHome); on('ciDrug', function(){ editDrugs(showCompressInfo); });
}
function showSkinCare(){
  view(topbar('Merawat kulit bekas infus') + '<div class="scr"><div class="tp-art" style="margin-bottom:12px">' + eduArtImg('skin') + '</div><div class="card"><ul class="plain">' +
    ['Jaga area bekas infus tetap bersih dan kering', 'Jangan memijat, menggaruk, atau menekan area tersebut', 'Jangan mengoleskan salep, minyak, atau ramuan tanpa arahan perawat/dokter', 'Pakai baju berlengan longgar agar area tidak tertekan', 'Saat istirahat, tinggikan tangan di atas bantal', 'Lihat dan foto area bekas infus setiap hari untuk membandingkan'].map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') +
    '</ul></div>' + redFlagsHtml('Segera hubungi perawat / ke IGD bila muncul') + '</div>');
  on('bBack', showEduHome);
}
function showIgdInfo(){
  var sf = S.home.content && S.home.content.safety;
  view(topbar('Kapan harus ke IGD') + '<div class="scr"><div class="tp-art">' + eduArtImg('igd') + '</div>' + redFlagsHtml('Bekas infus: langsung ke IGD bila muncul') +
    '<div class="tp-igd"><div class="t">' + icon('alert','sm') + 'Efek samping kemo: juga segera ke IGD bila</div><ul>' + ['Demam 38 °C atau lebih, atau menggigil', 'Sesak napas atau nyeri dada', 'Muntah atau diare terus-menerus, tidak bisa minum', 'Tinja berdarah/hitam, atau muntah darah', 'Perdarahan yang tidak berhenti (mimisan, gusi) atau lebam banyak', 'Lengan, leher, atau wajah bengkak di sisi port/PICC', 'Sangat lemas, bingung, atau pingsan'].map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
    (sf ? '<div class="card" style="margin-top:14px"><p class="small" style="margin:0">' + esc(sf.message + ' ' + (sf.safety || '')) + '</p></div>' : '') +
    '<div class="card" style="margin-top:14px"><h4>Hubungi sekarang</h4>' + callButtons() + '</div></div>');
  on('bBack', showEduHome);
}

/* Hubungi perawat */
function showHelp(){
  var i = S.info, igd = i.igdPhone || i.unitPhone;
  view(topbar('Hubungi') + '<div class="scr">' +
    '<div class="sosc"><div class="k">GAWAT DARURAT</div><p>Lepuh, luka terbuka, nyeri hebat, sesak, atau demam tinggi.</p>' + (igd ? '<a class="b" href="' + tel(igd) + '">' + icon('phone') + ' Telepon ' + esc(igd) + '</a>' : '') + '<small>Atau langsung datang ke IGD RSUP Dr. Kariadi.</small></div>' +
    '<h3 class="sec">Pertanyaan & konsultasi</h3><div class="contacts">' +
      contactRow('img:nurse', 'Perawat ' + (i.unitName || 'ruangan').split('–')[0].trim(), i.unitPhone, 'tel') +
      (String(i.rsPhone).replace(/\D/g, '') !== String(i.unitPhone).replace(/\D/g, '') ? contactRow('img:center', 'RSUP Dr. Kariadi (operator)', i.rsPhone, 'tel') : '') +
      contactRow('img:center', 'Contact Center', i.callCenter, 'tel') +
      contactRow('img:wa', 'WhatsApp layanan pasien', i.csWa, 'wa') +
      (i.unitWa ? contactRow('img:wa', 'WhatsApp ruangan', i.unitWa, 'wa') : '') +
      contactRow('calendar', 'Pendaftaran online · jadwal dokter', 'KNOW RS Kariadi', 'link', '', i.knowUrl) +
    '</div>' +
    '<div class="card" style="margin-top:12px"><div class="row" style="flex-wrap:nowrap;align-items:flex-start">' + icon('info') + '<div class="small"><b style="color:var(--navy)">' + esc(i.hospital) + '</b><br>' + esc(i.rsAddress || i.unitName) + (i.serviceHours ? '<br><span class="muted">Jam pemantauan: ' + esc(i.serviceHours) + '</span>' : '') + '</div></div>' +
      (i.rsAddress ? '<div class="mapbox"><iframe title="Peta lokasi RSUP Dr. Kariadi Semarang" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen src="https://www.google.com/maps?q=' + encodeURIComponent('RSUP Dr. Kariadi Semarang, ' + i.rsAddress) + '&z=16&output=embed"></iframe></div>' +
        '<a class="btn soft block" style="margin-top:10px" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('RSUP Dr. Kariadi Semarang') + '">' + icon('external','sm') + ' Petunjuk arah (Google Maps)</a>' : '') + '</div>' +
    '</div>');
  on('bBack', S.home ? showHome : showLanding);
}
function contactRow(ic, label, num, kind, tone, url){
  if (!num || (kind === 'link' && !url)) return '';
  var href = kind === 'link' ? url : kind === 'wa' ? 'https://wa.me/' + String(num).replace(/\D/g, '').replace(/^0/, '62') : tel(num);
  var shown = kind === 'wa' ? String(num).replace(/^62/, '0').replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3') : num;
  var go = kind === 'wa' ? '<span class="go wa">Chat</span>' : kind === 'link' ? '<span class="go lk">Buka</span>' : '<span class="go">Telepon</span>';
  return '<a class="crow' + (tone ? ' ' + tone : '') + '" href="' + esc(href) + '"' + (kind === 'wa' || kind === 'link' ? ' target="_blank" rel="noopener"' : '') + '><span class="ib' + (ic.indexOf('img:') === 0 ? ' aib' : '') + '"' + (kind === 'link' ? ' style="background:none;padding:0"' : '') + '>' + (kind === 'link' ? '<img class="kicon" src="' + ASSET.knowIcon + '" alt="KNOW">' : ic.indexOf('img:') === 0 ? sprImg('contact', ic.slice(4), 'aipic', ic === 'img:wa' ? 'message' : 'phone') : icon(ic)) + '</span><span class="grow"><b style="font-size:.98rem">' + esc(label) + '</b><span class="small muted">' + esc(shown) + '</span></span>' + go + '</a>';
}

/* 9 · Riwayat */
function showHistory(){
  var h = S.home.history, msgs = S.home.messages || [];
  var withPain = h.filter(function(r){ return r.pain !== '' && r.pain != null; });
  var trend = '';
  if (withPain.length >= 2){
    var now = Number(withPain[0].pain), prev = Number(withPain[1].pain), better = now < prev, worse = now > prev;
    trend = '<div class="trend"><div class="bars"><i style="height:' + Math.max(8, prev * 4.4) + 'px;background:#F2B8A0"></i><i style="height:' + Math.max(8, now * 4.4) + 'px;background:' + (worse ? '#E5847B' : '#9FD4C9') + '"></i></div><div><b>Nyeri ' + (better ? 'berkurang' : worse ? 'bertambah' : 'tetap') + ': ' + prev + ' → ' + now + '</b><span class="s" style="color:' + (better ? 'var(--ok-700)' : worse ? 'var(--bad-700)' : 'var(--muted)') + '">' + (better ? 'Membaik dibanding laporan sebelumnya' : worse ? 'Bila bertambah berat, hubungi perawat' : 'Sama dengan laporan sebelumnya') + '</span></div></div>';
  }
  tabView('history', '<div class="scr"><h1 style="margin:6px 0 4px">Riwayat laporan</h1><p class="muted" style="margin:0 0 14px">Semua laporan dan balasan perawat.</p>' + trend + (h.length ? h.map(function(r){
    var m = msgs.filter(function(x){ return x.reportId === r.id; })[0], d = pd(r.time);
    var hs = m ? ['done', 'Dibalas'] : r.nurseStatus === 'CLOSED' ? ['closed', 'Selesai'] : ['wait', 'Sedang ditinjau'];
    var sum = (r.symptoms && r.symptoms.length ? (r.pain ? 'Nyeri ' + r.pain + ' · ' : '') + r.symptoms.filter(function(x){ return x !== 'Nyeri'; }).slice(0, 3).join(' · ').toLowerCase() : r.condition) + (r.siteLabel ? ' · ' + r.siteLabel : '');
    return '<div class="hcard"><div class="top"><div class="ph" data-ph="' + esc(r.photoId) + '">' + icon(r.photoId ? 'image' : (r.condition === 'Tidak ada perubahan' ? 'checkc' : 'clipcheck')) + '</div>' +
      '<div class="grow"><b>' + esc(DAYN[d.getDay()] + ', ' + d.getDate() + ' ' + MONTH[d.getMonth()] + ' · ' + String(r.time).slice(11,16)) + '</b><span class="s">' + esc(sum) + '</span></div><span class="hs ' + hs[0] + '">' + hs[1] + '</span></div>' +
      (m ? '<div class="reply"><b style="color:var(--navy)">Perawat:</b> “' + esc(m.message.length > 140 ? m.message.slice(0, 140) + '…' : m.message) + '”</div>' : '') +
      '<button class="hmore" data-id="' + esc(r.id) + '">Lihat detail laporan ' + icon('chevron','sm') + '</button></div>';
  }).join('') : '<div class="card center muted">' + icon('history','xl') + '<p>Belum ada laporan.</p></div>') + '</div>');
  app.querySelectorAll('.hmore[data-id]').forEach(function(b){ b.onclick = function(){ showReportDetail(b.dataset.id); }; });
  app.querySelectorAll('[data-ph]').forEach(function(el){
    var id = el.getAttribute('data-ph'); if (!id) return;
    if (KS.photo(id)) { el.innerHTML = '<img src="' + KS.photo(id) + '" alt="">'; return; }
    call('pPhotoThumb', S.token, id).then(function(u){ KS.photo(id, u); el.innerHTML = '<img src="' + u + '" alt="">'; }).catch(function(){});
  });
}

/* ---------------- Alur pemeriksaan ---------------- */
function startCheck(){
  var gate = S.home && S.home.patient && S.home.patient.reportGate;
  if (gate && gate.waiting){
    var o = sheet('<h2>Laporan sebelumnya sedang ditinjau</h2><p class="small muted" style="margin:6px 0 12px">Anda dapat melapor lagi setelah perawat membalas laporan Anda. Bila keluhan bertambah, jangan menunggu – hubungi perawat ruangan atau datang ke IGD.</p>' + callButtons());
    return;
  }
  startCheck1();
}
function startCheck1(){ S.draft = { reportedBy: 'PASIEN', reporterName: '', answers: {}, photos: [], photoAI: [], photoTimes: [], site: '', sitePoint: '', examAccess: '', siteTemp: false, saveSite: false, siteTouched: false, ctxUnsure: false, reqId: newReq(), skip: false, skipReason: '', pending: null }; showPrecheck(); }
function step(n, total, label){ var b = ''; for (var i = 1; i <= total; i++) b += '<i class="' + (i <= n ? 'on' : '') + '"></i>'; return '<div class="scr" style="padding-top:4px;padding-bottom:0"><div class="steplbl"><span>Langkah ' + n + ' dari ' + total + '</span><span>' + esc(label || '') + '</span></div><div class="stepbar" style="grid-template-columns:repeat(' + total + ',1fr)">' + b + '</div></div>'; }
function parseOpts(s){ return String(s || '').split('|').filter(Boolean).map(function(o){ var kv = o.split(':'); return { v: kv[0].trim().toUpperCase(), l: (kv[1] || kv[0]).trim() }; }); }
function condOk(cond, a){
  if (!cond) return true;
  return String(cond).split('&&').every(function(part){
    var neg = part.indexOf('!=') >= 0, kv = part.split(neg ? '!=' : '='), f = kv[0].trim(), v = String(kv[1] || '').trim().toUpperCase();
    var cur = String(a[f] || '').toUpperCase(); return neg ? cur !== v : cur === v;
  });
}

/* 4 · Pemeriksaan awal */
function showCondition(){
  var d = S.draft, q = S.home.questions.filter(function(x){ return x.category === 'SELF_CHECK'; })[0];
  var opts = parseOpts(q.options), okO = opts.filter(function(o){ return o.v === 'NO_CHANGE'; })[0] || opts[0], badO = opts.filter(function(o){ return o.v === 'CHANGE'; })[0] || opts[1];
  var site = d.site && d.site !== 'TIDAK_YAKIN' ? siteLbl(d.site).toLowerCase() : '';
  view(topbar('Pemeriksaan') + step(1, 3, 'Kondisi') + '<div class="scr" style="padding-top:8px">' +
    '<div class="seg" style="margin-bottom:6px"><button id="rP" class="' + (d.reportedBy === 'PASIEN' ? 'on' : '') + '">Diisi pasien</button><button id="rK" class="' + (d.reportedBy === 'KELUARGA' ? 'on' : '') + '">Diisi keluarga</button></div>' +
    (d.reportedBy === 'KELUARGA' ? '<input type="text" id="famName" placeholder="Nama & hubungan, mis. Rina – anak" value="' + esc(d.reporterName) + '" style="margin-top:6px">' : '') +
    '<h1 class="qh">Bagaimana bekas infus Anda sekarang?</h1><p class="qs">Lihat dan raba perlahan area bekas infus' + (site ? ' di <b style="color:var(--navy)">' + esc(site) + '</b>' : '') + '.</p>' +
    '<button class="choice ok" id="cOk"><span class="ib">' + icon('check','lg') + '</span><span><b>' + esc(okO.l) + '</b><span class="s">Kulit tampak dan terasa normal</span></span></button>' +
    '<button class="choice bad" id="cBad"><span class="ib">' + icon('alert','lg') + '</span><span><b>' + esc(badO.l) + '</b><span class="s">Nyeri, bengkak, merah, panas, lepuh…</span></span></button>' +
    '<div class="hintbox">' + icon('info') + '<span>Ragu? Pilih <b style="color:var(--navy)">“' + esc(badO.l) + '”</b>. Lebih baik diperiksa perawat.</span></div></div>');
  on('bBack', ctx() ? showPrecheck : showHome);
  on('rP', function(){ keepName(); d.reportedBy = 'PASIEN'; showCondition(); });
  on('rK', function(){ d.reportedBy = 'KELUARGA'; showCondition(); });
  function keepName(){ var f = $('famName'); if (f) d.reporterName = f.value.trim(); }
  function pick(v){
    keepName();
    if (d.reportedBy === 'KELUARGA' && !d.reporterName) return toast('Mohon isi nama pengisi.', true);
    if (d.answers[q.code] !== v){ var a = {}; a[q.code] = v; d.answers = a; d.photos = []; }
    if (v === 'NO_CHANGE') showSend(); else showSymptoms();
  }
  on('cOk', function(){ pick(okO.v); }); on('cBad', function(){ pick(badO.v); });
}

/* 5 · Penilaian gejala */
var DANGER_Q = ['BLISTER','SKIN_CHANGE','FLUID','FEVER','NUMBNESS'];
function showSymptoms(){
  var d = S.draft, a = d.answers;
  var qs = S.home.questions.filter(function(x){ return x.category !== 'SELF_CHECK'; });
  var yn = qs.filter(function(q){ return q.type === 'YESNO'; });
  function subFor(code){ return qs.filter(function(q){ return q.type !== 'YESNO' && q.condition && q.condition.indexOf(code + '=YA') >= 0 && condOk(q.condition, a); }); }
  function orphan(){ return qs.filter(function(q){ return q.type !== 'YESNO' && condOk(q.condition, a) && !yn.some(function(y){ return q.condition && q.condition.indexOf(y.code + '=YA') >= 0; }); }); }
  function lbl(q){ return q.label || q.text; }
  function chk(q, wide){ var onq = a[q.code] === 'YA'; return '<button class="chk' + (onq ? ' on' : '') + (wide ? ' wide' : '') + '" data-y="' + q.code + '"><span class="box">' + icon('check','sm') + '</span><span class="grow">' + esc(lbl(q)) + '</span></button>'; }
  function grid(list){
    var wide = list.filter(function(q){ return lbl(q).length > 24; }), narrow = list.filter(function(q){ return lbl(q).length <= 24; });
    var odd = narrow.length % 2 === 1 ? narrow.pop() : null;
    return '<div class="sgrid">' + narrow.map(function(q){ return chk(q, false); }).join('') + (odd ? chk(odd, true) : '') + wide.map(function(q){ return chk(q, true); }).join('') + '</div>'; }
  function painWord(v){ v = Number(v); return v === 0 ? 'Tidak nyeri' : v <= 3 ? 'Ringan' : v <= 6 ? 'Sedang' : 'Berat'; }
  function subHtml(q){
    var v = a[q.code] || '';
    if (q.type === 'SCALE'){ var r = String(q.options || '0-10').split('-'), lo = Number(r[0]), hi = Number(r[1] || 10), cells = [];
      for (var i = lo; i <= hi; i++) cells.push('<button data-s="' + q.code + '" data-v="' + i + '" class="' + (v === String(i) ? 'on' : '') + '">' + i + '</button>');
      var half = Math.ceil(cells.length / 2);
      return '<div class="lbl2">' + esc(q.text) + ' <span class="tiny muted">(0 = tidak nyeri, 10 = terberat)</span></div><div class="scale2">' + cells.slice(0, half).join('') + '</div><div class="scale2">' + cells.slice(half).join('') + '<div class="lv">' + (v !== '' ? painWord(v) : '') + '</div></div>'; }
    if (q.type === 'CHOICE'){ var o = parseOpts(q.options);
      return '<div class="q">' + esc(q.text) + (q.required ? '' : ' <span class="tiny muted">(tidak wajib)</span>') + '</div>' + (o.length <= 3 ? '<div class="opt3">' + o.map(function(x){ return '<button class="' + (v === x.v ? 'on' : '') + '" data-s="' + q.code + '" data-v="' + esc(x.v) + '">' + (v === x.v ? '✓ ' : '') + esc(x.l) + '</button>'; }).join('') + '</div>'
        : o.map(function(x){ return '<button class="chk ' + (v === x.v ? 'on' : '') + '" data-s="' + q.code + '" data-v="' + esc(x.v) + '"><span class="box">' + icon('check','sm') + '</span>' + esc(x.l) + '</button>'; }).join('')); }
    return '<label class="lbl" style="margin-top:14px">' + esc(q.code === 'OTHER_TEXT' ? 'Keluhan lain' : (q.label || q.text)) + ' <span class="tiny muted" style="font-weight:600">(tidak wajib)</span></label><textarea data-t="' + q.code + '" placeholder="Tulis singkat, mis. mulai terasa sejak tadi malam">' + esc(v) + '</textarea>';
  }
  function render(){
    saveText();
    var y = window.scrollY;
    var vis = yn.filter(function(q){ return condOk(q.condition, a) && q.code !== 'OTHER_COMPLAINT'; });
    var pain = vis.filter(function(q){ return q.code === 'PAIN'; })[0];
    var common = vis.filter(function(q){ return q.code !== 'PAIN' && DANGER_Q.indexOf(q.code) < 0; });
    var danger = vis.filter(function(q){ return DANGER_Q.indexOf(q.code) >= 0; });
    var subsCommon = common.filter(function(q){ return a[q.code] === 'YA' && subFor(q.code).length; });
    var n = yn.filter(function(q){ return a[q.code] === 'YA'; }).length;
    app.innerHTML = '<div>' + topbar('Pemeriksaan') + step(2, 3, 'Gejala') + '<div class="scr" style="padding-top:8px;padding-bottom:170px"><h1 class="qh">Apa yang Anda rasakan?</h1><p class="qs">Boleh pilih lebih dari satu. Lihat dan raba perlahan area bekas infus.</p>' +
      (pain ? '<div class="paincard' + (a.PAIN === 'YA' ? '' : ' off') + '">' + chk(pain) + (a.PAIN === 'YA' ? subFor('PAIN').map(subHtml).join('') : '') + '</div>' : '') +
      grid(common) +
      subsCommon.map(function(q){ return '<div class="subcard"><b>Tentang ' + esc(lbl(q).toLowerCase()) + 'nya</b>' + subFor(q.code).map(subHtml).join('') + '</div>'; }).join('') +
      (danger.length ? '<div class="dangerbox"><div class="t">Tanda yang perlu segera diperiksa</div>' + grid(danger) +
        danger.filter(function(q){ return a[q.code] === 'YA' && subFor(q.code).length; }).map(function(q){ return subFor(q.code).map(subHtml).join(''); }).join('') + '</div>' : '') +
      orphan().map(subHtml).join('') + '</div></div>' +
      '<div class="sticky bar"><div class="in"><div class="sum">' + (n ? n + ' gejala dipilih' + (a.PAIN === 'YA' && a.PAIN_SCORE ? ' · nyeri ' + esc(a.PAIN_SCORE) : '') : 'Belum ada gejala dipilih') + '</div><button class="btn block lg" id="bNext">Lanjut ke foto ' + icon('chevron','sm') + '</button></div></div>';
    window.scrollTo(0, y);
    on('bBack', showCondition);
    app.querySelectorAll('[data-y]').forEach(function(b){ b.onclick = function(){ var c = b.dataset.y; a[c] = a[c] === 'YA' ? 'TIDAK' : 'YA'; render(); }; });
    app.querySelectorAll('[data-s]').forEach(function(b){ b.onclick = function(){ a[b.dataset.s] = b.dataset.v; render(); }; });
    on('bNext', function(){
      saveText();
      if (a.OTHER_TEXT) a.OTHER_COMPLAINT = 'YA';
      yn.forEach(function(q){ if (condOk(q.condition, a) && a[q.code] !== 'YA') a[q.code] = 'TIDAK'; });
      Object.keys(a).forEach(function(k){ var q = qs.filter(function(x){ return x.code === k; })[0]; if (q && !condOk(q.condition, a)) delete a[k]; });
      var anyYes = yn.some(function(q){ return a[q.code] === 'YA'; });
      if (!anyYes) return toast('Pilih minimal satu gejala, atau tulis keluhan Anda.', true);
      var miss = qs.filter(function(q){ return q.type !== 'YESNO' && q.required && condOk(q.condition, a) && !a[q.code]; });
      if (miss.length) return toast('Lengkapi: ' + (miss[0].label || miss[0].text), true);
      showPhoto();
    });
  }
  function saveText(){ app.querySelectorAll('[data-t]').forEach(function(t){ var v = t.value.trim(); if (v) a[t.dataset.t] = v; else delete a[t.dataset.t]; }); }
  render();
}

var SYMPTOMS = ['PAIN','BURNING','SWELLING','REDNESS','RED_STREAK','COLOR_CHANGE','PALE_SHINY','SKIN_CHANGE','HARDNESS','BLISTER','FLUID','FEVER','NUMBNESS','OTHER_COMPLAINT'];
function photoRequired(){
  var a = S.draft.answers, m = S.home.photo.requiredWhen, change = a.OVERALL_CONDITION === 'CHANGE';
  if (m === 'OPTIONAL') return false; if (m === 'ON_CHANGE') return change;
  return change && SYMPTOMS.some(function(f){ return a[f] === 'YA'; });
}

/* =====================================================================
   v3.12 · SEBELUM MEMERIKSA – ringkasan konteks + lokasi untuk pemeriksaan ini
   - Konteks masih sesuai → cukup tekan "Lanjutkan pemeriksaan".
   - Lokasi bisa diubah KHUSUS pemeriksaan ini (tidak mengubah data sesi), kecuali pasien memilih menyimpannya.
   - Tidak ada kolom wajib: keluhan tetap bisa dilaporkan walau konteks belum lengkap.
   ===================================================================== */
function draftDefaults(){
  var d = S.draft, c = ctx(); if (!d || !c) return;
  if (!d.siteTouched){ d.site = c.exam.site || ''; d.examAccess = c.exam.accessType || ''; d.siteTemp = false; }
}
function showPrecheck(){
  var d = S.draft, c = ctx(); if (!d) return showHome();
  if (!c){ return showCondition(); }
  draftDefaults();
  var chemo = c.chemo.date ? dShort(c.chemo.date) : 'Belum diketahui';
  var inf = [accLbl(d.examAccess || c.access.typeCode) || c.access.type, d.site ? siteLbl(d.site) : (c.access.site || '')].filter(Boolean).join(' – ') || 'Belum diisi';
  view(topbar('Pemeriksaan') + '<div class="scr" style="padding-top:8px;padding-bottom:150px">' +
    '<div class="steplbl" style="margin:2px 0 6px"><span>Persiapan</span><span>lalu 3 langkah pemeriksaan</span></div><h1 class="qh">Sebelum memeriksa</h1><p class="qs">Cek sebentar. Bila masih sesuai, langsung lanjutkan.</p>' +
    askNewHtml(c, 'p') +
    '<div class="ctxc pcard"><div class="it"><span>Kemoterapi terakhir</span><div><b>' + esc(chemo) + '</b></div></div>' +
    '<div class="it"><span>Obat kemo</span><div><b>' + esc(c.drugs.status === 'OK' ? drugsTxt(c) : 'Belum diketahui') + '</b></div></div>' +
    '<div class="it"><span>Infus yang diperiksa</span><div><b>' + esc(inf) + '</b></div></div>' +
    '<button class="btn ghost block" id="pcEdit" style="margin-top:6px">' + icon('sliders','sm') + ' Ubah data</button></div>' +
    '<div class="sos" style="margin-top:12px"><div class="t">' + icon('alert') + '<span><b>Lepuh, luka terbuka, atau nyeri hebat?</b> Jangan menunggu – telepon sekarang.</span></div>' + callButtons() + '</div>' +
    '</div><div class="sticky bar"><div class="in"><button class="btn block lg" id="pcGo">Lanjutkan pemeriksaan ' + icon('chevron','sm') + '</button></div></div>');
  on('bBack', showHome);
  bindAsk('p', showPrecheck);
  on('pcEdit', function(){ ctxSheet(showPrecheck); });
  on('pcGo', showCondition);
}
function accLbl(t){ var a = accOpts(); for (var i = 0; i < a.length; i++) if (a[i][0] === t) return a[i][1]; return ''; }
function todayStr(){ var t = serverNow(); return t.getFullYear() + '-' + ('0' + (t.getMonth()+1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); }
/* v3.13: SATU formulir "Ubah data" – tanggal kemo, obat, jenis & lokasi infus. Tanggal yang lebih baru = sesi baru (diatur server). */
function ctxSheet(after, opt){
  opt = opt || {}; after = after || showHome;
  var c = ctx() || { chemo: {}, drugs: { status: '' }, access: {}, exam: {} }, d = S.draft;
  var curDate = c.chemo.date || '', known = c.drugs.status === 'OK';
  var t0 = (d && d.examAccess) || c.access.typeCode || '', s0 = (d && d.site) || c.exam.site || c.access.siteCode || '';
  var dItems = (known ? [['KEEP', 'Sama seperti tercatat', drugsTxt(c)]] : []).concat([['BEDA', known ? 'Ganti obat' : 'Pilih obat'], ['TIDAK_TAHU', 'Tidak tahu']]);
  var o = sheet('<h2>Ubah data</h2><p class="small muted" style="margin:4px 0 8px">Isi yang Anda ketahui saja. Data lama tetap tersimpan.</p>' +
    '<p class="small b" style="margin:8px 0 6px">Tanggal kemoterapi terakhir</p><select id="cxD" aria-label="Tanggal kemoterapi terakhir">' + dateOpts(curDate, !curDate) + '</select>' +
    '<div id="cxNew" class="tempnote hidden">Tanggal ini lebih baru – dicatat sebagai sesi kemoterapi baru.</div>' +
    '<p class="small b" style="margin:14px 0 6px">Obat kemoterapi</p>' + chips('cxM', dItems, known ? 'KEEP' : '') + '<div id="cxDrugBox"></div>' +
    accessBlock('cxA', t0, s0) +
    (d && c.exam.last ? '<p class="small b" style="margin:10px 0 6px">Titik infus dibanding pemeriksaan ' + esc(dShort(c.exam.last.time)) + ' <span class="tiny muted" style="font-weight:600">(tidak wajib)</span></p>' + chips('cxP', [['SAMA', 'Titik sama'], ['BEDA', 'Titik berbeda'], ['TIDAK_TAHU', 'Tidak yakin']], d.sitePoint) : '') +
    '<p class="tiny muted" style="margin:10px 0 0">Tidak tahu? Pilih "Tidak tahu" – jangan menebak.</p>' +
    '<button class="btn block" id="cxS" style="margin-top:12px">' + icon('check','sm') + ' Simpan</button>');
  var st = { drugs: known ? 'KEEP' : '', type: t0, site: s0, point: d ? d.sitePoint : '' }, dp = null, reqId = newReq(), sel = o.querySelector('#cxD');
  function upd(){ var v = sel.value; o.querySelector('#cxNew').classList.toggle('hidden', !(v !== '__U' && curDate && v > curDate)); var m = o.querySelector('#cxM [data-v="KEEP"]'); if (m) m.firstChild.textContent = !o.querySelector('#cxNew').classList.contains('hidden') ? 'Sama seperti sesi sebelumnya' : 'Sama seperti tercatat'; }
  if (opt.newChemo) sel.value = todayStr();
  sel.onchange = upd; upd();
  bindChips(o, 'cxM', function(v){ st.drugs = v; var box = o.querySelector('#cxDrugBox');
    if (v === 'BEDA'){ dp = drugPicker('dpCx', S.home.drugCatalog || [], known ? (c.drugs.codes || []) : [], known ? c.drugs.other : ''); box.innerHTML = dp.html; dp.bind(); } else { box.innerHTML = ''; dp = null; } });
  bindAccess(o, 'cxA', st);
  bindChips(o, 'cxP', function(v){ st.point = v; });
  o.querySelector('#cxS').onclick = function(){
    if (!st.type) return toast('Pilih jenis infus (boleh "Tidak yakin jenisnya").', true);
    if (!st.site) { toast('Pilih lokasi infus (boleh "Tidak yakin lokasinya").', true); var sb = o.querySelector('#cxASBox'); if (sb) sb.scrollIntoView({ block: 'center' }); return; }
    var dv = sel.value, nd = dv === '__U' ? '' : dv, f = { reqId: reqId }, any = false;
    if (nd !== curDate){ f.date = nd; any = true; }
    if (st.drugs === 'TIDAK_TAHU' && c.drugs.status !== 'PERLU_KONFIRMASI'){ f.drugsMode = 'TIDAK_TAHU'; any = true; }
    else if (st.drugs === 'BEDA'){ var v = dp ? dp.value() : { codes: [], other: '' }; f.drugsMode = v.codes.length || v.other ? 'DIISI' : 'TIDAK_TAHU'; f.drugCodes = v.codes; f.drugOther = v.other; any = true; }
    if (st.type && (st.type !== (c.access.typeCode || '') || (st.site || '') !== (c.access.siteCode || '') || !c.access.fromSession)){ f.accessType = st.type; f.accessSite = st.site; any = any || st.type !== (c.access.typeCode || '') || (st.site || '') !== (c.access.siteCode || ''); }
    if (d){ d.site = st.site || ''; d.examAccess = st.type || ''; d.sitePoint = st.point || ''; d.siteTouched = true; d.siteTemp = false; }
    var done = function(){ o.remove(); after(); };
    if (!any) return done();
    saveSess(this, 'pSaveContext', [f], f.date && curDate && f.date > curDate ? 'Sesi kemoterapi baru tercatat.' : 'Data tersimpan.', done);
  };
}

/* 6 · Ambil foto */
function showPhoto(){
  var d = S.draft, req = photoRequired(), max = S.home.photo.max;
  view(topbar('Pemeriksaan') + step(3, 3, 'Foto') + '<div class="scr" style="padding-top:8px;padding-bottom:150px">' +
    '<h1 class="qh">Foto bekas infus Anda</h1><p class="qs">' + (req ? '<b style="color:var(--bad-700)">Foto diperlukan</b> agar perawat dapat melihat kondisi Anda.' : 'Foto tidak wajib, tetapi sangat membantu perawat.') + ' Minta keluarga membantu memotret bila sulit.</p>' +
    (d.photos.length ? '<div class="thumbs" id="thumbs"></div><p class="small muted" style="margin:0">' + d.photos.length + ' dari maksimal ' + max + ' foto.</p>' : '<div class="camfr"><div>Letakkan area bekas infus di dalam kotak</div></div>') +
    tipsHtml() +
    '<div class="coin">' + icon('info') + '<span><b>Letakkan koin di samping area infus</b> – membantu perawat memperkirakan ukuran bengkak.</span></div>' +
    (d.photos.length < max ? '<label class="bigcam' + (d.photos.length ? ' ghost' : '') + '">' + icon('camera') + (d.photos.length ? ' Tambah foto' : ' Ambil Foto') + '<input type="file" accept="image/*" capture="environment" id="fCam" class="sr"></label>' +
      '<div class="center" style="margin-top:6px"><label class="btn link">' + icon('image','sm') + ' Pilih dari galeri<input type="file" accept="image/*" id="fGal" class="sr"></label></div>' : '') +
    (req && !d.photos.length ? '<label class="row small" style="margin-top:12px;cursor:pointer;flex-wrap:nowrap"><input type="checkbox" id="cSkip" ' + (d.skip ? 'checked' : '') + ' style="width:22px;height:22px;accent-color:var(--teal)"> Saya tidak bisa mengambil foto</label>' +
      '<div id="skipBox" class="' + (d.skip ? '' : 'hidden') + '"><input type="text" id="skipReason" value="' + esc(d.skipReason) + '" placeholder="Alasan, mis. kamera rusak" style="margin-top:8px"></div>' : '') +
    '</div>' + (d.photos.length || !req || d.skip ? '<div class="sticky bar"><div class="in"><button class="btn block lg" id="bNext">Lanjut ke pengiriman ' + icon('chevron','sm') + '</button></div></div>' : ''));
  on('bBack', showSymptoms);
  drawThumbs();
  ['fCam','fGal'].forEach(function(id){ var e = $(id); if (e) e.onchange = function(){ var f = this.files[0]; this.value = ''; if (f) takePhoto(f); }; });
  var cs = $('cSkip'); if (cs) cs.onchange = function(){ d.skip = this.checked; showPhoto(); };
  on('bNext', function(){
    var sr = $('skipReason'); if (sr) d.skipReason = sr.value.trim();
    if (req && !d.photos.length && !d.skipReason) return toast('Mohon tulis alasan tidak bisa mengambil foto.', true);
    showSend();
  });
}
function drawThumbs(){
  var box = $('thumbs'); if (!box) return;
  box.innerHTML = S.draft.photos.map(function(p, i){ return '<div class="thumb"><img src="' + p + '" alt="Foto ' + (i+1) + '"><button data-i="' + i + '" aria-label="Hapus">' + icon('x','sm') + '</button></div>'; }).join('');
  box.querySelectorAll('button').forEach(function(b){ b.onclick = function(){ S.draft.photos.splice(Number(b.dataset.i), 1); (S.draft.photoAI || []).splice(Number(b.dataset.i), 1); (S.draft.photoTimes || []).splice(Number(b.dataset.i), 1); showPhoto(); }; });
}
function takePhoto(file){
  loading('Memeriksa kejelasan foto…');
  S.draft.pendingTime = file && file.lastModified ? file.lastModified : Date.now(); /* v3.11: waktu foto dari HP */
  compress(file, Math.min(S.home.photo.maxPx || 1080, 1080)).then(function(u){
    S.draft.pending = u; S.draft.pendingAI = null;
    return photoQuality(u).then(function(q){ S.draft.pendingQ = q; showPreview(); });
  }).catch(function(e){ toast(e.message, true); showPhoto(); });
}
/* Cek kualitas foto di HP: ketajaman (variansi Laplacian) + kecerahan. Tanpa kirim ke server. */
function photoQuality(dataUrl){
  return new Promise(function(res){
    var img = new Image();
    img.onload = function(){
      try {
        var s = 360 / Math.max(img.naturalWidth, img.naturalHeight), w = Math.max(8, Math.round(img.naturalWidth * s)), h = Math.max(8, Math.round(img.naturalHeight * s));
        var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
        var d = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h), sum = 0;
        for (var i = 0; i < w * h; i++){ g[i] = 0.299 * d[i*4] + 0.587 * d[i*4+1] + 0.114 * d[i*4+2]; sum += g[i]; }
        var n = 0, m = 0, m2 = 0;
        for (var yy = 1; yy < h - 1; yy++) for (var xx = 1; xx < w - 1; xx++){
          var k = yy * w + xx, L = g[k-1] + g[k+1] + g[k-w] + g[k+w] - 4 * g[k]; n++; m += L; m2 += L * L; }
        var sharp = n ? (m2 / n - Math.pow(m / n, 2)) : 999, bright = sum / (w * h), min = Number(S.home.photo.blurMin);
        if (isNaN(min)) min = 40;
        var reasons = [];
        if (min > 0 && sharp < min) reasons.push('BLUR');
        if (bright < 45) reasons.push('DARK');
        if (bright > 242) reasons.push('BRIGHT');
        res({ sharp: Math.round(sharp), bright: Math.round(bright), ok: !reasons.length, reasons: reasons });
      } catch (e) { res({ ok: true, reasons: [] }); }
    };
    img.onerror = function(){ res({ ok: true, reasons: [] }); };
    img.src = dataUrl;
  });
}
function compress(file, maxPx){
  return new Promise(function(res, rej){
    if (!/^image\//.test(file.type || 'image/')) return rej(new Error('File bukan gambar.'));
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function(){ var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, maxPx / Math.max(w, h));
      var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.8)); };
    img.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('Foto tidak dapat dibaca. Coba ambil ulang.')); };
    img.src = url;
  });
}

/* 7 · Pratinjau foto */
var AI_LIKE = {
  LOW: { cls: 'low', lbl: 'RENDAH', txt: 'Tidak tampak tanda ekstravasasi yang jelas pada foto.' },
  MEDIUM: { cls: 'mid', lbl: 'SEDANG', txt: 'Tampak perubahan pada kulit yang perlu ditinjau perawat.' },
  HIGH: { cls: 'high', lbl: 'TINGGI', txt: 'Tampak tanda yang perlu segera diperiksa petugas.' }
};
function aiLikeCard(r, title){
  var f = (r.findings || []).slice(), sz = r.size || r.est_size_cm, note = r.note || r.patient_note;
  if (sz) f.push('Perkiraan luas area ± ' + sz + ' cm');
  return '<div class="aiseen"><div class="t"><span class="ib">' + icon('sparkle','sm') + '</span>' + esc(title || 'Yang terlihat oleh AI') + '</div>' +
    (f.length ? '<ul>' + f.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p>' + esc(note || 'Tidak tampak perubahan yang jelas pada foto.') + '</p>') +
    (f.length && note ? '<p style="margin-top:0">' + esc(note) + '</p>' : '') +
    '<div class="nb">Ini bacaan awal komputer, <b>bukan diagnosis</b>. Perawat tetap memeriksa foto Anda.</div></div>';
}
function showPreview(){
  var q = S.draft.pendingQ || { ok: true, reasons: [] }, ai = S.draft.pendingAI, bad = !q.ok;
  var aiBad = ai && ai.done && ai.result && (ai.result.relevant === 'NO' || ['BLURRY', 'DARK', 'NOT_RELEVANT'].indexOf(ai.result.photo_quality) >= 0);
  if ((bad || aiBad) && !S.draft.countedBad){ S.draft.badTries = (S.draft.badTries || 0) + 1; S.draft.countedBad = true; }
  var MSG = { BLUR: 'Foto <b>buram / tidak fokus</b>', DARK: 'Foto <b>terlalu gelap</b>', BRIGHT: 'Foto <b>terlalu terang / silau</b>' };
  var aiMsg = aiBad ? (ai.result.relevant === 'NO' || ai.result.photo_quality === 'NOT_RELEVANT' ? 'AI tidak menemukan <b>area bekas infus</b> pada foto' : ai.result.photo_quality === 'DARK' ? 'AI menilai foto <b>terlalu gelap</b>' : 'AI menilai foto <b>kurang jelas</b>') : '';
  var block = bad || aiBad, waiting = !block && S.home.photo.ai && (!ai || !ai.done);
  view(topbar(block ? 'Foto perlu diulang' : 'Periksa foto Anda') + '<div class="scr" style="padding-top:6px;padding-bottom:140px"><div class="pvwrap"><img class="preview" src="' + S.draft.pending + '" alt="Pratinjau"' + (block ? ' style="outline:3px solid var(--bad);outline-offset:-3px"' : '') + '>' + (!block ? '<span class="okchip">' + icon('check','sm') + ' Foto jelas</span>' : '') + '</div>' +
    (block
      ? '<div class="qwarn">' + icon('alert') + '<div><span class="t">' + (bad ? q.reasons.map(function(r){ return MSG[r]; }).join(' dan ') : aiMsg) + '. <b>Mohon foto ulang.</b></span>Arahkan kamera ke area bekas infus/akses kemoterapi.<ul>' +
          '<li>Tempat terang, tanpa filter, jarak ±20–30 cm</li><li>Pegang HP dengan dua tangan, ketuk layar di area infus agar fokus</li><li>Seluruh area infus dan kulit sekitarnya masuk dalam foto</li>' +
          '</ul></div></div>'
      : (!S.home.photo.ai ? ''
        : waiting ? '<div class="aiseen wait"><div class="t"><span class="ib">' + icon('sparkle','sm') + '</span>AI sedang membaca foto…</div><div class="sk"></div><div class="sk" style="width:70%"></div><p class="small" style="margin:0">Menilai kemerahan, bengkak, perubahan warna, lepuh, dan luka.</p></div>'
        : ai.result ? aiLikeCard(ai.result) : '<div class="qok" style="color:var(--muted)">' + icon('info','sm') + ' ' + esc(ai.error || 'AI belum dapat membaca foto. Perawat akan menilai.') + '</div>')) +
    (block && S.draft.badTries >= 2 ? '<p class="center" style="margin-top:12px"><button class="linkbtn" id="bForce" style="font-size:.84rem">Sudah dicoba beberapa kali – tetap gunakan foto ini</button></p>' : '') +
    '</div><div class="sticky bar"><div class="in"><div class="row" style="flex-wrap:nowrap">' +
      (block
        ? '<label class="btn block lg grow">' + icon('camera','sm') + ' Foto ulang<input type="file" accept="image/*" capture="environment" id="fRe" class="sr"></label>'
        : '<label class="btn ghost lg grow">' + icon('refresh','sm') + ' Foto ulang<input type="file" accept="image/*" capture="environment" id="fRe" class="sr"></label><button class="btn lg grow" id="bUse"' + (waiting ? ' disabled' : '') + ' style="flex:1.4">' + (waiting ? '<div class="spinner"></div>' : icon('check','sm') + ' Gunakan foto') + '</button>') +
    '</div></div></div>');
  function use(){
    S.draft.photos.push(S.draft.pending); (S.draft.photoAI = S.draft.photoAI || []).push(ai && ai.result && !aiBad ? ai.result : null); (S.draft.photoTimes = S.draft.photoTimes || []).push(S.draft.pendingTime || Date.now());
    S.draft.pending = null; S.draft.pendingQ = null; S.draft.pendingAI = null; S.draft.badTries = 0; S.draft.countedBad = false; S.draft.skip = false; showPhoto();
  }
  on('bBack', function(){ S.draft.pending = null; S.draft.pendingQ = null; S.draft.pendingAI = null; showPhoto(); });
  $('fRe').onchange = function(){ var f = this.files[0]; this.value = ''; if (f){ S.draft.countedBad = false; takePhoto(f); } };
  on('bUse', use); on('bForce', use);
  if (waiting && !ai){
    var pend = S.draft.pending; S.draft.pendingAI = { done: false };
    var timer = setTimeout(function(){ if (S.draft && S.draft.pending === pend && !S.draft.pendingAI.done){ S.draft.pendingAI = { done: true, error: 'AI butuh waktu lebih lama. Perawat tetap akan menilai foto Anda.' }; showPreview(); } }, 30000);
    call('pAnalyzePhoto', S.token, pend).then(function(r){
      clearTimeout(timer);
      if (!S.draft || S.draft.pending !== pend || (S.draft.pendingAI && S.draft.pendingAI.done)) return;
      S.draft.pendingAI = { done: true, result: r && r.result, error: r && r.error };
      if (r && r.enabled === false) S.home.photo.ai = false;
      showPreview();
    }).catch(function(){ clearTimeout(timer); if (S.draft && S.draft.pending === pend){ S.draft.pendingAI = { done: true, error: 'AI belum dapat membaca foto. Perawat tetap akan menilai foto Anda.' }; showPreview(); } });
  }
}

/* Kirim */
function showSend(){
  var d = S.draft, a = d.answers, noChange = a.OVERALL_CONDITION === 'NO_CHANGE';
  var qs = S.home.questions, yes = qs.filter(function(q){ return a[q.code] === 'YA'; }).map(function(q){ return q.label || q.text; });
  view(topbar('Kirim Laporan') + '<div class="scr"><div class="card"><div class="row" style="flex-wrap:nowrap"><span class="dot" style="background:' + (noChange ? 'var(--ok)' : 'var(--bad)') + '"></span><b class="grow">' + (noChange ? 'Tidak ada perubahan' : 'Ada perubahan') + '</b><span class="tiny muted">' + esc(d.reportedBy === 'KELUARGA' ? 'Diisi: ' + d.reporterName : 'Diisi pasien') + '</span></div>' +
    (yes.length ? '<div class="row" style="margin-top:10px;gap:6px">' + yes.map(function(y){ return '<span class="badge b-REVIEW">' + esc(y) + '</span>'; }).join('') + '</div>' : '') +
    (a.PAIN_SCORE ? '<div class="small" style="margin-top:8px">Skala nyeri: <b>' + esc(a.PAIN_SCORE) + '/10</b></div>' : '') +
    (a.OTHER_TEXT ? '<div class="small" style="margin-top:6px;color:var(--ink-2)">“' + esc(a.OTHER_TEXT) + '”</div>' : '') + '</div>' +
    (d.photos.length ? '<div class="card"><h4>Foto (' + d.photos.length + ')</h4><div class="thumbs">' + d.photos.map(function(p){ return '<div class="thumb"><img src="' + p + '" alt=""></div>'; }).join('') + '</div></div>' : (d.skip ? '<div class="alert warn">' + icon('info') + '<div>Tanpa foto – ' + esc(d.skipReason) + '</div></div>' : '')) +
    '<p class="tiny muted center" style="margin-top:14px">Laporan akan dinilai oleh sistem sesuai clinical pathway dan ditinjau perawat.</p></div>' +
    '<div class="sticky"><div class="in"><button class="btn block lg" id="bSend">' + icon('send','sm') + ' Kirim Laporan</button></div></div>');
  on('bBack', function(){ noChange ? showCondition() : showPhoto(); });
  on('bSend', submit);
}
function submit(){
  var d = S.draft;
  var steps = [d.photos.length ? 'Foto terkirim' : 'Laporan terkirim', 'Laporan diterima perawat', 'Menyiapkan saran perawatan'];
  app.innerHTML = '<div class="sendv"><div class="ico">' + icon('send','xl') + '</div><div><h1>Mengirim laporan…</h1><p style="margin-top:8px">Mohon tunggu, jangan tutup aplikasi.<br>Biasanya kurang dari 30 detik.</p></div>' +
    '<div class="pbar"><div id="pb" style="width:12%"></div></div><ol class="sendlist">' + steps.map(function(s, i){ return '<li id="sp' + i + '"' + (i ? '' : ' class="on"') + '><i>' + icon('check','sm') + '</i>' + esc(s) + '</li>'; }).join('') + '</ol></div>';
  var si = 0, tm = setInterval(function(){ var a = $('sp' + si); if (!a || si >= steps.length - 1){ clearInterval(tm); return; } a.className = 'done'; si++; $('sp' + si).className = 'on'; var pb = $('pb'); if (pb) pb.style.width = Math.round(12 + si / steps.length * 76) + '%'; }, d.photos.length ? 2500 : 1500);
  function stop(){ clearInterval(tm); }
  call('pSubmitReport', S.token, { reportedBy: d.reportedBy, reporterName: d.reporterName, answers: d.answers, photos: d.photos, site: d.site || '', sitePoint: d.sitePoint || '', examAccess: d.examAccess || '', siteTemp: !!d.siteTemp, saveSite: !!(d.siteTemp && d.saveSite), ctxUnsure: !!d.ctxUnsure, reqId: d.reqId, photoTimes: d.photoTimes || [], photoAI: (d.photoAI || []).filter(Boolean), photoSkipReason: d.skip ? d.skipReason : '' })
    .then(function(r){ stop(); S.last = r; S.draft = null; showResult(); })
    .catch(function(e){
      stop();
      if ((e.message || '').indexOf('AUTH:') === 0) return handleErr(e);
      view('<div class="scr"><div class="alert danger">' + icon('alert') + '<div><b>Laporan belum terkirim.</b><br>' + esc(e.message) + '</div></div>' +
        '<button class="btn block lg" id="bRetry">' + icon('refresh','sm') + ' Coba kirim lagi</button><button class="btn ghost block" id="bEdit" style="margin-top:10px">Kembali ke laporan</button>' + callButtons() + '</div>');
      on('bRetry', submit); on('bEdit', showSend);
    });
}

/* 8 · Hasil, Tindakan Sekarang & Panduan */
ICON.snow = '<path d="M12 2v20M4.9 6l14.2 12M19.1 6L4.9 18"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5M3 9.2l3.4.9-.9 3.4M21 14.8l-3.4-.9.9-3.4M3 14.8l3.4-.9-.9-3.4M21 9.2l-3.4.9.9 3.4"/>';
var THERMAL_UI = {
  COLD: { cls: 'cold', ic: 'snow', tag: 'KOMPRES DINGIN' },
  WARM: { cls: 'warm', ic: 'flame', tag: 'KOMPRES HANGAT' },
  NONE: { cls: 'none', ic: 'checkc', tag: 'TANPA KOMPRES KHUSUS' },
  NURSE: { cls: 'hold', ic: 'phone', tag: 'JANGAN KOMPRES DULU' }
};
function careCard(c, withTimer){
  if (!c) return '';
  var u = THERMAL_UI[c.thermal] || THERMAL_UI.NURSE, i = S.info;
  return '<section class="carec ' + u.cls + '"><div class="hd"><span class="ib">' + icon(u.ic, 'lg') + '</span><div><b>' + esc(c.title) + '</b>' +
      (c.drugs && c.drugs.length ? '<span>Sesuai obat ' + esc(c.drugs.join(', ')) + '</span>' : '<span>Petunjuk tindakan dari ruangan</span>') + '</div></div>' +
    (c.thermal === 'NURSE' ? '<p>' + esc(c.message) + '</p>' : '') +
    (c.steps && c.steps.length ? '<ol>' + c.steps.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') +
    (withTimer && (c.thermal === 'COLD' || c.thermal === 'WARM') ? '<button class="btn tbtn" id="bTimer">' + icon('clock','sm') + ' Mulai timer 15 menit</button>' : '') +
    (c.thermal === 'NURSE' && i.unitPhone ? '<a class="btn danger block" style="margin-top:12px" href="' + tel(i.unitPhone) + '">' + icon('phone','sm') + ' Telepon perawat sekarang</a>' : '') +
    '</section>';
}
var RED_FLAGS = ['Lepuh', 'Luka terbuka / menghitam', 'Nyeri hebat', 'Bengkak cepat meluas', 'Garis merah menjalar', 'Demam ≥ 38 °C', 'Nanah', 'Mati rasa / jari sulit digerakkan'];
function redFlagsHtml(title){ return '<div class="redflags"><div class="t">' + icon('alert') + esc(title || 'Langsung ke IGD bila muncul') + '</div><div class="cs">' + RED_FLAGS.map(function(x){ return '<span>' + esc(x) + '</span>'; }).join('') + '</div></div>'; }
function showResult(){
  var r = S.last, g = r.guidance || {}, c = r.care, st = r.status, sp = sapa(), th = c ? c.thermal : '';
  var comp = th === 'COLD' ? 'Kompres dingin' : th === 'WARM' ? 'Kompres hangat' : '';
  var chip = STATUS_TXT[st] || st, head, sub, steps;
  if (st === 'PRIORITY'){
    head = 'Hubungi ruangan sekarang';
    sub = 'Keluhan ' + esc(sp) + ' perlu segera dinilai petugas. Jangan menunggu dihubungi.';
    steps = ['<b>Telepon ruangan sekarang</b> – tombol di bawah', th === 'NURSE' ? '<b>Jangan kompres dulu</b> sebelum ada arahan perawat' : comp ? '<b>' + comp + '</b> 15–20 menit sambil menunggu' : '<b>Tinggikan tangan</b> di atas bantal', '<b>Datang ke IGD</b> bila nyeri hebat, bengkak cepat meluas, atau demam'];
  } else if (st === 'REVIEW'){
    head = th === 'NURSE' ? 'Jangan kompres dulu – hubungi perawat' : comp ? comp + ', lalu tunggu perawat menghubungi' : 'Istirahatkan area, lalu tunggu perawat menghubungi';
    sub = 'Perawat akan meninjau ' + (r.photos ? 'foto' : 'laporan') + ' dan membalas dalam <b>' + replyTxt() + '</b>.' + (c && c.highRisk && c.drugs && c.drugs.length ? ' Obat kemo ' + esc(sp) + ' (<b>' + esc(c.drugs.join(', ')) + '</b>) perlu dipantau ketat.' : '');
    steps = [th === 'NURSE' ? '<b>Telepon perawat</b> untuk arahan kompres' : comp ? '<b>' + comp + ' sekarang</b> 15–20 menit' : '<b>Jaga area</b> tetap bersih dan kering', '<b>Tinggikan tangan</b> di atas bantal', '<b>Tunggu balasan perawat</b> – muncul di aplikasi atau lewat telepon'];
  } else {
    head = 'Tidak ada perubahan – lanjutkan pemantauan';
    sub = esc(g.message || '');
    steps = (g.actions || []).slice(0, 3).map(function(x){ return esc(x); });
  }
  var ASK = st === 'MONITOR' ? ['Bagaimana cara mencegah ekstravasasi?', 'Tanda apa yang harus saya waspadai?'] : ['Berapa lama dan berapa kali saya kompres?', 'Obat apa yang aman untuk nyeri?'];
  var aiF = r.ai && r.ai.likelihood ? (r.ai.findings || []).slice(0, 2).join(', ') : '';
  view('<div class="scr" style="padding-top:22px">' +
    '<div class="row" style="flex-wrap:nowrap;margin-bottom:14px">' + (DRIVE_DEAD.sent ? '<span style="width:34px;height:34px;border-radius:50%;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center">' + icon('check','sm') + '</span>' : '<span class="sentpic">' + drivePic('sent', 'check') + '</span>') + '<div class="grow"><b style="color:var(--navy);font-size:1.05rem">Laporan terkirim</b><div class="small muted">' + esc(fmtDT(r.time)) + '</div></div></div>' +
    '<div class="act ' + esc(st) + '"><span class="chip">' + esc(chip) + '</span><div><div class="k">YANG PERLU ' + esc(sp.toUpperCase()) + ' LAKUKAN</div><h1>' + esc(head) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
      (steps.length ? '<ol class="nsteps">' + steps.map(function(x){ return '<li><span>' + x + '</span></li>'; }).join('') + '</ol>' : '') +
      (st === 'REVIEW' ? '<div class="redline">Makin parah sebelum dibalas? <b>Jangan menunggu</b> – telepon sekarang.</div>' : '') +
      (st !== 'MONITOR' ? callButtons() : '') + '</div>' +
    careCard(c, true) +
    redFlagsHtml() +
    '<div class="accs">' +
      '<details class="acc" id="accAI"><summary><span class="ib">' + icon('sparkle') + '</span><span class="grow"><b>Saran perawatan tambahan</b><span class="s">Nyeri, kulit, istirahat & ketenangan · dari AI</span></span><span class="chev">' + icon('chevron','sm') + '</span></summary><div class="body"><div class="aicare" id="aiCare"><div class="sk" style="width:92%"></div><div class="sk" style="width:78%"></div><div class="sk" style="width:85%"></div></div></div></details>' +
      (r.ai && r.ai.likelihood ? '<details class="acc" id="accPh"><summary><span class="ib">' + icon('camera') + '</span><span class="grow"><b>Yang terlihat dari foto</b><span class="s">' + esc(aiF || 'Bacaan awal AI dari foto Anda') + '</span></span><span class="chev">' + icon('chevron','sm') + '</span></summary><div class="body">' + aiLikeCard(r.ai, 'Bacaan AI dari foto Anda') +
        (r.ai.raised ? '<div class="alert warn" style="margin-top:8px">' + icon('alert') + '<div>Berdasarkan foto, laporan ditandai untuk ditinjau lebih cepat.</div></div>' : '') + '</div></details>' : '') + '</div>' +
    (r.next ? '<div class="nextinfo">' + icon('calendar') + '<div><b>Cek berikutnya:</b> ' + esc(fmtDate(r.next.date)) + ', ' + esc(r.next.start) + '</div></div>'
      : '<div class="nextinfo">' + icon('clock') + '<div><b>Selanjutnya:</b> balasan perawat muncul di Beranda. Laporan baru bisa dikirim setelah perawat membalas.</div></div>') +
    '<div class="askcta" style="margin-top:14px"><div class="hd"><span class="ib aib">' + aiPic() + '</span><div><b>Masih ada pertanyaan?</b><span>Tanya KASUARI NURSE.AI – jawaban dari pedoman & jurnal</span></div></div>' +
      '<div class="qs">' + ASK.map(function(q, i){ return '<button data-i="' + i + '">' + esc(q) + '</button>'; }).join('') + '</div>' +
      '<button class="btn block" id="bAsk">' + icon('message','sm') + ' Tanya KASUARI NURSE.AI</button></div>' +
    '<button class="btn ghost block lg" id="bOk" style="margin-top:12px">Selesai, kembali ke Beranda</button>' +
    '<p class="tiny muted center" style="margin:12px 4px 0">Tindakan di atas mengikuti protokol ruangan berdasarkan obat kemoterapi Anda dan bukan diagnosis. Perawat tetap meninjau laporan Anda.</p></div>');
  on('bOk', function(){ /* v3.0: tampil seketika dengan laporan baru, lalu disegarkan dari server */
    var r = S.last;
    if (S.home && r && r.reportId){
      var hist = S.home.history || (S.home.history = []);
      if (!hist.some(function(x){ return x.id === r.reportId; })) hist.unshift({ id: r.reportId, time: r.time, status: r.status, statusLabel: r.statusLabel, nurseStatus: 'NEW', nurseLabel: 'Menunggu perawat', condition: '', photos: r.photos || 0, day: '', photoId: '', careCode: r.care ? r.care.code || '' : '', careReason: '', pain: '', symptoms: [] });
      if (S.home.patient.reportRule !== 'BEBAS') S.home.patient.reportGate = { waiting: true, lastId: r.reportId, lastTime: r.time };
      saveHome();
    }
    S.homeAt = 0; loadHome(showHome); });
  document.querySelectorAll('.askcta .qs button').forEach(function(b){ b.onclick = function(){ showChat(showResult, ASK[Number(b.dataset.i)], r.reportId); }; });
  on('bTimer', function(){ compressTimer(r.care.thermal); });
  loadCareAdvice(r.reportId);
  on('bAsk', function(){ showChat(showResult, null, r.reportId); });
}

/* Rekomendasi perawatan segera + edukasi (AI dari pedoman & jurnal; cadangan statis) */
function loadCareAdvice(reportId){
  var box = $('aiCare'); if (!box) return;
  if (S.careAdv && S.careAdv.id === reportId) return paint(S.careAdv.v);
  call('pCareAdvice', S.token, reportId).then(function(v){ S.careAdv = { id: reportId, v: v }; paint(v); })
    .catch(function(){ var b = $('aiCare'); if (b) b.innerHTML = '<p class="small muted" style="margin:0">Belum dapat dimuat. Ikuti langkah di atas dan hubungi perawat bila keluhan memberat.</p>'; });
  function paint(v){
    var b = $('aiCare'); if (!b) return;
    b.innerHTML = '<div class="tiny muted" style="margin-bottom:6px">' + (v.ai ? 'Disusun KASUARI NURSE.AI dari pedoman & jurnal (ONS, ESMO-EONS, MASCC, Kemenkes)' : 'Panduan perawatan berdasarkan pedoman ONS & ESMO-EONS') + '</div>' +
      '<div class="md">' + mdLite(v.text) + '</div>' + refsHtml(v.sources) +
      '<div class="foot">Rekomendasi ini bukan diagnosis. Perawat tetap meninjau dan menindaklanjuti laporan Anda.</div>';
  }
}

/* Timer kompres */
function compressTimer(thermal){
  var total = 15 * 60, left = total, run = true, u = THERMAL_UI[thermal] || THERMAL_UI.COLD;
  var o = document.createElement('div'); o.className = 'timer-ov ' + u.cls;
  o.innerHTML = '<div class="timer"><span class="care-tag">' + u.tag + '</span><div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="bg"/><circle cx="60" cy="60" r="52" class="fg" id="tRing"/></svg><div class="tm" id="tTxt">15:00</div></div>' +
    '<p>Kompres area bekas infus. Timer berbunyi/bergetar saat selesai.</p><div class="row" style="flex-wrap:nowrap;width:100%"><button class="btn ghost grow" id="tPause">Jeda</button><button class="btn grow" id="tStop">Selesai</button></div></div>';
  document.body.appendChild(o);
  var ring = o.querySelector('#tRing'), C = 2 * Math.PI * 52; ring.style.strokeDasharray = C;
  function draw(){ var m = Math.floor(left / 60), s2 = left % 60; o.querySelector('#tTxt').textContent = (m < 10 ? '0' : '') + m + ':' + (s2 < 10 ? '0' : '') + s2; ring.style.strokeDashoffset = C * (1 - left / total); }
  draw();
  var iv = setInterval(function(){ if (!run) return; left--; draw(); if (left <= 0){ clearInterval(iv); try { navigator.vibrate && navigator.vibrate([400, 200, 400]); } catch(e){} o.querySelector('#tTxt').textContent = 'Selesai'; o.querySelector('p').textContent = 'Kompres selesai. Ulangi 3–4 kali sehari sesuai petunjuk.'; } }, 1000);
  o.querySelector('#tPause').onclick = function(){ run = !run; this.textContent = run ? 'Jeda' : 'Lanjut'; };
  o.querySelector('#tStop').onclick = function(){ clearInterval(iv); o.remove(); };
}

/* KASUARI NURSE.AI (chatbot) */
var CHAT_SUGGEST = ['Obat nyeri yang aman?', 'Kapan harus ke IGD?', 'Daftar kontrol'];
function chatCtx(){
  var c = ctx(); if (!c) return '';
  var fr = S.chatRep && (S.home.history || []).filter(function(x){ return x.id === S.chatRep; })[0];
  if (fr) return '<div class="chatctx">NURSE.AI membahas pemeriksaan ' + esc(dShort(fr.time)) + (fr.siteLabel ? ' (' + esc(fr.siteLabel) + ')' : '') + ' beserta data sesi kemoterapinya.</div>';
  var parts = [];
  if (c.access.type || c.access.site) parts.push([c.access.type, c.access.site].filter(Boolean).join(' – '));
  if (c.chemo.date) parts.push('kemo ' + dShort(c.chemo.date));
  parts.push(c.drugs.status === 'OK' ? 'obat: ' + drugsTxt(c) : c.drugs.status === 'KOSONG' ? 'obat belum diisi' : 'obat sesi ini belum dikonfirmasi');
  if (c.exam.last && c.exam.last.siteLabel) parts.push('pemeriksaan terakhir: ' + c.exam.last.siteLabel);
  return '<div class="chatctx">NURSE.AI memakai data tercatat: ' + esc(parts.join(' · ')) + '.</div>';
}
function showChat(back, preset, reportId){
  S.chat = S.chat || []; S.chatRep = reportId || null; /* v3.12: chat tentang pemeriksaan tertentu → konteks pemeriksaan itu diutamakan */
  view(topbar('KASUARI NURSE.AI') + '<h1 class="sr-only">Chat KASUARI NURSE.AI</h1><div class="chat-hd"><span class="bot aib">' + aiPic() + '</span><div class="grow"><b>KASUARI NURSE.AI</b><span class="tiny muted">Asisten Ners AI · jawaban dari pedoman</span></div></div>' +
    chatCtx() + '<div class="chat" id="chat"></div>' +
    '<div class="chat-in"><div class="in"><div class="chips-s" id="sug"><button class="snap" id="cSnap">' + icon('camera','sm') + ' Foto area infus</button>' + CHAT_SUGGEST.map(function(q){ return '<button>' + esc(q) + '</button>'; }).join('') + '</div>' +
    '<div class="row" style="flex-wrap:nowrap"><input type="text" id="cMsg" placeholder="Tulis pertanyaan…" autocomplete="off" maxlength="600"><button class="btn icon" id="cSend" aria-label="Kirim">' + icon('send','sm') + '</button></div></div></div>');
  on('bBack', typeof back === 'function' ? back : showHome);
  on('cwCheck', startCheck);
  var box = $('chat');
  function bubble(role, text, emergency, sources, fallback, links, foot){
    var d = document.createElement('div'); d.className = 'msg ' + role + (emergency ? ' em' : '');
    var src = (sources || []).filter(function(s){ return s && s.title; });
    d.innerHTML = '<div class="bb' + (role === 'model' ? ' md' : '') + '">' + (role === 'model' ? mdLite(text) : esc(text).replace(/\n/g, '<br>')) +
      (src.length ? '<button class="srcbtn">Sumber: ' + src.length + ' rujukan ›</button><div class="srcs hidden">' + refsHtml(src) + '</div>' : '') +
      (links && links.length ? '<div class="clinks">' + links.map(function(l){ return '<a class="btn sm kbtn" target="_blank" rel="noopener" href="' + esc(l.url) + '"><img src="' + ASSET.knowIcon + '" alt=""> ' + esc(l.label) + '</a>'; }).join('') + '</div>' : '') +
      (fallback ? '<div class="fb">Jawaban cadangan – AI sedang sibuk, coba tanyakan lagi sebentar lagi.</div>' : '') +
      (foot ? '<div class="foot">' + icon('eye','sm') + '<span>' + esc((function(t){ return t.charAt(0).toUpperCase() + t.slice(1); })(String(foot).replace(/^\s*💚\s*/, '').replace(/^Pengingat deteksi ekstravasasi:\s*/i, ''))) + '</span></div>' : '') +
      '</div>' + (emergency ? callButtons() : '');
    var sb = d.querySelector('.srcbtn'); if (sb) sb.onclick = function(){ var x = d.querySelector('.srcs'); x.classList.toggle('hidden'); sb.textContent = x.classList.contains('hidden') ? 'Sumber: ' + src.length + ' rujukan ›' : 'Sembunyikan sumber'; };
    box.appendChild(d); window.scrollTo(0, document.body.scrollHeight);
  }
  if (!S.chat.length){ var sp = sapa(), nm = S.home ? S.home.patient.firstName : '';
    bubble('model', 'Halo, ' + sp + (nm ? ' ' + nm : '') + ' 👋\nSelamat datang di KASUARI SIGAP.\n\nSaya Asisten Ners AI, siap menemani ' + sp + ' memantau area bekas infus setelah kemoterapi.\n\nYuk, kita cek bersama.\nCeritakan apa yang ' + sp + ' rasakan atau tunjukkan perubahan yang terlihat. Saya akan membantu memberikan panduan berdasarkan alur klinis yang tersedia.\n\n💚 Kemoterapi selesai, pemantauan tetap berjalan.');
    var miss = missingCtx();
    if (miss.length){ var qtxt = 'Agar jawaban saya tepat, boleh ' + sp + ' sampaikan dulu:\n' + miss.map(function(x, i){ return (i + 1) + '. ' + x; }).join('\n') + '\n\nTidak tahu? Tidak apa-apa, jawab saja "tidak tahu" – jangan menebak.';
      S.chat.push({ role: 'model', text: qtxt }); } }
  S.chat.forEach(function(m){ bubble(m.role, m.text, m.em, m.src, m.fb, m.links, m.foot); });
  if (missingCtx().length){ var fx = document.createElement('div'); fx.className = 'msg model'; fx.innerHTML = '<div class="bb"><button class="btn soft sm" id="cFill">' + icon('clipcheck','sm') + ' Isi lewat formulir (tersimpan)</button></div>'; box.appendChild(fx);
    fx.querySelector('#cFill').onclick = function(){ ctxSheet(function(){ showChat(back); }); }; }
  function send(q){
    q = String(q || '').trim(); if (!q) return;
    $('cMsg').value = ''; bubble('user', q); S.chat.push({ role: 'user', text: q });
    var t = document.createElement('div'); t.className = 'msg model typing'; t.innerHTML = '<div class="bb"><i></i><i></i><i></i></div>'; box.appendChild(t); window.scrollTo(0, document.body.scrollHeight);
    var slow = setTimeout(function(){ if (t.parentNode) { t.innerHTML = '<div class="bb"><span class="small muted">NURSE.AI masih menyiapkan jawaban… Bila darurat, jangan menunggu – telepon ruangan atau IGD.</span></div>'; window.scrollTo(0, document.body.scrollHeight); } }, 12000);
    call('pChat', S.token, S.chat.slice(-11, -1), q, S.chatRep || '').then(function(r){ clearTimeout(slow); t.remove(); bubble('model', r.reply, r.emergency, r.sources, r.fallback, r.links, r.footer); S.chat.push({ role: 'model', text: r.reply, em: r.emergency, src: r.sources, fb: r.fallback, links: r.links, foot: r.footer }); })
      .catch(function(e){ clearTimeout(slow); t.remove(); bubble('model', e.message); });
  }
  on('cSend', function(){ send($('cMsg').value); });
  $('cMsg').onkeydown = function(e){ if (e.key === 'Enter') send(this.value); };
  $('sug').querySelectorAll('button:not(.snap)').forEach(function(b){ b.onclick = function(){ send(b.textContent); }; });
  on('cSnap', startCheck);
  if (preset) setTimeout(function(){ send(preset); }, 250);
}

/* Pemilih obat kemoterapi */
function drugPicker(id, catalog, selected, other){
  selected = (selected || []).slice();
  return { html: '<div class="dp" id="' + id + '"><div class="input-ic">' + icon('search','sm') + '<input type="search" class="dq" placeholder="Cari nama obat, mis. doksorubisin"></div>' +
      '<div class="dsel"></div><div class="dlist">' + catalog.map(function(d){ return '<button type="button" data-c="' + esc(d.code) + '" data-s="' + esc((d.name + ' ' + (d.aliases || '') + ' ' + (d.group || '')).toLowerCase()) + '" class="' + (selected.indexOf(d.code) >= 0 ? 'on' : '') + '"><b>' + esc(d.name) + '</b><span>' + esc(d.group || '') + '</span></button>'; }).join('') + '</div>' +
      '<label class="lbl" style="margin-top:10px">Obat lain / tidak ada di daftar (opsional)</label><input type="text" class="dother" value="' + esc(other || '') + '" placeholder="Tulis nama obat bila tidak ditemukan">' +
      '<p class="tiny muted" style="margin:6px 0 0">Tidak tahu nama obatnya? Lihat surat kontrol/resep, tanyakan perawat, atau lewati dulu – bisa dilengkapi nanti di menu Akun.</p></div>',
    bind: function(){
      var root = $(id);
      function paint(){ root.querySelector('.dsel').innerHTML = selected.length ? selected.map(function(c){ var d = catalog.filter(function(x){ return x.code === c; })[0]; return '<span class="badge b-TEAL">' + esc(d ? d.name : c) + '</span>'; }).join(' ') : '<span class="tiny muted">Belum ada obat dipilih</span>'; }
      paint();
      root.querySelectorAll('.dlist button').forEach(function(b){ b.onclick = function(){ var c = b.dataset.c, i = selected.indexOf(c); if (i >= 0) selected.splice(i, 1); else selected.push(c); b.classList.toggle('on', i < 0); paint(); }; });
      root.querySelector('.dq').oninput = function(){ var q = this.value.toLowerCase().trim(); root.querySelectorAll('.dlist button').forEach(function(b){ b.style.display = !q || b.dataset.s.indexOf(q) >= 0 ? '' : 'none'; }); };
    },
    value: function(){ return { codes: selected.slice(), other: $(id).querySelector('.dother').value.trim() }; }
  };
}
function editDrugs(after){
  var a = S.home.account || {}, cx0 = ctx(), known = cx0 && cx0.drugs.status === 'OK', dp = drugPicker('dpEdit', S.home.drugCatalog || [], known ? (cx0.drugs.codes || a.drugCodes || []) : [], known ? cx0.drugs.other : '');
  var o = sheet('<h2>Obat kemoterapi saya</h2><p class="small muted" style="margin:4px 0 10px">Pilih semua obat yang Anda terima pada sesi kemoterapi terbaru' + (cx0 && cx0.chemo.date ? ' (' + esc(dShort(cx0.chemo.date)) + ')' : '') + '. Jenis obat menentukan tindakan (kompres dingin/hangat) bila terjadi perubahan.</p>' + dp.html +
    '<div class="row" style="margin-top:14px;flex-wrap:nowrap"><button class="btn ghost grow" id="dNo">Batal</button><button class="btn grow" id="dYes">' + icon('check','sm') + ' Simpan</button></div>');
  dp.bind();
  o.querySelector('#dNo').onclick = function(){ o.remove(); };
  o.querySelector('#dYes').onclick = function(){
    var v = dp.value(), cat = {}; (S.home.drugCatalog || []).forEach(function(d){ cat[d.code] = d; }); o.remove();
    optimistic(function(){ var ac = S.home.account || (S.home.account = {}); ac.drugCodes = v.codes.slice(); ac.drugOther = v.other;
        ac.drugs = v.codes.map(function(c){ var old = (ac.drugs || []).filter(function(x){ return x.code === c; })[0]; return old || { code: c, name: (cat[c] || {}).name || c, thermal: '' }; });
        var cx = ctx(); if (cx){ cx.drugs.names = ac.drugs.map(function(d){ return d.name; }); cx.drugs.other = v.other; cx.drugs.src = 'PASIEN'; cx.drugs.codes = v.codes.slice(); cx.drugs.status = v.codes.length ? 'OK' : (v.other ? 'KOSONG' : 'PERLU_KONFIRMASI'); cx.needs = cx.needs.filter(function(n){ return n !== 'KONFIRMASI_OBAT'; }); } },
      function(){ return call('pUpdateDrugs', S.token, v.codes, v.other); }, null, 'Daftar obat disimpan.');
    (after || showAccount)(); };
}

/* =====================================================================
   v3.5 · NAVIGASI: riwayat browser, tombol Back HP, refresh tetap di halaman yang sama.
   Fungsi tampilan yang sudah ada dibungkus – tombol & menu lama otomatis tercatat.
   ===================================================================== */
var NAVR = {
  showLanding: ['awal', 'pre'], showLogin: ['masuk', 'pre'], showRegister: ['daftar', 'pre'], showConsent: ['setuju', 'pre'],
  showEduPage: [function(a){ return a[0] === 'review' ? 'edupage' : 'eduawal'; }, function(a){ return a[0] === 'review' ? 'sub' : 'pre'; }],
  showHome: ['home', 'home'], showHistory: ['history', 'tab'], showEduHome: ['edu', 'tab'], showAccount: ['akun', 'tab'], showChat: ['chat', 'tab'],
  showMessages: ['pesan', 'sub'], showReportDetail: [function(a){ return 'laporan:' + a[0]; }, 'sub'], showFaq: ['faq', 'sub'], showConsentText: ['persetujuan', 'sub'],
  showInstall: ['pasang', 'sub'], showSchedule: ['jadwal', 'sub'], showCompressInfo: ['kompres', 'sub'], showSkinCare: ['kulit', 'sub'], showIgdInfo: ['igd', 'sub'],
  showHelp: ['bantuan', 'sub'], showTopic: [function(a){ return 'topik:' + a[0]; }, 'sub'], showVideo: ['video', 'sub'],
  showPrecheck: ['periksa0', 'flow'], showCondition: ['periksa1', 'flow'], showSymptoms: ['periksa2', 'flow'], showPhoto: ['periksa3', 'flow'], showPreview: ['periksa4', 'flow'], showSend: ['periksa5', 'flow'], showResult: ['hasil', 'result']
};
var ROUTE_KIND = { awal: 'pre', masuk: 'pre', daftar: 'pre', setuju: 'pre', eduawal: 'pre', home: 'home', history: 'tab', edu: 'tab', akun: 'tab', chat: 'tab', hasil: 'result' };
function routeKind(r){ r = String(r || ''); if (ROUTE_KIND[r]) return ROUTE_KIND[r]; if (/^periksa\d$/.test(r)) return 'flow'; return 'sub'; }
function routeGroup(k){ return k === 'pre' ? 'pre' : (k === 'sub' ? '' : 'in'); }
function curGroup(){ var st = KNav.stack(); for (var i = st.length - 1; i >= 0; i--){ var g = routeGroup(routeKind(st[i])); if (g) return g; } return ''; }
function navKind(k){
  var cur = KNav.cur(), ck = routeKind(cur), g = routeGroup(k), cg = curGroup(), h = KNav.indexOf('home');
  if (cur && g && cg && g !== cg) return 'reset';                       /* masuk/keluar akun: riwayat lama dibersihkan */
  if (k === 'pre' || k === 'sub' || k === 'flow') return 'push';
  if (k === 'home') return h >= 0 ? { to: h } : 'replace';
  if (k === 'tab') return ck === 'home' ? 'push' : (ck === 'tab' ? 'replace' : (h >= 0 ? { after: h } : 'replace'));
  if (k === 'result') return h >= 0 ? { after: h } : 'replace';
  return 'push';
}
Object.keys(NAVR).forEach(function(name){
  var orig = window[name]; if (typeof orig !== 'function') return;
  window[name] = function(){
    var a = arguments, d = NAVR[name], r = typeof d[0] === 'function' ? d[0](a) : d[0], k = typeof d[1] === 'function' ? d[1](a) : d[1];
    if (!KNav.isQuiet()) KNav.nav(r, navKind(k));
    return orig.apply(this, a);
  };
});
function closeOverlays(){
  var o = document.querySelectorAll('.sheet-ov, .rp-ov, .zoomp, .overlay, .zoom, .timer-ov');
  o.forEach(function(x){ x.remove(); }); if (o.length){ S.replyOpen = false; S.igdOpen = false; }
  return o.length > 0;
}
/* Tampilkan halaman dari nama rute (dipakai saat refresh & tombol Back/Forward) */
function renderRoute(r){
  var p = String(r || '').split(':'), base = p[0], id = p.slice(1).join(':'), k = routeKind(r);
  var logged = !!(S.token && S.home);
  if (routeGroup(k) === 'in' || (k === 'sub' && base !== 'bantuan')) { if (!logged) return showLanding(); }
  var M = {
    awal: function(){ showLanding(); }, eduawal: function(){ showEduPage('pre'); }, masuk: function(){ showLogin(); }, daftar: function(){ showRegister(); },
    setuju: function(){ logged ? showConsent() : showLanding(); },
    home: showHome, history: function(){ showHistory(); refreshHome(false); }, edu: showEduHome, akun: showAccount, chat: function(){ showChat(showHome); },
    edupage: function(){ showEduPage('review'); }, pesan: showMessages, faq: function(){ showFaq(); }, persetujuan: showConsentText, pasang: showInstall,
    jadwal: showSchedule, kompres: showCompressInfo, kulit: showSkinCare, igd: showIgdInfo, bantuan: showHelp, video: function(){ showVideo(); },
    laporan: function(){ var ok = (S.home.history || []).some(function(x){ return x.id === id; }); if (ok) showReportDetail(id); else { showHistory(); toast('Laporan tidak ditemukan – menampilkan riwayat.', true); } }, topik: function(){ showTopic(id); },
    hasil: function(){ S.last ? showResult() : showHome(); },
    periksa0: function(){ S.draft ? showPrecheck() : showHome(); }, periksa1: function(){ S.draft ? showCondition() : showHome(); }, periksa2: function(){ S.draft ? showSymptoms() : showHome(); },
    periksa3: function(){ S.draft ? showPhoto() : showHome(); }, periksa4: function(){ S.draft ? showPreview() : showHome(); }, periksa5: function(){ S.draft ? showPreview() : showHome(); }
  };
  (M[base] || showHome)();
}
function onPatientRoute(r){
  closeOverlays();
  KNav.quiet(function(){ renderRoute(r); });
}
/* Refresh: pulihkan halaman terakhir di tab ini (setelah akses diperiksa ulang) */
var NAV_SAVED = KNav.init({ scope: 'p', params: {}, onRoute: onPatientRoute });
function restoreOrLanding(){
  var r = NAV_SAVED, k = routeKind(r);
  if (!r || r === 'awal') return showLanding();
  if (routeGroup(k) === 'pre') return renderRoute(r);
  if (!S.token) return r === 'bantuan' ? showHelp() : showLanding();
  S.landed = true;
  loadHome(function(){
    if (k === 'flow'){ showHome(); toast('Pemeriksaan yang belum terkirim tidak disimpan. Silakan mulai lagi bila perlu.'); return; }
    if (k === 'result') return showHome();
    renderRoute(r);
  });
}

start();
