// Home entry point. Keep URL-dependent portal content inside Suspense.
import { Suspense } from "react";
import PortalClient from "@/components/PortalClient";

export default function Home() {
  return <Suspense fallback={<main className="container"><p role="status">Memuat halaman…</p></main>}>
    <PortalClient />
  </Suspense>;
}
