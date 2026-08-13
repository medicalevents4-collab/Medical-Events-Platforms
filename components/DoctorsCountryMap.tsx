import { useQuery } from "@tanstack/react-query";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { MapPin, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AFRICA_CENTER, COUNTRY_COORDS } from "@/lib/geo";
import { COUNTRIES, countryFlag } from "@/lib/countries";

export function DoctorsCountryMap() {
  const { data = [] } = useQuery({ queryKey: ["doctor-country-map"], queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("country").eq("is_active", true);
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const row of data ?? []) if (row.country) counts.set(row.country, (counts.get(row.country) ?? 0) + 1);
    return [...counts].map(([country, doctors]) => ({ country, doctors, coords: COUNTRY_COORDS[country] })).filter((item) => item.coords);
  }});
  return <section className="overflow-hidden rounded-xl border bg-card"><div className="p-5"><h2 className="flex items-center gap-2 text-base font-bold"><MapPin className="h-4 w-4 text-primary" />Registered Doctors Across Africa</h2><p className="text-xs text-muted-foreground">Live country totals synchronized from verified practitioner profiles.</p></div>
    <MapContainer center={[AFRICA_CENTER.lat, AFRICA_CENTER.lng]} zoom={3} minZoom={2} className="h-[360px] w-full" scrollWheelZoom={false}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {data.map((item) => <CircleMarker key={item.country} center={[item.coords.lat,item.coords.lng]} radius={Math.min(24, 8 + item.doctors * 2)} pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0f766e", fillOpacity: .9 }}><Popup><div className="min-w-40"><p className="text-base font-bold">{countryFlag(COUNTRIES.find((c) => c.name === item.country)?.iso ?? "ZA")} {item.country}</p><p className="mt-1 flex items-center gap-1"><Users className="h-3.5 w-3.5" />{item.doctors} registered doctor{item.doctors===1?"":"s"}</p><a className="mt-2 block text-xs font-semibold text-blue-700" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.country)}`} target="_blank" rel="noreferrer">Open in Google Maps</a></div></Popup></CircleMarker>)}
    </MapContainer></section>;
}
