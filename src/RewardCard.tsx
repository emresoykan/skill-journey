import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { displaySkill } from './mockAnalysis';
import type { Reward } from './journey-state';

const useNative = Platform.OS !== 'web';
const teal = '#166B65';

function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const counter = new Animated.Value(0);
    const id = counter.addListener(({ value: v }) => setValue(Math.round(v)));
    Animated.timing(counter, { toValue: target, duration: 1000, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => { counter.removeListener(id); counter.stopAnimation(); };
  }, [target]);
  return value;
}

function PopIn({ index, children }: { index: number; children: ReactNode }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(t, { toValue: 1, delay: 300 + index * 160, friction: 6, tension: 80, useNativeDriver: useNative }).start();
  }, [index, t]);
  return <Animated.View style={{ opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>{children}</Animated.View>;
}

// Kayıt başına yeniden bağlanır (key={reward.id}); sayaç ve animasyonlar sıfırdan başlar.
export function RewardCard({ reward }: { reward: Reward }) {
  const total = reward.analysis.xp + reward.bonusXp;
  const shown = useCountUp(total);
  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 5, tension: 70, useNativeDriver: useNative }).start();
  }, [enter]);
  const perks = [
    ...reward.newSkills.map(skill => `✦ Yeni beceri keşfedildi: ${displaySkill(skill)}`),
    ...reward.leveledSkills.map(skill => `⬆️ ${displaySkill(skill)} seviye atladı`),
    ...(reward.bonusXp ? [`🎯 Günün görevi tamamlandı: +${reward.bonusXp} bonus XP`] : []),
    ...(reward.streakExtended && reward.streak > 0 ? [`🔥 Seri ${reward.streak} gün oldu!`] : []),
    ...reward.newBadges.map(badge => `${badge.icon} Yeni rozet: ${badge.title}`),
  ];

  return <Animated.View style={[s.card, { opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
    <Text style={s.eyebrow}>{reward.leveledUp ? `🎉 SEVİYE ${reward.newLevel}!` : '⚡ XP KAZANDIN'}</Text>
    <Text style={s.total}>+{shown} <Text style={s.totalUnit}>XP</Text></Text>
    <Text style={s.reason}>{reward.analysis.reason}</Text>
    {reward.analysis.awards.map((award, i) => <PopIn key={award.skill} index={i}>
      <View style={s.awardRow}>
        <Text style={s.awardSkill}>{displaySkill(award.skill)}</Text>
        <Text style={s.awardXp}>+{award.xp} XP</Text>
      </View>
    </PopIn>)}
    {perks.map((perk, i) => <PopIn key={perk} index={reward.analysis.awards.length + i}>
      <Text style={s.perk}>{perk}</Text>
    </PopIn>)}
  </Animated.View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: '#FFF7DF', borderColor: '#F3D990', borderWidth: 2, borderRadius: 24, padding: 20, marginBottom: 25 },
  eyebrow: { color: '#8B5B00', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  total: { color: '#182637', fontSize: 46, fontWeight: '800', letterSpacing: -1.5, marginTop: 4 },
  totalUnit: { fontSize: 22, color: '#8B5B00' },
  reason: { color: '#657482', fontSize: 14, lineHeight: 21, marginBottom: 12 },
  awardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1E5C9' },
  awardSkill: { color: '#182637', fontSize: 15, fontWeight: '700' },
  awardXp: { color: teal, fontSize: 14, fontWeight: '800' },
  perk: { color: '#664708', backgroundColor: '#FCEBB5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, fontWeight: '800', marginTop: 10, overflow: 'hidden' },
});
