import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { mapMarkers } from "@/data/mockData";
import {
  districtHQs,
  tamilNaduBoundary,
  blackSpotVillages,
  pewBoundaryZones,
  checkpostLocations,
} from "@/data/gisData";
import { X, AlertTriangle } from "lucide-react";

const severityColor: Record<string, string> = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#22c55e",
};

type LayerKey =
  | "policeStationBoundary"
  | "policeStationPoints"
  | "blackSpotVillages"
  | "pewBoundary"
  | "checkPost"
  | "office";

type BaseMap = "streets" | "satellite" | "hybrid" | "terrain" | "traffic";

const baseMaps: Record<BaseMap, { url: string; attribution: string }> = {
  streets: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "©OpenStreetMap ©CARTO",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "©Esri",
  },
  hybrid: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "©Esri",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "©OpenTopoMap",
  },
  traffic: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "©CARTO",
  },
};

export function GISPage() {
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const layerGroupsRef = useRef<Record<string, any>>({});
  const [selectedMarker, setSelectedMarker] = useState<typeof mapMarkers[0] | null>(null);
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMap>("streets");
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    policeStationBoundary: true,
    policeStationPoints: true,
    blackSpotVillages: true,
    pewBoundary: true,
    checkPost: false,
    office: true,
  });

  const toggleLayer = (key: LayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [11.0, 78.5],
        zoom: 7,
        zoomControl: true,
      });

      const tile = L.tileLayer(baseMaps.streets.url, {
        attribution: baseMaps.streets.attribution,
        maxZoom: 19,
      }).addTo(map);
      tileLayerRef.current = tile;

      // --- State boundary (Police Station Boundary) ---
      const boundaryGroup = L.layerGroup();
      L.polygon(tamilNaduBoundary, {
        color: "#dc2626",
        weight: 3,
        fillColor: "#dc2626",
        fillOpacity: 0.04,
        dashArray: "",
      }).addTo(boundaryGroup);
      boundaryGroup.addTo(map);
      layerGroupsRef.current.policeStationBoundary = boundaryGroup;

      // --- Police HQ points (Police Station Points) ---
      const hqGroup = L.layerGroup();
      districtHQs.forEach((hq) => {
        const color = hq.type === "commissionerate" ? "#6b7280" : "#dc2626";
        const radius = hq.type === "commissionerate" ? 8 : 6;
        L.circleMarker([hq.lat, hq.lng], {
          radius,
          fillColor: color,
          color: "#1f2937",
          weight: 1.5,
          fillOpacity: 0.85,
        })
          .bindTooltip(`<b>${hq.name}</b><br/>${hq.type === "commissionerate" ? "Commissionerate" : "District HQ"}`, {
            className: "leaflet-tooltip-dark",
          })
          .addTo(hqGroup);
      });
      hqGroup.addTo(map);
      layerGroupsRef.current.policeStationPoints = hqGroup;

      // --- Black Spot Villages ---
      const blackSpotGroup = L.layerGroup();
      blackSpotVillages.forEach((v) => {
        L.circleMarker([v.lat, v.lng], {
          radius: 5,
          fillColor: "#dc2626",
          color: "#dc2626",
          weight: 1,
          fillOpacity: 0.9,
        })
          .bindTooltip(`<b>${v.name}</b><br/>${v.district} — Black Spot`, {
            className: "leaflet-tooltip-dark",
          })
          .addTo(blackSpotGroup);
      });
      blackSpotGroup.addTo(map);
      layerGroupsRef.current.blackSpotVillages = blackSpotGroup;

      // --- PEW Boundary zones ---
      const pewGroup = L.layerGroup();
      pewBoundaryZones.forEach((zone) => {
        L.circle(zone.center, {
          radius: zone.radius,
          color: "#2563eb",
          weight: 2,
          fillColor: "#2563eb",
          fillOpacity: 0.06,
          dashArray: "8 4",
        })
          .bindTooltip(`<b>PEW ${zone.name}</b>`, { className: "leaflet-tooltip-dark" })
          .addTo(pewGroup);
      });
      pewGroup.addTo(map);
      layerGroupsRef.current.pewBoundary = pewGroup;

      // --- Check Posts ---
      const checkpostGroup = L.layerGroup();
      checkpostLocations.forEach((cp) => {
        L.marker([cp.lat, cp.lng], {
          icon: L.divIcon({
            className: "checkpost-icon",
            html: `<div style="background:#f59e0b;border:2px solid #92400e;width:12px;height:12px;border-radius:2px;transform:rotate(45deg);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
        })
          .bindTooltip(`<b>${cp.name}</b><br/>Checkpost — ${cp.district}`, {
            className: "leaflet-tooltip-dark",
          })
          .addTo(checkpostGroup);
      });
      // Not added to map by default (checkPost: false)
      layerGroupsRef.current.checkPost = checkpostGroup;

      // --- Case markers (Office / Active Cases) ---
      const caseGroup = L.layerGroup();
      mapMarkers.forEach((m) => {
        const circle = L.circleMarker([m.lat, m.lng], {
          radius: 10,
          fillColor: severityColor[m.severity],
          color: severityColor[m.severity],
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.7,
        });
        circle.addTo(caseGroup);
        circle.bindTooltip(`<b>${m.label}</b><br/>${m.district} — ${m.type}`, {
          className: "leaflet-tooltip-dark",
        });
      });
      caseGroup.addTo(map);
      layerGroupsRef.current.office = caseGroup;

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Toggle layers on/off
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    Object.entries(layers).forEach(([key, visible]) => {
      const group = layerGroupsRef.current[key];
      if (!group) return;
      if (visible && !map.hasLayer(group)) map.addLayer(group);
      if (!visible && map.hasLayer(group)) map.removeLayer(group);
    });
  }, [layers]);

  // Switch base map
  useEffect(() => {
    if (!tileLayerRef.current || !mapInstanceRef.current) return;
    const cfg = baseMaps[activeBaseMap];
    tileLayerRef.current.setUrl(cfg.url);
  }, [activeBaseMap]);

  const layerCheckboxes: { key: LayerKey; label: string }[] = [
    { key: "policeStationBoundary", label: "Police Station Boundary" },
    { key: "policeStationPoints", label: "Police Station Points" },
    { key: "blackSpotVillages", label: "Black Spot Villages" },
    { key: "pewBoundary", label: "PEW Boundary" },
    { key: "checkPost", label: "Check Post" },
    { key: "office", label: "Office" },
  ];

  return (
    <div className="relative flex-1 flex overflow-hidden">
      {/* Map Container */}
      <div ref={mapRef} className="flex-1 h-full" style={{ background: "#e8f0fe" }} />

      {/* Right Legend Panel — matches reference image */}
      <div
        className="absolute right-3 top-16 w-56 rounded-lg shadow-lg p-4 space-y-3 z-[1000]"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
      >
        {/* Base map radios */}
        <div className="space-y-1.5">
          {(["streets", "satellite", "hybrid", "terrain", "traffic"] as BaseMap[]).map((bm) => (
            <label key={bm} className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="radio"
                name="basemap"
                checked={activeBaseMap === bm}
                onChange={() => setActiveBaseMap(bm)}
                className="accent-[hsl(var(--primary))]"
              />
              <span className="capitalize">{bm === "streets" ? "Streets" : bm.charAt(0).toUpperCase() + bm.slice(1)}</span>
            </label>
          ))}
        </div>

        <div className="border-t" style={{ borderColor: "hsl(var(--border))" }} />

        {/* Overlay checkboxes */}
        <div className="space-y-1.5">
          {layerCheckboxes.map((lc) => (
            <label key={lc.key} className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={layers[lc.key]}
                onChange={() => toggleLayer(lc.key)}
                className="accent-[hsl(var(--primary))] rounded"
              />
              <span>{lc.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div
        className="gis-control-panel absolute bottom-4 left-4 right-4 flex items-center justify-between z-[1000]"
      >
        <div className="flex gap-6">
          <div className="text-xs">
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Total Markers</span>
            <span className="ml-2 font-bold">{mapMarkers.length}</span>
          </div>
          <div className="text-xs">
            <span style={{ color: "hsl(var(--muted-foreground))" }}>District HQs</span>
            <span className="ml-2 font-bold">{districtHQs.length}</span>
          </div>
          <div className="text-xs">
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Black Spots</span>
            <span className="ml-2 font-bold">{blackSpotVillages.length}</span>
          </div>
          <div className="text-xs">
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Checkposts</span>
            <span className="ml-2 font-bold">{checkpostLocations.length}</span>
          </div>
        </div>
        <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
          Last updated: {new Date().toLocaleTimeString()} IST
        </div>
      </div>

      {/* Case Detail Drawer */}
      <AnimatePresence>
        {selectedMarker && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute right-0 top-0 bottom-0 w-72 flex flex-col z-[1001]"
            style={{ background: "hsl(var(--card))", borderLeft: "1px solid hsl(var(--border))" }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <div>
                <p className="text-sm font-bold font-mono" style={{ color: "hsl(var(--accent))" }}>{selectedMarker.label}</p>
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Case Details</p>
              </div>
              <button onClick={() => setSelectedMarker(null)} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-3">
                {[
                  { label: "District", value: selectedMarker.district },
                  { label: "Case Type", value: selectedMarker.type },
                  { label: "Coordinates", value: `${selectedMarker.lat.toFixed(4)}, ${selectedMarker.lng.toFixed(4)}` },
                ].map((row) => (
                  <div key={row.label}>
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{row.label}</p>
                    <p className="text-sm font-medium">{row.value}</p>
                  </div>
                ))}
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Severity</p>
                  <span className={`risk-badge-${selectedMarker.severity}`}>
                    <AlertTriangle className="h-3 w-3" />
                    {selectedMarker.severity.toUpperCase()} RISK
                  </span>
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "hsl(var(--muted))" }}>
                <p className="text-xs font-semibold mb-2">Quick Actions</p>
                <div className="space-y-2">
                  {["View Full Case", "Add Intelligence", "Assign Officer", "Generate Report"].map((action) => (
                    <button key={action} className="w-full text-left text-xs px-3 py-2 rounded transition-colors hover:bg-card">
                      → {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
