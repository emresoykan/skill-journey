import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useJourney } from './journey-state';
import { confidenceLabel, DEPTH_XP, depthLabels, displaySkill, parentPath } from './skillEngine';
import { SkillPicker } from './SkillPicker';
import type { Entry } from './storage';

const teal = '#166B65';

// "Neden bu beceriler?": her becerinin dayanağı (metindeki kelimeler), güveni, gerekçesi ve XP'si.
// Kullanıcı öneriyi kabul eder (dokunmaz), çıkarır ya da başka bir beceriyle değiştirir.
export function SkillExplain({ entry }: { entry: Entry }) {
  const { busy, correctAward, rejectAward } = useJourney();
  const [changing, setChanging] = useState<string | null>(null);
  const [error, setError] = useState('');
  const suggestions = entry.suggestions ?? [];
  const suggested = new Set(suggestions.map(item => item.skill));
  // Kullanıcının sonradan seçtiği beceriler öneri listesinde yoktur.
  const chosen = entry.awards.filter(award => !suggested.has(award.skill));
  const xpOf = (skill: string) => entry.awards.find(award => award.skill === skill)?.xp;

  async function run(action: () => Promise<void>) {
    setError('');
    try { await action(); setChanging(null); } catch (cause) { setError(cause instanceof Error ? cause.message : 'İşlem yapılamadı.'); }
  }

  const actions = (skill: string) => <View style={s.actions}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${displaySkill(skill)} becerisini değiştir`} disabled={busy} onPress={() => { setChanging(changing === skill ? null : skill); setError(''); }}>
      <Text style={s.link}>Değiştir</Text>
    </Pressable>
    {entry.awards.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`${displaySkill(skill)} becerisini çıkar`} disabled={busy} onPress={() => run(() => rejectAward(entry.id, skill))}>
      <Text style={s.danger}>Çıkar</Text>
    </Pressable> : null}
  </View>;

  return <View style={s.wrap}>
    {entry.depth ? <Text style={s.depth}>
      {`Derinlik: ${depthLabels[entry.depth]}${entry.depthEvidence ? ` (“${entry.depthEvidence}”)` : ''} · temel puan ${DEPTH_XP[entry.depth]} XP`}
    </Text> : null}
    {entry.xpNote ? <Text style={s.note}>{entry.xpNote}</Text> : null}
    {suggestions.map(item => {
      const xp = xpOf(item.skill);
      const active = xp !== undefined;
      const path = parentPath(item.skill);
      return <View key={item.skill} style={[s.row, !active && s.rowOff]}>
        <View style={s.head}>
          <Text style={[s.skill, !active && s.skillOff]}>{displaySkill(item.skill)}</Text>
          <Text style={s.xp}>{active ? `+${xp} XP` : 'kayıtta yok'}</Text>
        </View>
        {path ? <Text style={s.path}>{path}</Text> : null}
        <Text style={s.meta}>
          {`Güven: ${confidenceLabel(item.confidence)}`}{item.evidence.length ? ` · Dayanak: ${item.evidence.map(word => `“${word}”`).join(', ')}` : ''}
        </Text>
        <Text style={s.rationale}>{item.rationale}</Text>
        {active ? actions(item.skill) : null}
        {changing === item.skill ? <SkillPicker exclude={entry.awards.map(award => award.skill)} disabled={busy} onCancel={() => setChanging(null)} onPick={to => run(() => correctAward(entry.id, item.skill, to))} /> : null}
      </View>;
    })}
    {chosen.map(award => <View key={award.skill} style={s.row}>
      <View style={s.head}>
        <Text style={s.skill}>{displaySkill(award.skill)}</Text>
        <Text style={s.xp}>+{award.xp} XP</Text>
      </View>
      <Text style={s.meta}>Senin seçimin</Text>
      {actions(award.skill)}
      {changing === award.skill ? <SkillPicker exclude={entry.awards.map(item => item.skill)} disabled={busy} onCancel={() => setChanging(null)} onPick={to => run(() => correctAward(entry.id, award.skill, to))} /> : null}
    </View>)}
    {error ? <Text style={s.error}>{error}</Text> : null}
    <Text style={s.disclaimer}>Öneriler yazdığın kelimelere dayanır ve cihazında yerel kurallarla üretilir; yapay zekâ değildir ve uzmanlığını doğrulamaz.</Text>
  </View>;
}

const s = StyleSheet.create({
  wrap: { marginTop: 10 },
  depth: { color: '#664708', fontSize: 12, fontWeight: '700', lineHeight: 17, marginBottom: 6 },
  note: { color: '#8B5B00', fontSize: 12, lineHeight: 17, marginBottom: 6 },
  row: { borderTopWidth: 1, borderTopColor: '#F1E5C9', paddingVertical: 9 },
  rowOff: { opacity: 0.55 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  skill: { color: '#182637', fontSize: 14, fontWeight: '800', flexShrink: 1 },
  skillOff: { textDecorationLine: 'line-through' },
  xp: { color: teal, fontSize: 13, fontWeight: '800' },
  path: { color: '#657482', fontSize: 11, marginTop: 1 },
  meta: { color: '#657482', fontSize: 11, lineHeight: 16, marginTop: 4 },
  rationale: { color: '#3D4B58', fontSize: 12, lineHeight: 17, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 6 },
  link: { color: teal, fontSize: 12, fontWeight: '800', paddingVertical: 4 },
  danger: { color: '#A33D3D', fontSize: 12, fontWeight: '800', paddingVertical: 4 },
  error: { color: '#B34242', fontSize: 12, marginTop: 6 },
  disclaimer: { color: '#8A969E', fontSize: 10, lineHeight: 14, marginTop: 8 },
});
