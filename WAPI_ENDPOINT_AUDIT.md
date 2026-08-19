# WAPI.in.net — Endpoint Audit Notes

**Date:** 2026-07-30  
**Base URL used:** `https://wapi.in.net/api/{WAPI_VENDOR_UID}/...`  
**Auth:** `Authorization: Bearer {WAPI_TOKEN}`  
**Repo code:** `pbmp-backend/whatsapp-service.js`

> This audit is for **WAPI.in.net** (Grow24 BSP), **not** the open-source `zakirkun/wapi` project (different API shape: `/v1/messages/*`).

---

## Confirmed working

| Method | Path | Result | Notes |
|--------|------|--------|-------|
| `POST` | `{vendor}/contact/send-message` | **200** | Text: `{ phone_number, message_body }` → `wamid` |
| `POST` | `{vendor}/contact/send-media-message` | **200** | `{ phone_number, media_type, media_url, caption? }` — verified image + document |
| `POST` | `{vendor}/contact/send-template-message` | **422/failed** | Path exists. Needs `template_name` + `template_language`. Fails until Meta template is synced in WAPI. |

---

## Interactive — path documented but 404 on this account

Docs list `contact/send-interactive-message`. Live probe (2026-08-03) → **HTML 404**.

App behavior: try interactive path; on 404 fall back to numbered text menu (`WAPI_INTERACTIVE_FALLBACK_TEXT=true`).

---

## Template unblock steps (Meta + WAPI)

1. Meta Business Manager → create/approve WhatsApp template  
2. WAPI dashboard → sync templates  
3. Use exact `template_name` + `template_language`  
4. Zeabur env: `WAPI_SEND_TEMPLATE_PATH=contact/send-template-message`  
5. Test: `POST /whatsapp/test-template`

---

## Media send — verified payload

```json
{
  "phone_number": "91XXXXXXXXXX",
  "media_type": "image",
  "media_url": "https://example.com/photo.jpg",
  "caption": "optional"
}
```

`media_type`: `image` | `video` | `audio` | `document`  
Documents may include `file_name`.

---

## Old wrong guesses (do not use)

`contact/send-image`, `contact/send-document`, `contact/send-template`, `contact/send-buttons` → historically 404.


Example success shape:

```json
{
  "result": "success",
  "message": "Message processed",
  "data": {
    "log_uid": "...",
    "contact_uid": "...",
    "phone_number": "91...",
    "wamid": "wamid....",
    "status": "accepted"
  }
}
```

---

## Media send — not found (404)

Probed against live credentials (2026-07-30). All returned **HTML 404** (route missing), not JSON “validation” errors:

| Path | HTTP |
|------|------|
| `contact/send-image` | 404 |
| `contact/send-document` | 404 |
| `contact/send-audio` | 404 |
| `contact/send-video` | 404 |
| `contact/send-media` | 404 |
| `media/send` | 404 |
| `send-media` | 404 |
| `message/send-media` | 404 |

### Media fields on `contact/send-message`

Tried extra JSON fields (`type`/`media_url`, `image_url`, `attachment`, `file_url`, bare `image`). API still returned **200 + wamid** — behaves like **text-only** (`message_body` accepted; media fields ignored for delivery as media).

**Conclusion:** Public HTTP media send path for this account is **unknown / unavailable**. Dashboard “bot replies” can send media; that does **not** mean the same exists on the vendor API we use.

**Unblock:** WAPI support must provide official path + payload. Then set:

```bash
WAPI_SEND_IMAGE_PATH=...
WAPI_SEND_DOCUMENT_PATH=...
WAPI_SEND_AUDIO_PATH=...
WAPI_SEND_VIDEO_PATH=...
```

Optional: `WAPI_MEDIA_VIA_SEND_MESSAGE=true` to POST media fields on `contact/send-message` (experimental; not verified to deliver media).

---

## Template send — not found (404)

Probed 2026-08-01:

| Path | HTTP |
|------|------|
| `contact/send-template` | 404 |
| `template/send` | 404 |
| `send-template` | 404 |
| `message/send-template` | 404 |
| `contact/template` | 404 |

Code scaffold: `sendWhatsAppTemplate()` + `POST /whatsapp/test-template`. Set `WAPI_SEND_TEMPLATE_PATH` when WAPI documents the real route.

---

## Interactive send — not found (404)

Probed 2026-08-01:

| Path | HTTP |
|------|------|
| `contact/send-interactive` | 404 |
| `contact/send-button` | 404 |
| `contact/send-buttons` | 404 |
| `contact/send-list` | 404 |
| `message/send-interactive` | 404 |
| `interactive/send` | 404 |
| `contact/send-cta` | 404 |

**App behavior (Phase 3):** try configured interactive path; on 404 fall back to numbered text menu via `contact/send-message` (`WAPI_INTERACTIVE_FALLBACK_TEXT=true`). Inbound `button_reply` / `list_reply` / numbers `1–4` are handled.

---

## Phase 2 app behaviour

| Feature | Behavior |
|---------|----------|
| 24h window | Tracked via `session.lastInboundAt`. Proactive free-form (`/whatsapp/test`) blocked when expired unless `bypassWindow: true`. Webhook replies use `isReply: true`. |
| STOP | Keywords: stop, unsubscribe, end, quit, optout, opt-out → consent store + block outbound |
| START | Keywords: start, unstop, subscribe, optin, opt-in → re-enable + welcome |
| Consent API | `GET /whatsapp/consent/:phone` |
---

## Other paths

| Path | Result |
|------|--------|
| Public docs (`/api/docs`, `/docs`, `/api/swagger`) | 404 |
| Template / interactive / upload guesses | Unreliable (timeouts/errors); no confirmed 200 |

---

## Webhooks (inbound)

**Configured URL (production):** `https://pbmpchatbotbackend.zeabur.app/whatsapp/webhook`

Expected app-handled shapes:

1. **WAPI-style message** (existing):

```json
{
  "contact": { "phone_number": "91..." },
  "message": {
    "is_new_message": true,
    "body": "hello",
    "id": "optional-id"
  }
}
```

Media may appear as nested `message.image` / `audio` / `document` / `video` / `media_url` (normalized in code).

2. **Status updates** (Meta Cloud API style and/or flat WAPI style) — handled in Phase 1:

- Meta: `entry[].changes[].value.statuses[]` with `id`, `status`, `timestamp`, `recipient_id`, `errors`
- Flat: `{ type: "status", wamid|message_id, status, phone_number }`

3. **Meta verify:** `GET /whatsapp/webhook?hub.verify_token=...&hub.challenge=...`

---

## Meta Cloud API vs WAPI vs PBMP

| Layer | Role |
|-------|------|
| Meta Cloud API / WABA | Underlying WhatsApp Business messaging |
| WAPI.in.net | BSP: auth, vendor UID, webhooks, send proxy |
| PBMP backend | Our bot: sessions, Gemini, booking, idempotency, status store |

Do **not** assume Meta Graph paths (`graph.facebook.com/.../messages`) work with WAPI tokens. Always call WAPI base URL.

Business App / coexistence features are **account configuration + test evidence**, not something we reimplement as fake App UI in this API.

---

## Env reference

See `pbmp-backend/.env.example` for current keys.
