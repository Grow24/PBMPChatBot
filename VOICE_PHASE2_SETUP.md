# PBMP Voice — Phase 2 (React Native + Expo)

Phase 1 (PWA) proved: **Hey PBMP → record → backend receives audio** while the page is open.

Phase 2 moves that same Hello World onto a **native Android/iOS app** so listening can survive switching apps on Android.

Same backend. No new AI / WhatsApp / reports.

## What this phase is / is not

| Expectation | Result |
|-------------|--------|
| App open, Enable Voice, say **Hey PBMP** | Yes |
| Record command → `POST /api/voice/hello-world` | Yes — same Zeabur API as Phase 1 |
| Android: switch to another app, still say Hey PBMP | **Goal of this phase** (needs a **development build**, not Expo Go) |
| iOS: Siri-style always-on | **No** — Apple does not allow unrestricted background listening |
| Phone locked / OS killed the app | Not guaranteed |
| Expo Go | **Will not work** — needs custom native modules |

## Requirements

- Android Studio / Android SDK (to run `expo run:android`)
- USB debugging or emulator
- Backend already live: `https://pbmpchatbotbackend.zeabur.app/api/voice/hello-world`

## Install and run (Android)

```bash
cd PBMPChatBot/voice-app
npm install
npx expo prebuild --platform android
npx expo run:android
```

First install takes several minutes. The app **PBMP Voice** will open on the phone/emulator.

Optional local backend (emulator):

```bash
cp .env.example .env
# set EXPO_PUBLIC_VOICE_ENDPOINT=http://10.0.2.2:3000/api/voice/hello-world
```

Physical phone + laptop backend: use your laptop LAN IP, not `localhost`.

Default (no `.env`) already points at Zeabur.

## Test steps

1. Allow **Microphone** (and speech recognition on iOS).
2. Tap **Enable Voice**.
3. Say **“Hey PBMP”**.
4. Phone speaks **“Yes, I’m listening”**.
5. Speak a short command (~6 seconds).
6. Screen shows **Got it** + received id.
7. Confirm:

```bash
curl https://pbmpchatbotbackend.zeabur.app/api/voice/status
```

Look for `"clientSource":"expo-native"`.

8. **Android background test:** Enable Voice → Home → open Chrome → say **“Hey PBMP”**. If the sticky recording notification is visible, this is the Phase 2 pass.

If wake-word is flaky, tap **Record command now** — that still proves native record + backend.

## Battery / OEM

On some Androids (Xiaomi, Vivo, Oppo, Samsung):

1. Settings → Apps → PBMP Voice → Battery → **Unrestricted**
2. Autostart / background run: **Allow**

## iOS

Build on a Mac:

```bash
npx expo prebuild --platform ios
npx expo run:ios
```

Keep the app in the foreground. Background “Hey PBMP” is not a product promise on iOS.

## Architecture

```
Phone (Expo native)
  Enable Voice
  → expo-speech-recognition (Hey PBMP)
  → expo-speech (“Yes, I’m listening”)
  → expo-audio (6s command)
  → POST Zeabur /api/voice/hello-world
```

Next after this POC: on-device Porcupine wake-word, then STT → `/api/chat` → TTS conversation.
