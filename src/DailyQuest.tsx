import { StyleSheet, Text, View } from 'react-native';
import type { Quest } from './game';

export function DailyQuest({ quest, done }: { quest: Quest; done: boolean }) {
  return <View style={[s.card, done && s.cardDone]}>
    <Text style={s.icon}>{done ? '✅' : '🎯'}</Text>
    <View style={{ flex: 1 }}>
      <View style={s.row}>
        <Text style={s.eyebrow}>GÜNÜN GÖREVİ</Text>
        <Text style={[s.bonus, done && s.bonusDone]}>+{quest.bonus} XP</Text>
      </View>
      <Text style={s.title}>{quest.title}</Text>
      <Text style={s.hint}>{done ? 'Görev tamamlandı! Yarın yeni bir görev seni bekliyor.' : quest.hint}</Text>
    </View>
  </View>;
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, backgroundColor: '#FFF7DF', borderColor: '#F3D990', borderWidth: 1, borderRadius: 21, padding: 16, marginBottom: 24 },
  cardDone: { backgroundColor: '#E7F5EE', borderColor: '#BEDDD1' },
  icon: { fontSize: 30, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#8B5B00', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  bonus: { color: '#664708', backgroundColor: '#F5C45A', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  bonusDone: { color: '#166B65', backgroundColor: '#BEDDD1' },
  title: { color: '#182637', fontSize: 16, fontWeight: '800', marginTop: 6 },
  hint: { color: '#657482', fontSize: 12, lineHeight: 18, marginTop: 4 },
});
