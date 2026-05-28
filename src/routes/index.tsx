import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const CensusMap = lazy(() => import("@/components/CensusMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Census Mapping Dashboard" },
      { name: "description", content: "Interactive GIS dashboard for analyzing village boundaries and detected building structures." },
      { property: "og:title", content: "Census Mapping Dashboard" },
      { property: "og:description", content: "Interactive GIS dashboard for analyzing village boundaries and detected building structures." },
    ],
  }),
  component: Index,
  ssr: false,
});

function Index() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">Loading map…</div>}>
      <CensusMap />
    </Suspense>
  );
}
