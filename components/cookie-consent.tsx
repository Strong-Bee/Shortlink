"use client";

import { useCallback, useEffect, useState } from "react";

type Categories = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

type ConsentResponse = {
  consent: { updatedAt: string; categories: Categories } | null;
};

const defaultCategories: Categories = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export default function CookieConsent() {
  const [categories, setCategories] = useState<Categories>(defaultCategories);
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadConsent = useCallback(async () => {
    try {
      const response = await fetch("/api/cookie-consent", { cache: "no-store" });
      const result = await response.json() as ConsentResponse;
      if (result.consent?.categories) {
        setCategories(result.consent.categories);
        setVisible(false);
      } else {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    void loadConsent();
  }, [loadConsent]);

  const save = async (next: Categories) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/cookie-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: next }),
      });
      const result = await response.json() as { error?: string; consent?: ConsentResponse["consent"] };
      if (!response.ok || !result.consent) {
        setError(result.error || "Preferensi belum dapat disimpan. Periksa konfigurasi server.");
        return;
      }
      setCategories(result.consent.categories);
      setVisible(false);
      setSettingsOpen(false);
    } catch {
      setError("Tidak dapat menghubungi server. Preferensi belum disimpan.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key: "functional" | "analytics" | "marketing", value: boolean) => {
    setCategories((current) => ({ ...current, [key]: value }));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setSettingsOpen(true); setVisible(true); setError(""); }}
        className="fixed bottom-3 left-3 z-40 rounded-full border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100 shadow-lg hover:bg-slate-700"
        aria-label="Buka pengaturan cookies"
      >
        Pengaturan cookies
      </button>

      {visible && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-5" role="region" aria-label="Persetujuan cookies">
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-600 bg-slate-950 p-5 text-white shadow-2xl">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="text-2xl">🍪</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">Pilihan privasi dan cookies</h2>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  Cookies yang diperlukan selalu aktif untuk menyimpan pilihan privasi Anda. Cookies opsional dinonaktifkan sampai Anda memilihnya. Pilihan dapat diubah kapan saja melalui Pengaturan cookies.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Laporan Telegram, jika dikonfigurasi, hanya berisi status persetujuan dan pilihan kategori—bukan nilai cookies atau token autentikasi.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={loading} onClick={() => void save(defaultCategories)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">
                    Tolak opsional
                  </button>
                  <button type="button" disabled={loading} onClick={() => setSettingsOpen(true)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">
                    Sesuaikan
                  </button>
                  <button type="button" disabled={loading} onClick={() => void save({ necessary: true, functional: true, analytics: true, marketing: true })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">
                    Terima semua
                  </button>
                </div>
                {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title" className="w-full max-w-lg rounded-2xl border border-slate-600 bg-slate-900 p-5 text-white shadow-2xl">
            <h2 id="cookie-settings-title" className="text-lg font-semibold">Pengaturan cookies</h2>
            <p className="mt-1 text-sm text-slate-300">Pilih kategori opsional yang Anda izinkan. Perubahan berlaku setelah disimpan.</p>
            <div className="mt-4 space-y-3">
              <label className="flex items-start justify-between gap-4 rounded-xl border border-slate-700 p-3">
                <span><span className="block font-medium">Diperlukan</span><span className="block text-xs text-slate-400">Menyimpan preferensi privasi dan fungsi dasar aplikasi.</span></span>
                <input type="checkbox" checked disabled aria-label="Cookies diperlukan selalu aktif" className="mt-1 h-4 w-4" />
              </label>
              {([
                ["functional", "Fungsional", "Mengingat pilihan tambahan dan meningkatkan kenyamanan."],
                ["analytics", "Analitik", "Membantu memahami penggunaan situs jika analitik diaktifkan."],
                ["marketing", "Pemasaran", "Digunakan untuk pemasaran hanya jika layanan tersebut ditambahkan."],
              ] as const).map(([key, title, description]) => (
                <label key={key} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-700 p-3">
                  <span><span className="block font-medium">{title}</span><span className="block text-xs text-slate-400">{description}</span></span>
                  <input type="checkbox" checked={categories[key]} onChange={(event) => toggle(key, event.target.checked)} className="mt-1 h-4 w-4 accent-blue-500" />
                </label>
              ))}
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={loading} onClick={() => { setSettingsOpen(false); if (!categories) setVisible(true); }} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">Batal</button>
              <button type="button" disabled={loading} onClick={() => void save(categories)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{loading ? "Menyimpan…" : "Simpan pilihan"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
