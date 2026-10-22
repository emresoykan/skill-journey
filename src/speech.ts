// Web: tarayıcının konuşma tanıması (Web Speech API; Safari'de webkit önekli).
// Tanıma için ses tarayıcının sunucusuna (Apple/Google) gidebilir.
// Telefon sürümü speech.native.ts'te; Expo Go'da konuşma tanıma modülü yok.
type Alternative = { transcript: string };
type Result = { readonly isFinal: boolean; readonly 0: Alternative };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<Result> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionConstructor = new () => Recognition;
type SpeechWindow = { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

const Recognizer = typeof window === 'undefined' ? undefined
  : (window as unknown as SpeechWindow).SpeechRecognition ?? (window as unknown as SpeechWindow).webkitSpeechRecognition;

export const speechSupported = !!Recognizer;

export type DictationHandlers = {
  onText: (text: string, final: boolean) => void;
  onEnd: () => void;
  onError: (message: string) => void;
};

const errorMessages: Record<string, string> = {
  'not-allowed': 'Mikrofon izni verilmedi. Ayarlardan izin verebilirsin.',
  'service-not-allowed': 'Ses tanıma bu modda kullanılamıyor; klavyedeki mikrofonu kullanabilirsin.',
  network: 'Ses tanıma için internet bağlantısı gerekiyor.',
  'audio-capture': 'Mikrofona ulaşılamadı.',
  'language-not-supported': 'Bu tarayıcıda Türkçe ses tanıma yok.',
};

// Aynı anda tek bir dinleme olur; yenisi başlarken öncekini kapatır.
let active: Recognition | null = null;

export function startDictation(handlers: DictationHandlers): () => void {
  if (!Recognizer) return () => {};
  active?.abort();
  const recognition = new Recognizer();
  recognition.lang = 'tr-TR';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = event => {
    let text = '';
    let final = true;
    for (let i = 0; i < event.results.length; i++) {
      text += event.results[i][0].transcript;
      if (!event.results[i].isFinal) final = false;
    }
    handlers.onText(text.trim(), final);
  };
  recognition.onerror = event => {
    // Sessizlik ve bilerek durdurma hata sayılmaz.
    if (event.error === 'no-speech' || event.error === 'aborted') return;
    handlers.onError(errorMessages[event.error] ?? 'Ses tanınamadı. Tekrar dene.');
  };
  recognition.onend = () => {
    if (active === recognition) active = null;
    handlers.onEnd();
  };
  active = recognition;
  try {
    recognition.start();
  } catch {
    active = null;
    handlers.onError('Ses tanıma başlatılamadı.');
    handlers.onEnd();
  }
  return () => recognition.stop();
}
