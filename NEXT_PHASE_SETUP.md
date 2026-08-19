# Next phase — Calling · Catalogue · AutoVoice

**You are here:** Automate POC works. Now enable these three tracks in parallel.

---

## Track 1 — WhatsApp Calling (VoIP in WhatsApp)

**Not the same as menu *5* (click-to-call).** This is Meta in-app voice calling via your PBMP Meta App.

### Already done (code)
- Webhook: `https://pbmpchatbotbackend.zeabur.app/whatsapp/calling/webhook`
- Meta subscribed: `calls` field ✅
- `GET /whatsapp/calling/status`

### Your steps (Meta — browser)

1. [developers.facebook.com](https://developers.facebook.com/) → **PBMP Grow24**
2. **Use cases → WhatsApp →** find **Calling** / phone settings  
   (or WhatsApp Manager → your WABA → phone → Calling)
3. **Enable WhatsApp Calling** on the number Meta allows  
   - Start with **test number** if production `9370239600` is locked to WAPI
4. Zeabur env:
   ```bash
   WHATSAPP_CALLING_ENABLED=true
   META_APP_ID=1010034605583120
   META_ACCESS_TOKEN=<token>
   META_PHONE_NUMBER_ID=1226712897196565
   META_WABA_ID=2257726894886119
   ```
5. **Redeploy** → check:
   ```bash
   curl https://pbmpchatbotbackend.zeabur.app/whatsapp/calling/status
   ```
6. Place a **test call** to business number from another WhatsApp  
7. Incoming call events appear in `/whatsapp/calling/status` → `recentEvents`  
   Team email/webhook if `WHATSAPP_HANDOFF_NOTIFY_EMAIL` set

### Blockers
- Business verification still **In review** may limit some Calling features
- Production number on WAPI — do **not** move off WAPI without a migration plan

---

## Track 2 — Product catalogue

### Already done (code)
- WhatsApp menu **\*7* / catalogue / products**
- `POST /whatsapp/catalogue/send` (WAPI → Meta Graph fallback)
- Automate: `{"action":"catalogue",...}`

### Your steps (Meta Commerce)

1. [business.facebook.com/commerce](https://business.facebook.com/commerce) → **Create catalogue**
2. Add products — note each **retailer ID** (e.g. `sku-pbmp-1`)
3. **Link catalogue** to your WhatsApp Business Account (WABA)
4. Copy **Catalogue ID** from Commerce Manager
5. Zeabur env:
   ```bash
   WHATSAPP_CATALOGUE_ID=your_catalog_id
   WHATSAPP_CATALOGUE_PRODUCT_IDS=sku-pbmp-1,sku-pbmp-2
   ```
6. **Redeploy**
7. Test from WhatsApp: send `menu` → reply **7**  
   Or:
   ```bash
   curl -X POST https://pbmpchatbotbackend.zeabur.app/whatsapp/catalogue/send \
     -H "Content-Type: application/json" \
     -d '{"phone":"919096794848","bodyText":"Our products"}'
   ```
8. If WAPI fails → backend tries **Meta Graph** automatically (uses `META_*` vars)

### Also ask WAPI
Email `admin@wapi.in.net` — enable **catalog_message / product_list** interactive messages.

---

## Track 3 — AutoVoice (always-listening)

**Optional upgrade** to Automate POC — hands-free voice trigger.

### Install (phone)
1. Play Store → **AutoVoice** (Joãoapps)
2. Optional: **AutoVoice Pro** (~$3) for full commands
3. **Do not install Tasker** — Automate has Plug-in blocks

### Automate flow (new flow: `PBMP AutoVoice`)

```
Plug-in event (AutoVoice Recognized)
  → Variable set (command = recognized text)
  → HTTP request (same as PBMP Voice Ask — action=ask)
  → Variable set (answer from speakText)
  → Speak
```

**Plug-in event block:**
- App: AutoVoice  
- Configuration: command filter e.g. `pbmp` or `ask pbmp`

**AutoVoice command example:** say *"ask pbmp what is grow24"*

See full steps: [AUTOVOICE_SETUP.md](./AUTOVOICE_SETUP.md)

### Cost
- AutoVoice Pro: ~$3 one-time  
- Automate Premium (if >30 blocks): ~$5 one-time  

---

## Automate actions (all)

| action | Purpose |
|--------|---------|
| `ping` | Health check |
| `ask` | Voice → AI (+ optional WhatsApp) |
| `send` | Send text to WhatsApp |
| `menu` | Send main menu |
| `catalogue` | Send product catalogue |
| `calling_status` | Speak Calling readiness |

---

## Recommended order this week

| Day | Task |
|-----|------|
| 1 | Meta Commerce → create catalogue + products |
| 2 | Zeabur `WHATSAPP_CATALOGUE_ID` → test menu **7** |
| 3 | Meta → enable Calling on test WABA → `WHATSAPP_CALLING_ENABLED=true` |
| 4 | Test call + check `/whatsapp/calling/status` |
| 5 | AutoVoice install + second Automate flow (optional) |

---

## Still waiting (parallel)

- Business verification → Flow Publish (menu 3 in-chat form)
- WAPI Flows enable email
