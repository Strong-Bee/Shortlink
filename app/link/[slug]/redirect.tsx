"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type LinkRecord = { slug: string; destination: string };

export default function LinkRedirect() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [record, setRecord] = useState<LinkRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/shortlinks?slug=${encodeURIComponent(slug)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Sublink tidak ditemukan.");
        setRecord(result as LinkRecord);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Gagal memuat sublink.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    if (slug) void load();
    else { setError("Nama sublink tidak valid."); setLoading(false); }
    return () => controller.abort();
  }, [slug]);

  if (loading) return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Memuat sublink…</main>;
  if (!record) return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6"><p role="alert">{error || "Sublink tidak ditemukan."}</p></main>;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7 text-center">
        <h1 className="text-xl font-bold text-blue-300">Anda akan membuka tautan eksternal</h1>
        <p className="mt-2 text-xs text-slate-400">Sublink: /link/{record.slug}</p>
        <p className="mt-3 text-sm text-slate-300 break-all">{record.destination}</p>
        <p className="mt-4 text-xs text-slate-400">Periksa alamat tujuan sebelum melanjutkan.</p>
        <button onClick={() => { setConfirmed(true); window.location.assign(record.destination); }} disabled={confirmed} className="mt-6 w-full rounded-lg bg-blue-600 p-3 font-semibold hover:bg-blue-700 disabled:opacity-60">
          {confirmed ? "Membuka tautan…" : "Lanjutkan ke tujuan"}
        </button>
      </section>
    </main>
  );
}
