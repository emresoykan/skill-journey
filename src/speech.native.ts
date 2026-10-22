// Telefon sürümü: Expo Go'da konuşmayı yazıya çeviren bir modül yok (expo-speech yalnız
// sesli okur). Mikrofon düğmesi burada görünmez; klavyenin dikte tuşu her alanda çalışır.
// Web sürümü speech.ts'te.
import type { DictationHandlers } from './speech';

export const speechSupported = false;
export const startDictation = (_handlers: DictationHandlers): (() => void) => () => {};
