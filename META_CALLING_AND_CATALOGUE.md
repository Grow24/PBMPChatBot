# Meta Developer App — Calling + Product Catalogue

**Related:** [META_APP_STRATEGY.md](./META_APP_STRATEGY.md) · [WHATSAPP_STACK_LAYERS.md](./WHATSAPP_STACK_LAYERS.md)

Keep **WAPI for messaging**. Use a **PBMP-owned Meta App** only for Calling experiments and (optionally) catalogue / Graph API.

---

## Part A — Meta Developer App

### Do you need it?

| Goal | Need Meta Developer App? |
|------|--------------------------|
| Current WAPI text bot | No |
| WhatsApp Flows via WAPI | Usually no |
| WhatsApp Calling (VoIP in WhatsApp) | **Yes** |
| Direct Cloud API (bypass WAPI) | **Yes** |
| Catalogue via Graph if WAPI lacks it | Likely **Yes** |

### Steps

1. Fix Facebook **device trust** first (trusted Chrome profile — see META_APP_STRATEGY.md). SMS/OTP on “master device” is Meta account security, not PBMP code.
2. [developers.facebook.com](https://developers.facebook.com/) → register as developer.
3. Create app → type **Business** → add product **WhatsApp**.
4. Do **not** retarget WAPI’s existing messaging webhooks/tokens.
5. Copy into Zeabur:
   ```bash
   META_APP_ID=
   META_ACCESS_TOKEN=
   META_PHONE_NUMBER_ID=
   META_WABA_ID=
   META_GRAPH_API_VERSION=v21.0
   ```

Support if blocked: Meta **Business Support Home** — ticket only about Developer registration / device trust.

---

## Part B — WhatsApp Calling

**Today live:** menu *5* = click-to-call + callback (not VoIP).  
**WAPI:** does not expose Calling API.

### Backend scaffold (added)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/whatsapp/calling/status` | Config readiness + recent events |
| `GET/POST` | `/whatsapp/calling/webhook` | Meta verify + store call webhook payloads |

```bash
WHATSAPP_CALLING_ENABLED=false   # set true only after Meta Calling is approved
```

### Enable sequence

1. Meta App + WhatsApp product linked to a test or production number that supports Calling.
2. In Meta App → WhatsApp → Configuration → enable Calling / permissions as documented by Meta.
3. Webhook URL: `https://pbmpchatbotbackend.zeabur.app/whatsapp/calling/webhook`  
   Verify token = same `WEBHOOK_VERIFY_TOKEN`.
4. Set `WHATSAPP_CALLING_ENABLED=true` + `META_*` vars → redeploy.
5. Check: `GET /whatsapp/calling/status` → `ready: true`.
6. Next code phase: inbound calls are **auto-rejected** (no WebRTC media server yet) and a WhatsApp follow-up is sent (`callback` / menu *5* / *4*). Manual: `POST /whatsapp/calling/reject` and `POST /whatsapp/calling/terminate`. True pickup needs SDP accept later.

---

## Part C — Product catalogue

**Blocked on:** Commerce catalogue on WABA + WAPI (or Graph) support for `catalog_message` / `product_list`.

**Live now:** menu *7* sends a Grow24/PBMP **text catalogue** until `WHATSAPP_CATALOGUE_ID` is set.

### Backend scaffold (added)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/whatsapp/catalogue/status` | Shows if `WHATSAPP_CATALOGUE_ID` set |
| `POST` | `/whatsapp/catalogue/send` | Tries WAPI interactive catalogue payload |

```bash
WHATSAPP_CATALOGUE_ID=your_meta_catalog_id
# WAPI_SEND_CATALOGUE_PATH=contact/send-interactive-message
```

### Enable sequence

1. Meta Commerce Manager → create catalogue → link to WABA.
2. Add products with retailer IDs.
3. Ask **WAPI support** whether catalogue / product list interactive messages are enabled.
4. Set `WHATSAPP_CATALOGUE_ID` → redeploy.
5. Test:
   ```bash
   curl -sS -X POST https://pbmpchatbotbackend.zeabur.app/whatsapp/catalogue/send \
     -H "Content-Type: application/json" \
     -d '{"phone":"919370239600","bodyText":"Our products","productRetailerIds":["sku-1"]}'
   ```
6. If WAPI returns 404/not supported → send via Meta Graph from PBMP Meta App (same credentials as Calling path).

---

## Cost (approx)

| Item | Cost |
|------|------|
| Meta Developer / verification | Free |
| WhatsApp Calling | Meta conversation / call rates (usage) |
| Catalogue | Free to create; messaging rates apply |
| Automate Premium | ~$5 one-time |
| AutoVoice Pro | ~$3 one-time (optional) |
