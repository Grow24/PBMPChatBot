# PBMP Voice PWA — Phase 1 Hello World

This is the first voice assistant slice.

It proves:

**Enable Voice → “Hey PBMP” → “Yes, I’m listening” → record command → PBMP backend receives the audio.**

It does **not** include STT, LLM answers, WhatsApp, AutoVoice, Expo, or always-on background listening.

## What this is / is not

| Expectation | Result |
|-------------|--------|
| PWA is open and visible | Wake-word works |
| User switches Android apps / locks the phone | Not reliable |
| Siri/Alexa-style “Hey PBMP from anywhere” | **Not this phase** — that is Phase 2 React Native + Expo |

Wake-word detection in this POC uses the **browser SpeechRecognition API** (Chrome / Edge / Android Chrome). It is a stand-in so we can ship without a Picovoice key. Later we can swap in on-device Porcupine.

## Run locally

Terminal 1 — backend:

```bash
cd PBMPChatBot/pbmp-backend
node server.js
```

Terminal 2 — PWA:

```bash
cd PBMPChatBot
npm install
npm run dev
```

Open:

- Chatbot: http://localhost:3001
- Voice PWA: **http://localhost:3001/voice**

Microphone works on `localhost`. On a phone over LAN IP you need HTTPS (use the deployed Vercel URL, or a tunnel).

## Test steps

1. Open `/voice`
2. Tap **Enable Voice** and allow the microphone
3. Say **“Hey PBMP”**
4. Phone/browser should speak **“Yes, I’m listening”**
5. Speak a short command (about 6 seconds is recorded)
6. Screen should show **Got it** and a received id
7. Confirm backend stored it:

```bash
curl https://pbmpchatbotbackend.zeabur.app/api/voice/status
```

Local:

```bash
curl http://localhost:3000/api/voice/status
```

Audio files are written to `pbmp-backend/voice-inbox/` (gitignored).

If wake-word STT is flaky, tap **Record command now** — that still uploads audio and proves the backend.

## Deploy (GitHub → Zeabur)

No new npm packages. Backend uses existing Express. PWA uses browser APIs.

### A. Backend (existing Zeabur service)

Repo: `Grow24/PBMPChatBot`  
Root directory: `pbmp-backend`  
Domain: `https://pbmpchatbotbackend.zeabur.app`

1. Push `main` (this repo).
2. Zeabur → **pbmpchatbotbackend** → **Redeploy** (or wait for auto-deploy).
3. **No new env vars required** for Hello World.
4. Optional later: mount a volume at `/app/voice-inbox` if you want audio files to survive restarts.
5. Verify:

```bash
curl https://pbmpchatbotbackend.zeabur.app/api/voice/status
```

Expect `"phase":"hello-world"`.

### B. PWA UI

The `/voice` page is the **frontend**, not `pbmp-backend`.

**Option 1 — Vercel (already used for this chatbot UI)**  
- Same GitHub repo auto-builds the Vite app.
- Set (or keep) `VITE_API_ENDPOINT=https://pbmpchatbotbackend.zeabur.app/api/chat`
- Optional: `VITE_VOICE_ENDPOINT=https://pbmpchatbotbackend.zeabur.app/api/voice/hello-world`
- Open: `https://pbmpchatbot.vercel.app/voice`

**Option 2 — second Zeabur service for the PWA**
1. Zeabur → same GitHub repo → **New Service**
2. Root directory: **repository root** (not `pbmp-backend`)
3. Dockerfile path: `Dockerfile.pwa`
4. Port: **8080**
5. Build args / variables:
   - `VITE_API_ENDPOINT=https://pbmpchatbotbackend.zeabur.app/api/chat`
   - `VITE_VOICE_ENDPOINT=https://pbmpchatbotbackend.zeabur.app/api/voice/hello-world`
6. Open: `https://<pwa-service>.zeabur.app/voice`

CORS already allows `*.zeabur.app` and `*.vercel.app`.

## API

`POST /api/voice/hello-world`

```json
{
  "audioBase64": "<base64>",
  "mimeType": "audio/webm",
  "durationMs": 6000,
  "wakeTranscript": "hey pbmp",
  "clientTs": "2026-08-18T10:00:00.000Z"
}
```

Success:

```json
{
  "ok": true,
  "received": true,
  "id": "vw_...",
  "speakText": "Got it. PBMP received your command.",
  "phase": "hello-world"
}
```

`GET /api/voice/status` — last receipts (metadata only).

`GET /api/voice/files` — list saved recording files.

`GET /api/voice/download/:filename` — download one saved recording.

Example:

```bash
curl https://pbmpchatbotbackend.zeabur.app/api/voice/files
# then open:
# https://pbmpchatbotbackend.zeabur.app/api/voice/download/vw_1234567890_abcd1234.webm
```

## Next (not in this POC)

Phase 2 native app: see **[VOICE_PHASE2_SETUP.md](./VOICE_PHASE2_SETUP.md)** (React Native + Expo).

After that:

- On-device wake-word (Porcupine)
- STT → existing `/api/chat`
- TTS conversation
