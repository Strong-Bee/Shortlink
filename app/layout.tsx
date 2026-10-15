import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import CookieConsent from "@/components/cookie-consent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shortlink — Tautan Ringkas, Mudah Dibagikan",
  description: "Buat shortlink dengan nama khusus, bagikan dengan mudah, dan kelola tautan yang berlaku selama tujuh hari.",
  applicationName: "Shortlink",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900 text-white`}
      >
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
