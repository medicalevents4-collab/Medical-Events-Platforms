# AI and WhatsApp credential activation

The database controls and authenticated Edge Function routes are prepared.
Provider credentials must be created by the account owner and stored only in
Supabase Edge Function Secrets.

## Gemini

1. Select the Google Cloud / AI Studio project that will own billing and usage.
2. Create a Gemini API key restricted to the Generative Language API.
3. Add it in Supabase Edge Function Secrets as `GEMINI_API_KEY`.
4. Replace the safely disabled `medassist` function with the approved provider implementation.

## Meta WhatsApp Cloud API

1. Select the Meta Business portfolio and verified WhatsApp Business Account.
2. Register and verify the sender phone number.
3. Create a permanent system-user access token with the minimum WhatsApp permissions.
4. Add `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and optionally
   `WHATSAPP_API_VERSION` in Supabase Edge Function Secrets. Existing projects
   using `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, and
   `META_GRAPH_API_VERSION` are also supported.
5. Replace the safely disabled `send-whatsapp` function with the approved delivery implementation.

Recipients are controlled in `whatsapp_allowed_recipients`. Every outbound
message is saved in `crm_messages` as `queued` before delivery, then updated to
`sent` or `failed`. Never put these credentials in Vercel or a `VITE_*` value.

## SerpAPI

Add `SERPAPI_API_KEY` in Supabase Edge Function Secrets. It is used only by
the `medassist` and `medical-news` server functions. The browser never receives
this key. MedAssist searches when a practitioner requests current information;
the medical news feed uses SerpAPI first and falls back to its RSS feed if a
search request is unavailable.
