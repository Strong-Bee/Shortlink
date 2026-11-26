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

  const continueToDestination = async (shareDetails: boolean) => {
    if (!slug || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/shortlinks?slug=" + encodeURIComponent(slug) + "&report=" + (shareDetails ? "1" : "0"),
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sublink tidak ditemukan.");

      const record = result as LinkRecord;
      const destination = new URL(record.destination);
      if (destination.protocol !== "http:" && destination.protocol !== "https:") {
        throw new Error("Alamat tujuan tidak valid.");
      }
      window.location.replace(destination.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka sublink.");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-7">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-2xl">🔗</div>
          <h1 className="text-xl font-semibold">Sebelum membuka tautan</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Server memproses alamat IP untuk mengirim halaman ini. Jika Anda memilih setuju,
            alamat IP, perkiraan kota/wilayah/negara dan ISP dari IP, browser, sistem operasi,
            jenis perangkat, bahasa browser, serta informasi browser yang tersedia juga dikirim
            kepada pengelola melalui Telegram.
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
          <p className="font-semibold text-white">Privasi Anda</p>
          <p className="mt-1">Lokasi hanya perkiraan dari IP, bukan GPS. Tidak ada kamera, mikrofon, foto, audio, kontak, atau file yang diakses. Sebagian detail perangkat mungkin tidak tersedia atau tidak akurat.</p>
          <p className="mt-3">Jika menolak, pengelola hanya menerima slug dan waktu kunjungan untuk statistik dasar.</p>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-300" role="alert">{error}</p> : null}

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void continueToDestination(true)}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Memproses tautan…" : "Setuju & lanjutkan"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void continueToDestination(false)}
            className="w-full rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Lanjutkan tanpa laporan tambahan
          </button>
          <Link href="/" className="pt-1 text-center text-sm text-slate-400 hover:text-white">Kembali ke beranda</Link>
        </div>
      </section>
    </main>
  );
}
