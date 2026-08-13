import { useQuery } from "@tanstack/react-query";
import { Globe2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { COUNTRIES, countryFlag } from "@/lib/countries";

interface Headline { id: string; country: string; headline: string; kind: string; }
export function CountryMedicalHeadlines() {
  const { data = [] } = useQuery<Headline[]>({ queryKey: ["country-medical-headlines"], queryFn: async () => {
    const [events, posts] = await Promise.all([
      supabase.from("events").select("id,title,country").gte("end_date", new Date().toISOString()).order("start_date").limit(16),
      supabase.from("posts").select("id,title,location_name").order("created_at", { ascending: false }).limit(16),
    ]);
    const eventItems = (events.data ?? []).map((item) => ({ id: `event-${item.id}`, country: item.country, headline: item.title, kind: "Event" }));
    const postItems = (posts.data ?? []).filter((item) => item.location_name).map((item) => ({ id: `post-${item.id}`, country: item.location_name!, headline: item.title, kind: "Medical update" }));
    return [...eventItems, ...postItems];
  }});
  if (!data.length) return null;
  const repeated=[...data,...data];
  return <section className="overflow-hidden rounded-xl border bg-card p-4"><h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Globe2 className="h-4 w-4 text-primary" />Africa Country Medical Headlines</h2><div className="overflow-hidden"><div className="flex w-max animate-[ticker_100s_linear_infinite] gap-3 hover:[animation-play-state:paused] motion-reduce:animate-none">{repeated.map((item,index) => { const country=COUNTRIES.find((c)=>c.name===item.country); return <article key={`${item.id}-${index}`} className="w-72 shrink-0 rounded-xl border bg-muted/30 p-3"><div className="flex items-center gap-2 text-xs font-semibold"><span className="text-xl">{countryFlag(country?.iso ?? "ZA")}</span>{item.country}<span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[9px] text-primary">{item.kind}</span></div><p className="mt-2 line-clamp-2 text-xs font-medium">{item.headline}</p></article>; })}</div></div></section>;
}
