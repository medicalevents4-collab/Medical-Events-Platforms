import { useQuery } from "@tanstack/react-query";
import { Activity, ExternalLink } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

interface NewsItem { id: string; headline: string; source_name: string; source_url: string; }

const FALLBACK_NEWS: NewsItem[] = [
  { id: "za-med", headline: "🇿🇦 South Africa: clinical innovation and CPD events update", source_name: "Africa Medical Desk", source_url: "/events" },
  { id: "ke-med", headline: "🇰🇪 Kenya: primary healthcare and paediatrics update", source_name: "Africa Medical Desk", source_url: "/feed" },
  { id: "ng-med", headline: "🇳🇬 Nigeria: public-health research and specialist collaboration", source_name: "Africa Medical Desk", source_url: "/directory" },
  { id: "gh-med", headline: "🇬🇭 Ghana: medical education and professional events briefing", source_name: "Africa Medical Desk", source_url: "/events" },
  { id: "eg-med", headline: "🇪🇬 Egypt: surgery, cardiology and clinical training update", source_name: "Africa Medical Desk", source_url: "/feed" },
  { id: "et-med", headline: "🇪🇹 Ethiopia: community medicine and healthcare workforce update", source_name: "Africa Medical Desk", source_url: "/directory" },
];

export function MedicalNewsTicker() {
  useRealtimeInvalidation("medical-news-ticker", [
    { table: "medical_news", queryKeys: [["medical-news"]] },
    { table: "posts", queryKeys: [["medical-news"]] },
  ]);

  const { data = [] } = useQuery<NewsItem[]>({
    queryKey: ["medical-news"],
    queryFn: async () => {
      const { data: live } = await supabase.functions.invoke<{ items?: NewsItem[] }>("medical-news", { body: {} });
      if (live?.items?.length) return live.items;
      const { data: curated } = await supabase
        .from("medical_news")
        .select("id, headline, source_name, source_url")
        .eq("is_active", true)
        .order("published_at", { ascending: false })
        .limit(12);
      if (curated?.length) return curated as NewsItem[];
      const { data: posts } = await supabase
        .from("posts")
        .select("id, title")
        .eq("category", "news")
        .order("created_at", { ascending: false })
        .limit(12);
      const communityItems = (posts ?? []).map((post) => ({
        id: post.id,
        headline: post.title,
        source_name: "Medical Events Community",
        source_url: "/feed",
      }));
      return communityItems.length ? communityItems : FALLBACK_NEWS;
    },
    staleTime: 60_000,
  });

  const items = data.length ? data : FALLBACK_NEWS;
  const repeated = [...items, ...items];

  return (
    <div className="overflow-hidden border-b border-border bg-primary/10 text-foreground">
      <div className="flex h-9 items-center">
        <div className="z-10 flex h-full shrink-0 items-center gap-2 bg-primary px-3 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
          <Activity className="h-3.5 w-3.5" /> Global Medicine Live
        </div>
        <div className="group min-w-0 flex-1 overflow-hidden">
          <div className="flex w-max animate-[ticker_140s_linear_infinite] items-center will-change-transform group-hover:[animation-play-state:paused] motion-reduce:animate-none">
            {repeated.map((item, index) => (
              <a key={`${item.id}-${index}`} href={item.source_url} target={item.source_url.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex items-center gap-2 whitespace-nowrap px-6 text-xs hover:text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="font-medium">{item.headline}</span>
                <span className="text-muted-foreground">— {item.source_name}</span>
                {item.source_url.startsWith("http") && <ExternalLink className="h-3 w-3" />}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
