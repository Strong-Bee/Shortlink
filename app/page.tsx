"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  ExternalLink,
  Link2,
  LockKeyhole,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

export default function HomePage() {
  const [longUrl, setLongUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const createLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setShortUrl("");
    setCopied(false);
    setLoading(true);

    try {
      const response = await fetch("/api/shortlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: customName.trim().toLowerCase(),
          destination: longUrl.trim(),
        }),
      });
      const result: { slug?: string; error?: string } = await response.json();
      if (!response.ok || !result.slug) {
        setError(result.error || "Tautan belum berhasil dibuat. Silakan coba lagi.");
        return;
      }
      setShortUrl(`${window.location.origin}/link/${encodeURIComponent(result.slug)}`);
    } catch {
      setError("Server belum dapat dijangkau. Periksa koneksi Anda lalu coba lagi.");
    } finally {
      setLoading(false);
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
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand("copy");
        textArea.remove();
        if (!successful) throw new Error("Clipboard copy failed");
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Tidak dapat menyalin otomatis. Pilih URL hasil lalu salin secara manual.");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080d18] text-white selection:bg-lime-300 selection:text-slate-950">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-[110px]" />
        <div className="absolute -right-40 top-20 h-[30rem] w-[30rem] rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a href="/" aria-label="Shortlink beranda" className="group flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] shadow-lg shadow-black/20 transition group-hover:border-lime-300/40">
            <Link2 className="h-5 w-5 text-lime-300" strokeWidth={2.4} />
          </span>
          <span>
            <span className="block text-base font-bold tracking-tight">short<span className="text-lime-300">link</span></span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">Simple. Clear. Connected.</span>
          </span>
        </a>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-300 sm:flex">
          <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,0.7)]" />
          Link creation, made simple
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 md:pt-14 lg:grid-cols-[1.03fr_0.97fr] lg:gap-16 lg:px-12 lg:pb-24 lg:pt-16">
        <div className="mx-auto w-full max-w-2xl lg:mx-0">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/[0.07] px-3.5 py-2 text-xs font-semibold text-lime-200">
            <Sparkles className="h-3.5 w-3.5" />
            Link management, without the clutter
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl md:text-6xl">
            Long links.
            <br />
            <span className="bg-gradient-to-r from-lime-200 via-lime-300 to-cyan-300 bg-clip-text text-transparent">Shorter story.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
            Buat tautan yang ringkas, mudah diingat, dan siap dibagikan. Atur nama link Anda dalam beberapa detik—tanpa proses yang berbelit.
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200"><MousePointer2 className="h-4 w-4" /></span>
              <span className="text-xs font-medium leading-5 text-slate-300">Mudah dibuat<br />dan dibagikan</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-300/10 text-lime-200"><Clock3 className="h-4 w-4" /></span>
              <span className="text-xs font-medium leading-5 text-slate-300">Aktif hingga<br />7 hari</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-300/10 text-violet-200"><ShieldCheck className="h-4 w-4" /></span>
              <span className="text-xs font-medium leading-5 text-slate-300">Kontrol URL<br />yang jelas</span>
            </div>
          </div>

          <div className="mt-9 flex items-center gap-3 text-xs leading-5 text-slate-500">
            <LockKeyhole className="h-4 w-4 shrink-0 text-slate-400" />
            <p>Hanya URL HTTP dan HTTPS yang didukung. Periksa alamat tujuan sebelum membagikan tautan.</p>
          </div>
        </div>

        <div id="create-link" className="mx-auto w-full max-w-xl scroll-mt-8">
          <div className="relative">
            <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-lime-300/20 via-cyan-400/10 to-violet-400/20 blur-xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#101827]/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="flex items-start justify-between border-b border-white/[0.08] px-6 py-5 sm:px-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">Link studio</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Buat shortlink Anda</h2>
                  <p className="mt-1.5 text-sm text-slate-400">Isi URL tujuan dan nama yang mudah diingat.</p>
                </div>
                <div className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] sm:flex">
                  <Zap className="h-5 w-5 text-lime-300" />
                </div>
              </div>

              <form className="space-y-5 px-6 py-6 sm:px-8 sm:py-8" onSubmit={(event) => void createLink(event)}>
                <div>
                  <label htmlFor="destination" className="mb-2 block text-sm font-medium text-slate-200">URL tujuan</label>
                  <div className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-[#080d18]/80 px-4 transition focus-within:border-lime-300/60 focus-within:ring-4 focus-within:ring-lime-300/10">
                    <ExternalLink className="h-4 w-4 shrink-0 text-slate-500 transition group-focus-within:text-lime-300" />
                    <input
                      id="destination"
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      required
                      value={longUrl}
                      onChange={(event) => setLongUrl(event.target.value)}
                      placeholder="https://websiteanda.com/halaman"
                      className="min-w-0 flex-1 bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="custom-name" className="mb-2 block text-sm font-medium text-slate-200">Nama shortlink</label>
                  <div className="flex items-center rounded-2xl border border-white/10 bg-[#080d18]/80 transition focus-within:border-lime-300/60 focus-within:ring-4 focus-within:ring-lime-300/10">
                    <span className="whitespace-nowrap border-r border-white/[0.08] px-3.5 py-4 text-sm text-slate-500">/link/</span>
                    <input
                      id="custom-name"
                      type="text"
                      required
                      maxLength={50}
                      pattern="[a-zA-Z0-9]+([a-zA-Z0-9-]*[a-zA-Z0-9])?"
                      value={customName}
                      onChange={(event) => setCustomName(event.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      placeholder="promo-spesial"
                      aria-describedby="slug-help"
                      className="min-w-0 flex-1 bg-transparent px-3.5 py-4 text-sm text-white outline-none placeholder:text-slate-600"
                    />
                  </div>
                  <p id="slug-help" className="mt-2 text-xs leading-5 text-slate-500">Gunakan huruf, angka, atau tanda hubung. Nama yang sudah dipakai tidak dapat digunakan lagi.</p>
                </div>

                <button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-lime-300 px-5 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-lime-300/10 transition hover:bg-lime-200 hover:shadow-lime-300/20 focus:outline-none focus:ring-4 focus:ring-lime-300/20 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-950" /> Membuat tautan...</>
                  ) : (
                    <>Buat shortlink <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></>
                  )}
                </button>

                {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-sm leading-6 text-rose-200">{error}</div>}

                {shortUrl && (
                  <div aria-live="polite" className="rounded-2xl border border-lime-300/25 bg-lime-300/[0.06] p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-lime-200">
                      <CheckCircle2 className="h-4.5 w-4.5" /> Shortlink berhasil dibuat
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-[#080d18]/80 p-2">
                      <input aria-label="URL shortlink" readOnly value={shortUrl} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 bg-transparent px-2 py-2 font-mono text-xs text-white outline-none sm:text-sm" />
                      <button type="button" onClick={() => void handleCopy()} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15">
                        {copied ? <Check className="h-4 w-4 text-lime-300" /> : <Clipboard className="h-4 w-4" />}
                        {copied ? "Tersalin" : "Salin"}
                      </button>
                    </div>
                    <a href={shortUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-lime-200 hover:text-lime-100">
                      Buka tautan <ArrowDownRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </form>
              <div className="flex items-center gap-2 border-t border-white/[0.08] bg-white/[0.025] px-6 py-4 text-xs leading-5 text-slate-500 sm:px-8">
                <Clock3 className="h-4 w-4 shrink-0" />
                Tautan berlaku selama 7 hari sejak dibuat.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12 lg:pb-20">
        <div className="grid gap-4 border-t border-white/[0.08] pt-8 sm:grid-cols-3 sm:gap-6">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300"><Link2 className="h-4 w-4" /></span>
            <div><h3 className="text-sm font-semibold text-slate-200">Nama yang mudah diingat</h3><p className="mt-1 text-sm leading-6 text-slate-500">Gunakan slug khusus agar tautan lebih rapi saat dibagikan.</p></div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300"><Clock3 className="h-4 w-4" /></span>
            <div><h3 className="text-sm font-semibold text-slate-200">Masa berlaku jelas</h3><p className="mt-1 text-sm leading-6 text-slate-500">Setiap tautan otomatis kedaluwarsa setelah tujuh hari.</p></div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300"><ShieldCheck className="h-4 w-4" /></span>
            <div><h3 className="text-sm font-semibold text-slate-200">Penggunaan yang bertanggung jawab</h3><p className="mt-1 text-sm leading-6 text-slate-500">Periksa tujuan tautan dan bagikan hanya kepada penerima yang tepat.</p></div>
          </div>
        </div>
        <footer className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Shortlink. Simple links, clearer sharing.</p>
          <a href="#create-link" className="inline-flex items-center gap-1.5 transition hover:text-slate-300">Mulai buat tautan <ArrowRight className="h-3.5 w-3.5" /></a>
        </footer>
      </section>
    </main>
  );
}
