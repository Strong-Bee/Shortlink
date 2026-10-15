"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

function decodeDestination(token: string): string | null {
  try {
    const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const url = new URL(new TextDecoder().decode(bytes));
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function LinkRedirect() {
  const params = useSearchParams();
  const [confirmed, setConfirmed] = useState(false);
  const destination = useMemo(() => decodeDestination(params.get("t") ?? ""), [params]);

  if (!destination) {
    return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6"><p role="alert">Tautan tidak valid atau sudah rusak.</p></main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7 text-center">
        <h1 className="text-xl font-bold text-blue-300">Anda akan membuka tautan eksternal</h1>
        <p className="mt-3 text-sm text-slate-300 break-all">{destination}</p>
        <p className="mt-4 text-xs text-slate-400">Lanjutkan hanya jika Anda mempercayai tujuan tautan ini. Halaman ini tidak meminta akses kamera atau lokasi.</p>
        <button onClick={() => { setConfirmed(true); window.location.assign(destination); }} disabled={confirmed} className="mt-6 w-full rounded-lg bg-blue-600 p-3 font-semibold hover:bg-blue-700 disabled:opacity-60">
          {confirmed ? "Membuka tautan…" : "Lanjutkan ke tujuan"}
        </button>
      </section>
    </main>
  );
}
