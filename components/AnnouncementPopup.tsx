import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PartyPopper, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

interface Announcement { id: string; title: string; message: string; created_at: string; }

export function AnnouncementPopup() {
  const [dismissed, setDismissed] = useState<string[]>(() => JSON.parse(sessionStorage.getItem("dismissed-announcements") ?? "[]"));
  useRealtimeInvalidation("announcements-live", [{ table: "announcements", queryKeys: [["announcements"]] }]);
  const { data = [] } = useQuery<Announcement[]>({ queryKey: ["announcements"], queryFn: async () => {
    const { data, error } = await supabase.from("announcements").select("id,title,message,created_at").eq("is_active", true).order("created_at", { ascending: false }).limit(5);
    if (error) throw error; return data ?? [];
  }});
  const current = data.find((item) => !dismissed.includes(item.id));
  useEffect(() => { sessionStorage.setItem("dismissed-announcements", JSON.stringify(dismissed)); }, [dismissed]);
  if (!current) return null;
  return <div role="status" className="fixed right-5 top-24 z-[70] w-[min(92vw,380px)] animate-fade-in-up rounded-2xl border border-primary/30 bg-card p-4 shadow-2xl">
    <button onClick={() => setDismissed((items) => [...items, current.id])} className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Dismiss announcement"><X className="h-4 w-4" /></button>
    <div className="flex gap-3"><span className="rounded-xl bg-primary/15 p-2.5"><PartyPopper className="h-5 w-5 text-primary" /></span><div className="pr-5"><p className="text-sm font-bold">{current.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{current.message}</p></div></div>
  </div>;
}
