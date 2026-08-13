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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character] ?? character));
}

Deno.serve(async (request) => {
  const responseHeaders = headers(request);
  if (request.method === "OPTIONS") return new Response("ok", { headers: responseHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers: responseHeaders });

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!authorization || !supabaseUrl || !anonKey) return Response.json({ error: "Unauthorized." }, { status: 401, headers: responseHeaders });
  if (!resendApiKey || !from) return Response.json({ error: "Email delivery is not configured." }, { status: 503, headers: responseHeaders });

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: authorization, apikey: anonKey } });
  const user = await userResponse.json().catch(() => null);
  const recipient = typeof user?.email === "string" ? user.email : "";
  if (!userResponse.ok || !recipient) return Response.json({ error: "Unable to identify the signed-in user." }, { status: 401, headers: responseHeaders });

  const body = await request.json().catch(() => ({}));
  const type = body?.type === "welcome" ? "welcome" : "test";
  const displayName = typeof body?.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim() ? user.user_metadata.full_name.trim().slice(0, 120) : "Healthcare Professional";
  const safeName = escapeHtml(displayName);
  const subject = type === "welcome" ? "Welcome to Medical Events Connect" : "Your Medical Events Connect email is working";
  const html = type === "welcome"
    ? `<main style="font-family:Arial,sans-serif;color:#1f2937;max-width:600px;margin:0 auto;padding:32px"><h1 style="color:#355c3b">Welcome, ${safeName}</h1><p>Thank you for joining Medical Events Connect, Africa's healthcare professional engagement platform.</p><p>You can now discover events, connect with peers, and access professional resources.</p><p><a href="https://app.kumaniapps.online/dashboard" style="display:inline-block;background:#355c3b;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none">Open your dashboard</a></p></main>`
    : `<main style="font-family:Arial,sans-serif;color:#1f2937;max-width:600px;margin:0 auto;padding:32px"><h1 style="color:#355c3b">Email delivery is ready</h1><p>Hello ${safeName}, this confirms that Medical Events Connect can send email notifications to this address.</p></main>`;

  const resendResponse = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [recipient], subject, html }) });
  const result = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    console.error("Resend delivery failed", { status: resendResponse.status, message: result?.message });
    return Response.json({ error: result?.message ?? "Email delivery failed." }, { status: 502, headers: responseHeaders });
  }
  return Response.json({ id: result?.id, recipient }, { headers: responseHeaders });
});
