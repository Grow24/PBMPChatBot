import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import {
  getVoiceEndpoint,
  guessMimeType,
  hasWakeWord,
  sendHelloWorldAudio,
  type VoiceState,
} from './voiceApi';

const LISTEN_MS = 6000;

function speakAsync(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.stop().catch(() => undefined);
    Speech.speak(text, {
      language: 'en-US',
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: () => resolve(),
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function usePbmpNativeVoice() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<VoiceState>('need_permission');
  const [statusText, setStatusText] = useState(
    'Tap Enable Voice, then say “Hey PBMP”. You can switch Android apps after that.',
  );
  const [lastId, setLastId] = useState('');
  const [error, setError] = useState('');
  const [wakeHeard, setWakeHeard] = useState('');
  const [backgrounded, setBackgrounded] = useState(false);

  const armedRef = useRef(false);
  const busyRef = useRef(false);
  const stateRef = useRef<VoiceState>('need_permission');
  const handleWakeRef = useRef<(transcript: string) => Promise<void>>(async () => undefined);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const startWakeListening = useCallback(() => {
    if (!armedRef.current || busyRef.current) return;
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
        contextualStrings: ['Hey PBMP', 'PBMP', 'Grow24'],
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 8000,
          EXTRA_MASK_OFFENSIVE_WORDS: false,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start recognition');
    }
  }, []);

  const stopWakeListening = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      /* ignore */
    }
  }, []);

  const recordAndSend = useCallback(
    async (wakeTranscript: string) => {
      setState('listen');
      setStatusText('Speak your command…');
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        allowsBackgroundRecording: true,
        shouldPlayInBackground: true,
      });
      await recorder.prepareToRecordAsync();
      const startedAt = Date.now();
      recorder.record();
      await sleep(LISTEN_MS);
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        throw new Error('No recording file was produced');
      }
      const audioBase64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
      setState('send');
      setStatusText('Sending command to PBMP…');
      const result = await sendHelloWorldAudio({
        audioBase64,
        mimeType: guessMimeType(uri),
        durationMs: Date.now() - startedAt,
        wakeTranscript,
      });
      setLastId(result.id || '');
      setState('received');
      setStatusText(result.speakText || 'PBMP received your command.');
      await speakAsync(result.speakText || 'Got it. PBMP received your command.');
    },
    [recorder],
  );

  const handleWake = useCallback(
    async (transcript: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      stopWakeListening();
      setState('wake');
      setStatusText("Yes, I'm listening");
      setError('');
      try {
        await speakAsync("Yes, I'm listening");
        await sleep(250);
        await recordAndSend(transcript);
      } catch (err) {
        setState('error');
        setError(err instanceof Error ? err.message : 'Voice flow failed');
        setStatusText('Could not complete the native voice flow.');
      } finally {
        busyRef.current = false;
        if (armedRef.current) {
          setTimeout(() => {
            if (!armedRef.current) return;
            setState('idle');
            setStatusText('Listening for “Hey PBMP”');
            startWakeListening();
          }, 1200);
        }
      }
    },
    [recordAndSend, startWakeListening, stopWakeListening],
  );

  useEffect(() => {
    handleWakeRef.current = handleWake;
  }, [handleWake]);

  useSpeechRecognitionEvent('result', (event) => {
    if (busyRef.current || stateRef.current !== 'idle') return;
    const combined = (event.results || []).map((item) => item.transcript).join(' ');
    if (hasWakeWord(combined)) {
      setWakeHeard(combined.trim());
      void handleWakeRef.current(combined.trim());
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (armedRef.current && !busyRef.current && stateRef.current === 'idle') {
      startWakeListening();
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'aborted' || event.error === 'no-speech') return;
    if (event.error === 'not-allowed') {
      armedRef.current = false;
      setState('need_permission');
      setError('Microphone or speech permission denied.');
      setStatusText('Allow microphone and speech recognition, then tap Enable Voice.');
    }
  });

  const enableVoice = useCallback(async () => {
    setError('');
    const speech = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    const rec = await requestRecordingPermissionsAsync();
    if (!speech.granted || !rec.granted) {
      setState('need_permission');
      setError('Microphone permission is required.');
      setStatusText('Allow the microphone, then tap Enable Voice.');
      return;
    }
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      allowsBackgroundRecording: true,
      shouldPlayInBackground: true,
    });
    await activateKeepAwakeAsync('pbmp-voice');
    armedRef.current = true;
    setState('idle');
    setStatusText('Listening for “Hey PBMP”');
    startWakeListening();
  }, [startWakeListening]);

  const disableVoice = useCallback(() => {
    armedRef.current = false;
    busyRef.current = false;
    stopWakeListening();
    deactivateKeepAwake('pbmp-voice');
    Speech.stop().catch(() => undefined);
    setState('need_permission');
    setStatusText('Voice is off. Tap Enable Voice to start.');
  }, [stopWakeListening]);

  const testRecordNow = useCallback(async () => {
    if (!armedRef.current) {
      await enableVoice();
    }
    if (busyRef.current) return;
    setWakeHeard('(manual test)');
    await handleWake('(manual test)');
  }, [enableVoice, handleWake]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const hidden = next !== 'active';
      setBackgrounded(hidden);
      if (hidden && Platform.OS === 'ios' && armedRef.current) {
        setStatusText('iOS background listening is limited. Keep the app open for Hey PBMP.');
      }
    });
    return () => {
      sub.remove();
      disableVoice();
    };
  }, [disableVoice]);

  return {
    state,
    statusText,
    lastId,
    error,
    wakeHeard,
    backgrounded,
    endpoint: getVoiceEndpoint(),
    enableVoice,
    disableVoice,
    testRecordNow,
  };
}
