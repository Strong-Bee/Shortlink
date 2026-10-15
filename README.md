# Shortlink

Generator shortlink ringan berbasis Next.js dan TypeScript. Aplikasi membuat tautan dengan menyandikan URL tujuan ke dalam parameter URL, sehingga **tidak memerlukan database** untuk pembuatan tautan dasar.

## Fitur

- Membuat tautan tujuan dengan parameter `/link?t=...`.
- Validasi URL tujuan: hanya protokol `http:` dan `https:` yang diterima.
- Encoding Base64 URL-safe dan dukungan URL Unicode.
- Tombol salin tautan dengan fallback untuk browser yang tidak mendukung Clipboard API.
- Halaman pengalihan kompatibel dengan token Base64 standar lama.
- Endpoint laporan Telegram pada `/api/snap` (opsional; membutuhkan konfigurasi server).

## Teknologi

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Axios untuk komunikasi server-side dengan layanan Geo-IP dan Telegram

## Persyaratan

- Node.js yang kompatibel dengan versi Next.js yang digunakan.
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
npm run dev       # Server pengembangan
npm run build     # Build produksi
npm run start     # Menjalankan build produksi
npm run lint      # Pemeriksaan ESLint
```

## Konfigurasi Telegram (opsional)

Buat file `.env.local` di root proyek:

```env
TELEGRAM_TOKEN=
TELEGRAM_CHAT_ID=
```

Jangan commit token atau rahasia ke repository. Jika variabel Telegram tidak diatur, endpoint laporan akan mengembalikan error konfigurasi.

## Catatan arsitektur

Tautan yang dihasilkan menyimpan URL tujuan dalam parameter query, bukan sebagai record di database. Artinya:

- Tidak ada database yang diperlukan untuk pembuatan tautan dasar.
- URL yang panjang membuat parameter tautan ikut panjang.
- Tautan dapat dibagikan atau dipindahkan, tetapi tidak menyediakan pengelolaan slug persisten seperti layanan shortener berbasis database.
- Siapa pun yang memiliki tautan dapat membaca token dan mendekode URL tujuan; encoding bukan enkripsi.

## Privasi dan keamanan

- Gunakan fitur lokasi atau kamera hanya dengan pemberitahuan yang jelas dan persetujuan sadar dari pengunjung.
- Browser tetap mengendalikan izin lokasi dan kamera; izin yang sudah diberikan sebelumnya mungkin tetap berlaku sesuai perilaku browser.
- Jangan gunakan endpoint pelaporan untuk mengumpulkan atau mengirimkan data pribadi tanpa dasar yang sah dan persetujuan yang sesuai.
- Pastikan deployment menggunakan HTTPS untuk API browser yang memerlukan secure context.
- Batasi akses ke bot Telegram dan simpan kredensial hanya sebagai environment variables server.
- Geo-IP adalah perkiraan lokasi jaringan, bukan koordinat GPS.

## Lisensi

Lihat file lisensi repository jika tersedia.

Dikembangkan oleh Strong-Bee.


## Penyimpanan sublink menggunakan JSON (tanpa database)

Sublink bernama dibuat melalui `POST /api/shortlinks` dan disimpan sebagai array JSON di `data/shortlinks.json`. Endpoint `GET /api/shortlinks?slug=nama` mencari tujuan dari file tersebut. Rute publik menggunakan format `/link/nama`.

Contoh isi file:

```json
[
  {
    "slug": "promo-2026",
    "destination": "https://example.com/promo",
    "createdAt": "2026-10-15T12:00:00.000Z"
  }
]
```

### Catatan deployment

- Jalankan pada server Node.js yang memiliki akses tulis ke direktori proyek dan penyimpanan persisten.
- File JSON adalah penyimpanan file sederhana, bukan database transaksional. Untuk traffic serentak tinggi, penulisan paralel perlu antrean/lock agar perubahan tidak saling menimpa.
- Hosting serverless seperti Vercel biasanya memiliki filesystem runtime sementara atau read-only. File JSON lokal tidak dijamin bertahan setelah redeploy/restart dan tidak otomatis dibagikan ke beberapa instance. Untuk model JSON tanpa database, gunakan VPS/self-hosted Node.js dengan disk persisten dan backup rutin.
- Pastikan file JSON tidak menyimpan data pribadi atau kredensial. Jangan mengubah file ini melalui GitHub API saat aplikasi sedang aktif karena dapat menimpa data runtime.
