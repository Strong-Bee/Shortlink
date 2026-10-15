# Shortlink

Aplikasi shortlink berbasis Next.js, React, TypeScript, dan Tailwind CSS. Mendukung tautan berbasis token URL serta sublink bernama dengan masa berlaku tujuh hari.

## Fitur

- Membuat tautan dari URL tujuan HTTP/HTTPS.
- Sublink bernama melalui `POST /api/shortlinks`.
- Masa berlaku tujuh hari (168 jam).
- Penyimpanan lokal JSON untuk pengembangan mandiri.
- Penyimpanan Upstash Redis dengan TTL tujuh hari untuk deployment serverless Vercel.
- Halaman konfirmasi tujuan eksternal; halaman redirect tidak mengakses kamera/lokasi atau mengirim data perangkat.
- Banner persetujuan cookies dengan pilihan Terima semua, Tolak opsional, dan Sesuaikan.
- Preferensi kategori cookies: diperlukan (selalu aktif), fungsional, analitik, dan pemasaran.
- Preferensi disimpan dalam cookie first-party bertanda tangan, dengan atribut `HttpOnly`, `SameSite=Lax`, `Path=/`, masa berlaku 180 hari, dan `Secure` di production.
- Pengaturan cookies dapat dibuka kapan saja dari tombol di kiri bawah.
- Laporan Telegram gabungan tersedia melalui `POST /api/snap` dan hanya diproses setelah request menyertakan `consent: true`.
- Halaman laporan sukarela mengirim detail teknis yang memang tersedia di browser: OS/browser, model jika tersedia, perkiraan RAM, jumlah core logis, bahasa, zona waktu, layar, status izin, baterai dan koneksi jika API didukung.
- Lookup ISP/organisasi/Geo-IP bersifat opsional melalui `IPINFO_TOKEN`; alamat IP hanya dikirim ke IPinfo setelah persetujuan eksplisit pada formulir laporan.
- Jika cookie persetujuan bertanda tangan tersedia, laporan gabungan menyertakan status kategori cookies bersama informasi pengunjung yang secara eksplisit dikirim klien.
- `POST /api/cookie-consent` hanya menyimpan preferensi; endpoint ini tidak lagi mengirim pesan Telegram terpisah.
- Pemeriksaan lint, TypeScript, dan pengujian Node.js.

## Persyaratan

- Node.js 20.9 atau lebih baru.
- npm.

## Instalasi lokal

```bash
git clone https://github.com/Strong-Bee/Shortlink.git
cd Shortlink
npm ci
cp .env.example .env.local
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Perintah

```bash
npm run dev        # Server pengembangan
npm run lint       # ESLint
npm run typecheck  # Pemeriksaan TypeScript
npm test           # Tes Node.js
npm run build      # Build produksi
npm start          # Jalankan build produksi
```

## Konfigurasi environment

Atur variabel pada `.env.local` untuk pengembangan dan Vercel Project Settings → Environment Variables untuk deployment.

```env
COOKIE_CONSENT_SECRET=generate-a-unique-random-secret-at-least-32-bytes
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
IPINFO_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Buat secret kuat dengan `openssl rand -base64 32`. Jangan gunakan contoh placeholder sebagai secret produksi, jangan commit `.env.local`, dan jangan gunakan secret yang sama lintas aplikasi. `AUTH_SECRET` atau `NEXTAUTH_SECRET` dapat menjadi fallback, tetapi `COOKIE_CONSENT_SECRET` khusus lebih disarankan. Setelah menambahkan variabel di Vercel, lakukan redeploy.

Telegram bersifat opsional. Jika `TELEGRAM_BOT_TOKEN` (atau nama lama `TELEGRAM_TOKEN`) dan `TELEGRAM_CHAT_ID` tersedia, server akan mencoba mengirim status persetujuan dan empat status kategori saja. Kegagalan Telegram tidak membatalkan penyimpanan persetujuan.

## Penyimpanan sublink dan retensi tujuh hari

Sublink dibuat dengan `POST /api/shortlinks` dan dicari dengan `GET /api/shortlinks?slug=nama`. Setiap record mempunyai `createdAt` dan respons pembuatan menyertakan `expiresAt`. Tautan kedaluwarsa mengembalikan HTTP 404.

### Lokal: JSON

Saat berjalan lokal dan variabel Upstash tidak diatur, record disimpan dalam `data/shortlinks.json`. Record kedaluwarsa dibersihkan saat endpoint membaca atau menulis data. Pembersihan terjadi pada request berikutnya, bukan melalui daemon latar belakang.

### Vercel: Upstash Redis (wajib)

Filesystem fungsi Vercel tidak cocok sebagai penyimpanan persisten. Buat database Redis di Upstash dan tambahkan `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` pada Vercel. Setelah variabel diatur, lakukan redeploy. Setiap sublink disimpan dengan TTL Redis selama 604800 detik (7 hari). Jika deployment berjalan di Vercel tanpa Redis, API mengembalikan HTTP 503.

## API persetujuan cookies

- `GET /api/cookie-consent`: membaca status persetujuan dari cookie bertanda tangan; respons tidak di-cache.
- `POST /api/cookie-consent`: menerima hanya objek `categories` dengan pilihan boolean eksplisit untuk `functional`, `analytics`, dan `marketing`. Kategori `necessary` selalu aktif.
- Cookie `shortlink_consent` memiliki tanda tangan HMAC-SHA256 yang diverifikasi server, bersifat HttpOnly, SameSite=Lax, Path=/, berlaku 180 hari, dan Secure pada production.
- Endpoint menolak properti tambahan dan request lintas-origin jika header Origin tersedia.
- Cookie hanya menyimpan versi, waktu pilihan, dan kategori. Tidak menyimpan cookie pihak ketiga, token login, atau nilai autentikasi.
- Kategori analitik/pemasaran tidak otomatis mengaktifkan skrip pihak ketiga. Jika layanan tersebut ditambahkan di kemudian hari, implementasikan pemblokiran skrip sampai persetujuan kategori terkait diberikan.
- Pengguna dapat mengubah preferensi kapan saja dengan tombol **Pengaturan cookies**.

## Konfigurasi Telegram (opsional)

Simpan token bot dan chat ID hanya di environment server. Variabel yang didukung:

- `TELEGRAM_BOT_TOKEN` (direkomendasikan; `TELEGRAM_TOKEN` didukung untuk kompatibilitas)
- `TELEGRAM_CHAT_ID`
- `IPINFO_TOKEN` (opsional): token IPinfo untuk memperkaya ISP/ASN, organisasi, kota/wilayah/negara, dan zona waktu perkiraan. Tanpa token ini, laporan menggunakan header hosting jika tersedia dan tidak mengarang ISP/ORG.

Laporan gabungan dikirim melalui `POST /api/snap` hanya jika body JSON berisi `consent: true`. Halaman `/capture` meminta persetujuan yang secara eksplisit mencakup pengiriman detail teknis yang tersedia sebelum mengirim laporan. Endpoint tidak mengaktifkan kamera atau GPS sendiri; foto dan GPS tepat hanya dikirim bila dipilih pengguna. Browser dapat membatasi model, RAM, CPU, GPU, baterai, dan API koneksi, sehingga sebagian kolom tetap menjelaskan batasan dukungan alih-alih mengarang nilai.

Jika `IPINFO_TOKEN` dikonfigurasi, server meminta data Geo-IP dari IPinfo setelah persetujuan laporan diverifikasi. Ini mengirim alamat IP pengunjung ke penyedia tersebut untuk lookup; jangan mengatur token bila pemrosesan pihak ketiga ini tidak sesuai dengan kebijakan privasi Anda. Lookup dibatasi waktu dan tidak menyimpan hasil ke database.

Jika cookie `shortlink_consent` yang valid tersedia, laporan menyertakan waktu dan kategori preferensi cookies. Jika tidak ada, laporan menyatakan preferensi tidak tersedia. Token bot, nilai cookie, dan token autentikasi tidak dimasukkan ke isi pesan.

Telegram Bot API dipanggil melalui `fetch` bawaan Node.js, tanpa SDK Telegram tambahan. Penandatanganan cookie memakai modul `node:crypto`; validasi request dan response memakai TypeScript serta API Next.js. Dengan begitu tidak diperlukan dependency baru hanya untuk mengirim laporan Telegram atau memverifikasi cookie.

## Privasi dan keamanan

- Persetujuan opsional tidak diaktifkan secara default.
- Persetujuan dapat diubah melalui pengaturan cookies.
- Token rahasia disimpan di environment server.
- Laporan Telegram dapat berisi IP, perkiraan lokasi jaringan, user-agent, dan detail teknis perangkat yang tersedia setelah persetujuan eksplisit; tidak berisi nilai cookie atau token autentikasi.
- Status kategori adalah pilihan pengguna, bukan bukti bahwa skrip analitik/pemasaran telah dipasang atau dijalankan.
- Implementasi teknis tidak dengan sendirinya menjamin kepatuhan hukum; sesuaikan kebijakan privasi dan praktik pemrosesan dengan yurisdiksi serta layanan yang benar-benar digunakan.

## Library dan runtime

- **Next.js + React** — halaman, App Router, dan route handler API.
- **TypeScript** — pemeriksaan tipe untuk route handler dan komponen.
- **Tailwind CSS** — styling UI.
- **Lucide React** — ikon UI.
- **nanoid** — pembuatan ID pendek untuk shortlink.
- **@upstash/redis** — penyimpanan Redis pada deployment serverless.
- **Node.js crypto** — HMAC-SHA256 dan verifikasi tanda tangan cookie.
- **Node.js fetch / FormData / Blob** — komunikasi dengan Telegram Bot API dan pengiriman foto tanpa SDK Telegram terpisah.
- **Node.js test runner** — pengujian helper tanpa framework tambahan.

Jangan menambahkan library hanya agar daftar dependency terlihat lebih panjang. Tambahkan dependency baru ketika fitur benar-benar membutuhkannya dan pastikan `package-lock.json` diperbarui bersama `package.json`.

## CI

GitHub Actions menjalankan lint, pemeriksaan TypeScript, tes Node.js, dan build produksi pada push ke `main` serta pull request. Lihat tab **Actions** untuk hasil aktual setelah workflow berjalan.

Dikembangkan oleh Strong-Bee.
