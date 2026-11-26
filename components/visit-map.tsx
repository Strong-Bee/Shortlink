"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type LeafletLayer = { addTo(map: LeafletMap): LeafletLayer };
type LeafletMap = {
  setView(center: [number, number], zoom: number): LeafletMap;
  remove(): void;
  invalidateSize(): LeafletMap;
};
type LeafletMarker = {
  addTo(map: LeafletMap): LeafletMarker;
  bindPopup(content: Node): LeafletMarker;
  openPopup(): LeafletMarker;
};
type LeafletControl = { addTo(map: LeafletMap): LeafletControl };
type LeafletApi = {
  map(element: HTMLElement, options?: Record<string, unknown>): LeafletMap;
  tileLayer(url: string, options: Record<string, unknown>): LeafletLayer;
  marker(position: [number, number]): LeafletMarker;
  control: {
    layers(layers: Record<string, LeafletLayer>): LeafletControl;
    scale(options: Record<string, unknown>): LeafletControl;
  };
};

declare global {
  interface Window {
    L?: LeafletApi;
  }
}

type VisitMapProps = {
  latitude: number;
  longitude: number;
  label: string;
};

export default function VisitMap({ latitude, longitude, label }: VisitMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [libraryReady, setLibraryReady] = useState(false);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    if (!libraryReady || !containerRef.current || !window.L) return;

    const L = window.L;
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
      [latitude, longitude],
      13,
    );

    const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    const humanitarian = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors, Tiles style by <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>',
    });

    street.addTo(map);
    L.control.layers({
      "Peta standar": street,
      "Peta Humanitarian": humanitarian,
    }).addTo(map);
    L.control.scale({ metric: true, imperial: false }).addTo(map);
    L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(document.createTextNode(label))
      .openPopup();

    const resizeFrame = window.requestAnimationFrame(() => {
      // Recalculate the map viewport after the responsive container paints.
      map.invalidateSize();
    });

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      map.remove();
    };
  }, [libraryReady, latitude, longitude, label]);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        strategy="afterInteractive"
        onLoad={() => setLibraryReady(true)}
        onError={() => setMapError("Library peta gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.")}
      />
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <div>
          <p className="text-sm font-semibold text-white">Peta lokasi perkiraan</p>
          <p className="mt-1 text-xs text-slate-400">{label}</p>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-medium text-cyan-200">
          Leaflet · OpenStreetMap
        </span>
      </div>
      <div
        ref={containerRef}
        role="region"
        aria-label="Peta interaktif lokasi perkiraan"
        className="h-[420px] w-full bg-slate-800 sm:h-[520px]"
      />
      {mapError ? <p role="alert" className="px-4 py-3 text-sm text-rose-300">{mapError}</p> : null}
      {!libraryReady && !mapError ? <p className="px-4 py-3 text-sm text-slate-400">Memuat peta…</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3 text-xs text-slate-400 sm:px-5">
        <span>Koordinat: {latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
        <a
          href={"https://www.openstreetmap.org/?mlat=" + latitude + "&mlon=" + longitude + "#map=15/" + latitude + "/" + longitude}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-cyan-200 transition hover:text-cyan-100"
        >
          Buka di OpenStreetMap ↗
        </a>
      </div>
    </section>
  );
}
