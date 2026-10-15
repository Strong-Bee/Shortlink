"use client";

import React, { useState } from "react";

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export default function AdminPage() {
  const [longUrl, setLongUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const createLink = () => {
    setError("");
    setShortUrl("");

    let destination: URL;
    try {
      destination = new URL(longUrl.trim());
    } catch {
      setError("Masukkan URL tujuan yang valid, termasuk https:// atau http://.");
      return;
    }

    if (destination.protocol !== "https:" && destination.protocol !== "http:") {
      setError("Hanya URL dengan protokol HTTP atau HTTPS yang didukung.");
      return;
    }

    const slug = customName.trim().toLowerCase();
    if (!slug) {
      setError("Masukkan nama sublink.");
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(slug)) {
      setError("Nama hanya boleh berisi huruf a-z, angka, dan tanda hubung; tanpa spasi.");
      return;
    }

    const encoded = encodeBase64Url(destination.toString());
    setShortUrl(`${window.location.origin}/link/${encodeURIComponent(slug)}?t=${encoded}`);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!shortUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shortUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shortUrl;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand("copy");
        textArea.remove();
        if (!successful) throw new Error("Clipboard copy failed");
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Gagal menyalin otomatis. Pilih dan salin URL secara manual.");
    }
  };

  return (
    <main className="bg-slate-900 text-white min-h-screen flex items-center justify-center p-4">
      <section className="max-w-md w-full p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
        <h1 className="text-2xl font-bold mb-2 text-blue-400 text-center uppercase tracking-tighter">
          SHORTLINK GENERATOR
        </h1>
        <p className="text-sm text-slate-400 text-center mb-6">Buat tautan dengan nama pilihan Anda.</p>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createLink();
          }}
        >
          <div>
            <label htmlFor="destination" className="block text-sm text-slate-300 mb-1">URL tujuan</label>
            <input
              id="destination"
              type="url"
              inputMode="url"
              autoComplete="url"
              required
              value={longUrl}
              onChange={(event) => setLongUrl(event.target.value)}
              placeholder="https://example.com/path"
              className="w-full p-3 rounded bg-slate-900 border border-slate-700 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label htmlFor="custom-name" className="block text-sm text-slate-300 mb-1">Nama sublink</label>
            <div className="flex items-center rounded bg-slate-900 border border-slate-700 focus-within:border-blue-500">
              <span className="pl-3 text-slate-500">/link/</span>
              <input
                id="custom-name"
                type="text"
                required
                maxLength={50}
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                placeholder="promo-2026"
                className="min-w-0 flex-1 p-3 bg-transparent outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Huruf kecil, angka, dan tanda hubung; tanpa spasi.</p>
          </div>
          <button type="submit" className="w-full bg-blue-600 p-3 rounded font-bold hover:bg-blue-700 transition">
            GENERATE LINK
          </button>
        </form>

        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}

        {shortUrl && (
          <div className="mt-6 p-4 bg-slate-950 rounded border border-blue-500/30">
            <p className="text-xs text-slate-400 mb-3 uppercase font-bold text-center">Shortlink siap</p>
            <div className="flex flex-col gap-3">
              <input
                aria-label="URL shortlink"
                readOnly
                value={shortUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="w-full bg-slate-900 p-2 rounded text-blue-300 font-mono text-xs text-center outline-none"
              />
              <button type="button" onClick={handleCopy} className={`w-full p-2 rounded text-xs font-bold transition uppercase ${copied ? "bg-green-600" : "bg-slate-700"}`}>
                {copied ? "✓ Tersalin" : "Salin link"}
              </button>
            </div>
          </div>
        )}
        <p className="mt-6 text-xs leading-relaxed text-slate-400">
          Tautan menggunakan nama yang Anda pilih. URL tujuan disandikan di parameter tautan dan tidak disimpan sebagai entri database.
        </p>
      </section>
    </main>
  );
}
