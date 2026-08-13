import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { DatabaseEvent } from "@/lib/types";
import { eventCoords, AFRICA_CENTER } from "@/lib/geo";
import { CountryFlag } from "@/components/CountryFlag";

/** Whether the event is an online/virtual event. */
function isOnlineEvent(event: DatabaseEvent): boolean {
  const loc = event.location?.toLowerCase() ?? "";
  return (
    event.category?.toLowerCase() === "webinar" ||
    loc.includes("online") ||
    loc.includes("virtual") ||
    loc.includes("remote")
  );
}

/** Normalizes a URL to ensure it has a protocol prefix. */
function normalizeUrl(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

/** Color mapping for each event category. */
const CATEGORY_COLORS: Record<string, string> = {
  Conference: "hsl(142 71% 45%)",
  Workshop: "hsl(38 92% 50%)",
  Webinar: "hsl(217 91% 60%)",
  Symposium: "hsl(280 65% 55%)",
  Summit: "hsl(0 84% 55%)",
  Course: "hsl(199 89% 48%)",
};

/** Distinct emoji icon for each event category, so pins are visually distinguishable at a glance. */
const CATEGORY_ICONS: Record<string, string> = {
  Conference: "🎤",
  Workshop: "🛠️",
  Webinar: "💻",
  Symposium: "🧠",
  Summit: "🏔️",
  Course: "📚",
};

const DEFAULT_COLOR = "hsl(82 24% 46%)";
const DEFAULT_ICON = "📍";

/** Returns the HSL color for a given event category. */
function categoryColor(category?: string): string {
  if (!category) return DEFAULT_COLOR;
  return CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
}

/** Returns the emoji icon for a given event category. */
function categoryIcon(category?: string): string {
  if (!category) return DEFAULT_ICON;
  return CATEGORY_ICONS[category] ?? DEFAULT_ICON;
}

/** Builds a teardrop pin div-icon in the color of the event's category with a category-specific emoji. */
function pinIcon(color: string, icon: string): L.DivIcon {
  return L.divIcon({
    className: "event-pin",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: ${color};
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    "><div style="
      transform: rotate(45deg);
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px;
      line-height: 1;
    ">${icon}</div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -24],
  });
}

interface PinnedEvent {
  event: DatabaseEvent;
  coords: { lat: number; lng: number };
}

/** Auto-fit the map to show all markers */
function FitBounds({ pins }: { pins: PinnedEvent[] }) {
  const map = useMap();

  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].coords.lat, pins[0].coords.lng], 5);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.coords.lat, p.coords.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [pins, map]);

  return null;
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface EventsMapProps {
  events: DatabaseEvent[];
  onEventClick?: (event: DatabaseEvent) => void;
}

export default function EventsMap({ events, onEventClick }: EventsMapProps) {
  const pins = useMemo<PinnedEvent[]>(() => {
    const seen = new Set<string>();
    const result: PinnedEvent[] = [];
    for (const event of events) {
      const coords = event.latitude != null && event.longitude != null
        ? { lat: event.latitude, lng: event.longitude }
        : eventCoords(event.location, event.country);
      if (!coords) continue;
      // Deduplicate by rounded coords to avoid stacking identical pins
      const key = `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ event, coords });
    }
    return result;
  }, [events]);

  // Determine which categories are actually present on the map
  const legendCategories = useMemo(() => {
    const present = new Set<string>();
    for (const { event } of pins) {
      if (event.category) present.add(event.category);
    }
    return Array.from(present).sort();
  }, [pins]);

  // Track which categories are visible — all enabled by default
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    () => new Set(legendCategories),
  );

  // Keep all categories visible when new categories appear (e.g. data changes)
  useEffect(() => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      for (const cat of legendCategories) {
        // Only auto-enable newly-appearing categories, keep user toggles intact
        if (!prev.has(cat) && !Array.from(prev).some((c) => !legendCategories.includes(c))) {
          next.add(cat);
        }
      }
      // Remove categories that no longer exist
      for (const cat of prev) {
        if (!legendCategories.includes(cat)) next.delete(cat);
      }
      return next;
    });
  }, [legendCategories]);

  const toggleCategory = (cat: string) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const allVisible =
    legendCategories.length > 0 && legendCategories.every((c) => visibleCategories.has(c));

  const toggleAll = () => {
    if (allVisible) setVisibleCategories(new Set());
    else setVisibleCategories(new Set(legendCategories));
  };

  // Filter pins by visible categories (uncategorized events always show)
  const visiblePins = useMemo(
    () =>
      pins.filter(({ event }) => !event.category || visibleCategories.has(event.category)),
    [pins, visibleCategories],
  );

  return (
    <div className="relative">
      <MapContainer
        center={[AFRICA_CENTER.lat, AFRICA_CENTER.lng]}
        zoom={3}
        scrollWheelZoom={false}
        style={{ height: "340px", width: "100%", borderRadius: "0.5rem", zIndex: 0 }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pins={visiblePins} />
        {visiblePins.map(({ event, coords }) => (
          <Marker
            key={event.id}
            position={[coords.lat, coords.lng]}
            icon={pinIcon(categoryColor(event.category), categoryIcon(event.category))}
          >
            <Popup>
              <div className="min-w-[200px] space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <CountryFlag country={event.country} size={18} />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {event.country}
                  </span>
                  {event.category && (
                    <span
                      className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
                      style={{ background: categoryColor(event.category) }}
                    >
                      {event.category}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold leading-snug">{event.title}</p>
                {isOnlineEvent(event) ? (
                  event.registration_url ? (
                    <a
                      href={normalizeUrl(event.registration_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <span aria-hidden>🔗</span> Join online venue
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                      <span aria-hidden>🔗</span> Online event
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                    <span aria-hidden>📍</span> {event.location}
                  </span>
                )}
                <p className="text-xs font-medium text-slate-700">
                  {formatDateShort(event.start_date)}
                </p>
                {!isOnlineEvent(event) && (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${event.location}, ${event.country}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex text-xs font-semibold text-blue-600 hover:underline">
                    Open directions in Google Maps →
                  </a>
                )}
                {onEventClick && (
                  <button
                    onClick={() => onEventClick(event)}
                    className="mt-1 text-xs font-semibold text-green-700 hover:underline"
                  >
                    View details →
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {pins.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-full border border-border/60 bg-background/95 px-4 py-2 text-xs font-medium text-muted-foreground shadow-md backdrop-blur-sm">
          No upcoming event locations yet — new Supabase events will appear automatically.
        </div>
      )}

      {/* Interactive category toggle overlay */}
      {legendCategories.length > 0 && <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-white/40 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
            Event Categories
          </p>
          <button
            onClick={toggleAll}
            className="text-[9px] font-semibold uppercase tracking-wide text-green-700 hover:text-green-800 hover:underline"
          >
            {allVisible ? "Hide all" : "Show all"}
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {legendCategories.map((cat) => {
            const isVisible = visibleCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className="group flex items-center gap-2 rounded px-1 py-0.5 transition-colors hover:bg-slate-100"
              >
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white text-[10px] shadow-sm transition-opacity"
                  style={{
                    background: categoryColor(cat),
                    opacity: isVisible ? 1 : 0.25,
                  }}
                >
                  {categoryIcon(cat)}
                </span>
                <span
                  className="text-[11px] font-medium transition-colors"
                  style={{
                    color: isVisible ? "#334155" : "#94a3b8",
                    textDecoration: isVisible ? "none" : "line-through",
                  }}
                >
                  {cat}
                </span>
              </button>
            );
          })}
          {legendCategories.length === 0 && (
            <span className="text-[11px] text-slate-500">Uncategorized</span>
          )}
        </div>
      </div>}
    </div>
  );
}
