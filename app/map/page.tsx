import Link from "next/link";
import VisitMap from "@/components/visit-map";

type MapPageProps = {
  searchParams: Promise<{
    lat?: string;
    lon?: string;
    label?: string;
  }>;
};

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = await searchParams;
  const latitude = Number(params.lat);
  const longitude = Number(params.lon);
  const validCoordinates =
    typeof params.lat === "string" &&
    typeof params.lon === "string" &&
    params.lat.trim() !== "" &&
    params.lon.trim() !== "" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
  const label = (params.label || "Lokasi pengunjung").slice(0, 160);

  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Shortlink · Visit location</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Peta kunjungan</h1>
            <p className="mt-2 text-sm text-slate-400">Visualisasi koordinat perkiraan berdasarkan geolokasi alamat IP.</p>
          </div>
          <Link href="/" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5">
            Kembali ke beranda
          </Link>
        </header>

        {validCoordinates ? (
          <>
            <VisitMap latitude={latitude} longitude={longitude} label={label} />
            <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100/90">
              <strong className="font-semibold text-amber-200">Catatan akurasi & privasi.</strong>{" "}
              Titik pada peta merupakan estimasi dari alamat IP, bukan posisi GPS atau alamat rumah yang pasti.
              Akurasinya dapat berbeda menurut ISP, jaringan seluler, VPN, dan penyedia geolokasi.
            </div>
          </>
        ) : (
          <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Koordinat peta tidak valid</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Buka tautan peta dari laporan Telegram yang memiliki koordinat geolokasi. Pastikan IPINFO_TOKEN
              dikonfigurasi agar laporan dapat menyertakan estimasi koordinat.
            </p>
          </section>
        )}

        <footer className="mt-6 text-center text-xs text-slate-500">
          Peta menggunakan Leaflet (BSD-2-Clause) dan data OpenStreetMap. © OpenStreetMap contributors.
        </footer>
      </div>
    </main>
  );
}
