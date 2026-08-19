# PBMP WhatsApp — Gap Checklist

**Scope:** `web/PBMPChatBot` only · Provider: **WAPI.in.net** (BSP over WhatsApp Cloud API)  
**Last updated:** 2026-08-13  
**Related:** [WAPI_ENDPOINT_AUDIT.md](./WAPI_ENDPOINT_AUDIT.md) · [AUTOMATE_POC.md](./AUTOMATE_POC.md) · [META_CALLING_AND_CATALOGUE.md](./META_CALLING_AND_CATALOGUE.md)

Legend: ✅ done · 🟡 partial · ❌ missing · 🚫 blocked (needs WAPI/account) · ⏭ later phase

---

## Phase 0 — Foundation

| Item | Status | Notes |
|------|--------|-------|
| Gap checklist (this file) | ✅ | |
| WAPI endpoint audit notes | ✅ | See audit doc |
| Push media/status code to `Grow24/PBMPChatBot` | 🟡 | Local commits may be ahead; push + Zeabur redeploy required |
| Confirm live `POST /whatsapp/test-media` on Zeabur | ❌ | Needs deploy after push |

---

## Phase 1 — Media + status + idempotency

| Item | Status | Notes |
|------|--------|-------|
| Inbound media detect/normalize | ✅ | image/audio/video/document/sticker/voice |
| Inbound media download metadata | ✅ | Optional URL fetch; size capped by `MEDIA_MAX_DOWNLOAD_MB` |
| Outbound media send (image/doc/audio/video) | ✅ | `contact/send-media-message` verified live |
| Delivery / read / fail status webhooks | ✅ | Meta + WAPI-shaped payloads; stored in memory |
| Idempotency (dedupe inbound message IDs) | ✅ | + command debounce for START/menu |
| Session persistence across restarts | 🟡 | Optional JSON file store via `WHATSAPP_SESSION_STORE` |
| Rich `/whatsapp/status` | ✅ | sessions, recent statuses, idempotency counts |

---

## Phase 2 — Window + templates + opt-in

| Item | Status | Notes |
|------|--------|-------|
| 24h customer-care window tracking | ✅ | `lastInboundAt` + enforce on proactive free-form |
| Template send API | 🟡 | Path `contact/send-template-message` live; needs Meta-approved + WAPI-synced template name |
| STOP / opt-out | ✅ | Keywords persist to consent store; blocks outbound |
| Explicit opt-in logging | ✅ | START/UNSTOP + implied opt-in on first inbound |

---

## Phase 3 — Interactive

| Item | Status | Notes |
|------|--------|-------|
| Reply buttons | 🟡 | WAPI interactive 404 is cached 30 min then text menu (faster). Optional Graph: `META_GRAPH_INTERACTIVE_FALLBACK=true` (sends from Meta test number) |
| List messages | 🟡 | Same interactive path / text fallback |
| List messages | 🟡 | Same interactive path / text fallback |
| External form links in replies | ✅ | `WHATSAPP_*_URL` env; menu option 3 |

---

## Phase 4 — Flows

| Item | Status | Notes |
|------|--------|-------|
| WhatsApp Flows (in-chat form) | 🟡 | Send uses `WHATSAPP_FLOW_MODE=draft` + Graph fallback. Publish still needs business verification |
| Flow submit → details message + success message | ✅ | `nfm_reply` webhook handler |
| HTML form links fallback | ✅ | When `WHATSAPP_*_FLOW_ID` unset or Flow send 404 |

---

## Phase 5 — CRM + human handover

| Item | Status | Notes |
|------|--------|-------|
| Match/create CRM contact (leads) | ✅ | Phone upsert via `/api/leads` (`source=whatsapp`); booking posts `whatsapp_booking` |
| Human agent handover flag | ✅ | Menu *4* / keywords; bot pauses; queue inbound; resume with *bot* |
| Agent reply API | ✅ | `POST /whatsapp/agent-reply`, `GET/POST /whatsapp/handoff/:phone`, `GET /whatsapp/handoffs` |
| Team notify | 🟡 | Optional `WHATSAPP_HANDOFF_WEBHOOK` + `WHATSAPP_HANDOFF_NOTIFY_EMAIL` |
| Multi-agent assignment | ❌ | WAPI team feature ≠ our API |

---

## Phase 6 — Catalogue / calling / Automate

| Item | Status | Notes |
|------|--------|-------|
| Product catalogue | 🟡 | Menu *7* sends a text catalogue now. Meta product cards need `WHATSAPP_CATALOGUE_ID`. See META_CALLING_AND_CATALOGUE.md |
| WhatsApp Calling (VoIP) | 🟡 | Inbound connect → auto-reject + WhatsApp follow-up. True pickup needs WebRTC. `POST /whatsapp/calling/reject` |
| Voice call menu (click-to-call + callback) | ✅ | Menu *5*; `WHATSAPP_VOICE_CALL_NUMBER`; notify via handoff webhook/email |
| Android Automate POC API | ✅ | `POST /whatsapp/automate` + `AUTOMATE_API_KEY`. `sendWhatsApp:0/1` parsed correctly. Phone flow: AUTOMATE_POC.md |
| AutoVoice always-listening | 🟡 | `action=autovoice` strips wake phrase. Phone: AUTOVOICE_SETUP.md |

---

## Phase 7 — Coexistence / Business App

| Item | Status | Notes |
|------|--------|-------|
| Coexistence config evidence | ⏭ | Config + test matrix, not App UI in API |
| Business App vs Cloud API boundary docs | ⏭ | Do not implement App-only features as API |

---

## Phase 8 — Test matrix

| Item | Status | Notes |
|------|--------|-------|
| P1 inbound text | ✅ | Live via webhook |
| P1 outbound text | ✅ | `contact/send-message` → `wamid` |
| C1 media round-trip | 🚫 | Outbound media blocked on WAPI |
| Status delivered/read/failed | 🟡 | Code ready; needs WAPI to POST status events |
| Idempotent webhook retries | ✅ | Code ready |

---

## Immediate blockers (Phase 1 outbound media)

1. Ask WAPI support / dashboard docs for the **exact** media send path + payload (URL vs base64 vs media_id).
2. Set env overrides when known: `WAPI_SEND_IMAGE_PATH`, etc.
3. Redeploy `pbmpchatbot` on Zeabur after push so `/whatsapp/test-media` exists.
