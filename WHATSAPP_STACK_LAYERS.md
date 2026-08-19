# Four layers of the WhatsApp business stack

These are **not competing products at the same layer**. They sit at different layers.

```
                 BUSINESS FACEBOOK
          Ownership / Governance / Assets
                       │
         ┌─────────────┴─────────────┐
         │                           │
 META FOR DEVELOPERS               WAPI
 Apps / APIs / Tokens         BSP / Service Layer
 Webhooks / Calling            Inbox / Messaging
         │                           │
         └─────────────┬─────────────┘
                       │
                WhatsApp Number
                       │
                       ▼
                 FLOW & FORM
            User-facing interaction
                       │
                       ▼
                Customer / Lead
```

## One-line each

| Layer | What it is | Who uses it |
|-------|------------|-------------|
| **WAPI** | Third-party BSP: UI + APIs so you do not build everything against Meta | Staff, agents, admins |
| **Meta for Developers** | Apps, Graph API, webhooks, tokens, programmatic WhatsApp | PBMP developers |
| **Meta Business / Suite** | Who owns WABA, numbers, billing, people, partners | Business owner / Meta admin |
| **Flow & Form** | Structured capture inside WhatsApp (or external PBMP/web form) | End customer fills; admin/dev creates |

## Ownership (important)

| | WAPI | Meta Developers | Business Suite | Flow & Form |
|--|------|-----------------|----------------|-------------|
| Owns the WhatsApp number? | No (delegated access) | No (authorised access) | **Yes** | No |
| Owns the WABA? | Ideally no (partner) | No | **Business Portfolio** | No |
| Arbitrary HTML in WhatsApp? | No | No | No | **No** — Flow JSON only |

Native in-chat form = **WhatsApp Flow**. External HTML = browser form (what we hosted earlier).

## Current vs target (do not skip steps)

**Current (keep working):**

```
Customer ↔ WhatsApp ↔ Meta ↔ WAPI ↔ PBMP
```

**Transition:**

```
                    Meta
                     │
         ┌───────────┴───────────┐
         │                       │
     Messaging                 Calling / Flow API experiments
         │                       │
       WAPI                PBMP Meta App
         │                       │
       PBMP                  PBMP Voice / experiments
```

**Target (later):**

```
Customer ↔ WhatsApp ↔ Meta Business Platform ↔ PBMP Meta App
  ↔ PBMP WhatsApp Gateway
      ├── Messaging, Calling, Flows, Forms
      ├── CRM, AI, Reports, Workflows
```

Business Portfolio **stays** even if WAPI is later replaced.

## What we use today vs later

| Capability | Today | Later (PBMP Meta App) |
|------------|--------|------------------------|
| Send/receive chat | WAPI | PBMP Cloud API |
| Agent inbox | WAPI | PBMP-built |
| Templates | WAPI + WhatsApp Manager | PBMP + Manager |
| Simple Flow create | WhatsApp Manager (no Developer account) | Flows API |
| Send Flow | Only if WAPI exposes it | PBMP App |
| Dynamic Flow → PBMP | Needs Meta endpoint + your App | Yes |
| Calling / voice AI | Not via WAPI today | PBMP App + WebRTC/SIP |
| Dashboard in chat | Image/PDF/link via WAPI media | Same + Flow as filter UI |
| Multi-client WABAs | WAPI’s role | Embedded Signup + Tech Provider |

## Practical rule for this repo

- **Do not** retarget WAPI webhooks, tokens, or messaging to a new Meta App until experiments are proven.
- **Simple Flow** = WhatsApp Manager → Account tools → Flows (JSON in `pbmp-backend/flows/`).
- **Developer account** = only when PBMP talks to Meta **directly** (Calling, Flows API, own webhooks). See `META_APP_STRATEGY.md`.
- **Business Suite** = ownership and WhatsApp Manager; not the bot runtime.
- **Flow** = customer UI; data still lands in PBMP (leads / dashboard / CRM).
