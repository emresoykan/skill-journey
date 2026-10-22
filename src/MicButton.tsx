import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tap } from './feedback';
import { speechSupported, startDictation } from './speech';

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
      <Text style={[s.icon, listening && s.iconListening]}>{listening ? '■' : '🎤'}</Text>
    </Pressable>
    {error ? <Text accessibilityLiveRegion="polite" style={[s.error, { top: size + 6 }]}>{error}</Text> : null}
  </View>;
}

const s = StyleSheet.create({
  button: { borderRadius: 14, borderWidth: 1, borderColor: '#D5DFDA', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  listening: { backgroundColor: '#B34242', borderColor: '#B34242' },
  icon: { fontSize: 20 },
  iconListening: { color: 'white', fontSize: 16, fontWeight: '800' },
  error: { position: 'absolute', right: 0, width: 230, zIndex: 10, color: 'white', backgroundColor: '#344150', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, lineHeight: 17, overflow: 'hidden' },
});
