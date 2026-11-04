import { StyleSheet, Text, View } from 'react-native';
import { growingSkills, learningWeeks, newSkills, overview } from './insights';
import { displaySkill, parentPath } from './skillEngine';
import type { Entry } from './storage';

const teal = '#166B65';
const gold = '#F5C45A';
const shortDate = (iso: string) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(iso));

// Gelişim › Genel bakış: sayılar, son 30 günde en çok gelişen ve yeni keşfedilen beceriler, öğrenme düzeni.
// Hepsi kayıtlardan hesaplanır; kayıt yoksa ilgili bölüm boş durum gösterir.
export function GrowthOverview({ entries }: { entries: Entry[] }) {
  const stats = overview(entries);
  const growing = growingSkills(entries);
  const discovered = newSkills(entries).slice(0, 5);
  const weeks = learningWeeks(entries);
  const maxGrowing = Math.max(1, ...growing.map(item => item.xp));

  return <View>
    <View style={s.stats}>
      {[
        [String(stats.entries), 'kayıt'],
        [String(stats.skills), 'beceri'],
        [String(stats.last30Days), 'aktif gün (30 gün)'],
        [String(stats.longestStreak), 'en uzun seri'],
      ].map(([value, label]) => <View key={label} style={s.stat} accessibilityLabel={`${value} ${label}`}>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>)}
    </View>

    <View style={s.card}>
      <Text style={s.title}>Son 30 günde en çok gelişenler</Text>
      {growing.length ? growing.map(item => <View key={item.skill} style={s.growRow}>
        <View style={s.growHead}>
          <Text style={s.skill} numberOfLines={1}>{displaySkill(item.skill)}</Text>
          <Text style={s.value}>{`+${item.xp} XP · ${item.count} kayıt`}</Text>
        </View>
        {parentPath(item.skill) ? <Text style={s.path}>{parentPath(item.skill)}</Text> : null}
        <View style={s.track}><View style={[s.fill, { width: `${item.xp / maxGrowing * 100}%` }]} /></View>
      </View>) : <Text style={s.empty}>Son 30 günde kayıt yok. Bugün bir şey yazdığında burada görünecek.</Text>}
    </View>

    <View style={s.card}>
      <Text style={s.title}>Yeni keşfettiğin beceriler</Text>
      <Text style={s.sub}>Son 30 günde ilk kez kayda geçenler</Text>
      {discovered.length ? discovered.map(({ skill, entry }) => <View key={skill} style={s.newRow}>
        <Text style={s.spark}>✦</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.skill}>{displaySkill(skill)}</Text>
          <Text style={s.evidence} numberOfLines={2}>{`${shortDate(entry.createdAt)} · “${entry.description}”`}</Text>
        </View>
      </View>) : <Text style={s.empty}>Son 30 günde yeni bir beceri yok.</Text>}
    </View>

    <View style={s.card}>
      <Text style={s.title}>Öğrenme düzenin</Text>
      <Text style={s.sub}>Her hafta öğrenmeye zaman ayırdığın gün sayısı (öğrendiğin kavramlar, tekrarlar ve öğrenme kayıtları)</Text>
      <View style={s.weeks}>
        {weeks.map((week, index) => <View key={week.start} style={s.week} accessibilityLabel={`${shortDate(week.start)} haftası: ${week.days} gün`}>
          <View style={s.weekBarBox}><View style={[s.weekBar, { height: `${week.days / 7 * 100}%` }, !week.days && s.weekBarEmpty]} /></View>
          <Text style={s.weekDays}>{week.days}/7</Text>
          <Text style={s.weekLabel}>{index === weeks.length - 1 ? 'Bu hafta' : shortDate(week.start)}</Text>
        </View>)}
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  stat: { flexGrow: 1, flexBasis: '45%', backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  statValue: { color: '#182637', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#657482', fontSize: 11, fontWeight: '700', marginTop: 2 },
  card: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 21, padding: 18, marginBottom: 16 },
  title: { color: '#182637', fontSize: 16, fontWeight: '800' },
  sub: { color: '#657482', fontSize: 11, lineHeight: 16, marginTop: 3 },
  growRow: { marginTop: 12 },
  growHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  skill: { color: '#182637', fontSize: 14, fontWeight: '800', flexShrink: 1 },
  value: { color: teal, fontSize: 12, fontWeight: '800' },
  path: { color: '#657482', fontSize: 11, marginTop: 1 },
  track: { height: 6, borderRadius: 4, backgroundColor: '#E2E9E4', overflow: 'hidden', marginTop: 6 },
  fill: { height: 6, backgroundColor: teal },
  newRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  spark: { color: '#8B5B00', fontSize: 16, marginTop: 1 },
  evidence: { color: '#657482', fontSize: 12, lineHeight: 17, marginTop: 2 },
  empty: { color: '#657482', fontSize: 12, lineHeight: 18, marginTop: 10 },
  weeks: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 14 },
  week: { flex: 1, alignItems: 'center' },
  weekBarBox: { height: 64, width: 26, borderRadius: 8, backgroundColor: '#F1F4F1', justifyContent: 'flex-end', overflow: 'hidden' },
  weekBar: { width: '100%', backgroundColor: gold, borderRadius: 8 },
  weekBarEmpty: { height: 0 },
  weekDays: { color: '#182637', fontSize: 12, fontWeight: '800', marginTop: 6 },
  weekLabel: { color: '#657482', fontSize: 10, marginTop: 2 },
});
