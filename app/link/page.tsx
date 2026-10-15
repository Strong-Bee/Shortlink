"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

function decodeDestination(token: string): string {
  const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const value = new TextDecoder().decode(bytes);
  const destination = new URL(value);

  if (destination.protocol !== "https:" && destination.protocol !== "http:") {
    throw new Error("Protokol tautan tidak didukung.");
  }

  return destination.toString();
}

function LinkContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const result = useMemo(() => {
    if (!token) return { destination: "", error: "Token tautan tidak ditemukan." };

    try {
      return { destination: decodeDestination(token), error: "" };
    } catch {
      return { destination: "", error: "Tautan tidak valid atau formatnya tidak didukung." };
    }
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-7">
        <h1 className="text-xl font-bold text-blue-300">Tautan eksternal</h1>
        {result.error ? (
          <p role="alert" className="mt-4 text-sm text-red-300">{result.error}</p>
        ) : result.destination ? (
          <>
            <p className="mt-3 text-sm text-slate-300">
              Periksa alamat tujuan sebelum melanjutkan. Halaman ini tidak mengakses kamera,
              lokasi, atau mengirim data perangkat.
            </p>
            <p className="mt-4 break-all rounded-lg bg-slate-950 p-3 text-sm text-slate-200">
              {result.destination}
            </p>
            <button
              type="button"
              onClick={() => window.location.assign(result.destination)}
              className="mt-6 w-full rounded-lg bg-blue-600 p-3 font-semibold hover:bg-blue-700"
            >
              Lanjutkan ke tujuan
            </button>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-400">Memvalidasi tautan…</p>
        )}
      </section>
    </main>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <LinkContent />
    </Suspense>
  );
}
