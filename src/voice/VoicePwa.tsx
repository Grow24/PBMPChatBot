import { useEffect } from 'react';
import { useVoiceHelloWorld } from './useVoiceHelloWorld';
import './VoicePwa.css';

const STATES = ['idle', 'wake', 'listen', 'send'] as const;

function orbLabel(state: string): string {
  if (state === 'need_permission') return 'Off';
  if (state === 'idle') return 'Idle';
  if (state === 'wake') return 'Wake';
  if (state === 'listen') return 'Listen';
  if (state === 'send') return 'Send';
  if (state === 'received') return 'Got it';
  return 'Error';
}

export default function VoicePwa() {
  const voice = useVoiceHelloWorld();

  useEffect(() => {
    document.documentElement.classList.add('voice-pwa');
    document.title = 'PBMP Voice';

    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = '/voice-manifest.webmanifest';
    document.head.appendChild(manifest);

    const theme = document.createElement('meta');
    theme.name = 'theme-color';
    theme.content = '#0b1220';
    document.head.appendChild(theme);

    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js');
    }

    return () => {
      document.documentElement.classList.remove('voice-pwa');
      manifest.remove();
      theme.remove();
    };
  }, []);

  return (
    <div className="voice-pwa-root">
      <div className="voice-pwa-card">
        <p className="voice-pwa-kicker">Phase 1 · Hello World</p>
        <h1 className="voice-pwa-title">Hey PBMP</h1>
        <p className="voice-pwa-note">
          This PWA listens only while it stays open. It is not Siri-style always-on.
        </p>

        <div className={`voice-orb ${voice.state}`}>
          <span>{orbLabel(voice.state)}</span>
        </div>

        <p className="voice-status">{voice.statusText}</p>
        {voice.wakeHeard ? <p className="voice-meta">Wake: {voice.wakeHeard}</p> : null}
        {voice.lastId ? <p className="voice-meta">Received id: {voice.lastId}</p> : null}
        {voice.error ? <p className="voice-error">{voice.error}</p> : null}
        {voice.hidden ? (
          <p className="voice-warn">App is in the background — wake-word may stop.</p>
        ) : null}
        {!voice.supportsSpeech ? (
          <p className="voice-warn">This browser has no SpeechRecognition. Use Record command now.</p>
        ) : null}

        <div className="voice-actions">
          {voice.state === 'need_permission' ? (
            <button className="primary" type="button" onClick={() => void voice.enableVoice()}>
              Enable Voice
            </button>
          ) : (
            <button className="ghost" type="button" onClick={voice.disableVoice}>
              Stop listening
            </button>
          )}
          <button className="ghost" type="button" onClick={() => void voice.testRecordNow()}>
            Record command now
          </button>
        </div>

        <div className="voice-states">
          {STATES.map((name) => (
            <span key={name}>
              {voice.state === name ? <b>{name}</b> : name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
