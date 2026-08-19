# WhatsApp Flows — PBMP integration (3 layers)

Learn / build in this order. **Pehla live test Meta Flow Builder se hoga — existing WAPI messaging pipe disturb nahi karenge.**

## Layer 1 — End-user experience

Customer ko kya dikhta hai:

```
WhatsApp chat
  → message with button  [Open Form]
  → tap
  → native form WhatsApp ke ANDAR khulta hai
  → Name / Company / Requirement
  → Submit
  → chat mein details + success message
```

Yeh **WhatsApp Business mobile app** ke andar form editor nahi hai. Flows **WhatsApp Business Platform** ka feature hai.

Watch (recommended order): **2 → 1 → 3 → 4 → 8**

| # | Topic |
|---|--------|
| 2 | Live demo — customer kya dekhta hai |
| 1 | Official API se form send (2026) |
| 3 | Flow JSON — screens, components, navigation |
| 4 | Endpoint / dynamic Flow (PBMP ke liye later) |
| 8 | Meta official — Flow + message templates |

## Layer 2 — Flow banana (Meta)

### Kahan jaana hai

```
Meta Business Suite
  → Business Portfolio
  → All tools
  → WhatsApp Manager
  → sahi WABA select karo
  → Account tools
  → Flows
```

Aap yeh screen pehle hi khol chuke ho.

Wahan:

```
Flows
├── Create Flow
├── Existing Flows
├── Draft
├── Published
└── Deprecated
```

### Teen tarike

| Method | Kahan | Hum kab use karenge |
|--------|--------|---------------------|
| Simple Flow | Message Templates | Survey / chhota enquiry |
| Flow Builder | Account tools → Flows | Pehla PBMP form (abhi yahi) |
| Flows API | Meta Graph API | Baad mein PBMP Form Designer auto-publish |

### Simple vs Dynamic

**Simple (abhi yahi):** saari fields Flow JSON mein hain. Submit → webhook. PBMP live lookup nahi.

```
Name        [____________]
Company     [____________]
Requirement [____________]
            [Submit]
```

**Dynamic (baad mein):** Flow PBMP endpoint call karta hai jab customer form use kar raha hota hai (customer list → projects → reports).

## Layer 3 — PBMP se jodna (baad mein)

Long-term:

```
PBMP Form Designer
  → Form definition (Period, Region, Metric, …)
  → same data, alag channel:
       Web form | Mobile form | WhatsApp Flow | Email link
  → Flow JSON → Meta publish → customer WhatsApp
```

Abhi yeh nahi bana rahe. Pehle **ek chhota Simple Flow** Meta mein, apne personal number pe test.

---

## Pehla test — WAPI pipe mat chhedo

1. WhatsApp Manager → **Account tools → Flows → Create Flow**
2. Name: `pbmp_lead_enquiry`
3. Category: Lead / Other
4. JSON editor mein paste karo: `pbmp-backend/flows/lead-enquiry-flow.json`
5. Preview (mobile pane) check karo
6. **Save** → **Publish**
7. Flow ID copy karo (Flows list / flow details)

**Pehla send Meta se karo, bot se nahi:**

Flow Builder mein **Test** / **Send preview** (apna personal WhatsApp number).

Isse:

- Form chat ke andar khulega ya nahi — confirm
- WAPI `send-message` / media / menu **same** rehte hain
- Agar Meta test kaam kare, tab Flow ID Zeabur pe lagayenge

---

## Zeabur (tab jab Meta test pass ho)

```bash
WHATSAPP_LEAD_FLOW_ID=<meta_flow_id>
WHATSAPP_LEAD_FLOW_SCREEN=LEAD_ENQUIRY
WHATSAPP_FLOW_CTA=Open Form
WHATSAPP_FLOW_MODE=draft
```

Bot se:

```bash
# Draft Flow (default until Publish). After Publish set WHATSAPP_FLOW_MODE=published
curl -X POST https://pbmpchatbotbackend.zeabur.app/whatsapp/test-flow \
  -H "Content-Type: application/json" \
  -d '{"phone":"91XXXXXXXXXX","flowKind":"lead","bypassWindow":true}'
```

Agar yeh 404 de → backend WAPI ke baad **Meta Graph** se try karega (test number). Phir bhi fail → HTML links.

Publish ke baad `WHATSAPP_FLOW_MODE=published` + redeploy.

Menu 3 **tabhi** in-chat Flow use karega jab Flow ID set ho. Warna purane HTML links (fallback).

---

## WAPI vs Meta (do alag checks)

```
Meta WABA → WhatsApp Manager → Flows     ← aapke paas visible hai
WAPI      → Flow create / send / submit / endpoint / templates  ← alag confirm
```

Meta feature on ho sakta hai; WAPI sirf messaging de. Isliye pehla proof **Meta preview/test** se.

---

## Files in this repo

| File | Use |
|------|-----|
| `pbmp-backend/flows/lead-enquiry-flow.json` | **Pehla Simple Flow** — Name, Company, Requirement |
| `pbmp-backend/flows/booking-flow.json` | Meeting booking (baad mein) |
| `pbmp-backend/flows/support-flow.json` | Support (baad mein) |

Submit ke baad bot (jab WAPI webhook `nfm_reply` de):

1. Message: bhari hui details  
2. Alag message: Form successfully submitted  

Meta: [Sending a Flow](https://developers.facebook.com/docs/whatsapp/flows/guides/sendingaflow/) · [Flow webhooks](https://developers.facebook.com/docs/whatsapp/flows/reference/flowswebhooks/)
