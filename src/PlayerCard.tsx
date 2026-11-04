import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LEVEL_XP, level, nextRank, rankFor, type Streak } from './game';

const gold = '#F5C45A';

// compact: Bugün sekmesinde yalnız seviye, seri ve XP çubuğu (hafta ve ipucu satırı Gelişim'de).
export function PlayerCard({ totalXp, streak, compact = false }: { totalXp: number; streak: Streak; compact?: boolean }) {
  const lvl = level(totalXp);
  const rank = rankFor(lvl);
  const upcoming = nextRank(lvl);
  const progress = totalXp % LEVEL_XP;
  const [fill] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fill, { toValue: progress, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [fill, progress]);
  const width = fill.interpolate({ inputRange: [0, LEVEL_XP], outputRange: ['0%', '100%'] });
  const atRisk = !streak.activeToday && streak.count > 0;

  return <View style={[s.card, compact && s.cardCompact]}>
    <View style={[s.top, compact && s.topCompact]}>
      <View style={[s.avatar, compact && s.avatarCompact]}><Text style={[s.avatarIcon, compact && { fontSize: 20 }]}>{rank.icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.rank}>{rank.title.toLocaleUpperCase('tr-TR')}</Text>
        <Text style={[s.level, compact && s.levelCompact]}>Seviye {lvl}</Text>
      </View>
      <View style={[s.streak, streak.count === 0 && s.streakOff]} accessibilityLabel={`${streak.count} günlük seri`}>
        <Text style={s.streakIcon}>🔥</Text>
        <Text style={s.streakCount}>{streak.count}</Text>
      </View>
    </View>
    <View style={s.row}><Text style={s.xpLabel}>XP</Text><Text style={s.xpLabel}>{progress} / {LEVEL_XP}</Text></View>
    <View style={s.track}><Animated.View style={[s.fill, { width }]} /></View>
    {compact ? (atRisk ? <Text style={[s.hint, { color: gold, marginTop: 10 }]}>{`Serini korumak için bugün bir an yaz! 🔥 ${streak.count}`}</Text> : null) : <>
    <View style={s.week}>
      {streak.week.map(day => <View key={day.key} style={s.day}>
        <View style={[s.dayDot, day.active && s.dayDotOn, day.today && !day.active && s.dayDotToday]}>
          <Text style={s.dayMark}>{day.active ? '🔥' : ''}</Text>
        </View>
        <Text style={[s.dayLabel, day.today && { color: gold }]}>{day.label}</Text>
      </View>)}
    </View>
    <Text style={[s.hint, atRisk && { color: gold }]}>
      {atRisk ? `Serini korumak için bugün bir an yaz! 🔥 ${streak.count}`
        : streak.activeToday ? `Bugünün alevi yandı. ${streak.count} günlük seri!`
        : 'İlk anını yaz, serini başlat.'}
      {upcoming ? `  ·  Seviye ${upcoming.from}: ${upcoming.icon} ${upcoming.title}` : ''}
    </Text>
    </>}
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: '#182637', borderRadius: 26, padding: 20, marginBottom: 18 },
  cardCompact: { borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 14 },
  topCompact: { marginBottom: 10, gap: 12 },
  avatarCompact: { width: 40, height: 40, borderRadius: 13 },
  levelCompact: { fontSize: 20 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#24384D', borderWidth: 2, borderColor: gold, alignItems: 'center', justifyContent: 'center' },
  avatarIcon: { fontSize: 28 },
  rank: { color: gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  level: { color: 'white', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#3A2A1A', borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7 },
  streakOff: { opacity: 0.45 },
  streakIcon: { fontSize: 16 },
  streakCount: { color: gold, fontSize: 17, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  xpLabel: { color: '#B8C4CF', fontSize: 11, fontWeight: '800' },
  track: { height: 12, borderRadius: 8, backgroundColor: '#2C4157', overflow: 'hidden' },
  fill: { height: 12, borderRadius: 8, backgroundColor: gold },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  day: { alignItems: 'center', gap: 5 },
  dayDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#24384D', alignItems: 'center', justifyContent: 'center' },
  dayDotOn: { backgroundColor: '#4A3420' },
  dayDotToday: { borderWidth: 2, borderColor: gold, borderStyle: 'dashed' },
  dayMark: { fontSize: 15 },
  dayLabel: { color: '#8D9BA8', fontSize: 10, fontWeight: '700' },
  hint: { color: '#B8C4CF', fontSize: 12, lineHeight: 18, marginTop: 14 },
});
