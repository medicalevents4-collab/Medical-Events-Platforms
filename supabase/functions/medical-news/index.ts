import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const allowedOrigins = new Set(["https://app.kumaniapps.online", "https://www.kumaniapps.online"]);
function headers(request: Request) {
  const origin = request.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://app.kumaniapps.online",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}
const decode = (value: string) => value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

type NewsItem = { id: string; headline: string; source_name: string; source_url: string; published_at: string };

async function fetchSerpNews(apiKey: string): Promise<NewsItem[]> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_news");
  url.searchParams.set("q", "Africa healthcare medicine research");
  url.searchParams.set("gl", "za");
  url.searchParams.set("hl", "en");
  url.searchParams.set("api_key", apiKey);
  const response = await fetch(url);
  const result = await response.json();
  if (!response.ok || result?.error) throw new Error(result?.error ?? "SerpAPI news request failed.");
  return (result?.news_results ?? []).slice(0, 15).flatMap((item: Record<string, unknown>, index: number) => {
    const headline = typeof item.title === "string" ? item.title : "";
    const sourceUrl = typeof item.link === "string" ? item.link : "";
    if (!headline || !sourceUrl) return [];
    const source = item.source;
    return [{
      id: `serp-${index}-${sourceUrl}`,
      headline,
      source_name: typeof source === "string" ? source : typeof source === "object" && source && typeof (source as Record<string, unknown>).name === "string" ? (source as Record<string, string>).name : "Medical News",
      source_url: sourceUrl,
      published_at: typeof item.date === "string" ? item.date : "",
    }];
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: headers(request) });
  if (request.method !== "POST" || !request.headers.get("Authorization")) return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401, headers: headers(request) });
  try {
    const serpApiKey = Deno.env.get("SERPAPI_API_KEY");
    if (serpApiKey) {
      try {
        const items = await fetchSerpNews(serpApiKey);
        if (items.length) return new Response(JSON.stringify({ items, provider: "serpapi" }), { headers: { ...headers(request), "Cache-Control": "public, max-age=300" } });
      } catch (error) {
        console.error("SerpAPI medical news failed", error instanceof Error ? error.message : "unknown");
      }
    }
    const response = await fetch("https://news.google.com/rss/search?q=global%20medicine%20healthcare%20research&hl=en-ZA&gl=ZA&ceid=ZA:en", { headers: { "User-Agent": "MedicalEventsConnect/1.0" } });
    if (!response.ok) throw new Error("News feed unavailable.");
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 15).map((match, index) => {
      const item = match[1];
      const read = (tag: string) => decode(item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] ?? "");
      return { id: `global-${index}`, headline: read("title"), source_name: read("source") || "Global Health News", source_url: read("link"), published_at: read("pubDate") };
    }).filter((item) => item.headline && item.source_url);
    return new Response(JSON.stringify({ items }), { headers: { ...headers(request), "Cache-Control": "public, max-age=300" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "News unavailable." }), { status: 502, headers: headers(request) });
  }
});
