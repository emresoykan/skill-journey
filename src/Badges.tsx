import { StyleSheet, Text, View } from 'react-native';
import { badgeProgress } from './game';
import type { Entry } from './storage';

export function Badges({ entries }: { entries: Entry[] }) {
  const list = badgeProgress(entries);
  const unlocked = list.filter(badge => badge.unlocked).length;
  return <View style={{ marginBottom: 26 }}>
    <View style={s.head}><Text style={s.section}>Rozetler</Text><Text style={s.count}>{unlocked} / {list.length}</Text></View>
    <View style={s.grid}>
      {list.map(badge => <View key={badge.id} style={[s.badge, !badge.unlocked && s.locked]} accessibilityLabel={`${badge.title}: ${badge.description}${badge.unlocked ? ', kazanıldı' : `, ${badge.current}/${badge.goal}`}`}>
        <Text style={[s.icon, !badge.unlocked && { opacity: 0.3 }]}>{badge.unlocked ? badge.icon : '🔒'}</Text>
        <Text style={s.title} numberOfLines={1}>{badge.title}</Text>
        <Text style={s.desc} numberOfLines={2}>{badge.description}</Text>
        {!badge.unlocked ? <View style={s.track}><View style={[s.fill, { width: `${badge.current / badge.goal * 100}%` }]} /></View> : null}
      </View>)}
    </View>
  </View>;
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  section: { color: '#182637', fontSize: 20, fontWeight: '800' },
  count: { color: '#8B5B00', backgroundColor: '#FFF0C2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '30%', flexGrow: 1, backgroundColor: '#FFF7DF', borderColor: '#F3D990', borderWidth: 1, borderRadius: 18, padding: 12, alignItems: 'center' },
  locked: { backgroundColor: 'white', borderColor: '#E2E9E4' },
  icon: { fontSize: 30 },
  title: { color: '#182637', fontSize: 12, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  desc: { color: '#657482', fontSize: 10, lineHeight: 14, marginTop: 3, textAlign: 'center', minHeight: 28 },
  track: { alignSelf: 'stretch', height: 5, borderRadius: 4, backgroundColor: '#E2E9E4', overflow: 'hidden', marginTop: 7 },
  fill: { height: 5, backgroundColor: '#F5C45A' },
});
