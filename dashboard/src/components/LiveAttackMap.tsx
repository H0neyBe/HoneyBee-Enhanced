import React, { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { useWebSocket } from "../hooks/useWebSocket";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

interface LiveMarker {
  id: number;
  coordinates: [number, number];
  country: string;
}

export function LiveAttackMap() {
  const { lastMessage } = useWebSocket(["pot_events"]);
  const [markers, setMarkers] = useState<LiveMarker[]>([]);

  useEffect(() => {
    if (lastMessage && lastMessage.type === "event_new") {
      const ev = lastMessage.payload;
      if (ev.lat && ev.lon) {
        const newMarker: LiveMarker = {
          id: Date.now() + Math.random(),
          coordinates: [ev.lon, ev.lat],
          country: ev.country_code,
        };
        setMarkers((prev) => [...prev, newMarker]);

        // Remove marker after 3 seconds to create a "flash" effect
        setTimeout(() => {
          setMarkers((prev) => prev.filter((m) => m.id !== newMarker.id));
        }, 3000);
      }
    }
  }, [lastMessage]);

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="dot-online w-2.5 h-2.5"></span>
        <h3 className="section-label !mb-0">Live Attack Map</h3>
      </div>
      <p className="text-slate-500 text-xs mb-4">Real-time global attack visualization. Glowing dots appear exactly when an attack hits a honeypot.</p>
      
      <div className="w-full bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center" style={{ height: "450px" }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 130, center: [0, 30] }}
          width={800}
          height={400}
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#E2E8F0"
                  stroke="#CBD5E1"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#CBD5E1" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          {markers.map(({ id, coordinates }) => (
            <Marker key={id} coordinates={coordinates}>
              <circle r={12} fill="#F59E0B" opacity={0.3} className="animate-ping" />
              <circle r={6} fill="#F59E0B" />
            </Marker>
          ))}
        </ComposableMap>
      </div>
    </div>
  );
}
