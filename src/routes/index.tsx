import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const CensusMap = lazy(() => import("@/components/CensusMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vista Mapper Pro" },
      { name: "description", content: "Interactive GIS dashboard for village boundaries and detected building structures." },
    ],
  }),
  component: Index,
  ssr: false,
});

function Index() {
  const fallback = (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
      Loading map…
    </div>
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <CensusMap />
      </Suspense>
    </ClientOnly>
  );
}
