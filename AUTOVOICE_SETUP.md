# AutoVoice + Automate — always-listening POC

**Requires:** Working [AUTOMATE_POC.md](./AUTOMATE_POC.md) flow first.

---

## When to use AutoVoice

| Need | Use |
|------|-----|
| Tap Start → speak once | Automate only ✅ (current) |
| Say a wake phrase anytime | **AutoVoice + Automate** |

---

## Install

1. Play Store → **AutoVoice** (com.joaomgcd.autovoice)
2. Open AutoVoice → grant **microphone** + **notification** access
3. Pro unlock (~$3) if commands longer than 4 characters

---

## AutoVoice — one command

1. AutoVoice app → **Commands** (or main screen)
2. **+** new command
3. **Command filter:** `ask pbmp` (or `pbmp`)
4. **Responses:** leave default — Automate will handle via plugin

---

## Automate — new flow `PBMP AutoVoice`

Duplicate your **Pbmp voice ask** flow or create fresh:

### Block 1 — Plug-in event
- Search: **Plug-in event**
- App: **AutoVoice**
- Event: **Recognized** / command recognized
- Store command text in variable: `transcript`

### Block 2 — HTTP request
Same as voice ask flow:
- URL: `https://pbmpchatbotbackend.zeabur.app/whatsapp/automate`
- Headers: `X-PBMP-Automate-Key: long-random-secret`
- Body:
  ```json
  {"action":"autovoice","text":transcripts[0],"sendWhatsApp":0,"bypassWindow":1,"bypassConsent":1}
  ```
- `action=autovoice` wake phrase hataata hai (`ask pbmp …` → question only) aur default WhatsApp **nahi** bhejta (tez jawab).
- Response → `response`

### Block 3 — Variable set
- `answer` = `jsonDecode(response)["speakText"]`

### Block 4 — Speak
- Message: `{answer}`

### Block 5 — Flow beginning
Connect: **Flow beginning GO → Plug-in event IN**  
(Or run flow without beginning — AutoVoice plugin starts the fiber)

**Important:** Enable **Run on boot** / keep AutoVoice **Always listening** in AutoVoice settings.

---

## Test

1. Start **PBMP AutoVoice** flow in Automate
2. Say: **"ask pbmp what is PBMP"**
3. Phone speaks answer

---

## YouTube (search)

- *Alexa Android LlamaLab Automate AutoVoice plugin*
- *Tasker AutoVoice Demo Always Listening*
- *How to use AutoVoice joaomgcd*

---

## Limitations

- Google Assistant third-party routes limited — use **AutoVoice direct**, not "Hey Google"
- Battery: always-listening uses more power
- Keep `sendWhatsApp:0` for faster response; use separate flow with `1` if needed
