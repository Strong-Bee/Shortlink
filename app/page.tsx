"use client";

import React, { useState } from "react";

export default function AdminPage() {
  const [longUrl, setLongUrl] = useState<string>("");
  const [shortUrl, setShortUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const createLink = () => {
    if (!longUrl) return alert("Masukkan URL tujuan!");

    try {
      const encoded = btoa(longUrl);
      const finalUrl = `${window.location.origin}/capture?t=${encoded}`;
      setShortUrl(finalUrl);
      setCopied(false);
    } catch (err) {
      alert("Terjadi kesalahan saat memproses URL.");
    }
  };

  const handleCopy = async () => {
    if (!shortUrl) return;

    try {
      // Metode 1: Navigator API (Modern)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shortUrl);
      } else {
        // Metode 2: Fallback untuk browser lama atau non-HTTPS
        const textArea = document.createElement("textarea");
        textArea.value = shortUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Gagal menyalin teks secara otomatis. Silakan salin manual.");
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
        <h1 className="text-2xl font-bold mb-6 text-blue-400 text-center tracking-tighter uppercase">
          LiteURL Generator
        </h1>
        <div className="space-y-4">
          <input
            type="text"
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            placeholder="https://google.com"
            className="w-full p-3 rounded bg-slate-900 border border-slate-700 focus:border-blue-500 outline-none transition"
          />
          <button
            onClick={createLink}
            className="w-full bg-blue-600 p-3 rounded font-bold hover:bg-blue-700 active:scale-95 transition uppercase tracking-widest"
          >
            GENERATE LINK
          </button>
        </div>

        {shortUrl && (
          <div className="mt-6 p-4 bg-slate-950 rounded border border-blue-500/30">
            <p className="text-xs text-slate-500 mb-3 uppercase font-bold tracking-widest text-center">
              Target Link:
            </p>
            <div className="flex flex-col gap-3">
              <input
                readOnly
                id="shortUrlInput"
                value={shortUrl}
                className="w-full bg-slate-900 p-2 rounded border border-slate-800 text-blue-300 font-mono text-xs outline-none text-center"
                onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className={`w-full p-2 rounded text-xs font-bold transition uppercase tracking-widest ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {copied ? "✓ Berhasil Disalin!" : "Salin Link"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
