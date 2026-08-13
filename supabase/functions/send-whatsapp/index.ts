import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405, headers: cors });
  }

  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? Deno.env.get("META_WHATSAPP_ACCESS_TOKEN") ?? Deno.env.get("META_WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
  const apiVersion = Deno.env.get("WHATSAPP_API_VERSION") ?? Deno.env.get("META_GRAPH_API_VERSION") ?? "v22.0";

  if (!accessToken || !phoneNumberId) {
    return Response.json(
      { error: "WhatsApp Cloud API is not configured. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to Supabase Edge Function Secrets." },
      { status: 503, headers: cors },
    );
  }

  let payload: { phone?: unknown; message?: unknown };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400, headers: cors });
  }

  const phone = typeof payload.phone === "string" ? payload.phone.replace(/\D/g, "") : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!phone || !message) {
    return Response.json({ error: "A recipient phone number and message are required." }, { status: 400, headers: cors });
  }

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { preview_url: false, body: message },
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerError = result?.error?.message ?? "Meta WhatsApp Cloud API rejected the message.";
    console.error("WhatsApp delivery failed", { status: response.status, providerError });
    return Response.json({ error: providerError }, { status: response.status, headers: cors });
  }

  return Response.json({ messageId: result?.messages?.[0]?.id }, { headers: cors });
});
