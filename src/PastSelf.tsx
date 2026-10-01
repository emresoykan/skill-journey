import { StyleSheet, Text, View } from 'react-native';
import { displaySkill } from './mockAnalysis';
import { findPastSelfPair } from './pastSelfPair';
import type { Entry } from './storage';

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

export function PastSelf({ entries }: { entries: Entry[] }) {
  const pair = findPastSelfPair(entries);

  return <View style={s.card}>
    <Text style={s.eyebrow}>GEÇMİŞTEKİ BEN</Text>
    <Text style={s.title}>İki gerçek anın, yan yana.</Text>
    {pair ? <>
      <Text style={s.subtitle}>{displaySkill(pair.skill)} ile ilgili {pair.daysApart} gün arayla yazdığın kayıtlar</Text>
      <View style={s.columns}>
        <View style={s.moment}>
          <Text style={s.tag}>ÖNCE</Text>
          <Text style={s.date}>{dateLabel(pair.earlier.createdAt)}</Text>
          <Text style={s.description}>{pair.earlier.description}</Text>
        </View>
        <View style={s.moment}>
          <Text style={s.tag}>SONRA</Text>
          <Text style={s.date}>{dateLabel(pair.later.createdAt)}</Text>
          <Text style={s.description}>{pair.later.description}</Text>
        </View>
      </View>
      <Text style={s.prompt}>Bu iki an arasında sende ne değişti?</Text>
    </> : <Text style={s.empty}>Aynı beceriyle ilgili en az bir hafta arayla iki deneyim kaydettiğinde karşılaştırman burada görünecek.</Text>}
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: '#E8F4F2', borderRadius: 21, padding: 18, marginBottom: 26 },
  eyebrow: { color: '#166B65', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 7 },
  title: { color: '#182637', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#657482', fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 15 },
  columns: { flexDirection: 'row', gap: 9 },
  moment: { flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 12 },
  tag: { color: '#166B65', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  date: { color: '#657482', fontSize: 10, marginTop: 4 },
  description: { color: '#182637', fontSize: 12, lineHeight: 18, marginTop: 10 },
  prompt: { color: '#166B65', fontSize: 12, fontWeight: '700', marginTop: 15 },
  empty: { color: '#657482', fontSize: 12, lineHeight: 18, marginTop: 10 },
});
