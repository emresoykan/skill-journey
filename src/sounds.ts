import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSyncExternalStore } from 'react';

// WAV dosyaları scripts/generate-sounds.cjs ile üretilir.
const sources = {
  tap: require('../assets/sounds/tap.wav'),
  xp: require('../assets/sounds/xp.wav'),
  quest: require('../assets/sounds/quest.wav'),
  badge: require('../assets/sounds/badge.wav'),
  levelup: require('../assets/sounds/levelup.wav'),
};
export type Sound = keyof typeof sources;

const KEY = 'skill-journey:sound:v1';
const volumes: Record<Sound, number> = { tap: 0.5, xp: 0.8, quest: 0.8, badge: 0.9, levelup: 1 };
// Uygulama boyunca yaşayan tekil oynatıcılar; bu yüzden remove() çağrılmaz.
const players: Partial<Record<Sound, AudioPlayer>> = {};
const listeners = new Set<() => void>();
let enabled = true;
let prepared = false;

const emit = () => listeners.forEach(listener => listener());
// Geliştirmede ses sorunlarını Metro loguna yazar; yayında sessiz kalır.
const report = (step: string) => (error: unknown) => { if (__DEV__) console.warn(`[ses] ${step}`, error); };

function player(sound: Sound) {
  let current = players[sound];
  if (!current) {
    current = createAudioPlayer(sources[sound]);
    current.volume = volumes[sound];
    players[sound] = current;
  }
  return current;
}

// İlk çalışta gecikme olmasın diye oynatıcılar uygulama açılışında yüklenir.
export function prepareSounds() {
  if (prepared) return;
  prepared = true;
  // Efektler iOS sessiz anahtarına uyar ve kullanıcının müziğinin üstüne karışır.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(report('setAudioModeAsync'));
  AsyncStorage.getItem(KEY).then(value => { if (value === 'off') { enabled = false; emit(); } }).catch(report('tercih okunamadı'));
  try { (Object.keys(sources) as Sound[]).forEach(player); } catch (error) { report('oynatıcı oluşturulamadı')(error); }
}

export function playSound(sound: Sound) {
  if (!enabled) return;
  try {
    const current = player(sound);
    current.seekTo(0).catch(report(`${sound} seekTo`));
    current.play();
  } catch (error) { report(`${sound} play`)(error); }
}

export function setSoundEnabled(next: boolean) {
  enabled = next;
  emit();
  AsyncStorage.setItem(KEY, next ? 'on' : 'off').catch(() => {});
  if (next) playSound('tap');
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useSoundEnabled = () => useSyncExternalStore(subscribe, () => enabled, () => enabled);
