import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePbmpNativeVoice } from './src/usePbmpNativeVoice';

const STATES = ['idle', 'wake', 'listen', 'send'] as const;

const ORB_COLOR: Record<string, string> = {
  need_permission: '#1e293b',
  idle: '#1d4ed8',
  wake: '#d97706',
  listen: '#dc2626',
  send: '#334155',
  received: '#16a34a',
  error: '#7f1d1d',
};

function orbLabel(state: string): string {
  if (state === 'need_permission') return 'Off';
  if (state === 'idle') return 'Idle';
  if (state === 'wake') return 'Wake';
  if (state === 'listen') return 'Listen';
  if (state === 'send') return 'Send';
  if (state === 'received') return 'Got it';
  return 'Error';
}

export default function App() {
  const voice = usePbmpNativeVoice();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Text style={styles.kicker}>Phase 2 · React Native + Expo</Text>
      <Text style={styles.title}>Hey PBMP</Text>
      <Text style={styles.note}>
        Android can keep listening after you switch apps (development build + notification).
        iOS cannot replace Siri in the background.
      </Text>

      <View style={[styles.orb, { backgroundColor: ORB_COLOR[voice.state] || '#1d4ed8' }]}>
        <Text style={styles.orbText}>{orbLabel(voice.state)}</Text>
      </View>

      <Text style={styles.status}>{voice.statusText}</Text>
      {voice.wakeHeard ? <Text style={styles.meta}>Wake: {voice.wakeHeard}</Text> : null}
      {voice.lastId ? <Text style={styles.meta}>Received id: {voice.lastId}</Text> : null}
      {voice.error ? <Text style={styles.error}>{voice.error}</Text> : null}
      {voice.backgrounded && Platform.OS === 'ios' ? (
        <Text style={styles.warn}>iOS app is in the background — wake-word may stop.</Text>
      ) : null}

      {voice.state === 'need_permission' ? (
        <Pressable style={styles.primary} onPress={() => void voice.enableVoice()}>
          <Text style={styles.primaryText}>Enable Voice</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.ghost} onPress={voice.disableVoice}>
          <Text style={styles.ghostText}>Stop listening</Text>
        </Pressable>
      )}

      <Pressable style={styles.ghost} onPress={() => void voice.testRecordNow()}>
        <Text style={styles.ghostText}>Record command now</Text>
      </Pressable>

      <View style={styles.states}>
        {STATES.map((name) => (
          <Text key={name} style={voice.state === name ? styles.stateOn : styles.stateOff}>
            {name}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  kicker: {
    color: '#93c5fd',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontSize: 11,
    marginBottom: 8,
  },
  title: {
    color: '#e2e8f0',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  note: {
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  orb: {
    width: 168,
    height: 168,
    borderRadius: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.25)',
  },
  orbText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  status: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  meta: { color: '#64748b', fontSize: 13, marginBottom: 4, textAlign: 'center' },
  error: { color: '#fca5a5', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  warn: { color: '#fcd34d', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  primary: {
    backgroundColor: '#93c5fd',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 16,
    minWidth: 220,
    alignItems: 'center',
  },
  primaryText: { color: '#0b1220', fontWeight: '700', fontSize: 15 },
  ghost: {
    borderColor: 'rgba(148,163,184,0.35)',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 10,
    minWidth: 220,
    alignItems: 'center',
  },
  ghostText: { color: '#cbd5e1', fontWeight: '600', fontSize: 15 },
  states: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },
  stateOn: { color: '#93c5fd', textTransform: 'uppercase', fontSize: 11 },
  stateOff: { color: '#64748b', textTransform: 'uppercase', fontSize: 11 },
});
