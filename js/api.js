/* =====================================================================
   KASUARI SIGAP v4.0.0 – penghubung frontend (GitHub Pages) ↔ API Apps Script
   - Semua panggilan: POST text/plain {fn, args} → {ok, data | error}
     (text/plain wajib: Apps Script tidak melayani CORS preflight)
   - Tidak menyimpan apa pun; token pasien / sesi perawat tetap dikelola aplikasi.
   ===================================================================== */
var KSAPI = (function(){
  var C = window.KS_CONFIG || {};
  var API = String(C.API_URL || '').trim();
  var LONG = /^(pChat|pSubmitReport|pAnalyzePhoto|pCareAdvice|pSetProfilePhoto|nUploadBaseline|nPoster|nAnalytics|nPatientCard|nRegisterPatient)$/;
  var NET = 'Koneksi terputus. Periksa internet Anda lalu coba lagi.';
  function ready(){ return /^https?:\/\/\S+\/exec$/.test(API) && API.indexOf('GANTI_DENGAN') < 0; }
  function call(fn, args){
    if (!ready()) return Promise.resolve({ ok: false, error: 'Alamat server belum diatur. Isi API_URL di js/config.js dengan URL /exec Apps Script.' });
    var ctl = window.AbortController ? new AbortController() : null;
    var tm = setTimeout(function(){ if (ctl) ctl.abort(); }, LONG.test(fn) ? 150000 : 60000);
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn: fn, args: args || [] }),
      credentials: 'omit', redirect: 'follow', cache: 'no-store',
      signal: ctl ? ctl.signal : undefined
    }).then(function(r){
      clearTimeout(tm);
      return r.text().then(function(t){
        try { return JSON.parse(t); }
        catch (e) {
          /* Bukan JSON: biasanya halaman login Google / "Script function not found: doPost"
             → penerapan belum "Versi baru" atau akses bukan "Siapa saja". */
          return { ok: false, error: 'Server belum siap (HTTP ' + r.status + '). Pastikan Apps Script sudah diterapkan Versi baru dengan akses "Siapa saja".' };
        }
      });
    }, function(){ clearTimeout(tm); throw new Error(NET); });
  }
  function boot(){
    var m = location.search.match(/[?&]t=([^&#]*)/), tok = '';
    if (m) { try { tok = decodeURIComponent(m[1]); } catch (e) { tok = m[1]; } }
    tok = String(tok).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    var base = String(C.APP_URL || '').trim() || (location.origin + location.pathname.replace(/[^\/]*$/, ''));
    return { token: tok, appUrl: base, execUrl: base };
  }
  return { call: call, boot: boot, ready: ready, url: function(){ return API; } };
})();
