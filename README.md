# Shortlink

Aplikasi shortlink berbasis Next.js, React, TypeScript, dan Tailwind CSS. Mendukung tautan berbasis token URL serta sublink bernama dengan masa berlaku tujuh hari.

## Fitur

- Membuat tautan dari URL tujuan HTTP/HTTPS.
- Sublink bernama melalui `POST /api/shortlinks`.
- Masa berlaku tujuh hari (168 jam).
- Penyimpanan lokal JSON untuk pengembangan mandiri.
- Penyimpanan Upstash Redis dengan TTL tujuh hari untuk deployment serverless Vercel.
- Halaman konfirmasi tujuan eksternal; halaman redirect tidak mengakses kamera/lokasi atau mengirim data perangkat.
- Endpoint laporan Telegram opsional di `POST /api/snap`, yang menolak request tanpa `consent: true`.
- Pemeriksaan lint, TypeScript, dan pengujian Node.js.

## Persyaratan

- Node.js 20.9 atau lebih baru.
- npm.

## Instalasi lokal

```bash
git clone https://github.com/Strong-Bee/Shortlink.git
cd Shortlink
npm ci
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Perintah

```bash
npm run dev        # Server pengembangan
npm run lint       # ESLint
npm run typecheck  # Pemeriksaan TypeScript
npm test           # Tes token shortlink
npm run build      # Build produksi
npm start          # Jalankan build produksi
```

## Penyimpanan sublink dan retensi tujuh hari

Sublink dibuat dengan `POST /api/shortlinks` dan dicari dengan `GET /api/shortlinks?slug=nama`. Setiap record mempunyai `createdAt` dan respons pembuatan menyertakan `expiresAt`. Tautan kedaluwarsa mengembalikan HTTP 404.

### Lokal: JSON

Saat berjalan lokal dan variabel Upstash tidak diatur, record disimpan dalam `data/shortlinks.json`. Record kedaluwarsa dibersihkan saat endpoint membaca atau menulis data. Karena itu, pembersihan terjadi pada request berikutnya, bukan melalui daemon latar belakang.

### Vercel: Upstash Redis (wajib)

Filesystem fungsi Vercel tidak cocok sebagai penyimpanan persisten. Untuk deployment Vercel, buat database Redis di Upstash dan tambahkan environment variables berikut pada Vercel Project Settings → Environment Variables:

```env
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token
```

Setelah variabel diatur, lakukan redeploy. Setiap sublink disimpan dengan TTL Redis selama 604800 detik (7 hari), sehingga record kedaluwarsa dihapus oleh Redis. Jika deployment berjalan di Vercel tanpa konfigurasi Redis, API akan mengembalikan HTTP 503 alih-alih menulis ke filesystem yang tidak persisten.

Contoh record lokal:

```json
[
  {
    "slug": "promo-2026",
    "destination": "https://example.com/promo",
    "createdAt": "2026-10-15T12:00:00.000Z"
  }
]
```

## Konfigurasi Telegram (opsional)

Atur environment variables server:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

`TELEGRAM_TOKEN` tetap didukung sebagai nama token lama. Jangan commit token atau kredensial ke repository. Endpoint `/api/snap` memerlukan JSON yang menyertakan `"consent": true`; tanpa persetujuan eksplisit, API mengembalikan HTTP 403. Endpoint tidak dipanggil otomatis oleh halaman shortlink.

## Privasi dan keamanan

- Halaman tautan meminta pengguna memeriksa tujuan sebelum melanjutkan.
- Halaman tautan tidak meminta atau mengakses kamera dan lokasi, dan tidak mengirim telemetry.
- Gunakan laporan Telegram hanya untuk data yang diberikan secara sadar dan dengan persetujuan yang sah.
- Browser tetap mengendalikan izin kamera dan lokasi.
- Simpan token Telegram dan Redis hanya sebagai environment variables.
- Jangan menyimpan informasi pribadi yang tidak diperlukan.

## CI

GitHub Actions menjalankan lint, pemeriksaan TypeScript, tes Node.js, dan build produksi pada push ke `main` serta pull request. Status build aktual dapat dilihat di tab **Actions** setelah workflow berjalan.

## Catatan

File JSON hanya ditujukan untuk pengembangan lokal. Di Vercel, gunakan Redis persisten seperti yang dijelaskan di atas. Lisensi mengikuti file lisensi repository jika tersedia.

Dikembangkan oleh Strong-Bee.
