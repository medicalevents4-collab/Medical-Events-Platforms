import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Newspaper,
  TrendingUp,
  CalendarDays,
  Stethoscope,
  Users,
  ArrowRight,
  Loader2,
  Globe,
  Clock,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { CountryFlag } from "@/components/CountryFlag";
import { SignedAvatar } from "@/components/SignedAvatar";
import type { DatabasePost, DatabaseEvent } from "@/lib/types";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CarouselCard {
  id: string;
  kind: "news" | "event";
  category: string;
  title: string;
  summary: string;
  meta: string;
  metaLabel: string;
  href: string;
  imageUrl: string | null;
  gradient: string;
  icon: typeof Newspaper;
  country?: string;
  authorName?: string;
  authorAvatar?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const GRADIENTS = [
  "from-[#1a3a2a] via-[#1f4a30] to-[#2d5a3d]",
  "from-[#2a1f3a] via-[#3a2848] to-[#4a3060]",
  "from-[#3a2a1a] via-[#4a3520] to-[#5a4030]",
  "from-[#1a2a3a] via-[#20384a] to-[#2d4a5d]",
  "from-[#2a3a1a] via-[#384a20] to-[#4a5d2d]",
  "from-[#3a1a2a] via-[#4a2038] to-[#5d2d4a]",
];

/** Group flat card list into chunks of 3 for multi-image slides. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Single card                                                        */
/* ------------------------------------------------------------------ */

function SlideCard({ card }: { card: CarouselCard }) {
  const navigate = useNavigate();
  const Icon = card.icon;

  return (
    <button
      onClick={() => navigate(card.href)}
      className="group relative flex min-w-0 flex-1 overflow-hidden rounded-xl text-left transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99]"
      style={{ minHeight: "200px" }}
    >
      {/* Image or gradient fallback */}
      {card.imageUrl ? (
        <img
          src={card.imageUrl}
          alt={card.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`}>
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(0,0,0,0.18), transparent 50%)",
            }}
          />
          <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      )}

      {/* Bottom gradient overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative z-10 mt-auto flex w-full flex-col gap-1.5 p-3.5">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm ring-1 ring-white/20">
            {card.kind === "event" ? "Event" : card.category}
          </span>
          {card.country && (
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm ring-1 ring-white/20">
              <CountryFlag country={card.country} size={12} />
              {card.country}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white">
          {card.title}
        </h3>
        <p className="line-clamp-1 text-[11px] leading-relaxed text-white/65">
          {card.summary}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <span className="flex min-w-0 items-center gap-1.5 text-[9px] font-semibold text-white/65">
            {card.authorName ? (
              <SignedAvatar path={card.authorAvatar ?? null} fallback={card.authorName.slice(0, 2).toUpperCase()} className="h-5 w-5 border border-white/30" />
            ) : <Clock className="h-2.5 w-2.5" />}
            <span className="truncate">{card.authorName || card.metaLabel}: {card.meta}</span>
          </span>
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function NewsCarousel() {
  useRealtimeInvalidation("news-carousel-live", [
    { table: "posts", queryKeys: [["carousel-posts"]] },
    { table: "events", queryKeys: [["carousel-events"]] },
  ]);
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const CARDS_PER_SLIDE = 3;

  /* ---- fetch latest news posts ---- */
  const { data: newsPosts = [], isLoading: newsLoading } = useQuery<Array<DatabasePost & { author_avatar_url?: string | null; author_country?: string | null }>>({
    queryKey: ["carousel-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(9);
      if (error) throw error;
      const posts = (data ?? []) as DatabasePost[];
      const userIds = [...new Set(posts.map((post) => post.user_id).filter(Boolean))];
      if (!userIds.length) return posts;
      const { data: profiles } = await supabase.from("profiles").select("id,avatar_url,country").in("id", userIds);
      const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return posts.map((post) => ({
        ...post,
        author_avatar_url: byId.get(post.user_id)?.avatar_url ?? null,
        author_country: byId.get(post.user_id)?.country ?? null,
      }));
    },
    refetchInterval: 30_000,
  });

  /* ---- fetch upcoming events across Africa ---- */
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery<DatabaseEvent[]>({
    queryKey: ["carousel-events"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("end_date", now)
        .order("start_date", { ascending: true })
        .limit(9);
      if (error) throw error;
      return (data ?? []) as DatabaseEvent[];
    },
    refetchInterval: 30_000,
  });

  /* ---- build flat card list (events with images first, then posts) ---- */
  const cards: CarouselCard[] = [
    ...upcomingEvents.map<CarouselCard>((event, i) => ({
      id: `event-${event.id}`,
      kind: "event" as const,
      category: event.category || "Event",
      title: event.title,
      summary: event.description.slice(0, 120),
      meta: formatDateShort(event.start_date),
      metaLabel: event.country || "Date",
      href: "/events",
      imageUrl: event.image_url,
      gradient: GRADIENTS[i % GRADIENTS.length],
      icon: CalendarDays,
      country: event.country,
    })),
    ...newsPosts.map<CarouselCard>((post, i) => {
      const isNews = post.category === "news";
      const icon = isNews ? TrendingUp : post.category === "case-study" ? Stethoscope : Users;
      return {
        id: `post-${post.id}`,
        kind: "news" as const,
        category: isNews ? "News" : post.category === "case-study" ? "Case Study" : "Discussion",
        title: post.title,
        summary: post.body.slice(0, 120),
        meta: timeAgo(post.created_at),
        metaLabel: "Posted",
        href: "/feed",
        imageUrl: post.image_url,
        gradient: GRADIENTS[(i + 2) % GRADIENTS.length],
        icon,
        country: post.location_name || post.author_country || undefined,
        authorName: post.author_name,
        authorAvatar: post.author_avatar_url,
      };
    }),
  ];

  /* ---- group into slides of 3 ---- */
  const slides: CarouselCard[][] = chunk(cards, CARDS_PER_SLIDE);
  const totalSlides = slides.length;

  /* ---- auto-advance ---- */
  const next = useCallback(() => {
    setCurrent((prev) => (totalSlides === 0 ? 0 : (prev + 1) % totalSlides));
  }, [totalSlides]);

  const prev = useCallback(() => {
    setCurrent((p) => (totalSlides === 0 ? 0 : (p - 1 + totalSlides) % totalSlides));
  }, [totalSlides]);

  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    timerRef.current = setInterval(() => {
      if (Math.random() > 0.5) next();
      else prev();
    }, 10_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [next, prev, isPaused, totalSlides]);

  useEffect(() => {
    if (current >= totalSlides && totalSlides > 0) {
      setCurrent(0);
    }
  }, [totalSlides, current]);

  const loading = newsLoading && eventsLoading;

  /* ---- loading skeleton ---- */
  if (loading) {
    return (
      <div className="relative mb-6 h-[230px] overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex h-full items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading latest news…</span>
        </div>
      </div>
    );
  }

  /* ---- empty state ---- */
  if (totalSlides === 0) {
    return (
      <div className="relative mb-6 flex h-[160px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/30">
        <div className="flex flex-col items-center gap-2 text-center">
          <Newspaper className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No news or updates yet</p>
          <p className="text-xs text-muted-foreground/70">
            Latest medical news and upcoming events will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="digital-gloss relative mb-6 overflow-hidden rounded-2xl border border-primary/10 bg-card p-3 shadow-sm sm:p-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Section label */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold tracking-tight">
            News, Updates &amp; Africa's Doctors
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            Live
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            {totalSlides} {totalSlides === 1 ? "page" : "pages"}
          </span>
        </div>
      </div>

      {/* Slides track */}
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slideCards, slideIdx) => (
          <div
            key={`slide-${slideIdx}`}
            className="flex min-w-full gap-3"
          >
            {slideCards.map((card) => (
              <SlideCard key={card.id} card={card} />
            ))}
            {/* Fill empty slots so layout stays consistent */}
            {slideCards.length < CARDS_PER_SLIDE &&
              Array.from({ length: CARDS_PER_SLIDE - slideCards.length }).map((_, i) => (
                <div
                  key={`empty-${slideIdx}-${i}`}
                  className="flex-1 rounded-xl border border-dashed border-border/50 bg-muted/20"
                  style={{ minHeight: "200px" }}
                />
              ))}
          </div>
        ))}
      </div>

      {/* Prev / Next arrows */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={() => { prev(); setIsPaused(true); }}
            className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-primary/30 transition-all hover:bg-primary/90 hover:scale-110 active:scale-95"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => { next(); setIsPaused(true); }}
            className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-primary/30 transition-all hover:bg-primary/90 hover:scale-110 active:scale-95"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {totalSlides > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={`dot-${idx}`}
              onClick={() => { setCurrent(idx); setIsPaused(true); }}
              className={`h-1.5 rounded-full transition-all ${
                idx === current
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
