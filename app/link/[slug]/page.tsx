import { Suspense } from "react";
import LinkRedirect from "./redirect";

export default function NamedLinkPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Memuat tautan…</main>}>
      <LinkRedirect />
    </Suspense>
  );
}
