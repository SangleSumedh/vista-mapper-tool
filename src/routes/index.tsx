import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import CensusMap from "@/components/CensusMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Census Mapping Dashboard" },
      { name: "description", content: "Interactive GIS dashboard for village boundaries and detected building structures." },
    ],
  }),
  component: Index,
  ssr: false,
});

function Index() {
  return (
    <ClientOnly fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">Loading map…</div>}>
      <CensusMap />
    </ClientOnly>
  );
}
