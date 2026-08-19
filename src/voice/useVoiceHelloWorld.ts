import { useCallback, useEffect, useRef, useState } from 'react';
import {
  hasWakeWord,
  pickRecorderMimeType,
  sendHelloWorldAudio,
  speak,
  type VoiceState,
} from './voiceHelloWorld';

const LISTEN_MS = 6000;

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
  }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useVoiceHelloWorld() {
  const [state, setState] = useState<VoiceState>('need_permission');
  const [statusText, setStatusText] = useState('Tap Enable Voice, then say “Hey PBMP”.');
  const [lastId, setLastId] = useState('');
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(() => (typeof document !== 'undefined' ? document.hidden : false));
  const [wakeHeard, setWakeHeard] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const listenTimerRef = useRef<number | null>(null);
  const armedRef = useRef(false);
  const busyRef = useRef(false);
  const stateRef = useRef<VoiceState>('need_permission');
  const startWakeRef = useRef<() => void>(() => undefined);
  const handleWakeRef = useRef<(transcript: string) => Promise<void>>(async () => undefined);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const stopRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
  }, []);

  const startWakeListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || !armedRef.current || busyRef.current) return;

    stopRecognition();
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      if (busyRef.current || stateRef.current !== 'idle') return;
      let combined = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        combined += ` ${event.results[i][0].transcript}`;
      }
      if (hasWakeWord(combined)) {
        const heard = combined.trim();
        setWakeHeard(heard);
        void handleWakeRef.current(heard);
      }
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'not-allowed') {
        armedRef.current = false;
        setState('need_permission');
        setError('Microphone permission denied.');
        setStatusText('Allow the microphone, then tap Enable Voice again.');
      }
    };

    rec.onend = () => {
      if (armedRef.current && !busyRef.current && stateRef.current === 'idle') {
        try {
          rec.start();
        } catch {
          window.setTimeout(() => startWakeRef.current(), 400);
        }
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      window.setTimeout(() => startWakeRef.current(), 400);
    }
  }, [stopRecognition]);

  useEffect(() => {
    startWakeRef.current = startWakeListening;
  }, [startWakeListening]);

  const recordAndSend = useCallback(async (wakeTranscript: string) => {
    const stream = streamRef.current;
    if (!stream) {
      busyRef.current = false;
      setState('error');
      setError('Microphone stream is missing.');
      setStatusText('Tap Enable Voice and try again.');
      return;
    }

    const mimeType = pickRecorderMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (err) {
      busyRef.current = false;
      setState('error');
      setError(err instanceof Error ? err.message : 'MediaRecorder failed');
      setStatusText('This browser cannot record audio.');
      return;
    }

    const chunks: Blob[] = [];
    const startedAt = Date.now();
    setState('listen');
    setStatusText('Speak your command…');

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };

    const finished = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.onerror = () => reject(new Error('Recording failed'));
    });

    recorder.start();
    await new Promise<void>((resolve) => {
      listenTimerRef.current = window.setTimeout(() => resolve(), LISTEN_MS);
    });
    if (recorder.state !== 'inactive') recorder.stop();

    const blob = await finished;
    const durationMs = Date.now() - startedAt;

    setState('send');
    setStatusText('Sending command to PBMP…');

    try {
      const result = await sendHelloWorldAudio({ blob, durationMs, wakeTranscript });
      setLastId(result.id || '');
      setState('received');
      setStatusText(result.speakText || 'PBMP received your command.');
      await speak(result.speakText || 'Got it. PBMP received your command.');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStatusText('Could not send audio to PBMP.');
    } finally {
      busyRef.current = false;
      if (listenTimerRef.current) {
        window.clearTimeout(listenTimerRef.current);
        listenTimerRef.current = null;
      }
      if (armedRef.current) {
        window.setTimeout(() => {
          if (!armedRef.current) return;
          setState('idle');
          setStatusText('Listening for “Hey PBMP”');
          startWakeRef.current();
        }, 1600);
      }
    }
  }, []);

  const handleWake = useCallback(async (transcript: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    stopRecognition();
    setState('wake');
    setStatusText('Yes, I’m listening');
    setError('');
    await speak("Yes, I'm listening");
    await recordAndSend(transcript);
  }, [recordAndSend, stopRecognition]);

  useEffect(() => {
    handleWakeRef.current = handleWake;
  }, [handleWake]);

  const enableVoice = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      armedRef.current = true;
      setState('idle');
      setStatusText('Listening for “Hey PBMP”');
      startWakeListening();
    } catch {
      setState('need_permission');
      setError('Microphone access is required.');
      setStatusText('Allow the microphone, then tap Enable Voice.');
    }
  }, [startWakeListening]);

  const testRecordNow = useCallback(async () => {
    if (!streamRef.current) {
      await enableVoice();
    }
    if (!streamRef.current || busyRef.current) return;
    setWakeHeard('(manual test)');
    await handleWake('(manual test)');
  }, [enableVoice, handleWake]);

  const disableVoice = useCallback(() => {
    armedRef.current = false;
    busyRef.current = false;
    stopRecognition();
    if (listenTimerRef.current) {
      window.clearTimeout(listenTimerRef.current);
      listenTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setState('need_permission');
    setStatusText('Voice is off. Tap Enable Voice to start.');
  }, [stopRecognition]);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    const onPageHide = () => disableVoice();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [disableVoice]);

  return {
    state,
    statusText,
    lastId,
    error,
    hidden,
    wakeHeard,
    supportsSpeech: Boolean(getSpeechRecognitionCtor()),
    enableVoice,
    disableVoice,
    testRecordNow,
  };
}
