"use client";

import React, { useState } from "react";

export default function AdminPage() {
  const [longUrl, setLongUrl] = useState<string>("");
  const [shortUrl, setShortUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const createLink = () => {
    if (!longUrl) return alert("Masukkan URL tujuan!");
    try {
      // Menggunakan btoa untuk encoding URL ke Base64
      const encoded = btoa(longUrl);
      const finalUrl = `${window.location.origin}/capture?t=${encoded}`;
      setShortUrl(finalUrl);
      setCopied(false);
    } catch (err) {
      alert("Format URL tidak didukung.");
    }
  };

  const handleCopy = async () => {
    if (!shortUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shortUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shortUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Gagal menyalin, silakan salin manual.");
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
        <h1 className="text-2xl font-bold mb-6 text-blue-400 text-center tracking-tighter uppercase">
          LITEURL GENERATOR
        </h1>
        <div className="space-y-4">
          <input
            type="text"
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            className="w-full p-3 rounded bg-slate-900 border border-slate-700 focus:border-blue-500 outline-none transition"
          />
          <button
            onClick={createLink}
            className="w-full bg-blue-600 p-3 rounded font-bold hover:bg-blue-700 active:scale-95 transition tracking-widest"
          >
            GENERATE LINK
          </button>
        </div>

        {shortUrl && (
          <div className="mt-6 p-4 bg-slate-950 rounded border border-blue-500/30 animate-in fade-in zoom-in">
            <p className="text-xs text-slate-500 mb-3 uppercase font-bold text-center tracking-widest">
              Link Siap:
            </p>
            <div className="flex flex-col gap-3">
              <input
                readOnly
                value={shortUrl}
                className="w-full bg-slate-900 p-2 rounded border border-slate-800 text-blue-300 font-mono text-xs text-center outline-none"
              />
              <button
                onClick={handleCopy}
                className={`w-full p-2 rounded text-xs font-bold transition uppercase ${
                  copied ? "bg-green-600" : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                {copied ? "✓ BERHASIL DISALIN" : "SALIN LINK"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
