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
  if (typeof window !== 'undefined' && (window as unknown as { PBMP_VOICE_ENDPOINT?: string }).PBMP_VOICE_ENDPOINT) {
    return (window as unknown as { PBMP_VOICE_ENDPOINT: string }).PBMP_VOICE_ENDPOINT;
  }
  if (import.meta.env.VITE_VOICE_ENDPOINT) {
    return import.meta.env.VITE_VOICE_ENDPOINT;
  }
  const chat = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api/chat';
  return chat.replace(/\/api\/chat.*$/, '/api/voice/hello-world');
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read audio'));
    reader.readAsDataURL(blob);
  });
  const comma = dataUrl.indexOf(',');
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

export async function sendHelloWorldAudio(input: {
  blob: Blob;
  durationMs: number;
  wakeTranscript: string;
}): Promise<{ received: boolean; id?: string; speakText?: string; error?: string }> {
  const audioBase64 = await blobToBase64(input.blob);
  const response = await fetch(getVoiceEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      mimeType: input.blob.type || 'audio/webm',
      durationMs: input.durationMs,
      wakeTranscript: input.wakeTranscript,
      clientTs: new Date().toISOString(),
    }),
  });

  const data = await response.json().catch(() => ({})) as {
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

export function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function pickRecorderMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}
