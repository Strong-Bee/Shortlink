"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

type LinkRecord = { slug: string; destination: string };

export default function LinkRedirect() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const continueToDestination = async () => {
    if (!slug || busy) return;
    setBusy(true);
    setError("");
    try {
      // Use the browser Geolocation API directly; no external service/package.
      const gps = await new Promise<{ latitude: number; longitude: number; accuracy: number } | null>((resolve) => {
        if (!("geolocation" in navigator)) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
      });
      const query = new URLSearchParams({ slug, report: "1" });
      if (gps) {
        query.set("lat", String(gps.latitude));
        query.set("lon", String(gps.longitude));
        query.set("accuracy", String(gps.accuracy));
      }
      const response = await fetch("/api/shortlinks?" + query.toString(), { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Shortlink tidak ditemukan.");

      const record = result as LinkRecord;
      const destination = new URL(record.destination);
      if (destination.protocol !== "http:" && destination.protocol !== "https:") {
        throw new Error("Alamat tujuan tidak valid.");
      }
      window.location.replace(destination.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka shortlink.");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-7">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-2xl">🔗</div>
          <h1 className="text-xl font-semibold">Persetujuan sebelum membuka tautan</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Dengan menekan tombol di bawah, Anda menyetujui pengiriman alamat IP
            dan informasi browser/perangkat yang tersedia kepada pengelola melalui
            Telegram. Browser juga akan meminta izin GPS untuk menyertakan koordinat
            dan tingkat akurasi lokasi jika Anda mengizinkannya.
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Lokasi GPS diambil langsung oleh browser, tanpa layanan geolokasi pihak
            ketiga. Jika izin ditolak atau GPS tidak tersedia, tautan tetap dapat
            dibuka tanpa koordinat. Kamera, mikrofon, foto, audio, kontak, dan file
            tidak diakses.
          </p>
        </div>

        {error ? <p className="mb-4 text-sm text-rose-300" role="alert">{error}</p> : null}

        <div className="grid gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void continueToDestination()}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Memproses tautan…" : "Setuju & buka tautan"}
          </button>
          <Link href="/" className="pt-1 text-center text-sm text-slate-400 hover:text-white">
            Tidak setuju? Kembali ke beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
