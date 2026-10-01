import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

const colors = ['#F5C45A', '#166B65', '#E86A5B', '#6C8CF5', '#9BD3AE', '#F29BC1'];
const useNative = Platform.OS !== 'web';

type Seed = { x: number; size: number; strip: boolean; color: string; delay: number; duration: number; drift: number; spin: number; fall: number };

// Saf sözde-rastgele: aynı patlama anahtarı aynı konfeti dizilimini üretir.
const noise = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const hash = (key: string) => [...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100_000, 7);

function Piece({ seed, burstKey, width, height }: { seed: Seed; burstKey: string; width: number; height: number }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    t.setValue(0);
    const animation = Animated.timing(t, { toValue: 1, duration: seed.duration, delay: seed.delay, easing: Easing.bezier(0.2, 0.6, 0.4, 1), useNativeDriver: useNative });
    animation.start();
    return () => animation.stop();
  }, [burstKey, seed, t]);
  const transform = [
    { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, seed.drift, seed.drift * 0.4] }) },
    { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-30, height * seed.fall] }) },
    { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${seed.spin}deg`] }) },
  ];
  const opacity = t.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] });
  return <Animated.View style={{ position: 'absolute', top: 0, left: seed.x * width, width: seed.size, height: seed.strip ? seed.size * 2.4 : seed.size, borderRadius: seed.strip ? 2 : seed.size / 2, backgroundColor: seed.color, opacity, transform }} />;
}

export function Confetti({ burstKey, count = 32 }: { burstKey: string | null; count?: number }) {
  const { width, height } = useWindowDimensions();
  if (!burstKey) return null;
  const base = hash(burstKey);
  const seeds: Seed[] = Array.from({ length: count }, (_, i) => {
    const r = (k: number) => noise(base + i * 17 + k);
    return { x: r(1), size: 6 + r(2) * 6, strip: r(3) > 0.5, color: colors[Math.floor(r(4) * colors.length)], delay: r(5) * 350, duration: 1500 + r(6) * 1100, drift: (r(7) - 0.5) * 120, spin: (r(8) - 0.5) * 900, fall: 0.55 + r(9) * 0.4 };
  });
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {seeds.map((seed, i) => <Piece key={`${burstKey}-${i}`} seed={seed} burstKey={burstKey} width={width} height={height} />)}
  </View>;
}
