import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { kml as kmlToGeoJSON } from "@tmcw/togeojson";
import type { FeatureCollection, Feature } from "geojson";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Layers,
  MapPin,
  Home,
  Ruler,
  Search,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Upload,
} from "lucide-react";

const CENTER: [number, number] = [18.748, 73.585];

type HouseProps = {
  latitude?: string;
  longitude?: string;
  area_in_meters?: string;
  confidence?: string;
  full_plus_code?: string;
};

function FitToBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40] });
  }, [bounds, map]);
  return null;
}

function FlyTo({ target }: { target: { center: [number, number]; zoom?: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target.center, target.zoom ?? 19, { duration: 1.2 });
  }, [target, map]);
  return null;
}

export default function CensusMap() {
  const [boundary, setBoundary] = useState<FeatureCollection | null>(null);
  const [houses, setHouses] = useState<FeatureCollection | null>(null);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showHouses, setShowHouses] = useState(true);
  const [showSatellite, setShowSatellite] = useState(true);
  const [selected, setSelected] = useState<{ id: number; props: HouseProps; center: [number, number]; area: number } | null>(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cursor, setCursor] = useState<[number, number]>(CENTER);
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom?: number } | null>(null);
  const [boundsTrigger, setBoundsTrigger] = useState(0);

  // Load datasets
  useEffect(() => {
    fetch("/data/boundary.kml")
      .then((r) => r.text())
      .then((txt) => {
        const dom = new DOMParser().parseFromString(txt, "text/xml");
        const gj = kmlToGeoJSON(dom) as FeatureCollection;
        setBoundary(gj);
      });
    fetch("/data/output_houses.geojson")
      .then((r) => r.json())
      .then((gj) => setHouses(gj));
  }, []);

  const allBounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (!boundary) return null;
    const layer = L.geoJSON(boundary);
    return layer.getBounds();
  }, [boundary]);

  useEffect(() => {
    if (allBounds) setBoundsTrigger((t) => t + 1);
  }, [allBounds]);

  const totalHouses = houses?.features.length ?? 0;
  const totalArea = useMemo(() => {
    if (!houses) return 0;
    return houses.features.reduce((acc, f) => {
      const a = parseFloat((f.properties as HouseProps)?.area_in_meters ?? "0");
      return acc + (isNaN(a) ? 0 : a);
    }, 0);
  }, [houses]);

  const filteredHouses = useMemo<FeatureCollection | null>(() => {
    if (!houses) return null;
    if (!search.trim()) return houses;
    const q = search.trim().toLowerCase();
    return {
      ...houses,
      features: houses.features.filter((f) => {
        const p = f.properties as HouseProps;
        return (
          p.full_plus_code?.toLowerCase().includes(q) ||
          p.latitude?.includes(q) ||
          p.longitude?.includes(q)
        );
      }),
    };
  }, [houses, search]);

  const houseStyle = () => ({
    color: "#FFAA00",
    weight: 1,
    fillColor: "#FFAA00",
    fillOpacity: 0.4,
  });

  const boundaryStyle = () => ({
    color: "#D32F2F",
    weight: 4,
    fillOpacity: 0,
  });

  const onEachHouse = (feature: Feature, layer: L.Layer) => {
    const path = layer as L.Path;
    let idx = 0;
    if (houses) idx = houses.features.indexOf(feature);
    path.on({
      mouseover: () => {
        path.setStyle({ fillOpacity: 0.7, color: "#FFD700", weight: 2 });
        (path as any).bringToFront?.();
      },
      mouseout: () => {
        path.setStyle(houseStyle());
      },
      click: () => {
        const p = feature.properties as HouseProps;
        const b = (layer as any).getBounds?.() as L.LatLngBounds | undefined;
        const c = b ? b.getCenter() : null;
        setSelected({
          id: idx,
          props: p,
          center: c ? [c.lat, c.lng] : [parseFloat(p.latitude ?? "0"), parseFloat(p.longitude ?? "0")],
          area: parseFloat(p.area_in_meters ?? "0"),
        });
      },
    });
  };

  const onEachBoundary = (_f: Feature, layer: L.Layer) => {
    const path = layer as L.Path;
    path.on({
      mouseover: () => path.setStyle({ weight: 6, color: "#FF1744" }),
      mouseout: () => path.setStyle(boundaryStyle()),
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "kml" | "geojson") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (type === "kml") {
      const dom = new DOMParser().parseFromString(text, "text/xml");
      setBoundary(kmlToGeoJSON(dom) as FeatureCollection);
    } else {
      setHouses(JSON.parse(text));
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      <MapContainer
        center={CENTER}
        zoom={16}
        zoomControl={false}
        preferCanvas
        className="absolute inset-0 h-full w-full"
        style={{ background: "#0b1220" }}
      >
        {showSatellite && (
          <TileLayer
            attribution='Tiles &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={22}
          />
        )}
        <ZoomControl position="topright" />
        <MouseTracker onMove={setCursor} />
        {boundsTrigger > 0 && <FitToBounds bounds={allBounds} />}
        <FlyTo target={flyTarget} />
        {showHouses && filteredHouses && (
          <GeoJSON
            key={`houses-${filteredHouses.features.length}`}
            data={filteredHouses}
            style={houseStyle as any}
            onEachFeature={onEachHouse}
          />
        )}
        {showBoundary && boundary && (
          <GeoJSON
            key="boundary"
            data={boundary}
            style={boundaryStyle as any}
            onEachFeature={onEachBoundary}
          />
        )}
      </MapContainer>

      {/* Toggle button when sidebar closed */}
      {!sidebarOpen && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute left-4 top-4 z-[1000] bg-slate-900/90 border border-slate-700 hover:bg-slate-800"
          onClick={() => setSidebarOpen(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Sidebar */}
      <aside
        className={`absolute left-0 top-0 z-[999] h-full w-[360px] transform border-r border-slate-800 bg-slate-950/95 backdrop-blur-xl transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 p-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-red-600">
                  <Layers className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-sm font-semibold tracking-tight">
                  Census Mapping Dashboard
                </h1>
              </div>
              <Badge variant="outline" className="mt-2 border-slate-700 bg-slate-900 text-[10px] font-mono text-slate-400">
                v1.0
              </Badge>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search Plus Code or coords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-slate-800 bg-slate-900 pl-9 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500/40"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
              onClick={() => setBoundsTrigger((t) => t + 1)}
            >
              <Crosshair className="mr-2 h-3.5 w-3.5" />
              Reset to Boundary View
            </Button>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <Metric
                icon={<Ruler className="h-3.5 w-3.5" />}
                label="Total Area"
                value={`${(totalArea / 1000).toFixed(2)}k m²`}
              />
              <Metric
                icon={<Home className="h-3.5 w-3.5" />}
                label="Detected Houses"
                value={totalHouses.toLocaleString()}
              />
              <Card className="col-span-2 border-slate-800 bg-slate-900 p-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
                  <MapPin className="h-3 w-3" /> Cursor Coordinates
                </div>
                <div className="mt-1 font-mono text-xs text-amber-400">
                  {cursor[0].toFixed(6)}, {cursor[1].toFixed(6)}
                </div>
              </Card>
            </div>

            {/* Layer Control */}
            <Section title="Layer Control">
              <LayerToggle
                label="Satellite Imagery"
                desc="Esri World Imagery"
                color="#3b82f6"
                checked={showSatellite}
                onChange={setShowSatellite}
              />
              <LayerToggle
                label="Block Boundary"
                desc="Village outline (KML)"
                color="#D32F2F"
                checked={showBoundary}
                onChange={setShowBoundary}
              />
              <LayerToggle
                label="Detected Houses"
                desc={`${totalHouses} polygons`}
                color="#FFAA00"
                checked={showHouses}
                onChange={setShowHouses}
              />
            </Section>

            {/* Upload */}
            <Section title="Replace Datasets">
              <FileDrop label="Upload boundary.kml" accept=".kml" onChange={(e) => handleFileUpload(e, "kml")} />
              <FileDrop label="Upload houses.geojson" accept=".geojson,.json" onChange={(e) => handleFileUpload(e, "geojson")} />
            </Section>

            {/* Selected house */}
            {selected && (
              <Section title="Selected Structure">
                <Card className="border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-amber-400">
                      Structure #{selected.id + 1}
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/20">
                      {(parseFloat(selected.props.confidence ?? "0") * 100).toFixed(0)}% conf
                    </Badge>
                  </div>
                  <Field label="Plus Code" value={selected.props.full_plus_code ?? "—"} mono />
                  <Field label="Area" value={`${selected.area.toFixed(2)} m²`} />
                  <Field
                    label="Center"
                    value={`${selected.center[0].toFixed(6)}, ${selected.center[1].toFixed(6)}`}
                    mono
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                    onClick={() => setFlyTarget({ center: selected.center, zoom: 20 })}
                  >
                    <Crosshair className="mr-2 h-3 w-3" /> Zoom to Structure
                  </Button>
                </Card>
              </Section>
            )}
          </div>

          <div className="border-t border-slate-800 p-3 text-[10px] text-slate-500">
            <div className="flex items-center justify-between">
              <span>EPSG:4326 · WGS84</span>
              <span className="font-mono">Z{16}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function MouseTracker({ onMove }: { onMove: (c: [number, number]) => void }) {
  const map = useMap();
  const ref = useRef(onMove);
  ref.current = onMove;
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => ref.current([e.latlng.lat, e.latlng.lng]);
    map.on("mousemove", handler);
    return () => {
      map.off("mousemove", handler);
    };
  }, [map]);
  return null;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="border-slate-800 bg-slate-900 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function LayerToggle({
  label,
  desc,
  color,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  color: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 p-2.5">
      <div className="flex items-center gap-2.5">
        <div
          className="h-3 w-3 rounded-sm ring-1 ring-white/10"
          style={{ backgroundColor: color }}
        />
        <div>
          <div className="text-xs font-medium text-slate-100">{label}</div>
          <div className="text-[10px] text-slate-500">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function FileDrop({
  label,
  accept,
  onChange,
}: {
  label: string;
  accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-700 bg-slate-900/50 p-2.5 text-xs text-slate-400 transition-colors hover:border-amber-500/50 hover:text-amber-400">
      <Upload className="h-3.5 w-3.5" />
      <span className="flex-1 truncate">{label}</span>
      <input type="file" accept={accept} onChange={onChange} className="hidden" />
    </label>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-xs text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
