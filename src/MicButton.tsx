import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tap } from './feedback';
import { speechSupported, startDictation } from './speech';

const teal = '#166B65';

// iPhone klavyesindeki dikte simgesi gibi sade mikrofon: dolu kapsül, U şeklinde kol, sap ve taban.
// Emoji (🎤) cihaza göre stüdyo mikrofonu gibi göründüğü için çizimle yapıldı; ek simge paketi gerekmez.
function MicIcon({ color }: { color: string }) {
  return <View style={s.mic}>
    <View style={[s.micCapsule, { backgroundColor: color }]} />
    <View style={[s.micArc, { borderColor: color }]} />
    <View style={[s.micStem, { backgroundColor: color }]} />
    <View style={[s.micBase, { backgroundColor: color }]} />
  </View>;
}

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  // Konuşma bitip metin kesinleşince (ör. rutin adını hemen kaydetmek için).
  onFinal?: (text: string) => void;
  size?: number;
};

// Yazı alanının yanındaki 🎤: dokununca dinler, konuştukça metni alana yazar; alanda yazı varsa sonuna ekler.
// Konuşma tanıma olmayan yerde (telefon uygulaması, desteklemeyen tarayıcı) hiç görünmez.
export function MicButton({ value, onChangeText, onFinal, size = 50 }: Props) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const stop = useRef<(() => void) | null>(null);
  // Alan ekrandan kalkarsa dinleme de kapanır.
  useEffect(() => () => { stop.current?.(); }, []);
  if (!speechSupported) return null;

  function toggle() {
    if (listening) { stop.current?.(); return; }
    setError('');
    tap();
    const base = value.trim() ? `${value.trimEnd()} ` : '';
    setListening(true);
    stop.current = startDictation({
      onText: (text, final) => {
        const next = base + text;
        onChangeText(next);
        if (final) onFinal?.(next);
      },
      onEnd: () => { setListening(false); stop.current = null; },
      onError: message => { setError(message); setTimeout(() => setError(''), 5000); },
    });
  }

  return <View style={{ position: 'relative' }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Dinlemeyi durdur' : 'Sesle yaz'}
      accessibilityState={{ selected: listening }}
      onPress={toggle}
      style={[s.button, { width: size, height: size }, listening && s.listening]}
    >
      {listening ? <View style={s.stop} /> : <MicIcon color={teal} />}
    </Pressable>
    {error ? <Text accessibilityLiveRegion="polite" style={[s.error, { top: size + 6 }]}>{error}</Text> : null}
  </View>;
}

const s = StyleSheet.create({
  button: { borderRadius: 14, borderWidth: 1, borderColor: '#D5DFDA', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  listening: { backgroundColor: '#B34242', borderColor: '#B34242' },
  mic: { width: 16, height: 22 },
  micCapsule: { position: 'absolute', left: 4, top: 0, width: 8, height: 13, borderRadius: 4 },
  micArc: { position: 'absolute', left: 0, top: 6, width: 16, height: 11, borderWidth: 2, borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  micStem: { position: 'absolute', left: 7, top: 17, width: 2, height: 3 },
  micBase: { position: 'absolute', left: 4, top: 20, width: 8, height: 2, borderRadius: 1 },
  stop: { width: 14, height: 14, borderRadius: 3, backgroundColor: 'white' },
  error: { position: 'absolute', right: 0, width: 230, zIndex: 10, color: 'white', backgroundColor: '#344150', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, lineHeight: 17, overflow: 'hidden' },
});
