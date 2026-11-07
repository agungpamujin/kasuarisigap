/* =====================================================================
   KS – utilitas kecepatan (gas-instant-ux)
   - get/set   : penyimpanan lokal aman (localStorage / sessionStorage)
   - wrap      : panggilan server read-only digabung bila sama & dicoba ulang 1x bila sinyal putus
   - bg        : tulis di latar belakang (optimistic UI) + coba ulang otomatis
   - photo     : memori foto agar tidak diunduh ulang
   - skel      : kerangka abu-abu
   ===================================================================== */
var KS = (function(){
  function get(k, sess){ try { var v = (sess ? sessionStorage : localStorage).getItem(k); return v ? JSON.parse(v) : null; } catch(e){ return null; } }
  function set(k, v, sess){ var st; try { st = sess ? sessionStorage : localStorage; if (v == null) st.removeItem(k); else st.setItem(k, JSON.stringify(v)); return true; } catch(e){ try { if (st) st.removeItem(k); } catch(x){} return false; } }
  var READ = /^(pHome|pPublicInfo|pCheckReplies|pPhotoThumb|pProfilePhoto|pHeroHd|pCareAdvice|nDashboard|nReportsArchive|nPatientsAll|nReportDetail|nGetPhoto|nAnalytics|nSettings|nPoster|nPatientCard)$/;
  var inflight = {}, pending = 0;
  function isNet(e){ return /Koneksi terputus|network|NetworkError|timeout|Failed to fetch|disconnected|ScriptError/i.test(String(e && e.message || e)); }
  function sync(on){ pending = Math.max(0, pending + (on ? 1 : -1)); var d = document.getElementById('ksSync'); if (d) d.classList.toggle('on', pending > 0); }
  function wrap(raw){
    return function(fn){
      var args = [].slice.call(arguments, 1);
      if (!READ.test(fn)) return raw.apply(null, arguments);
      var key = fn + '|' + JSON.stringify(args);
      if (inflight[key]) return inflight[key];
      var p = raw.apply(null, arguments).catch(function(e){
        if (!isNet(e)) throw e;
        return new Promise(function(r){ setTimeout(r, 900); }).then(function(){ return raw.apply(null, [fn].concat(args)); });
      });
      inflight[key] = p;
      var done = function(){ delete inflight[key]; };
      p.then(done, done);
      return p;
    };
  }
  /* Tulis di latar belakang. UI sudah diperbarui lebih dulu; bila gagal → rollback + pesan. */
  function bg(run, opt){
    opt = opt || {}; var tries = 0; sync(true);
    (function attempt(){
      tries++;
      run().then(function(r){ sync(false); if (opt.ok) opt.ok(r); })
        .catch(function(e){
          if (isNet(e) && tries < 3) return setTimeout(attempt, 1500 * tries);
          sync(false); if (opt.fail) opt.fail(e);
        });
    })();
  }
  /* Memori foto: per sesi (sessionStorage) + memori halaman */
  var mem = {};
  function photo(id, url){
    if (url !== undefined){ mem[id] = url; try { sessionStorage.setItem('ph_' + id, url); } catch(e){} return url; }
    if (mem[id]) return mem[id];
    try { var v = sessionStorage.getItem('ph_' + id); if (v) { mem[id] = v; return v; } } catch(e){}
    return '';
  }
  function skel(kind){
    if (kind === 'list') return '<div class="skwrap"><div class="sk h"></div><div class="sk t"></div>' + '<div class="sk row"></div>'.repeat(5) + '</div>';
    if (kind === 'dash') return '<div class="skwrap" style="padding:0"><div class="skgrid">' + '<div class="sk kpi"></div>'.repeat(4) + '</div><div class="sk card" style="height:320px"></div></div>';
    if (kind === 'detail') return '<div class="skwrap" style="padding:0"><div class="sk h"></div><div class="skgrid"><div class="sk card" style="height:360px"></div><div class="sk card" style="height:360px"></div></div></div>';
    return '<div class="skwrap"><div class="sk t"></div><div class="sk h"></div><div class="sk card"></div><div class="sk row"></div><div class="sk row"></div><div class="sk row"></div></div>';
  }
  function same(a, b){ try { return JSON.stringify(a) === JSON.stringify(b); } catch(e){ return false; } }
  /* Boleh menggambar ulang layar tanpa mengganggu pengguna? */
  function quiet(){
    var a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return false;
    if (document.querySelector('.sheet-ov,.rp-ov,.zoomp,.overlay,.zoom,.timer-ov')) return false;
    var sel = window.getSelection && String(window.getSelection()); if (sel) return false;
    return true;
  }
  function keepScroll(fn){ var y = window.scrollY; fn(); window.scrollTo(0, y); }
  /* Pita koneksi */
  function net(online){
    var b = document.getElementById('ksNet');
    if (!b){ b = document.createElement('div'); b.id = 'ksNet'; b.className = 'netbar'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
    b.className = 'netbar on' + (online ? ' ok' : '');
    b.innerHTML = '<i></i>' + (online ? 'Tersambung kembali' : 'Tidak ada koneksi – menampilkan data terakhir');
    clearTimeout(net.t); if (online) net.t = setTimeout(function(){ b.classList.remove('on'); }, 2200);
  }
  window.addEventListener('offline', function(){ net(false); });
  window.addEventListener('online', function(){ net(true); if (KS.onOnline) KS.onOnline(); });
  document.addEventListener('DOMContentLoaded', function(){ var d = document.createElement('div'); d.id = 'ksSync'; d.className = 'syncdot'; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d); });
  return { get: get, set: set, wrap: wrap, bg: bg, photo: photo, skel: skel, same: same, quiet: quiet, keepScroll: keepScroll, sync: sync, isNet: isNet, onOnline: null };
})();
