"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type LinkRecord = { slug: string; destination: string };

export default function LinkRedirect() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAndRedirect() {
      try {
        const response = await fetch(
          `/api/shortlinks?slug=${encodeURIComponent(slug)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Sublink tidak ditemukan.");
        }

        const record = result as LinkRecord;
        const destination = new URL(record.destination);

        // Only navigate to valid HTTP(S) destinations returned by the API.
        if (destination.protocol !== "http:" && destination.protocol !== "https:") {
          throw new Error("Alamat tujuan tidak valid.");
        }

        window.location.replace(destination.toString());
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Gagal membuka sublink.");
          setLoading(false);
        }
      }
    }

    if (slug) {
      void loadAndRedirect();
    } else {
      setError("Nama sublink tidak valid.");
      setLoading(false);
    }

    return () => controller.abort();
  }, [slug]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 text-center">
        {loading ? (
          <>
            <div
              className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400"
              aria-hidden="true"
            />
            <h1 className="text-lg font-semibold">Mengarahkan ke tujuan…</h1>
            <p className="mt-2 text-sm text-slate-400">Tautan sedang diproses.</p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-rose-300">Tautan tidak dapat dibuka</h1>
            <p className="mt-2 break-words text-sm text-slate-300" role="alert">
              {error || "Sublink tidak ditemukan."}
            </p>
            <a
              href="/"
              className="mt-5 inline-flex rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Kembali ke beranda
            </a>
          </>
        )}
      </section>
    </main>
  );
}
