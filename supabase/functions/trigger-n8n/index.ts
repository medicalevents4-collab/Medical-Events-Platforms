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

Deno.serve(async (request) => {
  const responseHeaders = headers(request);
  if (request.method === "OPTIONS") return new Response("ok", { headers: responseHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers: responseHeaders });

  const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
  const webhookSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
  if (!webhookUrl || !webhookSecret) return Response.json({ error: "n8n automation is not configured." }, { status: 503, headers: responseHeaders });

  const payload = {
    event: "medical_events.automation_test",
    occurred_at: new Date().toISOString(),
    data: { message: "Anonymous automation test from Medical Events Connect." },
  };

  try {
    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-N8N-Webhook-Secret": webhookSecret },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!n8nResponse.ok) {
      console.error("n8n webhook rejected event", { status: n8nResponse.status });
      return Response.json({ error: "n8n could not accept the automation event." }, { status: 502, headers: responseHeaders });
    }
    return Response.json({ accepted: true }, { status: 202, headers: responseHeaders });
  } catch (error) {
    console.error("n8n webhook request failed", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "n8n automation is unavailable." }, { status: 502, headers: responseHeaders });
  }
});
