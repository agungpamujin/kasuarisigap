/* v3.3 (UX-05/UX-08): setiap isian otomatis mendapat nama aksesibel – dari label di dekatnya atau placeholder –
   bila belum punya <label for>. Berlaku untuk semua layar yang digambar ulang (MutationObserver). */
(function(){
  function nameOf(el){
    if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return null;
    if (el.id && document.querySelector('label[for="' + el.id + '"]')) return null;
    if (el.closest('label')) return null;
    var box = el.closest('.frow, .fld, .field, div'), lb = null;
    for (var n = el; n && n !== document.body && !lb; n = n.parentElement){
      var p = n.previousElementSibling;
      while (p && !lb){ if (p.tagName === 'LABEL' || (p.classList && p.classList.contains('lbl'))) lb = p; p = p.previousElementSibling; }
      if (n.parentElement && n.parentElement.classList && n.parentElement.classList.contains('frow')) { var l2 = n.parentElement.querySelector('label'); if (l2) lb = l2; }
      if (n.tagName === 'FORM' || (n.classList && (n.classList.contains('card') || n.classList.contains('modal')))) break;
    }
    var t = lb ? lb.textContent.replace(/\*/g, '').trim() : '';
    return t || el.getAttribute('placeholder') || el.getAttribute('title') || null;
  }
  function fix(root){
    (root.querySelectorAll ? root : document).querySelectorAll('input:not([type=hidden]),select,textarea').forEach(function(el){
      var n = nameOf(el); if (n) el.setAttribute('aria-label', n.slice(0, 80));
    });
  }
  var t = null;
  function run(){ clearTimeout(t); t = setTimeout(function(){ fix(document); }, 30); }
  if (window.MutationObserver) new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', run);
})();
