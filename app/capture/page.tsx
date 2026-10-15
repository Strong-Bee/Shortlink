"use client";

import { useEffect, useRef, useState } from "react";

export default function CapturePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [consent, setConsent] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [gps, setGps] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
  }, []);

  async function openCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraReady(true);
    } catch {
      setError("Kamera tidak tersedia atau izin kamera ditolak.");
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("Tunggu hingga pratinjau kamera siap.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Tidak dapat memproses foto di perangkat ini.");
      return;
    }
    context.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) setPhoto(blob);
      else setError("Gagal mengambil foto.");
    }, "image/jpeg", 0.85);
  }

  function getLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Browser ini tidak mendukung lokasi GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setGps({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      () => setError("Lokasi tidak tersedia atau izin lokasi ditolak."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        setAudio(new Blob(chunksRef.current, { type }));
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Mikrofon tidak tersedia atau izin mikrofon ditolak.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function sendReport() {
    setError("");
    setMessage("");
    if (!consent) {
      setError("Centang persetujuan terlebih dahulu.");
      return;
    }
    if (recording) {
      setError("Hentikan rekaman audio sebelum mengirim.");
      return;
    }
    if (!photo && !gps && !audio) {
      setError("Pilih setidaknya satu data: foto, lokasi, atau audio.");
      return;
    }
    if (photo && photo.size > 5 * 1024 * 1024) {
      setError("Ukuran foto maksimal 5 MB.");
      return;
    }
    if (audio && audio.size > 15 * 1024 * 1024) {
      setError("Ukuran audio maksimal 15 MB.");
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.set("consent", "true");
      form.set("summary", [
        "Laporan media sukarela Shortlink",
        `Waktu: ${new Date().toISOString()}`,
        gps ? `Lokasi: ${gps.lat}, ${gps.lon} (akurasi ±${Math.round(gps.accuracy ?? 0)} m)` : "Lokasi: tidak dibagikan",
        gps ? `Peta: https://www.google.com/maps?q=${gps.lat},${gps.lon}` : "",
        photo ? "Foto: dilampirkan" : "Foto: tidak dibagikan",
        audio ? "Audio: dilampirkan" : "Audio: tidak dibagikan",
        `Perangkat/browser: ${navigator.userAgent.slice(0, 250)}`,
      ].filter(Boolean).join("\n"));
      if (photo) form.set("photo", photo, "capture.jpg");
      if (audio) form.set("audio", audio, audio.type.includes("mp4") ? "recording.m4a" : "recording.webm");
      const response = await fetch("/api/capture", { method: "POST", body: form });
      const result = await response.json() as { error?: string; success?: boolean };
      if (!response.ok || !result.success) throw new Error(result.error || "Laporan gagal dikirim.");
      setMessage("Laporan berhasil dikirim ke Telegram. Data hanya dikirim setelah persetujuan dan tindakan Anda.");
      setPhoto(null);
      setGps(null);
      setAudio(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim laporan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
      <section className="mx-auto max-w-2xl">
        <a href="/" className="text-sm text-cyan-300 hover:underline">← Kembali ke Shortlink</a>
        <header className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Fitur sukarela</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Pusat laporan media</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Anda mengontrol setiap data yang dibagikan. Kamera, lokasi, dan mikrofon hanya diakses setelah Anda menekan kontrol masing-masing dan memberikan izin browser. Tidak ada perekaman tersembunyi atau pengiriman otomatis.
          </p>
        </header>

        <div className="mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <section className="rounded-xl border border-slate-700 p-4">
            <h2 className="font-semibold">1. Kamera</h2>
            <p className="mt-1 text-sm text-slate-400">Buka pratinjau, lalu ambil foto secara manual.</p>
            <div className="mt-3 overflow-hidden rounded-lg bg-black">
              <video ref={videoRef} autoPlay muted playsInline className={cameraReady ? "block max-h-80 w-full object-contain" : "hidden"} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void openCamera()} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-600">Aktifkan kamera</button>
              <button type="button" onClick={takePhoto} disabled={!cameraReady} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">Ambil foto</button>
              {photo && <span className="self-center text-sm text-emerald-300">Foto siap dikirim</span>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 p-4">
            <h2 className="font-semibold">2. Lokasi GPS</h2>
            <p className="mt-1 text-sm text-slate-400">Lokasi tepat hanya diambil jika Anda menekan tombol di bawah dan menyetujui permintaan browser.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={getLocation} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-600">Ambil lokasi</button>
              {gps && <span className="text-sm text-emerald-300">Lokasi berhasil diperoleh</span>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 p-4">
            <h2 className="font-semibold">3. Mikrofon</h2>
            <p className="mt-1 text-sm text-slate-400">Mulai dan hentikan rekaman secara manual. Rekaman maksimal 15 MB untuk pengiriman.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {!recording ? (
                <button type="button" onClick={() => void startRecording()} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-600">Mulai rekam audio</button>
              ) : (
                <button type="button" onClick={stopRecording} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white">Hentikan rekaman</button>
              )}
              {recording && <span className="text-sm text-rose-300">Sedang merekam…</span>}
              {audio && <span className="text-sm text-emerald-300">Audio siap dikirim</span>}
            </div>
          </section>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cyan-900 bg-cyan-950/40 p-4 text-sm leading-6">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-cyan-400" />
            <span>Saya setuju mengirim hanya data yang saya pilih (foto, lokasi, dan/atau audio) ke operator Shortlink melalui Telegram. Saya memahami bahwa data tersebut dapat mengungkap informasi pribadi.</span>
          </label>

          {error && <p role="alert" className="rounded-lg border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p>}
          {message && <p role="status" className="rounded-lg border border-emerald-900 bg-emerald-950/50 p-3 text-sm text-emerald-200">{message}</p>}
          <button type="button" onClick={() => void sendReport()} disabled={busy || !consent || recording} className="w-full rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? "Mengirim laporan…" : "Kirim data yang dipilih ke Telegram"}
          </button>
          <p className="text-xs leading-5 text-slate-500">Kirim hanya jika Anda memahami dan menyetujui tujuan pengumpulan data. Anda dapat menutup halaman kapan saja; stream kamera dan mikrofon dihentikan saat halaman ditutup.</p>
        </div>
      </section>
    </main>
  );
}
