import { useEffect, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Confetti } from './Confetti';
import { nextRank, rankFor } from './game';
import { useJourney } from './journey-state';
import { tap } from './feedback';

const useNative = Platform.OS !== 'web';
const gold = '#F5C45A';

// Sekme düzeyinde bir kez çizilir; her ekranda ayrı modal açılmasın diye.
export function LevelUpModal() {
  const { levelUpShown, dismissLevelUp } = useJourney();
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (levelUpShown === null) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 60, useNativeDriver: useNative }).start();
  }, [levelUpShown, pop]);
  if (levelUpShown === null) return null;
  const rank = rankFor(levelUpShown);
  const newRank = rankFor(levelUpShown - 1).title !== rank.title;
  const upcoming = nextRank(levelUpShown);
  const close = () => { tap(); dismissLevelUp(); };

  return <Modal transparent visible animationType="fade" onRequestClose={dismissLevelUp}>
    <View style={s.backdrop}>
      {/* Kartın dışına dokunmak da pencereyi kapatır. */}
      <Pressable accessibilityLabel="Kapat" onPress={close} style={StyleSheet.absoluteFill} />
      <Confetti burstKey={`level-${levelUpShown}`} count={48} />
      <Animated.View style={[s.card, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={10} onPress={close} style={s.close}><Text style={s.closeText}>✕</Text></Pressable>
        <Text style={s.eyebrow}>SEVİYE ATLADIN!</Text>
        <View style={s.medal}><Text style={s.medalText}>{levelUpShown}</Text></View>
        <Text style={s.rank}>{rank.icon} {rank.title}</Text>
        <Text style={s.sub}>{newRank ? 'Yeni rütbe açıldı! Yolculuğun yeni bir bölüme geçti.' : 'Her küçük an seni bir adım ileri taşıyor.'}</Text>
        {upcoming ? <Text style={s.next}>Sıradaki rütbe: {upcoming.icon} {upcoming.title} · Seviye {upcoming.from}{upcoming.from - levelUpShown === 1 ? ', bir seviye kaldı!' : ''}</Text> : null}
        <Pressable accessibilityRole="button" onPress={close} style={s.button}><Text style={s.buttonText}>Harika, devam!</Text></Pressable>
      </Animated.View>
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(12, 22, 34, 0.78)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 360, backgroundColor: '#182637', borderRadius: 30, padding: 28, alignItems: 'center', borderWidth: 2, borderColor: gold },
  eyebrow: { color: gold, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  medal: { width: 120, height: 120, borderRadius: 60, backgroundColor: gold, alignItems: 'center', justifyContent: 'center', marginVertical: 22, borderWidth: 6, borderColor: '#FCE3A1' },
  medalText: { color: '#182637', fontSize: 54, fontWeight: '800' },
  rank: { color: 'white', fontSize: 24, fontWeight: '800' },
  sub: { color: '#B8C4CF', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, marginBottom: 14 },
  next: { color: gold, backgroundColor: '#24384D', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontWeight: '800', textAlign: 'center', marginBottom: 22, overflow: 'hidden' },
  close: { position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: '#24384D', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#B8C4CF', fontSize: 15, fontWeight: '800' },
  button: { backgroundColor: gold, borderRadius: 16, height: 52, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#182637', fontSize: 16, fontWeight: '800' },
});
