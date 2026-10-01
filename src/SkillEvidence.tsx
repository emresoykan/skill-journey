import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { availableSkills, displaySkill } from './mockAnalysis';
import type { Entry } from './storage';

const teal = '#166B65';
const level = (xp: number) => Math.floor(xp / 100) + 1;

type Props = {
  entries: Entry[];
  busy: boolean;
  onCorrectAward: (entryId: string, fromSkill: string, toSkill: string) => Promise<void>;
};

export function SkillEvidence({ entries, busy, onCorrectAward }: Props) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const totals = Object.entries(entries.reduce<Record<string, number>>((result, entry) => {
    for (const award of entry.awards) result[award.skill] = (result[award.skill] ?? 0) + award.xp;
    return result;
  }, {})).sort((a, b) => b[1] - a[1]);
  const evidence = selectedSkill
    ? entries.filter(entry => entry.awards.some(award => award.skill === selectedSkill))
    : [];

  async function chooseSkill(entryId: string, toSkill: string) {
    if (!selectedSkill || saving) return;
    setSaving(true);
    setError('');
    try {
      await onCorrectAward(entryId, selectedSkill, toSkill);
      setSelectedSkill(toSkill);
      setCorrectingId(null);
    } catch {
      setError('Beceri düzeltilemedi. Lütfen tekrar dene.');
    } finally {
      setSaving(false);
    }
  }

  if (totals.length === 0) {
    return <Text style={s.empty}>İlk anını kaydettiğinde becerilerin burada görünecek.</Text>;
  }

  return <View style={s.card}>
    <Text style={s.hint}>Bir beceriye dokun, hangi deneyimlerden geldiğini gör.</Text>
    {totals.map(([skill, xp]) => {
      const count = entries.filter(entry => entry.awards.some(award => award.skill === skill)).length;
      return <Pressable
        key={skill}
        accessibilityRole="button"
        accessibilityState={{ expanded: selectedSkill === skill }}
        onPress={() => { setSelectedSkill(selectedSkill === skill ? null : skill); setCorrectingId(null); setError(''); }}
        style={[s.skillItem, selectedSkill === skill && s.selectedSkill]}
      >
        <View style={s.row}>
          <Text style={s.skillName}>{displaySkill(skill)}</Text>
          <Text style={s.skillLevel}>Seviye {level(xp)}</Text>
        </View>
        <View style={s.track}><View style={[s.fill, { width: `${xp % 100}%` }]} /></View>
        <Text style={s.meta}>{xp} XP · {count} deneyim · Sonraki seviyeye {100 - xp % 100} XP</Text>
      </Pressable>;
    })}
    {selectedSkill && evidence.length > 0 ? <View style={s.evidencePanel}>
      <Text style={s.evidenceTitle}>{displaySkill(selectedSkill)} nasıl kazanıldı?</Text>
      {evidence.map(entry => {
        const award = entry.awards.find(item => item.skill === selectedSkill)!;
        return <View key={entry.id} style={s.evidenceItem}>
          <View style={s.row}>
            <Text style={s.date}>{new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(entry.createdAt))}</Text>
            <Text style={s.evidenceXp}>+{award.xp} XP</Text>
          </View>
          <Text style={s.description}>{entry.description}</Text>
          {correctingId === entry.id ? <View>
            <Text style={s.chooseTitle}>Bu deneyim hangi beceriye ait?</Text>
            <View style={s.options}>
              {availableSkills.filter(skill => skill !== selectedSkill).map(skill => (
                <Pressable key={skill} accessibilityRole="button" disabled={busy || saving} onPress={() => chooseSkill(entry.id, skill)} style={s.option}>
                  <Text style={s.optionText}>{displaySkill(skill)}</Text>
                </Pressable>
              ))}
            </View>
            {error ? <Text style={s.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" onPress={() => { setCorrectingId(null); setError(''); }}>
              <Text style={s.cancel}>Vazgeç</Text>
            </Pressable>
          </View> : <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setCorrectingId(entry.id); setError(''); }}>
            <Text style={s.correct}>Beceriyi düzelt</Text>
          </Pressable>}
        </View>;
      })}
    </View> : null}
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 21, padding: 18, marginBottom: 26 },
  hint: { color: '#657482', fontSize: 12, marginBottom: 14 },
  empty: { color: '#657482', fontSize: 12, marginBottom: 26 },
  skillItem: { borderRadius: 12, padding: 10, marginBottom: 7, backgroundColor: '#F7FAF8' },
  selectedSkill: { backgroundColor: '#E8F5EF' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  skillName: { color: '#182637', fontSize: 14, fontWeight: '800' },
  skillLevel: { color: teal, fontSize: 12, fontWeight: '800' },
  track: { height: 7, borderRadius: 7, backgroundColor: '#DDECE5', overflow: 'hidden', marginTop: 9, marginBottom: 6 },
  fill: { height: 7, backgroundColor: teal },
  meta: { color: '#657482', fontSize: 11 },
  evidencePanel: { borderTopWidth: 1, borderTopColor: '#E2E9E4', marginTop: 10, paddingTop: 15 },
  evidenceTitle: { color: '#182637', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  evidenceItem: { borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  date: { color: '#657482', fontSize: 11 },
  evidenceXp: { color: teal, fontSize: 12, fontWeight: '800' },
  description: { color: '#182637', fontSize: 12, lineHeight: 18, marginTop: 8 },
  correct: { color: teal, fontSize: 11, fontWeight: '800', marginTop: 9, paddingVertical: 4 },
  chooseTitle: { color: '#182637', fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: { borderColor: '#BEDDD1', borderWidth: 1, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6 },
  optionText: { color: teal, fontSize: 11, fontWeight: '700' },
  error: { color: '#B34242', fontSize: 11, marginTop: 8 },
  cancel: { color: '#657482', fontSize: 11, fontWeight: '700', marginTop: 10, paddingVertical: 4 },
});
