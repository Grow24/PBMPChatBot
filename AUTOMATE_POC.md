# Android Automate POC — voice → PBMP → WhatsApp

**Status:** Backend ready · phone flow to build in Automate app  
**Endpoint:** `POST https://pbmpchatbotbackend.zeabur.app/whatsapp/automate`  
**Docs:** [Automate](https://llamalab.com/automate/doc/) · [HTTP Request](https://llamalab.com/automate/doc/block/http_request.html) · [Speech](https://llamalab.com/automate/doc/block/index.html)

---

## What this does

```
You speak on Android
  → Automate (Speech Recognize)
  → HTTP POST /whatsapp/automate  action=ask
  → PBMP AI answers
  → WhatsApp message sent (optional)
  → Automate speaks answer aloud (speakText)
```

**AutoVoice:** not required for v1. Use Automate’s built-in speech. Add AutoVoice later only if you need always-listening / Bluetooth command triggers (plugin via Automate Plug-in blocks).

---

## Zeabur env (required)

```bash
AUTOMATE_API_KEY=long-random-secret
# Personal WhatsApp number (NOT the WAPI business number 9370239600)
AUTOMATE_DEFAULT_PHONE=919096794848
```

Redeploy after setting.

---

## API

**Auth (any one):**
- Header `X-PBMP-Automate-Key: <AUTOMATE_API_KEY>`
- Header `Authorization: Bearer <AUTOMATE_API_KEY>`
- Body field `apiKey`

### `action=ping`
```json
{ "action": "ping" }
```
→ `{ "speakText": "PBMP Automate endpoint is ready." }`

### `action=ask` (main POC)
```json
{
  "action": "ask",
  "text": "What is PBMP?",
  "phone": "919370239600",
  "sendWhatsApp": true,
  "bypassWindow": true,
  "bypassConsent": true
}
```
→ `{ "answer", "speakText", "whatsappSent", ... }`

### `action=send`
```json
{ "action": "send", "phone": "919370239600", "text": "Hello from Automate" }
```

### `action=menu`
```json
{ "action": "menu", "phone": "919370239600", "bypassWindow": true }
```

---

## Build the Automate flow (phone)

1. Install **Automate** (LlamaLab) from Play Store. Premium (~$5) if you hit the 30-block free limit.
2. New flow → name: `PBMP Voice Ask`.
3. Blocks in order:
   - **Flow beginning**
   - **Speech recognize** (or *Dialog speak* + *Speech recognize*) → save result to variable `transcript`
   - **HTTP request**
     - Method: `POST`
     - URL: `https://pbmpchatbotbackend.zeabur.app/whatsapp/automate`
     - Headers: `Content-Type: application/json` and `X-PBMP-Automate-Key: <your key>`
     - Body (JSON):
       ```json
       {
         "action": "ask",
         "text": "{transcript}",
         "sendWhatsApp": true,
         "bypassWindow": true,
         "bypassConsent": true
       }
       ```
     - Save response body / parse `speakText` into variable `answer`
   - **Speak** (TTS) → say `{answer}`
4. Start the fiber and grant mic + network permissions.

Optional: **Interact** block only if you must tap WhatsApp UI (prefer API send above).

### Test without speech first

From a computer:

```bash
curl -sS -X POST https://pbmpchatbotbackend.zeabur.app/whatsapp/automate \
  -H "Content-Type: application/json" \
  -H "X-PBMP-Automate-Key: YOUR_KEY" \
  -d '{"action":"ping"}'

# Voice only (no WhatsApp message)
curl -sS -X POST https://pbmpchatbotbackend.zeabur.app/whatsapp/automate \
  -H "Content-Type: application/json" \
  -H "X-PBMP-Automate-Key: YOUR_KEY" \
  -d '{"action":"ask","text":"What is PBMP?","sendWhatsApp":false,"bypassWindow":true,"bypassConsent":true}'

# AutoVoice (strips "ask pbmp" wake phrase; WhatsApp off by default)
curl -sS -X POST https://pbmpchatbotbackend.zeabur.app/whatsapp/automate \
  -H "Content-Type: application/json" \
  -H "X-PBMP-Automate-Key: YOUR_KEY" \
  -d '{"action":"autovoice","text":"ask pbmp what is PBMP?","sendWhatsApp":0}'
```

### Two Automate flows (voice-only vs voice+WhatsApp)

Duplicate the flow on your phone:

| Flow name | Request body `sendWhatsApp` |
|-----------|----------------------------|
| `PBMP Voice Ask` | `0` — phone speaks only |
| `PBMP Voice + WhatsApp` | `1` — phone speaks + WhatsApp to `AUTOMATE_DEFAULT_PHONE` |

**Important:** In Automate expression mode, do not use `true`/`false` — use `1` / `0`. The backend accepts both formats.

---

## AutoVoice (optional, later)

| Need | Use |
|------|-----|
| Tap mic → ask once | Automate speech only ✅ |
| Always listening / headset button | AutoVoice plugin → Automate Plug-in event |

Architecture if added:

```
AutoVoice → Automate → POST /whatsapp/automate → PBMP → WhatsApp
```

YouTube (search): *Alexa Android LlamaLab Automate AutoVoice*, *How to use AutoVoice*, *Tasker AutoVoice Always Listening*.

---

## Tutorials

1. [Automation flow tutorial](https://www.youtube.com/watch?v=p3tXhB6xAYw) — start here  
2. [Automate docs — flow basics](https://llamalab.com/automate/doc/flow.html)  
3. [HTTP Request block](https://llamalab.com/automate/doc/block/http_request.html)  
