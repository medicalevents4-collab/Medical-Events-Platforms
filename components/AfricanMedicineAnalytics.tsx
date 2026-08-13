import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Globe2, Newspaper, Stethoscope, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function AfricanMedicineAnalytics() {
  const { data } = useQuery({
    queryKey: ["african-medicine-analytics"],
    queryFn: async () => {
      const [profiles, events, posts] = await Promise.all([
        supabase.from("profiles").select("country,specialty", { count: "exact" }).eq("is_active", true),
        supabase.from("events").select("id", { count: "exact", head: true }).gte("end_date", new Date().toISOString()),
        supabase.from("posts").select("id", { count: "exact", head: true }),
      ]);
      const rows = profiles.data ?? [];
      return {
        doctors: profiles.count ?? rows.length,
        countries: new Set(rows.map((row) => row.country).filter(Boolean)).size,
        specialties: new Set(rows.map((row) => row.specialty).filter(Boolean)).size,
        events: events.count ?? 0,
        posts: posts.count ?? 0,
      };
    },
    staleTime: 30_000,
  });

  const items = [
    [Users, data?.doctors ?? 0, "Registered doctors"],
    [Globe2, data?.countries ?? 0, "African countries"],
    [Stethoscope, data?.specialties ?? 0, "Specialties"],
    [CalendarDays, data?.events ?? 0, "Upcoming events"],
    [Newspaper, data?.posts ?? 0, "Community posts"],
  ] as const;

  return <section aria-label="African medicine analytics" className="grid grid-cols-2 border-b border-border bg-card/80 sm:grid-cols-3 xl:grid-cols-5">
    {items.map(([Icon, value, label]) => <div key={label} className="flex items-center justify-center gap-2 border-r border-border px-3 py-2 last:border-r-0">
      <Icon className="h-3.5 w-3.5 text-primary" /><span className="text-sm font-bold">{value}</span><span className="hidden text-[10px] text-muted-foreground md:inline">{label}</span>
    </div>)}
  </section>;
}
