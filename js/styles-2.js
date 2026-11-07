/* =====================================================================
   v3.5 · KNav – navigasi terpusat (riwayat browser, tombol Back HP, refresh)
   - Memakai google.script.history (API resmi Apps Script) bila tersedia; di luar
     Apps Script memakai window.history.
   - Yang disimpan hanya NAMA halaman (mis. "edu", "topik:KOMPRES") di sessionStorage
     tab ini – tanpa token, identitas, atau data klinis.
   ===================================================================== */
window.KNav = (function(){
  var scope = 'x', params = {}, stack = [], idx = 0, ignore = 0, pend = null, onRoute = null, ready = false, GH = null, quietN = 0, liveMin = 0;
  function gh(){ try { return (window.google && google.script && google.script.history) || null; } catch (e) { return null; } }
  function st(i, r){ return { ks: 1, i: i, r: r }; }
  function save(){ try { sessionStorage.setItem('ks_nav_' + scope, JSON.stringify({ s: stack.slice(0, idx + 1), i: idx })); } catch (e) {} }
  function hpush(i, r){ try { if (GH) GH.push(st(i, r), params, ''); else history.pushState(st(i, r), ''); } catch (e) {} }
  function hrepl(i, r){ try { if (GH) GH.replace(st(i, r), params, ''); else history.replaceState(st(i, r), ''); } catch (e) {} }
  function onPop(s){
    if (!s || !s.ks) return;                                   /* entri di luar aplikasi – biarkan browser */
    if (pend && s.i === pend.i){ idx = s.i; var f = pend.f; pend = null; f(); save(); return; }
    if (s.i < liveMin) liveMin = s.i;
    if (ignore > 0){ ignore--; idx = s.i; stack[idx] = s.r; save(); return; }
    var prev = stack[idx], delta = s.i - idx; idx = s.i; stack[idx] = s.r; save();
    if (onRoute) onRoute(s.r, prev, delta);
  }
  function rewind(i, f){
    if (idx === i){ f(); save(); return; }
    if (i < liveMin){ idx = i; liveMin = i; f(); save(); return; } /* riwayat sebelum refresh tidak pasti – cukup ganti entri saat ini */
    pend = { i: i, f: f }; var n = i - idx;
    setTimeout(function(){ if (pend && pend.f === f){ pend = null; idx = i; f(); save(); } }, 900); /* cadangan bila event tidak datang */
    try { history.go(n); } catch (e) {}
  }
  return {
    init: function(o){
      scope = o.scope; params = o.params || {}; onRoute = o.onRoute; GH = gh();
      try { var v = JSON.parse(sessionStorage.getItem('ks_nav_' + scope) || 'null'); if (v && v.s && v.s.length){ stack = v.s; idx = Math.min(v.i, v.s.length - 1); } } catch (e) {}
      liveMin = idx; /* entri sebelum refresh tidak dipakai untuk 'mundur otomatis' (aman bila riwayat browser berbeda) */
      if (GH && GH.setChangeHandler) GH.setChangeHandler(function(e){ onPop(e && e.state); });
      else window.addEventListener('popstate', function(e){ onPop(e.state); });
      return stack.length ? stack[idx] : null;
    },
    cur: function(){ return stack[idx]; },
    stack: function(){ return stack.slice(0, idx + 1); },
    indexOf: function(r){ return stack.lastIndexOf(r, idx); },
    isQuiet: function(){ return quietN > 0; },
    quiet: function(fn){ quietN++; try { return fn(); } finally { quietN--; } },
    /* kind: 'push' | 'replace' | 'reset' | {to:i} (mundur ke i) | {after:i} (mundur ke i lalu tambah) */
    nav: function(r, kind){
      if (!ready){ ready = true; stack[idx] = r; stack.length = idx + 1; hrepl(idx, r); save(); return; }
      var cur = stack[idx]; if (r === cur) return;
      if (kind !== 'reset' && idx > liveMin && stack[idx - 1] === r){ ignore++; idx--; save(); try { history.back(); } catch (e) {} return; }
      if (kind === 'replace'){ stack[idx] = r; hrepl(idx, r); save(); return; }
      if (kind === 'reset'){ rewind(0, function(){ stack = [r]; idx = 0; hrepl(0, r); }); return; }
      if (kind && kind.to !== undefined){ var t = kind.to; rewind(t, function(){ stack.length = t + 1; stack[t] = r; hrepl(t, r); }); return; }
      if (kind && kind.after !== undefined){ var a = kind.after; rewind(a, function(){ idx = a + 1; stack.length = idx; stack[idx] = r; hpush(idx, r); }); return; }
      idx++; stack.length = idx; stack[idx] = r; hpush(idx, r); save();
    },
    /* batalkan pop terakhir (mis. balasan belum dikirim) */
    revert: function(delta){ if (!delta) return; ignore++; idx -= delta; try { history.go(-delta); } catch (e) {} },
    clear: function(){ stack = []; idx = 0; ready = false; try { sessionStorage.removeItem('ks_nav_' + scope); } catch (e) {} }
  };
})();
