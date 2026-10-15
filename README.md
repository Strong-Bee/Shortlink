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
- Laporan Telegram opsional hanya mengirim waktu, status persetujuan, dan status kategori; tidak mengirim nilai cookie, token, atau data browser.
- Endpoint laporan Telegram lama di `POST /api/snap` tetap terpisah dan tidak dipanggil otomatis oleh banner cookies.
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

Simpan token bot dan chat ID hanya di environment server. Endpoint `/api/cookie-consent` hanya melaporkan waktu, status, dan kategori persetujuan. Jangan pernah mengirim nilai cookie atau token autentikasi melalui laporan ini.

Endpoint `POST /api/snap` yang terpisah tetap mensyaratkan `consent: true`; halaman shortlink tidak memanggilnya otomatis.

## Privasi dan keamanan

- Persetujuan opsional tidak diaktifkan secara default.
- Persetujuan dapat diubah melalui pengaturan cookies.
- Token rahasia disimpan di environment server.
- Laporan Telegram tidak berisi nilai cookie, token, IP, user-agent, lokasi, atau data perangkat.
- Status kategori adalah pilihan pengguna, bukan bukti bahwa skrip analitik/pemasaran telah dipasang atau dijalankan.
- Implementasi teknis tidak dengan sendirinya menjamin kepatuhan hukum; sesuaikan kebijakan privasi dan praktik pemrosesan dengan yurisdiksi serta layanan yang benar-benar digunakan.

## CI

GitHub Actions menjalankan lint, pemeriksaan TypeScript, tes Node.js, dan build produksi pada push ke `main` serta pull request. Lihat tab **Actions** untuk hasil aktual setelah workflow berjalan.

Dikembangkan oleh Strong-Bee.
