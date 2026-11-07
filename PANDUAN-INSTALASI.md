# Panduan Instalasi KASUARI SIGAP v4.0.0
## Backend di Google Apps Script + Tampilan di GitHub Pages

Mulai versi 4.0, aplikasi dipisah menjadi dua bagian:

| Bagian | Tempat | Isi |
|---|---|---|
| **Backend (API)** | Google Apps Script (proyek yang sudah Anda pakai) | Data pasien di Sheets, foto di Drive, kunci Gemini, login perawat |
| **Tampilan (frontend)** | GitHub Pages | `index.html` (pasien), `nurse.html` (perawat), folder `css/` dan `js/` |

Tampilan dan alur aplikasi **sama persis** dengan v3.19.0. Yang berubah hanya cara tampilan berbicara ke server: dulu lewat `google.script.run` di dalam Apps Script, sekarang lewat internet (`fetch`) ke alamat `/exec` Apps Script.

**Yang tidak berubah:** spreadsheet dan kolomnya, data pasien, folder foto (tetap privat), cara login pasien dan perawat, aturan triase dan kompres, serta kunci Gemini (tetap di Script Properties → `GEMINI_API_KEY`).

**Alamat lama tetap jalan.** Alamat `…/exec?t=…` dari QR yang sudah tercetak tetap membuka aplikasi versi Apps Script, jadi tidak ada pasien yang terputus selama masa peralihan.

---

## BAGIAN A — Backend (Apps Script): 2 berkas

Hanya **dua** berkas `.gs` yang perlu disentuh. Berkas lain (Setup, Engine, ApiPatient, ApiNurse, Kilat, dan semua berkas HTML) **tidak berubah**.

1. Buka proyek Apps Script KASUARI SIGAP.
2. **Tambah berkas baru:** klik **＋** → **Skrip** → beri nama `Api` (tanpa `.gs`). Tempel seluruh isi `Api.gs`.
3. **Ganti isi `Code.gs`** dengan `Code.gs` versi 4.0.0. Perubahannya hanya nomor versi dan satu baris di `doGet` untuk `?action=…`.
4. Klik **Simpan** (ikon disket).
5. **Terapkan → Kelola penerapan → ✏️ (Edit) → Versi: "Versi baru" → Terapkan.**
   - ⚠️ Pilih **Versi baru** pada penerapan yang sudah ada, **bukan** "Penerapan baru". Dengan begitu alamat `/exec` tidak berubah.
   - Pastikan **Jalankan sebagai: Saya** dan **Yang memiliki akses: Siapa saja**. Tanpa "Siapa saja", tampilan di GitHub Pages tidak bisa memanggil server.
6. Salin **URL aplikasi web** (berakhiran `/exec`).

**Cek cepat:** buka `URL/exec?action=ping` di browser. Hasilnya harus kira-kira:
```
{"ok":true,"data":{"app":"KASUARI SIGAP","version":"4.0.0", …}}
```
Kalau yang muncul halaman aplikasi lama atau halaman login Google, ulangi langkah 5.

---

## BAGIAN B — Isi alamat server di frontend

1. Ekstrak `kasuari-sigap-pages-v4.0.0.zip` ke folder baru, misalnya `Documents\kasuari-sigap`.
2. Buka `js\config.js` dengan Notepad.
3. Ganti `https://script.google.com/macros/s/GANTI_DENGAN_ID_PENERAPAN/exec` dengan URL `/exec` dari langkah A6.
4. Simpan.

`API_URL` adalah alamat publik, bukan rahasia, jadi aman berada di repository publik. Kunci Gemini dan data **tidak pernah** ada di frontend.

---

## BAGIAN C — Unggah ke GitHub Pages (lewat terminal)

> Gunakan terminal, **jangan** "Add file → Upload files" di situs GitHub. Upload lewat web meratakan folder `css/` dan `js/`, sehingga tampilan rusak.

**Istilah singkat:**
- **Repository (repo):** folder proyek di GitHub.
- **Commit:** "simpan" dengan catatan.
- **Push:** mengirim ke GitHub.

### C1. Pasang Git (sekali saja)
- Windows: unduh dari https://git-scm.com/download/win, pasang dengan pilihan bawaan, lalu buka **PowerShell**.
- Cek dengan `git --version`.

### C2. Identitas Git (sekali saja)
```
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```

### C3. Buat repository di GitHub
1. Di github.com, klik **＋ → New repository**.
2. Isi nama `kasuari-sigap` dan pilih **Public**.
3. **Jangan** centang README, .gitignore, atau license.
4. Klik **Create repository**, lalu biarkan halamannya terbuka.

### C4. Masuk ke folder yang BENAR, lalu periksa isinya
Folder kerjanya adalah **folder hasil ekstrak ZIP itu sendiri** (contoh `Documents\kasuari-sigap`). Jangan masuk lebih dalam, dan jangan naik satu tingkat.

```
cd "$HOME\Documents\kasuari-sigap"
dir
```
Baris yang harus terlihat: `index.html`, `nurse.html`, `css`, `js`, `README.md`, `PANDUAN-INSTALASI.md`. Kalau `index.html` tidak ada di daftar, Anda berada di folder yang salah. **Jangan lanjut** sebelum ini benar.

### C5. Kirim ke GitHub — jalankan satu per satu
```
git init
git add .
git commit -m "KASUARI SIGAP v4.0.0"
git branch -M main
git remote add origin https://github.com/USERNAME/kasuari-sigap.git
git push -u origin main
```
- Perhatikan **titik** pada `git add .`.
- Saat `git push`, isi **Username** dengan username GitHub Anda.
- Isi **Password** dengan **Personal Access Token**, bukan password akun:
  1. Buka https://github.com/settings/tokens → **Generate new token (classic)**.
  2. Centang **repo**, lalu salin token `ghp_…`.
- Saat menempel token, layar **memang kosong** (tidak ada bintang). Itu normal; tekan Enter.
- Tanda berhasil: `Writing objects: 100%` dan `* [new branch] main -> main`.

### C6. Nyalakan GitHub Pages
1. Buka repo → **Settings → Pages**.
2. Atur **Source: Deploy from a branch**, **Branch: main**, folder **/ (root)**, lalu **Save**.
3. Centang **Enforce HTTPS**. Ini wajib karena aplikasi memakai kamera.
4. Tunggu 1–2 menit. Akan muncul `https://USERNAME.github.io/kasuari-sigap/`.

---

## BAGIAN D — Sambungkan alamat baru ke aplikasi

Supaya QR, kartu pasien, dan poster yang **baru** mengarah ke GitHub Pages:

1. Buka spreadsheet → sheet **01_CONFIG**.
2. Ubah nilai **WEBAPP_URL** menjadi `https://USERNAME.github.io/kasuari-sigap/` (dengan garis miring di akhir).
3. Opsional: isi alamat yang sama di `APP_URL` pada `js/config.js`, lalu push ulang (Bagian F).

Hasilnya:
- **Pasien:** `https://USERNAME.github.io/kasuari-sigap/` (dari QR: `…/?t=TOKEN`).
- **Perawat:** `https://USERNAME.github.io/kasuari-sigap/nurse.html`. Tautan lama `…/?page=nurse` otomatis dialihkan ke sini.

Bila ingin kembali ke cara lama, kembalikan `WEBAPP_URL` ke alamat `/exec`. Server melayani kedua tampilan sekaligus.

---

## BAGIAN E — Uji setelah online (pakai data dummy)

1. Buka `…/nurse.html`, login perawat, lalu pastikan dashboard tampil.
2. Daftarkan **pasien dummy**, buka tautan atau QR-nya di HP, lalu pastikan beranda pasien tampil.
3. Kirim laporan dummy **dengan foto**. Laporan harus muncul di dashboard perawat.
4. Coba balas, Chat NURSE.AI, dan materi edukasi.
5. Tekan **F12 → Console**. Seharusnya tidak ada tulisan merah "CORS" atau "Failed to fetch".
6. Di Apps Script → **Eksekusi**, setiap panggilan tercatat sebagai `[API] namaFungsi … ms`. Isi data pasien tidak ikut tercatat.

---

## BAGIAN F — Memperbarui tampilan nanti

Ekstrak ZIP versi baru ke folder yang sama (timpa berkas lama). Pastikan `js/config.js` tetap berisi URL `/exec` Anda. Lalu jalankan:
```
git add .
git commit -m "Update"
git push
```
Tunggu 1–2 menit, lalu tekan **Ctrl+Shift+R** di browser.

Perubahan di Apps Script tetap memakai **Terapkan → Kelola penerapan → Versi baru**.

---

## Mengatasi masalah

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| "Alamat server belum diatur. Isi API_URL…" | `js/config.js` belum diisi | Bagian B, lalu push ulang |
| "Server belum siap (HTTP …)" | Belum "Versi baru", atau akses bukan "Siapa saja" | Bagian A langkah 5 |
| `…/exec?action=ping` menampilkan aplikasi lama | `Code.gs` baru belum disimpan atau belum diterapkan | Ganti `Code.gs`, Simpan, Versi baru |
| "Koneksi terputus…" | Internet HP putus, atau server sibuk | Coba lagi; data yang sudah tampil tetap aman |
| Situs GitHub 404 | `index.html` tidak di root repo (folder salah saat `git init`) | Ulangi C4–C5 dari folder hasil ekstrak, lalu `git push -u origin main --force` |
| Tampilan tanpa warna/rapi | Folder `css/` dan `js/` rata (upload via web) | Push lewat terminal (Bagian C) |
| Masih versi lama setelah push | Cache browser | Ctrl+Shift+R atau jendela Incognito |
| `Password authentication is not supported` | GitHub butuh token | Buat Personal Access Token (C5) |
| Kamera tidak bisa dibuka | HTTPS belum aktif | Centang **Enforce HTTPS** (C6) |
