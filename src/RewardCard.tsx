import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { displaySkill } from './mockAnalysis';
import type { Reward } from './journey-state';

const useNative = Platform.OS !== 'web';
const teal = '#166B65';

// Süreye göre sayar: kare atlanırsa bir sonraki kare doğru değere zıplar. Sayaç her
// durumda hedefte biter; animasyon yarıda kesilse bile ekranda yanlış sayı kalmaz.
function useCountUp(target: number, duration = 700, delay = 150) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = Date.now() + delay;
    const step = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / duration));
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    const settle = setTimeout(() => setValue(target), delay + duration + 50);
    return () => { cancelAnimationFrame(frame); clearTimeout(settle); };
  }, [target, duration, delay]);
  return value;
}

function PopIn({ index, children }: { index: number; children: ReactNode }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(t, { toValue: 1, delay: 300 + index * 160, friction: 6, tension: 80, useNativeDriver: useNative }).start();
  }, [index, t]);
  return <Animated.View style={{ opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>{children}</Animated.View>;
}

export function rewardPerks(reward: Reward): string[] {
  return [
    ...reward.newSkills.map(skill => `✦ Yeni beceri keşfedildi: ${displaySkill(skill)}`),
    ...reward.leveledSkills.map(skill => `⬆️ ${displaySkill(skill)} seviye atladı`),
    ...(reward.goalReached ? ['✅ Günlük hedef tamam! Bugün harika gidiyorsun.'] : []),
    ...(reward.bonusXp ? [`🎯 Günün görevi tamamlandı: +${reward.bonusXp} bonus XP`] : []),
    ...(reward.streakExtended && reward.streak > 0 ? [`🔥 Seri ${reward.streak} gün oldu!`] : []),
    ...reward.newBadges.map(badge => `${badge.icon} Yeni rozet: ${badge.title}`),
  ];
}

// Özel bir an yoksa küçük satır, varsa büyük kutlama kartı.
export const isSpecialReward = (reward: Reward) => reward.leveledUp || rewardPerks(reward).length > 0;

// Kayıt başına yeniden bağlanır (key={reward.id}); sayaç ve animasyonlar sıfırdan başlar.
export function RewardCard({ reward }: { reward: Reward }) {
  const total = reward.analysis.xp + reward.bonusXp;
  const shown = useCountUp(total);
  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 5, tension: 70, useNativeDriver: useNative }).start();
  }, [enter]);
  const perks = rewardPerks(reward);
  const pop = { opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] };

  if (!isSpecialReward(reward)) {
    return <Animated.View style={[s.compact, pop]}>
      <Text style={s.compactXp}>+{shown} XP</Text>
      <Text style={s.compactSkills} numberOfLines={2}>{reward.analysis.awards.map(award => `${displaySkill(award.skill)} +${award.xp}`).join(' · ')}</Text>
    </Animated.View>;
  }

  return <Animated.View style={[s.card, pop]}>
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
  card: { backgroundColor: '#FFF7DF', borderColor: '#F3D990', borderWidth: 2, borderRadius: 20, padding: 18, marginTop: 14, marginBottom: 4 },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF7DF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  compactXp: { color: '#8B5B00', fontSize: 18, fontWeight: '800' },
  compactSkills: { flex: 1, color: teal, fontSize: 13, fontWeight: '700' },
  eyebrow: { color: '#8B5B00', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  total: { color: '#182637', fontSize: 40, fontWeight: '800', letterSpacing: -1.5, marginTop: 4 },
  totalUnit: { fontSize: 22, color: '#8B5B00' },
  reason: { color: '#657482', fontSize: 14, lineHeight: 21, marginBottom: 12 },
  awardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1E5C9' },
  awardSkill: { color: '#182637', fontSize: 15, fontWeight: '700' },
  awardXp: { color: teal, fontSize: 14, fontWeight: '800' },
  perk: { color: '#664708', backgroundColor: '#FCEBB5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, fontWeight: '800', marginTop: 10, overflow: 'hidden' },
});
