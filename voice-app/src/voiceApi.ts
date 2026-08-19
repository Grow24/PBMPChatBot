export type VoiceState =
  | 'need_permission'
  | 'idle'
  | 'wake'
  | 'listen'
  | 'send'
  | 'received'
  | 'error';

export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasWakeWord(text: string): boolean {
  const t = normalizeTranscript(text);
  if (!t) return false;
  if (/\bhey\s*pbmp\b/.test(t)) return true;
  if (/\bhey\s*p\s*b\s*m\s*p\b/.test(t)) return true;
  if (/\bhey\s*pbm\s*p\b/.test(t)) return true;
  if (/\bhay\s*pbmp\b/.test(t)) return true;
  return /\bhey\b/.test(t) && /\bpbmp\b/.test(t);
}

export function getVoiceEndpoint(): string {
  return (
    process.env.EXPO_PUBLIC_VOICE_ENDPOINT ||
    'https://pbmpchatbotbackend.zeabur.app/api/voice/hello-world'
  );
}

export async function sendHelloWorldAudio(input: {
  audioBase64: string;
  mimeType: string;
  durationMs: number;
  wakeTranscript: string;
}): Promise<{ received: boolean; id?: string; speakText?: string }> {
  const response = await fetch(getVoiceEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64: input.audioBase64,
      mimeType: input.mimeType,
      durationMs: input.durationMs,
      wakeTranscript: input.wakeTranscript,
      clientSource: 'expo-native',
      clientTs: new Date().toISOString(),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    received?: boolean;
    id?: string;
    speakText?: string;
    error?: string;
  };

  if (!response.ok || !data.received) {
    throw new Error(data.error || `Voice API error ${response.status}`);
  }

  return {
    received: true,
    id: data.id,
    speakText: data.speakText,
  };
}

export function guessMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.mp4')) return 'audio/mp4';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.3gp')) return 'audio/3gpp';
  if (lower.endsWith('.webm')) return 'audio/webm';
  return 'audio/mp4';
}
