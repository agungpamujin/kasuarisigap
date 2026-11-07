# KASUARI SIGAP – Frontend (GitHub Pages) v4.0.0

Sistem Informasi Gejala dan Arahan Perawatan Ekstravasasi – Instalasi Kasuari Lantai 3, RSUP Dr. Kariadi Semarang.

- `index.html` – aplikasi pasien
- `nurse.html` – dashboard perawat
- `js/config.js` – **satu-satunya berkas yang perlu diisi**: `API_URL` = URL `/exec` Apps Script
- `js/api.js` – penghubung ke API Apps Script (POST `text/plain` `{fn, args}` → `{ok, data|error}`)

Backend (Google Sheets, Drive, Gemini, login) tetap di Google Apps Script dan **tidak** ada di repository ini.
Panduan lengkap: [PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)
