/* =====================================================================
   KASUARI SIGAP – TOPIK EDUKASI PASIEN KEMOTERAPI (v2.6.0)
   Semua teks di file ini adalah DRAF dan WAJIB ditelaah tim onkologi /
   disesuaikan dengan SPO ruangan sebelum dipakai pada pasien.
   Mengubah teks: edit isi EDU_TOPICS di bawah (lead, points, avoid, tip,
   call = "Hubungi perawat bila", igd = "Langsung ke IGD bila").
   Foto klinis per topik: isi EDU_TOPIC_PHOTOS (lihat petunjuk di bawah).
   ===================================================================== */

/* Ikon tambahan untuk daftar topik */
(function(){
  var x = {
    ruler: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6 8v3M9.5 8v4M13 8v3M16.5 8v4"/>',
    port: '<circle cx="12" cy="13" r="5"/><circle cx="12" cy="13" r="1.8"/><path d="M12 8V3"/>',
    nausea: '<circle cx="12" cy="12" r="8.5"/><path d="M8 10h.01M16 10h.01"/><path d="M8.5 16c1-1 2-1 3.5 0s2.5 1 3.5 0"/>',
    thermo: '<path d="M10 4a2 2 0 0 1 4 0v10.3a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
    mouth: '<path d="M3.5 11c2.5-2.5 5-3.5 8.5-1 3.5-2.5 6-1.5 8.5 1-2 4.5-5 6.5-8.5 6.5S5.5 15.5 3.5 11z"/><path d="M3.5 11h17"/>',
    battery: '<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3"/><path d="M5.5 10v4"/>',
    hair: '<path d="M5 13a7 7 0 0 1 14 0"/><path d="M4 13h16"/><path d="M8 13v2a4 4 0 0 0 8 0v-2"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6.5 7-3 0-4.5-1.5-6-4l-1.8-3a1.4 1.4 0 0 1 2.3-1.6L8 15"/>',
    belly: '<path d="M7 3v4c-2 1.5-3 4-3 6.5C4 18 7.5 21 12 21s8-3 8-7.5c0-2.5-1-5-3-6.5V3"/><path d="M12 12.5v.01"/>',
    plate: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M12 12h8.5"/>',
    glass: '<path d="M6 3h12l-1.5 17a1.5 1.5 0 0 1-1.5 1.3H9a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M6.8 10h10.4"/>',
    glove: '<path d="M7 21v-5l-2.5-4a1.4 1.4 0 0 1 2.3-1.6L8 12V5a1.5 1.5 0 0 1 3 0v5-6.5a1.5 1.5 0 0 1 3 0V10V5.5a1.5 1.5 0 0 1 3 0V15c0 3-1.5 4.5-3 6z"/>',
    pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.5 8.5l5 7" />',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    hosp: '<rect x="4" y="6" width="16" height="15" rx="1.5"/><path d="M12 9.5v5M9.5 12h5"/><path d="M9 21v-3h6v3"/><path d="M8 3h8v3H8z"/>'
  };
  for (var k in x) ICON[k] = x[k];
})();

/* ---------- Ilustrasi (SVG, gaya teal) ---------- */
var SKIN = '#F6D3BC', SKIN2 = '#E9B695', TEAL = '#0E9C9A', TEAL7 = '#086C6B', NAVY = '#0D3B57', LIME = '#6FA52A';
function svgArt(label, bg, body){
  return '<svg viewBox="0 0 320 170" role="img" aria-label="' + esc(label) + '" font-family="inherit"><rect width="320" height="170" fill="' + bg + '"/>' + body + '</svg>';
}
function sT(x, y, t, o){ o = o || {}; return '<text x="' + x + '" y="' + y + '" font-size="' + (o.s || 11) + '" font-weight="' + (o.w || 800) + '" fill="' + (o.c || NAVY) + '"' + (o.a ? ' text-anchor="' + o.a + '"' : '') + '>' + t + '</text>'; }
function sPill(x, y, w, t, c, bg){ return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="20" rx="10" fill="' + (bg || '#fff') + '"/>' + sT(x + w / 2, y + 14, t, { s: 10.5, c: c || TEAL7, a: 'middle' }); }
function sArm(x, y, w){ /* lengan bawah horizontal + tangan di kanan */
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="46" rx="23" fill="' + SKIN + '"/>' +
    '<ellipse cx="' + (x + w + 8) + '" cy="' + (y + 23) + '" rx="30" ry="25" fill="' + SKIN + '"/>' +
    '<path d="M' + (x + w + 26) + ' ' + (y + 6) + ' q14 4 22 0 M' + (x + w + 30) + ' ' + (y + 18) + ' q16 3 24 0 M' + (x + w + 30) + ' ' + (y + 30) + ' q14 3 22 0" stroke="' + SKIN2 + '" stroke-width="9" stroke-linecap="round" fill="none"/>' +
    '<path d="M' + (x + 20) + ' ' + (y + 12) + ' h' + (w - 40) + '" stroke="' + SKIN2 + '" stroke-width="1.5" opacity=".5"/>';
}
function sCheck(x, y, c){ return '<circle cx="' + x + '" cy="' + y + '" r="10" fill="' + (c || '#1F9D63') + '"/><path d="M' + (x - 4.5) + ' ' + y + 'l3 3 6-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; }
function sCross(x, y){ return '<circle cx="' + x + '" cy="' + y + '" r="10" fill="#D23C3C"/><path d="M' + (x - 4) + ' ' + (y - 4) + 'l8 8M' + (x + 4) + ' ' + (y - 4) + 'l-8 8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>'; }
function sDrop(x, y, s, c){ s = s || 1; return '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 -14 C 6 -5, 10 0, 10 5 A10 10 0 0 1 -10 5 C -10 0, -6 -5, 0 -14z" fill="' + (c || '#3B8FD9') + '"/>'; }
function sPerson(x, y, c, s){ s = s || 1; return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><circle cx="0" cy="-30" r="13" fill="' + SKIN + '"/><path d="M-22 22 v-18 a22 22 0 0 1 44 0 v18z" fill="' + c + '"/></g>'; }

var EDU_ART = {
  compress: function(){ return svgArt('Kompres dingin dan kompres hangat', '#EEF5FB',
    '<rect x="22" y="36" width="120" height="84" rx="22" fill="#CFE6FA" stroke="#3B8FD9" stroke-width="3"/>' +
    '<g stroke="#3B8FD9" stroke-width="3" stroke-linecap="round"><path d="M82 56v44M63 67l38 22M101 67l-38 22"/></g>' +
    '<rect x="178" y="36" width="120" height="84" rx="22" fill="#FFE2CC" stroke="#E0762C" stroke-width="3"/>' +
    '<path d="M238 98c-10 0-17-7-17-15 0-7 5-11 8-17 1 5 4 7 6 7 0-7 2-13 8-18 0 9 12 14 12 28 0 8-7 15-17 15z" fill="#E0762C"/>' +
    sT(82, 142, 'DINGIN', { s: 13, c: '#1F5F99', a: 'middle' }) + sT(238, 142, 'HANGAT', { s: 13, c: '#B4541A', a: 'middle' }) +
    sT(160, 82, 'atau', { s: 12, c: NAVY, a: 'middle', w: 700 }) + sT(160, 162, 'Mengikuti jenis obat kemo · tanya perawat', { s: 10.5, c: TEAL7, a: 'middle', w: 700 })); },

  measure: function(){ return svgArt('Mengukur dan memotret area bengkak dengan koin pembanding', '#E7F6F5',
    sArm(14, 96, 176) +
    '<ellipse cx="112" cy="119" rx="36" ry="17" fill="#EE9C93" opacity=".75"/>' +
    '<ellipse cx="112" cy="119" rx="46" ry="23" fill="none" stroke="#6B4BC4" stroke-width="2.4" stroke-dasharray="5 4"/>' +
    '<circle cx="176" cy="84" r="12" fill="#E2BE52" stroke="#B08A2E" stroke-width="2"/>' + sT(176, 88, 'koin', { s: 8.5, c: '#6B5214', a: 'middle' }) +
    '<rect x="248" y="14" width="52" height="92" rx="10" fill="' + NAVY + '"/><rect x="253" y="24" width="42" height="68" rx="4" fill="#BFE7E4"/>' +
    '<rect x="260" y="36" width="28" height="22" rx="3" fill="none" stroke="' + TEAL7 + '" stroke-width="2"/><circle cx="274" cy="99" r="3" fill="#fff"/>' +
    '<path d="M246 60 C 214 64, 180 78, 150 100" stroke="' + TEAL7 + '" stroke-width="1.6" stroke-dasharray="4 4" fill="none"/>' +
    sPill(186, 46, 58, '20–30 cm') +
    sT(14, 26, '1. Cahaya terang, dari atas', { s: 11 }) + sT(14, 44, '2. Koin di samping area', { s: 11 }) + sT(14, 62, '3. Batas ditandai pulpen', { s: 11, c: '#5B3FB0' }) +
    sT(14, 164, 'Posisi & jarak sama setiap hari agar bisa dibandingkan', { s: 10.5, c: TEAL7, w: 700 })); },

  skin: function(){ return svgArt('Tangan ditinggikan di atas bantal, area bekas infus bersih', '#E7F6F5',
    '<rect x="18" y="112" width="210" height="36" rx="18" fill="#fff" stroke="#CFE3E2" stroke-width="2"/>' +
    '<g transform="rotate(-8 120 100)">' + sArm(30, 72, 160) + '<rect x="30" y="72" width="54" height="46" rx="12" fill="' + TEAL + '" opacity=".9"/>' +
    '<rect x="120" y="86" width="26" height="18" rx="4" fill="#fff" stroke="#BFD6D5" stroke-width="1.5"/></g>' +
    sT(30, 30, 'Bersih & kering', { s: 12 }) + sCheck(16, 26) +
    sT(30, 52, 'Tinggikan tangan', { s: 12 }) + sCheck(16, 48) +
    sT(236, 30, 'Jangan pijat', { s: 12, c: '#9E2222' }) + sCross(222, 26) +
    sT(236, 52, 'Tanpa salep', { s: 12, c: '#9E2222' }) + sCross(222, 48) +
    sT(160, 164, 'Lengan baju longgar · lihat & foto tiap hari', { s: 10.5, c: TEAL7, a: 'middle', w: 700 })); },

  port: function(){ return svgArt('Port di dada dan PICC di lengan atas', '#EEF3FB',
    '<path d="M18 160 v-58 c0-26 22-40 52-44 l10-12 h40 l10 12 c30 4 52 18 52 44 v58z" fill="' + SKIN + '"/>' +
    '<circle cx="136" cy="96" r="15" fill="#fff" stroke="#6B4BC4" stroke-width="3"/><circle cx="136" cy="96" r="6" fill="#6B4BC4"/>' +
    '<path d="M136 81 C 134 64, 124 56, 112 48" stroke="#6B4BC4" stroke-width="3" fill="none" stroke-dasharray="1 0"/>' +
    sT(96, 132, 'PORT', { s: 13, c: '#5B3FB0', a: 'middle' }) + sT(96, 148, 'di bawah kulit dada', { s: 9.5, c: '#5B3FB0', a: 'middle', w: 700 }) +
    '<rect x="196" y="60" width="118" height="44" rx="22" fill="' + SKIN + '"/>' +
    '<rect x="238" y="66" width="36" height="30" rx="5" fill="#fff" stroke="#9FB9CF" stroke-width="2"/>' +
    '<path d="M256 96 C 258 116, 240 124, 230 132" stroke="' + TEAL7 + '" stroke-width="3" fill="none"/><rect x="220" y="128" width="14" height="10" rx="3" fill="' + TEAL7 + '"/>' +
    sT(256, 30, 'PICC', { s: 13, c: TEAL7, a: 'middle' }) + sT(256, 46, 'di lengan atas', { s: 9.5, c: TEAL7, a: 'middle', w: 700 }) +
    sDrop(282, 138, .9) + '<path d="M268 124 l28 28" stroke="#D23C3C" stroke-width="3" stroke-linecap="round"/>' + sT(250, 164, 'Balutan tetap kering', { s: 10, c: '#1F5F99', a: 'middle' })); },

  nausea: function(){ return svgArt('Makan porsi kecil tapi sering dan minum obat antimual sesuai jadwal', '#FFF4E5',
    '<g><ellipse cx="62" cy="112" rx="40" ry="12" fill="#fff" stroke="#E7C9A3" stroke-width="2"/><circle cx="54" cy="104" r="8" fill="#F5E2B8"/><circle cx="70" cy="106" r="6" fill="#9CCB6B"/></g>' +
    '<g><ellipse cx="150" cy="112" rx="40" ry="12" fill="#fff" stroke="#E7C9A3" stroke-width="2"/><circle cx="144" cy="104" r="8" fill="#F5E2B8"/><circle cx="158" cy="106" r="5" fill="#E88B5B"/></g>' +
    sT(106, 140, 'Porsi kecil, 5–6 kali sehari', { s: 11, a: 'middle' }) +
    '<circle cx="252" cy="62" r="30" fill="#fff" stroke="' + TEAL + '" stroke-width="3"/><path d="M252 42v20l12 8" stroke="' + NAVY + '" stroke-width="3" stroke-linecap="round" fill="none"/>' +
    '<g transform="translate(236 104) rotate(-30)"><rect x="0" y="0" width="36" height="16" rx="8" fill="#fff" stroke="#E0762C" stroke-width="2"/><rect x="0" y="0" width="18" height="16" rx="8" fill="#E0762C"/></g>' +
    sT(254, 148, 'Obat antimual', { s: 11, a: 'middle' }) + sT(254, 162, 'tepat waktu', { s: 11, a: 'middle' }) +
    '<path d="M22 30 h56 l-5 44 h-46z" fill="#DDEFFB" stroke="#3B8FD9" stroke-width="2"/><path d="M26 48 h48" stroke="#3B8FD9" stroke-width="2"/>' + sT(92, 50, 'Minum sedikit-sedikit', { s: 11, c: '#1F5F99' })); },

  fever: function(){ return svgArt('Termometer menunjukkan 38 derajat, cuci tangan', '#FDECEC',
    '<rect x="44" y="18" width="30" height="104" rx="15" fill="#fff" stroke="#9E2222" stroke-width="3"/><circle cx="59" cy="130" r="22" fill="#D23C3C"/>' +
    '<rect x="53" y="50" width="12" height="72" fill="#D23C3C"/><path d="M78 50 h14" stroke="#9E2222" stroke-width="2"/>' +
    sT(96, 46, '≥ 38 °C', { s: 22, c: '#9E2222' }) + sT(96, 66, 'demam = segera ke IGD', { s: 11, c: '#9E2222' }) +
    sT(96, 84, 'jangan menunggu besok', { s: 10.5, c: '#9E2222', w: 700 }) +
    '<g transform="translate(236 128) scale(.8)"><path d="M-40 10 c0-22 18-30 40-30 s40 8 40 30 v10 h-80z" fill="' + SKIN + '"/><path d="M-30 -2 q8 -6 16 0 M-6 -4 q8 -6 16 0 M18 -2 q8 -6 16 0" stroke="' + SKIN2 + '" stroke-width="3" fill="none" stroke-linecap="round"/></g>' +
    '<g fill="#fff" stroke="#9FC6E8" stroke-width="2"><circle cx="212" cy="104" r="6"/><circle cx="230" cy="96" r="5"/><circle cx="250" cy="102" r="7"/><circle cx="268" cy="95" r="4"/></g>' +
    sT(236, 150, 'Cuci tangan sesering mungkin', { s: 10.5, a: 'middle' }) + sT(236, 164, 'Hindari orang yang sedang sakit', { s: 10.5, a: 'middle', w: 700 })); },

  mouth: function(){ return svgArt('Sikat gigi berbulu lembut dan berkumur', '#EAF4FB',
    '<g transform="rotate(-18 110 80)"><rect x="30" y="74" width="140" height="14" rx="7" fill="' + TEAL + '"/><rect x="150" y="56" width="44" height="18" rx="4" fill="#fff" stroke="' + TEAL + '" stroke-width="2"/>' +
    '<g stroke="#9FC6E8" stroke-width="2.5" stroke-linecap="round"><path d="M156 56v-12M164 56v-14M172 56v-12M180 56v-14M188 56v-12"/></g></g>' +
    sT(40, 142, 'Sikat gigi berbulu lembut', { s: 11 }) + sT(40, 158, 'pelan-pelan, sesudah makan', { s: 10.5, w: 700, c: TEAL7 }) +
    '<path d="M236 58 h56 l-6 70 a6 6 0 0 1 -6 5 h-32 a6 6 0 0 1 -6 -5z" fill="#DDEFFB" stroke="#3B8FD9" stroke-width="2.5"/><path d="M240 82 h48" stroke="#3B8FD9" stroke-width="2"/>' +
    '<g fill="#fff"><circle cx="252" cy="100" r="3"/><circle cx="270" cy="112" r="2.5"/><circle cx="262" cy="94" r="2"/></g>' +
    sT(264, 150, 'Kumur rutin', { s: 11, a: 'middle', c: '#1F5F99' }) + sT(264, 34, 'tanpa alkohol', { s: 10.5, a: 'middle', c: '#1F5F99', w: 700 })); },

  fatigue: function(){ return svgArt('Baterai rendah, istirahat dan jalan ringan', '#F1EEFA',
    '<rect x="22" y="40" width="76" height="40" rx="8" fill="#fff" stroke="#6B4BC4" stroke-width="3"/><rect x="98" y="52" width="7" height="16" rx="2" fill="#6B4BC4"/><rect x="28" y="46" width="18" height="28" rx="3" fill="#E3A21A"/>' +
    sT(60, 102, 'Lelah itu wajar', { s: 11, a: 'middle', c: '#5B3FB0' }) +
    '<g transform="translate(160 96)"><circle cx="0" cy="-44" r="11" fill="' + SKIN + '"/><path d="M0 -32 l-4 30 M-4 -2 l-12 30 M-4 -2 l14 28 M-2 -26 l-18 14 M-2 -26 l18 10" stroke="' + TEAL + '" stroke-width="7" stroke-linecap="round" fill="none"/></g>' +
    sT(160, 150, 'Jalan santai', { s: 11, a: 'middle' }) + sT(160, 164, '10–15 menit', { s: 10.5, a: 'middle', w: 700, c: TEAL7 }) +
    '<rect x="222" y="92" width="84" height="24" rx="6" fill="#fff" stroke="#B9A9E6" stroke-width="2"/><rect x="226" y="80" width="26" height="16" rx="6" fill="#E4DCF7"/><path d="M222 116v14M306 116v14" stroke="#B9A9E6" stroke-width="3"/>' +
    '<path d="M282 40a14 14 0 1 0 12 20 11 11 0 0 1-12-20z" fill="#6B4BC4"/>' + sT(264, 150, 'Tidur siang', { s: 11, a: 'middle' }) + sT(264, 164, 'singkat', { s: 10.5, a: 'middle', w: 700, c: '#5B3FB0' })); },

  hair: function(){ return svgArt('Kepala tertutup topi, tabir surya dan pelembap', '#FFF7E0',
    '<circle cx="84" cy="94" r="38" fill="' + SKIN + '"/><path d="M42 84 c4-34 80-34 84 0 z" fill="' + TEAL + '"/><rect x="38" y="80" width="92" height="10" rx="5" fill="' + TEAL7 + '"/>' +
    '<circle cx="72" cy="104" r="3" fill="' + NAVY + '"/><circle cx="96" cy="104" r="3" fill="' + NAVY + '"/><path d="M76 118 q8 6 16 0" stroke="' + NAVY + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    sT(84, 158, 'Topi / kerudung', { s: 11, a: 'middle' }) +
    '<circle cx="272" cy="40" r="16" fill="#F5B82E"/><g stroke="#F5B82E" stroke-width="3" stroke-linecap="round"><path d="M272 12v-6M272 74v-6M244 40h-6M306 40h-6M252 20l-4-4M292 60l4 4M292 20l4-4M252 60l-4 4"/></g>' +
    '<rect x="178" y="70" width="36" height="64" rx="8" fill="#fff" stroke="#E0762C" stroke-width="2.5"/><rect x="186" y="60" width="20" height="12" rx="3" fill="#E0762C"/>' + sT(196, 108, 'SPF', { s: 10, c: '#B4541A', a: 'middle' }) +
    '<rect x="228" y="92" width="44" height="42" rx="10" fill="#fff" stroke="' + TEAL + '" stroke-width="2.5"/><rect x="232" y="84" width="36" height="10" rx="4" fill="' + TEAL + '"/>' +
    sT(226, 158, 'Tabir surya & pelembap', { s: 11, a: 'middle' })); },

  nerve: function(){ return svgArt('Tangan kesemutan, cek suhu air dan pakai alas kaki', '#EEF7EA',
    '<path d="M60 150 V92 a8 8 0 0 1 16 0 V60 a8 8 0 0 1 16 0 V56 a8 8 0 0 1 16 0 v4 a8 8 0 0 1 16 0 v34 c0 30 -14 56 -40 56z" fill="' + SKIN + '"/>' +
    '<g stroke="#6B4BC4" stroke-width="2.5" stroke-linecap="round"><path d="M68 40l-4-8M84 36v-9M100 34l4-8M120 38l6-7M46 70l-9-3M142 72l9-3"/></g>' +
    sT(92, 18, 'kesemutan / baal', { s: 11, a: 'middle', c: '#5B3FB0' }) +
    '<path d="M186 66 h88 v40 a20 20 0 0 1 -20 20 h-48 a20 20 0 0 1 -20 -20z" fill="#DDEFFB" stroke="#3B8FD9" stroke-width="2.5"/>' +
    '<path d="M206 58 q6 -10 0 -18 M230 58 q6 -10 0 -18 M254 58 q6 -10 0 -18" stroke="#E0762C" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    sT(230, 146, 'Cek suhu air', { s: 11, a: 'middle' }) + sT(230, 162, 'dengan siku, bukan jari', { s: 10.5, a: 'middle', w: 700, c: '#1F5F99' })); },

  digest: function(){ return svgArt('Diare minum oralit, sembelit makan serat dan bergerak', '#EAF6F2',
    '<rect x="10" y="10" width="146" height="150" rx="16" fill="#fff"/><rect x="164" y="10" width="146" height="150" rx="16" fill="#fff"/>' +
    sT(83, 34, 'DIARE', { s: 13, c: '#1F5F99', a: 'middle' }) +
    '<path d="M52 50 h40 l-5 66 a5 5 0 0 1 -5 4 h-20 a5 5 0 0 1 -5 -4z" fill="#DDEFFB" stroke="#3B8FD9" stroke-width="2.5"/><path d="M55 72 h34" stroke="#3B8FD9" stroke-width="2"/>' +
    '<rect x="98" y="66" width="30" height="42" rx="4" fill="#fff" stroke="' + TEAL + '" stroke-width="2"/>' + sT(113, 91, 'ORS', { s: 9, c: TEAL7, a: 'middle' }) +
    sT(83, 140, 'Oralit & banyak minum', { s: 10.5, a: 'middle' }) +
    sT(237, 34, 'SEMBELIT', { s: 13, c: LIME, a: 'middle' }) +
    '<ellipse cx="214" cy="84" rx="20" ry="14" fill="#9CCB6B"/><path d="M214 70 v-10" stroke="#5E8F2A" stroke-width="3"/>' +
    '<circle cx="258" cy="86" r="15" fill="#E86B5B"/><path d="M258 71 q4 -8 10 -8" stroke="#5E8F2A" stroke-width="3" fill="none"/>' +
    '<rect x="222" y="104" width="30" height="14" rx="7" fill="#F2C78A"/>' +
    sT(237, 140, 'Sayur, buah, bergerak', { s: 10.5, a: 'middle' })); },

  food: function(){ return svgArt('Isi piringku: nasi, lauk, sayur, buah', '#F1F8E8',
    '<circle cx="110" cy="88" r="68" fill="#fff" stroke="#DCE6E8" stroke-width="3"/><circle cx="110" cy="88" r="58" fill="#fff"/>' +
    '<path d="M110 88 L110 30 A58 58 0 0 0 52 88z" fill="#F5E9CF"/>' +
    '<path d="M110 88 L52 88 A58 58 0 0 0 110 146z" fill="#9CCB6B"/>' +
    '<path d="M110 88 L110 146 A58 58 0 0 0 158 120z" fill="#F0A36B"/>' +
    '<path d="M110 88 L158 120 A58 58 0 0 0 110 30z" fill="#E88B7B"/>' +
    sT(82, 66, 'Nasi', { s: 11, a: 'middle' }) + sT(80, 116, 'Sayur', { s: 11, a: 'middle' }) + sT(126, 132, 'Buah', { s: 11, a: 'middle' }) + sT(140, 80, 'Lauk', { s: 11, a: 'middle' }) +
    sT(200, 40, 'Protein tiap makan:', { s: 11 }) + sT(200, 58, 'telur, ikan, ayam,', { s: 10.5, w: 700, c: TEAL7 }) + sT(200, 74, 'tahu, tempe', { s: 10.5, w: 700, c: TEAL7 }) +
    sT(200, 104, 'Masak sampai matang', { s: 11 }) + sT(200, 122, 'Cuci buah & sayur', { s: 11 }) + sT(200, 140, 'Tanpa jamu/suplemen', { s: 11, c: '#9E2222' }) + sT(200, 156, 'tanpa izin dokter', { s: 10.5, c: '#9E2222', w: 700 })); },

  water: function(){ return svgArt('Botol air minum dan warna urin', '#E6F3FB',
    '<rect x="30" y="34" width="54" height="116" rx="14" fill="#fff" stroke="#3B8FD9" stroke-width="3"/><rect x="42" y="18" width="30" height="18" rx="5" fill="#3B8FD9"/>' +
    '<rect x="34" y="70" width="46" height="76" rx="10" fill="#9ED0F2"/><g stroke="#fff" stroke-width="2"><path d="M34 90h12M34 110h12M34 130h12"/></g>' +
    sT(57, 166, '± 2 liter/hari*', { s: 10, a: 'middle', c: '#1F5F99' }) +
    '<g>' + [0, 1, 2, 3, 4, 5, 6, 7].map(function(i){ return '<path transform="translate(' + (106 + (i % 4) * 22) + ' ' + (40 + Math.floor(i / 4) * 34) + ')" d="M0 0h16l-2 24h-12z" fill="#DDEFFB" stroke="#3B8FD9" stroke-width="1.6"/>'; }).join('') + '</g>' +
    sT(146, 120, '8 gelas', { s: 12, a: 'middle', c: '#1F5F99' }) +
    sT(210, 36, 'Warna urin:', { s: 11 }) +
    '<rect x="210" y="46" width="28" height="28" rx="6" fill="#FFF6C7"/><rect x="242" y="46" width="28" height="28" rx="6" fill="#F7DE7A"/><rect x="274" y="46" width="28" height="28" rx="6" fill="#C98A2B"/>' +
    sCheck(224, 90) + sCheck(256, 90, '#8DBA4E') + sCross(288, 90) +
    sT(210, 124, 'Pucat = cukup', { s: 11, c: '#137148' }) + sT(210, 140, 'Pekat = kurang', { s: 11, c: '#9E2222' }) + sT(210, 162, '*kecuali dibatasi dokter', { s: 9.5, w: 700, c: '#1F5F99' })); },

  home: function(){ return svgArt('Sarung tangan, toilet ditutup dan disiram dua kali', '#F3F0FA',
    sPill(110, 10, 100, '± 48 jam setelah kemo', '#5B3FB0') +
    '<path d="M36 146 v-38 l-10 -16 a6 6 0 0 1 10 -6 l6 8 v-38 a6 6 0 0 1 12 0 v26 -32 a6 6 0 0 1 12 0 v32 -26 a6 6 0 0 1 12 0 v56 c0 14 -6 24 -12 34z" fill="#8FD3CF" stroke="' + TEAL7 + '" stroke-width="2"/>' +
    sT(60, 164, 'Sarung tangan', { s: 10.5, a: 'middle' }) +
    '<rect x="132" y="50" width="56" height="30" rx="6" fill="#fff" stroke="#9FB9CF" stroke-width="2.5"/><path d="M126 86 h68 a4 4 0 0 1 0 8 c-4 26 -20 34 -34 34 s-30 -8 -34 -34 a4 4 0 0 1 0 -8z" fill="#fff" stroke="#9FB9CF" stroke-width="2.5"/>' +
    '<rect x="146" y="126" width="28" height="18" fill="#fff" stroke="#9FB9CF" stroke-width="2.5"/><path d="M126 86 h68" stroke="#6B4BC4" stroke-width="4" stroke-linecap="round"/>' +
    sT(160, 164, 'Tutup · siram 2×', { s: 10.5, a: 'middle' }) +
    '<g fill="#fff" stroke="#B9A9E6" stroke-width="2"><circle cx="246" cy="92" r="9"/><circle cx="266" cy="78" r="7"/><circle cx="286" cy="94" r="10"/></g>' +
    '<path d="M234 112 c0-10 64-10 64 0 v14 h-64z" fill="' + SKIN + '"/>' + sT(266, 150, 'Cuci tangan', { s: 10.5, a: 'middle' }) + sT(266, 164, 'pakai sabun', { s: 10, a: 'middle', w: 700, c: '#5B3FB0' })); },

  meds: function(){ return svgArt('Kalender kontrol dan kotak obat mingguan', '#E7F6F5',
    '<rect x="22" y="26" width="120" height="120" rx="12" fill="#fff" stroke="' + TEAL + '" stroke-width="3"/><rect x="22" y="26" width="120" height="28" rx="12" fill="' + TEAL + '"/><rect x="22" y="44" width="120" height="10" fill="' + TEAL + '"/>' +
    '<path d="M48 18v16M116 18v16" stroke="' + NAVY + '" stroke-width="4" stroke-linecap="round"/>' +
    '<g fill="#DCE6E8">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function(i){ return '<rect x="' + (32 + (i % 4) * 26) + '" y="' + (64 + Math.floor(i / 4) * 26) + '" width="18" height="18" rx="4"/>'; }).join('') + '</g>' +
    '<rect x="84" y="90" width="18" height="18" rx="4" fill="#E3A21A"/>' + sT(82, 166, 'Tanggal kontrol', { s: 10.5, a: 'middle' }) +
    '<rect x="166" y="72" width="140" height="44" rx="8" fill="#fff" stroke="#9FB9CF" stroke-width="2.5"/>' +
    ['S', 'S', 'R', 'K', 'J', 'S', 'M'].map(function(d, i){ return '<rect x="' + (170 + i * 19.5) + '" y="78" width="16" height="32" rx="4" fill="' + (i < 3 ? '#E7F6F5' : '#F3F7FA') + '"/>' + sT(178 + i * 19.5, 104, d, { s: 9, a: 'middle', c: TEAL7 }) + (i < 3 ? '<circle cx="' + (178 + i * 19.5) + '" cy="88" r="4" fill="#E0762C"/>' : ''); }).join('') +
    sT(236, 56, 'Minum obat', { s: 11, a: 'middle' }) + sT(236, 140, 'Tepat waktu,', { s: 10.5, a: 'middle' }) + sT(236, 156, 'jangan berhenti sendiri', { s: 10.5, a: 'middle', w: 700, c: '#9E2222' })); },

  mind: function(){ return svgArt('Dua orang saling mendukung dengan hati di antaranya', '#FDEFF3',
    sPerson(92, 118, TEAL, 1.3) + sPerson(228, 118, '#6B4BC4', 1.3) +
    '<path d="M160 86 s-18 -11 -18 -24 a10 10 0 0 1 18 -5 a10 10 0 0 1 18 5 c0 13 -18 24 -18 24z" fill="#E4577C"/>' +
    '<path d="M16 22 h92 a10 10 0 0 1 10 10 v18 a10 10 0 0 1 -10 10 h-70 l-12 10 v-10 a10 10 0 0 1 -10 -10 v-18 a10 10 0 0 1 10 -10z" fill="#fff" stroke="#F0B3C4" stroke-width="2"/>' +
    sT(62, 46, 'Ceritakan', { s: 11, a: 'middle', c: '#B2345E' }) +
    sT(160, 164, 'Perasaan cemas & sedih itu wajar – Anda tidak sendiri', { s: 10.5, a: 'middle', c: '#B2345E' })); },

  igd: function(){ return svgArt('Gedung IGD rumah sakit dan ambulans', '#FDECEC',
    '<rect x="24" y="44" width="150" height="104" rx="6" fill="#fff" stroke="#E7B3B3" stroke-width="2.5"/><rect x="24" y="30" width="150" height="24" rx="6" fill="#D23C3C"/>' +
    sT(99, 47, 'IGD', { s: 14, c: '#fff', a: 'middle' }) +
    '<rect x="84" y="66" width="30" height="30" rx="4" fill="#D23C3C"/><path d="M99 71v20M89 81h20" stroke="#fff" stroke-width="5"/>' +
    '<rect x="80" y="110" width="38" height="38" fill="#F3F7FA" stroke="#E7B3B3" stroke-width="2"/>' +
    '<g fill="#DDEFFB"><rect x="38" y="66" width="30" height="22" rx="3"/><rect x="130" y="66" width="30" height="22" rx="3"/><rect x="38" y="110" width="30" height="22" rx="3"/><rect x="130" y="110" width="30" height="22" rx="3"/></g>' +
    '<rect x="194" y="92" width="112" height="46" rx="8" fill="#fff" stroke="#E7B3B3" stroke-width="2.5"/><path d="M270 92 v-14 h22 l14 14" fill="#fff" stroke="#E7B3B3" stroke-width="2.5"/>' +
    '<path d="M222 104v18M213 113h18" stroke="#D23C3C" stroke-width="5"/><rect x="238" y="80" width="18" height="8" rx="3" fill="#3B8FD9"/>' +
    '<circle cx="222" cy="142" r="11" fill="' + NAVY + '"/><circle cx="282" cy="142" r="11" fill="' + NAVY + '"/>' +
    sT(250, 40, '24 jam', { s: 15, c: '#9E2222', a: 'middle' }) + sT(250, 58, 'jangan menunda', { s: 11, c: '#9E2222', a: 'middle' })); }
};

/* ---------- Isi topik ----------
   group: A = Bekas infus & ekstravasasi, B = Efek samping kemoterapi, C = Sehari-hari di rumah */
var EDU_GROUPS = [['A', 'Bekas infus & ekstravasasi'], ['B', 'Efek samping kemoterapi'], ['C', 'Sehari-hari di rumah']];
var EDU_TOPICS = [
  { id: 'measure', g: 'A', ic: 'ruler', tone: 'purple', title: 'Cara mengukur & memotret bengkak', min: 2,
    lead: 'Foto yang rapi membantu perawat melihat apakah area bekas infus membesar, mengecil, atau berubah warna dari hari ke hari.',
    points: ['Foto di tempat yang terang (cahaya siang dekat jendela), tanpa lampu kilat bila bisa', 'Letakkan koin di samping area sebagai pembanding ukuran', 'Arahkan kamera tegak lurus dari atas, jarak sekitar 20–30 cm', 'Bila perawat sudah menggambar batas dengan pulpen, jangan dihapus – biarkan terlihat di foto', 'Ambil foto dengan posisi tangan dan jarak yang sama setiap hari', 'Ukur kira-kira besarnya: sebesar koin, sebesar telapak tangan, atau lebih luas'],
    avoid: ['Memakai filter atau efek kamera', 'Foto buram, terlalu gelap, atau terlalu jauh'],
    tip: 'Kirim foto lewat menu CHECK di Beranda. Aplikasi akan mengingatkan bila foto kurang terang atau buram.',
    call: ['Area kemerahan/bengkak melewati garis pulpen atau lebih besar dari foto sebelumnya', 'Muncul lepuh, kulit menghitam, atau luka terbuka'] },
  { id: 'port', g: 'A', ic: 'port', tone: 'purple', title: 'Port & PICC di rumah', min: 2,
    lead: 'Sebagian pasien pulang dengan selang infus jangka panjang: PORT (tertanam di bawah kulit dada) atau PICC (selang di lengan atas). Perawatannya perlu hati-hati agar tidak infeksi atau tersumbat.',
    points: ['Jaga balutan tetap bersih, kering, dan menempel rapat', 'Tutup balutan dengan plastik saat mandi; jangan berendam atau berenang', 'Datang untuk ganti balutan dan pembilasan (flushing) sesuai jadwal dari perawat', 'Lengan dengan PICC: hindari mengangkat beban berat dan gerakan berulang yang kuat', 'Jangan mengukur tekanan darah atau mengambil darah di lengan yang terpasang PICC', 'Selalu cuci tangan sebelum menyentuh area selang'],
    avoid: ['Menarik, menggunting, atau membuka sendiri balutan dan tutup selang', 'Memakai gunting atau benda tajam di dekat selang'],
    call: ['Balutan basah, lepas, atau kotor', 'Kemerahan, bengkak, nyeri, atau keluar cairan/nanah di sekitar selang', 'Selang terasa lebih panjang dari biasanya atau tutupnya lepas'],
    igd: ['Demam ≥ 38 °C atau menggigil', 'Lengan, leher, atau wajah bengkak di sisi selang', 'Sesak napas atau nyeri dada', 'Selang bocor, patah, atau tercabut – tekan area dengan kasa bersih lalu segera ke IGD'] },
  { id: 'nausea', g: 'B', ic: 'nausea', tone: 'orange', title: 'Mual & muntah', min: 2,
    lead: 'Mual adalah efek samping yang sering, terutama 1–3 hari setelah kemoterapi. Sebagian besar dapat dicegah dengan obat antimual yang diminum tepat waktu.',
    points: ['Minum obat antimual sesuai jadwal dari dokter – jangan menunggu sampai mual berat', 'Makan porsi kecil tapi sering (5–6 kali sehari)', 'Pilih makanan hangat-hangat kuku atau dingin yang tidak berbau tajam', 'Minum sedikit-sedikit tapi sering di antara waktu makan', 'Duduk tegak sekitar 30 menit setelah makan', 'Jahe hangat atau permen jahe dapat membantu sebagian orang'],
    avoid: ['Makanan berlemak, digoreng, sangat manis, atau pedas', 'Berbaring segera setelah makan'],
    call: ['Muntah lebih dari 3 kali dalam sehari', 'Tidak dapat makan atau minum selama 24 jam', 'Obat antimual tidak membantu'],
    igd: ['Muntah terus-menerus dan tidak bisa minum sama sekali', 'Muntah darah atau cairan seperti ampas kopi', 'Sangat lemas, pusing saat berdiri, atau hampir tidak buang air kecil'] },
  { id: 'fever', g: 'B', ic: 'thermo', tone: 'red', title: 'Demam & risiko infeksi', min: 2,
    lead: 'Kemoterapi dapat menurunkan sel darah putih (neutropenia), biasanya 7–14 hari setelah kemo. Saat itu tubuh mudah terkena infeksi, dan demam bisa menjadi tanda bahaya.',
    points: ['Siapkan termometer di rumah dan ukur suhu bila badan terasa tidak enak atau menggigil', 'Cuci tangan dengan sabun sebelum makan, setelah dari toilet, dan setelah bepergian', 'Hindari orang yang sedang batuk, pilek, cacar, atau sakit lainnya', 'Pakai masker di tempat ramai', 'Makan makanan yang dimasak sampai matang', 'Jaga kebersihan mulut dan kulit; mandi setiap hari'],
    avoid: ['Minum obat penurun panas sebelum menghubungi rumah sakit – obat dapat menutupi tanda infeksi (kecuali sudah dianjurkan dokter)', 'Makanan mentah atau setengah matang (telur, daging, sushi, lalapan yang tidak dicuci)'],
    call: ['Batuk, pilek, nyeri tenggorokan, atau nyeri saat buang air kecil', 'Luka atau area bekas infus menjadi merah, bengkak, bernanah'],
    igd: ['Suhu 38 °C atau lebih, walaupun hanya sekali', 'Menggigil, badan sangat lemas, atau bingung', 'Sesak napas'] },
  { id: 'mouth', g: 'B', ic: 'mouth', tone: 'blue', title: 'Sariawan & perawatan mulut', min: 2,
    lead: 'Beberapa obat kemo membuat lapisan mulut menjadi tipis dan mudah luka (mukositis). Mulut yang bersih membantu mencegah sariawan dan infeksi.',
    points: ['Sikat gigi pelan-pelan dengan sikat berbulu lembut setelah makan dan sebelum tidur', 'Berkumur beberapa kali sehari dengan air matang atau air garam (½ sendok teh garam dalam 1 gelas air), atau obat kumur tanpa alkohol sesuai anjuran', 'Oleskan pelembap bibir agar tidak pecah-pecah', 'Pilih makanan lunak dan tidak terlalu panas', 'Bila memakai gigi palsu, lepas dan bersihkan setiap hari'],
    avoid: ['Obat kumur yang mengandung alkohol', 'Makanan pedas, asam, keras, atau terlalu panas', 'Merokok dan minuman beralkohol'],
    call: ['Sariawan membuat sulit makan atau minum', 'Muncul bercak putih di mulut atau lidah', 'Gusi berdarah dan tidak berhenti'],
    igd: ['Tidak bisa minum sama sekali', 'Sariawan disertai demam ≥ 38 °C'] },
  { id: 'fatigue', g: 'B', ic: 'battery', tone: 'purple', title: 'Lelah (fatigue)', min: 1,
    lead: 'Rasa lelah yang tidak hilang dengan tidur adalah efek samping yang sangat umum. Biasanya membaik setelah rangkaian kemoterapi selesai.',
    points: ['Jalan santai atau aktivitas ringan 10–15 menit setiap hari, bila kuat', 'Tidur siang singkat (sekitar 30 menit) agar tidur malam tetap nyenyak', 'Kerjakan hal yang paling penting saat badan paling segar', 'Minta bantuan keluarga untuk pekerjaan rumah yang berat', 'Makan cukup dan minum cukup air'],
    avoid: ['Memaksakan diri bekerja berat', 'Berbaring seharian tanpa bergerak sama sekali'],
    call: ['Lelah makin berat hingga tidak bisa melakukan aktivitas sehari-hari', 'Tampak pucat, jantung berdebar, atau pusing'],
    igd: ['Sesak napas saat istirahat atau nyeri dada', 'Pingsan atau hampir pingsan'] },
  { id: 'hair', g: 'B', ic: 'hair', tone: 'orange', title: 'Rambut rontok, kulit & kuku', min: 2,
    lead: 'Rambut dapat mulai rontok sekitar 2–3 minggu setelah kemo pertama, tergantung jenis obat. Rambut biasanya tumbuh kembali setelah pengobatan selesai. Kulit bisa menjadi kering dan lebih sensitif terhadap matahari.',
    points: ['Gunakan sampo lembut dan sisir bergigi jarang', 'Pakai topi, kerudung, atau syal untuk melindungi kepala', 'Gunakan tabir surya (SPF 30 atau lebih) dan pakaian tertutup saat keluar rumah', 'Oleskan pelembap tanpa pewangi setelah mandi', 'Potong kuku pendek dan pakai sarung tangan saat berkebun atau mencuci'],
    avoid: ['Mengecat, mengeriting, atau memakai alat pengering panas pada rambut', 'Sabun dan losion yang berpewangi keras'],
    call: ['Ruam kulit yang luas atau sangat gatal', 'Kulit mengelupas, melepuh, atau kuku bernanah'] },
  { id: 'nerve', g: 'B', ic: 'hand', tone: 'green', title: 'Kesemutan & baal (neuropati)', min: 2,
    lead: 'Beberapa obat kemo (misalnya oksaliplatin, paklitaksel, vinkristin) dapat mengganggu saraf tepi sehingga jari tangan atau kaki terasa kesemutan, baal, atau seperti terbakar.',
    points: ['Cek suhu air mandi dengan siku atau termometer – bukan dengan jari', 'Selalu pakai alas kaki, juga di dalam rumah', 'Pasang penerangan di malam hari dan singkirkan barang yang membuat tersandung', 'Hati-hati saat memakai pisau, gunting, atau benda panas', 'Bila mendapat oksaliplatin: hindari minuman dingin dan memegang benda dingin beberapa hari setelah kemo; pakai sarung tangan saat membuka kulkas'],
    avoid: ['Merendam tangan/kaki di air panas', 'Berjalan tanpa alas kaki'],
    call: ['Kesemutan membuat sulit mengancingkan baju, menulis, atau berjalan', 'Keluhan makin berat setelah setiap siklus kemo', 'Sering tersandung atau jatuh'] },
  { id: 'digest', g: 'B', ic: 'belly', tone: 'green', title: 'Diare & sembelit', min: 2,
    lead: 'Kemoterapi dan obat antimual dapat mengubah pola buang air besar. Diare dapat membuat tubuh cepat kekurangan cairan; sembelit membuat perut tidak nyaman.',
    points: ['Diare: minum lebih banyak – air putih, kuah bening, atau oralit', 'Diare: makan porsi kecil, lunak, rendah serat (nasi tim, pisang, roti)', 'Sembelit: perbanyak sayur, buah, dan air putih bila tidak ada larangan', 'Sembelit: bergerak atau jalan santai setiap hari', 'Catat berapa kali buang air besar dalam sehari', 'Minum obat pencahar atau antidiare hanya sesuai anjuran dokter'],
    avoid: ['Diare: susu, makanan berlemak, pedas, dan minuman bersoda/berkafein'],
    call: ['Diare 4 kali atau lebih dalam sehari', 'Tidak buang air besar lebih dari 3 hari', 'Perut kembung dan nyeri'],
    igd: ['Tinja berdarah atau hitam', 'Diare disertai demam ≥ 38 °C', 'Pusing berat, sangat lemas, atau hampir tidak buang air kecil', 'Perut sangat nyeri dan muntah'] },
  { id: 'food', g: 'C', ic: 'plate', tone: 'green', title: 'Makan bergizi selama kemo', min: 2,
    lead: 'Makanan yang cukup membantu tubuh memperbaiki sel yang rusak dan menjaga daya tahan. Tidak perlu diet khusus kecuali dianjurkan dokter atau ahli gizi.',
    points: ['Ikuti pola Isi Piringku: nasi/umbi, lauk, sayur, dan buah', 'Makan protein di setiap waktu makan: telur, ikan, ayam, daging, tahu, tempe, kacang-kacangan', 'Makan porsi kecil tapi sering bila nafsu makan turun', 'Masak makanan sampai matang; cuci buah dan sayur dengan air mengalir', 'Timbang berat badan seminggu sekali'],
    avoid: ['Jamu, herbal, atau suplemen tanpa bertanya dulu ke dokter – sebagian dapat mengganggu kerja obat kemo', 'Makanan mentah atau setengah matang'],
    call: ['Nafsu makan sangat berkurang lebih dari 2 hari', 'Berat badan terus turun'] },
  { id: 'water', g: 'C', ic: 'glass', tone: 'blue', title: 'Minum cukup', min: 1,
    lead: 'Cairan yang cukup membantu ginjal membuang sisa obat kemo dan mencegah dehidrasi, terutama saat mual, muntah, atau diare.',
    points: ['Minum sekitar 8 gelas (± 2 liter) sehari, kecuali dokter membatasi cairan (misalnya ada penyakit jantung atau ginjal)', 'Bawa botol minum agar mudah minum sedikit-sedikit sepanjang hari', 'Perhatikan warna urin: kuning pucat berarti cukup minum', 'Kuah sup, jus buah, dan buah berair juga dihitung sebagai cairan'],
    avoid: ['Minuman beralkohol', 'Terlalu banyak kopi atau minuman bersoda'],
    call: ['Urin berwarna pekat atau sangat sedikit', 'Mulut sangat kering dan pusing saat berdiri'],
    igd: ['Tidak buang air kecil lebih dari 12 jam'] },
  { id: 'home', g: 'C', ic: 'glove', tone: 'purple', title: 'Keamanan keluarga di rumah', min: 2,
    lead: 'Sisa obat kemo dapat keluar melalui urin, tinja, muntahan, dan keringat, umumnya sekitar 48 jam setelah kemo (untuk beberapa obat bisa lebih lama – ikuti arahan perawat). Langkah sederhana ini melindungi keluarga.',
    points: ['Tutup kloset sebelum menyiram, lalu siram 2 kali', 'Pasien sebaiknya buang air kecil sambil duduk agar tidak memercik', 'Keluarga memakai sarung tangan saat membersihkan muntahan, urin, atau tinja, lalu cuci tangan dengan sabun', 'Cuci pakaian atau sprei yang terkena cairan tubuh secara terpisah', 'Gunakan kondom bila berhubungan intim selama masa ini, dan tanyakan ke dokter tentang kontrasepsi', 'Anggota keluarga yang sedang hamil sebaiknya tidak membersihkan cairan tubuh pasien'],
    avoid: ['Membersihkan cairan tubuh pasien tanpa sarung tangan'],
    tip: 'Pasien tetap boleh memeluk, makan bersama, dan tidur di rumah bersama keluarga seperti biasa.',
    call: ['Ada keluarga yang terkena cairan tubuh pasien dan kulitnya menjadi merah atau gatal', 'Ragu cara membersihkan tumpahan'] },
  { id: 'meds', g: 'C', ic: 'pill', tone: '', title: 'Obat & jadwal kontrol', min: 1,
    lead: 'Minum obat di rumah dengan benar dan datang kontrol tepat waktu membuat kemoterapi berjalan aman sesuai rencana.',
    points: ['Minum obat sesuai jadwal dan dosis yang tertulis', 'Simpan daftar obat (termasuk nama obat kemo) dan bawa saat kontrol', 'Periksa darah sesuai jadwal sebelum siklus kemo berikutnya', 'Daftar kontrol lebih awal lewat KNOW RS Kariadi', 'Beri tahu dokter semua obat lain, vitamin, atau jamu yang sedang diminum'],
    avoid: ['Menghentikan, menambah, atau mengurangi obat tanpa bertanya ke dokter', 'Meminjam atau memakai obat orang lain'],
    call: ['Lupa minum obat dan bingung harus bagaimana', 'Tidak bisa datang pada jadwal kontrol'], extra: 'meds' },
  { id: 'mind', g: 'C', ic: 'heart', tone: 'pink', title: 'Perasaan & dukungan keluarga', min: 2,
    lead: 'Cemas, sedih, takut, atau mudah marah selama pengobatan adalah hal yang wajar. Membicarakannya membantu Anda merasa lebih ringan.',
    points: ['Ceritakan perasaan Anda kepada keluarga, teman, atau perawat', 'Libatkan keluarga: siapa yang mengantar kontrol, membantu di rumah, dan mengingatkan obat', 'Lakukan kegiatan yang Anda sukai, sekecil apa pun', 'Berdoa, beribadah, atau latihan napas dalam untuk menenangkan diri', 'Bergabung dengan kelompok pendukung pasien kanker bila tersedia'],
    call: ['Merasa sangat sedih, cemas, atau putus asa hampir setiap hari lebih dari 2 minggu', 'Sulit tidur atau tidak nafsu makan karena beban pikiran'],
    igd: ['Muncul pikiran untuk menyakiti diri sendiri – segera hubungi IGD atau minta orang terdekat menemani Anda'] }
];

/* Foto klinis per topik (opsional). Isi dengan foto yang SUDAH punya izin (informed consent pasien / lisensi),
   sudah dipotong & tanpa wajah/tato/nama/nomor RM. Format sama seperti EDU_PHOTOS:
   { src: 'data:image/jpeg;base64,...', caption: '...', source: 'Dok. Ruang Kasuari 3, izin pasien no. ...' } */
var EDU_TOPIC_PHOTOS = {
  measure: [],  /* contoh foto BAIK vs BURUK, foto dengan koin, foto dengan batas pulpen */
  port: [],     /* port & PICC normal, port/PICC dengan tanda infeksi */
  mouth: [],    /* sariawan ringan vs berat (opsional) */
  hair: []      /* hand-foot syndrome / ruam (opsional) */
};

/* ---------- Tampilan ---------- */
function eduTopic(id){ for (var i = 0; i < EDU_TOPICS.length; i++) if (EDU_TOPICS[i].id === id) return EDU_TOPICS[i]; return null; }
function eduTopicRows(g){
  return EDU_TOPICS.filter(function(t){ return t.g === g; }).map(function(t){ return eduRow('eT_' + t.id, t.ic, t.tone, t.title, t.min + ' menit'); }).join('');
}
function bindEduTopics(back){ EDU_TOPICS.forEach(function(t){ on('eT_' + t.id, function(){ showTopic(t.id, back); }); }); }
function tpList(arr, no){ return '<ul class="tp-pts">' + arr.map(function(x){ return '<li' + (no ? ' class="no"' : '') + '>' + icon(no ? 'x' : 'checkc', 'sm') + '<span>' + esc(x) + '</span></li>'; }).join('') + '</ul>'; }
function tpGallery(list){
  if (!list || !list.length) return '';
  return '<div class="tp-sec"><h3>' + icon('image', 'sm') + 'Contoh foto</h3><div class="tp-gal">' + list.map(function(p, i){
    return '<figure><button class="tpimg" data-src="' + i + '" aria-label="Perbesar foto ' + (i + 1) + '"><img src="' + p.src + '" alt="' + esc(p.caption || 'Contoh foto') + '"></button><figcaption>' + esc(p.caption || '') + (p.source ? '<small>Sumber: ' + esc(p.source) + '</small>' : '') + '</figcaption></figure>'; }).join('') + '</div></div>';
}
function showTopic(id, back){
  var t = eduTopic(id); back = back || showEduHome; if (!t) return back();
  var art = eduArtImg(t.id), photos = EDU_TOPIC_PHOTOS[t.id] || [];
  var extra = '';
  if (t.extra === 'meds') extra = '<div class="tp-act"><button class="btn soft block" id="tpDrug">' + icon('clipcheck', 'sm') + ' Lihat / isi obat kemoterapi saya</button>' +
    (S.info && S.info.knowUrl ? '<a class="btn soft block" target="_blank" rel="noopener" href="' + esc(S.info.knowUrl) + '">' + icon('external', 'sm') + ' Daftar kontrol lewat KNOW</a>' : '') + '</div>';
  view(topbar(t.title) + '<div class="scr">' +
    '<div class="tp-wrap"><div class="tp-l"><div class="tp-art">' + art + '</div><p class="tp-lead">' + esc(t.lead) + '</p>' + (t.tip ? '<div class="tp-tip">' + icon('info', 'sm') + '<span>' + esc(t.tip) + '</span></div>' : '') + '</div><div class="tp-r">' +
    '<div class="tp-sec"><h3>' + icon('checkc', 'sm') + 'Yang bisa dilakukan</h3>' + tpList(t.points) + '</div>' +
    (t.avoid && t.avoid.length ? '<div class="tp-sec"><h3>' + icon('x', 'sm') + 'Sebaiknya dihindari</h3>' + tpList(t.avoid, true) + '</div>' : '') +
    tpGallery(photos) + extra +
    (t.call && t.call.length ? '<div class="tp-call"><div class="t">' + icon('phone', 'sm') + 'Kapan hubungi perawat</div><ul>' + t.call.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '') +
    (t.igd && t.igd.length ? '<div class="tp-igd"><div class="t">' + icon('alert', 'sm') + 'Langsung ke IGD bila</div><ul>' + t.igd.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '') +
    '<div class="tp-sec"><h3>' + icon('phone', 'sm') + 'Hubungi</h3>' + callButtons() + '<button class="btn soft block" id="tpAsk" style="margin-top:10px">' + icon('ai', 'sm') + ' Tanya NURSE.AI</button></div>' +
    '<p class="tp-foot">Informasi umum ini tidak menggantikan penjelasan dokter/perawat Anda.</p></div></div></div>');
  on('bBack', back);
  on('tpAsk', function(){ showChat(function(){ showTopic(id, back); }); });
  on('tpDrug', function(){ editDrugs(function(){ showTopic(id, back); }); });
  app.querySelectorAll('.tpimg').forEach(function(b){ b.onclick = function(){ zoomImg(b.querySelector('img').src); }; });
}
/* ---------- VIDEO EDUKASI ----------
   Video tidak disimpan di dalam aplikasi (terlalu besar untuk Apps Script & boros kuota pasien).
   Unggah video ke YouTube (Tidak publik / Unlisted) ATAU Google Drive ("Siapa saja yang memiliki link"),
   lalu isi tautannya di sheet 01_CONFIG → EDU_VIDEO_URL (atau di EDU_VIDEO.url di bawah).
   Didukung: tautan YouTube, tautan Google Drive, atau tautan langsung file .mp4. */
var EDU_VIDEO = {
  url: 'https://www.youtube.com/watch?v=XV7qjogJwTk',
  title: 'Profil Layanan Kanker RSUP Dr. Kariadi Semarang',
  about: 'Kenali Pusat Onkologi Terpadu (Instalasi Kasuari) – dari skrining dan deteksi dini, kemoterapi, radiasi, tim dokter multidisiplin, hingga perawatan paliatif.',
  source: 'YouTube resmi RS Kariadi',
  duration: '3 menit', size: '16 MB',
  poster: 'data:image/jpeg;base64,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',
  /* Bab (perkiraan detik – sesuaikan bila perlu) */
  chapters: [[0, 'Pembuka'], [20, 'Pusat Onkologi Terpadu – Instalasi Kasuari'], [30, 'Skrining & deteksi dini kanker'], [42, 'Kemoterapi, radiasi & terapi kanker'], [72, 'Tim dokter multidisiplin'], [138, 'Kerja sama internasional'], [150, 'Laboratorium & riset'], [168, 'Komitmen perawatan pasien']]
};
function eduVideoUrl(){ var c = String((S.info && S.info.eduVideoUrl) || '').trim(); if (/^(OFF|TIDAK|-)$/i.test(c)) return ''; return c || EDU_VIDEO.url; }
function videoSource(url, start){
  url = String(url || ''); start = Math.max(0, Math.floor(start || 0)); var m;
  if ((m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/)))
    return { kind: 'yt', seek: true, open: 'https://www.youtube.com/watch?v=' + m[1] + (start ? '&t=' + start + 's' : ''), src: 'https://www.youtube-nocookie.com/embed/' + m[1] + '?autoplay=1&rel=0&playsinline=1&modestbranding=1' + (start ? '&start=' + start : '') };
  if ((m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?(?:.*&)?id=|uc\?(?:.*&)?id=)([\w-]{20,})/)))
    return { kind: 'drive', seek: false, open: 'https://drive.google.com/file/d/' + m[1] + '/view', src: 'https://drive.google.com/file/d/' + m[1] + '/preview' };
  if (/^https:\/\/.+\.(mp4|webm)(\?.*)?$/i.test(url)) return { kind: 'mp4', seek: true, open: url, src: url };
  return null;
}
function fmtSec(t){ return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }
function playIcon(){ return '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="#0E9C9A"/></svg>'; }
function videoCardHtml(id){
  if (!videoSource(eduVideoUrl())) return '';
  return '<button class="vcard" id="' + id + '" style="background-image:url(' + EDU_VIDEO.poster + ')" aria-label="Putar video: ' + esc(EDU_VIDEO.title) + '"><span class="vb">' + esc(EDU_VIDEO.duration) + '</span><span class="vp">' + playIcon() + '</span><span class="vt"><b>' + esc(EDU_VIDEO.title) + '</b><span>' + esc(EDU_VIDEO.source) + '</span></span></button>';
}
function showVideo(back){
  var vs = videoSource(eduVideoUrl()); back = back || showEduHome; if (!vs) return back();
  view(topbar('Video') + '<div class="scr"><div class="vplayer" id="vPlayer"><button class="vcard" id="vPlay" style="background-image:url(' + EDU_VIDEO.poster + ')" aria-label="Putar video"><span class="vb">' + esc(EDU_VIDEO.duration) + '</span><span class="vp">' + playIcon() + '</span></button></div>' +
    '<div class="vmeta"><h2>' + esc(EDU_VIDEO.title) + '</h2><div class="src">' + esc(EDU_VIDEO.source) + '</div><p class="tp-lead" style="margin-top:10px">' + esc(EDU_VIDEO.about) + '</p></div>' +
    '<div class="vdata">' + icon('info', 'sm') + '<span>Video memakai kuota data sekitar ' + esc(EDU_VIDEO.size) + '. Bila bisa, putar saat tersambung Wi-Fi.</span></div>' +
    (EDU_VIDEO.chapters.length ? '<div class="tp-sec"><h3>' + icon('menu', 'sm') + 'Isi video</h3><ul class="vch' + (vs.seek ? '' : ' off') + '">' + EDU_VIDEO.chapters.map(function(c){ return '<li><button data-t="' + c[0] + '"' + (vs.seek ? '' : ' tabindex="-1"') + '><i>' + fmtSec(c[0]) + '</i><span>' + esc(c[1]) + '</span></button></li>'; }).join('') + '</ul></div>' : '') +
    '<a class="btn soft block" style="margin-top:14px" id="vOpen" target="_blank" rel="noopener" href="' + esc(vs.open) + '">' + icon('external', 'sm') + ' Video tidak tampil? Buka di ' + (vs.kind === 'yt' ? 'YouTube' : vs.kind === 'drive' ? 'Google Drive' : 'browser') + '</a>' +
    '<button class="btn block" style="margin-top:10px" id="vEdu">' + icon('book', 'sm') + ' Lanjut ke bacaan edukasi</button></div>');
  function play(start){
    var v = videoSource(eduVideoUrl(), start), box = $('vPlayer');
    if (v.kind === 'mp4'){ var el = box.querySelector('video'); if (!el){ box.innerHTML = '<video controls playsinline preload="metadata" poster="' + EDU_VIDEO.poster + '"><source src="' + esc(v.src) + '"></video>'; el = box.querySelector('video'); } try { el.currentTime = start || 0; } catch (e) {} var pr = el.play(); if (pr && pr.catch) pr.catch(function(){}); return; }
    box.innerHTML = '<iframe src="' + esc(v.src) + '" title="' + esc(EDU_VIDEO.title) + '" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  }
  on('bBack', back); on('vEdu', showEduHome); on('vPlay', function(){ play(0); });
  if (vs.seek) app.querySelectorAll('.vch button').forEach(function(b){ b.onclick = function(){ play(+b.getAttribute('data-t')); $('vPlayer').scrollIntoView({ block: 'start', behavior: 'smooth' }); }; });
}

/* =====================================================================
   v3.8 · ILUSTRASI EDUKASI dari Google Drive (folder "KASUARI SIGAP – gambar edukasi", dibagikan publik
   "siapa saja yang memiliki link – Pelihat"). Gambar diambil langsung dari Google dalam ukuran yang pas
   (lh3.googleusercontent.com/d/<ID>=w<lebar>) – tidak memperberat aplikasi. Bila gagal dimuat, ilustrasi lama tampil.
   Ganti gambar: unggah file baru ke folder, salin ID-nya (bagian /d/<ID>/ pada tautan), ganti di bawah.
   ===================================================================== */
var EDU_IMG = {
  measure: ['1EXJs_TJslF44I1jaPMXTrczE1gNfLq21', 'Panduan memotret bengkak: cahaya terang dari atas, koin di samping area sebagai pembanding ukuran, tandai batas dengan pulpen, foto dari jarak 20–30 cm dengan posisi yang sama setiap hari.'],
  port:    ['1AE11-uEAUlES0khm-_lBNt5TfDnFatO_', 'Perbandingan port di bawah kulit dada (terapi jangka panjang, diakses jarum khusus) dan PICC di lengan atas (terapi jangka menengah).'],
  nausea:  ['1MkhNYfQmpWfxAhy4RMw8ASfNKwF5pupE', 'Ilustrasi: minum sedikit-sedikit dan minum obat tepat waktu untuk membantu mengatasi mual.'],
  fever:   ['162kkhuyz6qowH3GYGtYK6nzJyn101bwW', 'Infografis demam dan cuci tangan untuk mencegah infeksi selama kemoterapi.'],
  mouth:   ['1DKhw7_f0TgbCo3CdLekCDSDGdqrtwfic', 'Panduan sikat gigi berbulu lembut dan kumur rutin untuk mencegah sariawan.'],
  fatigue: ['1OKYwzY5V_bD4c0ygJw22cAdWt7hkZJZu', 'Mengelola lelah: istirahat, jalan santai, dan tidur siang singkat.'],
  hair:    ['1KJTXhIQ7OCtgRQFoIM8w3Mge-hQCnzks', 'Panduan perawatan rambut dan kulit selama kemoterapi.'],
  nerve:   ['1Uo4f3QLddJyRMX0sNxgKppCWqoeOuF4P', 'Kesemutan: periksa suhu air dengan siku atau termometer sebelum mandi agar tidak melepuh.'],
  digest:  ['1hq1QZZ4a29t3rEogoK8mFsYTxQ4arWVA', 'Panduan mengatasi diare dan sembelit: cukup minum dan pilihan makanan yang sesuai.'],
  food:    ['1VKvc519tkbSQIPVkisSRMOfaFRzVERBX', 'Piring sehat: nasi, sayur, lauk, buah; protein tiap makan (telur, ikan, ayam, tahu-tempe); masak sampai matang, cuci buah dan sayur, tanpa jamu/suplemen tanpa izin dokter.'],
  water:   ['1ygQZqtCTbyWZt1poiIutnffrTA14FG1T', 'Panduan minum cukup dan membaca warna urin.'],
  home:    ['1bTIczBBJkWwNH7com6dTk9NiacmTGJ0b', 'Panduan kebersihan di rumah selama 48 jam setelah kemoterapi untuk melindungi keluarga.'],
  meds:    ['1w7zs903mpXaX63NmS3v7nIdpfHxMqF3e', 'Pengingat jadwal kontrol dan minum obat.'],
  mind:    ['1cj4AN-CxMtbomN3qwpMPR-6mXGobnOMJ', 'Ceritakan perasaan Anda – Anda tidak sendiri: dukungan keluarga dan tenaga kesehatan.'],
  skin:    ['1nBUTy8xI87W8Xmeyoum2cqiZcl9Ov0Iy', 'Panduan merawat area bekas infus agar tetap bersih dan kering.'],
  igd:     ['1nK-UYjYftgRlpt2rDE7wIBmPVJsJaJLK', 'IGD buka 24 jam – jangan menunda bila muncul tanda bahaya.'],
  compress:['1Lw23RP5d08LQ0g9wgbU_fB9GOsRXq5Ys', 'Infografik kompres dingin dan kompres hangat – jenis kompres mengikuti jenis obat kemoterapi.']
};
function eduImgUrl(id, w){ return 'https://lh3.googleusercontent.com/d/' + id + '=w' + w; }
/* Ilustrasi untuk satu materi: gambar Drive bila ada, ilustrasi lama sebagai cadangan */
function eduArtImg(key){
  var m = EDU_IMG[key], old = EDU_ART[key] ? EDU_ART[key]() : '';
  if (!m) return old;
  return '<button type="button" class="tp-img" data-k="' + key + '" aria-label="Perbesar gambar: ' + esc(m[1]) + '">' +
    '<img src="' + eduImgUrl(m[0], 900) + '" srcset="' + eduImgUrl(m[0], 600) + ' 600w, ' + eduImgUrl(m[0], 900) + ' 900w, ' + eduImgUrl(m[0], 1400) + ' 1400w" sizes="(min-width:1024px) 46vw, 100vw" alt="' + esc(m[1]) + '" loading="eager" onerror="artFallback(this)"></button>';
}
function artFallback(img){ var b = img.closest('.tp-img'), k = b && b.getAttribute('data-k'), box = b && b.parentNode; if (box) box.innerHTML = EDU_ART[k] ? EDU_ART[k]() : ''; }
document.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('.tp-img'); if (!b) return; var i = b.querySelector('img'); if (i) zoomImg(eduImgUrl(EDU_IMG[b.getAttribute('data-k')][0], 1600)); });
