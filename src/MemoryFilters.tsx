import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dateRanges, type DateRange } from './insights';
import { displaySkill } from './skillEngine';

const teal = '#166B65';

type Props = {
  range: DateRange;
  domain: string | null;
  skill: string | null;
  domains: string[];
  skills: string[];
  onRange: (range: DateRange) => void;
  onDomain: (domain: string | null) => void;
  onSkill: (skill: string | null) => void;
};

// Anılar: tarih aralığı, alan ve beceri filtreleri. Seçenekler yalnız kayıtlarda geçenlerdir; satırlar yatay kayar.
export function MemoryFilters({ range, domain, skill, domains, skills, onRange, onDomain, onSkill }: Props) {
  const chip = (label: string, selected: boolean, onPress: () => void) => <Pressable key={label} accessibilityRole="radio"
    accessibilityState={{ selected }} aria-checked={selected} onPress={onPress} style={[s.chip, selected && s.chipOn]}>
    <Text style={[s.chipText, selected && s.chipTextOn]}>{label}</Text>
  </Pressable>;
  const row = (title: string, children: ReactNode[]) => <View style={s.group}>
    <Text style={s.label}>{title}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>{children}</ScrollView>
  </View>;

  return <View style={s.wrap}>
    {row('TARİH', dateRanges.map(item => chip(item.label, range === item.key, () => onRange(item.key))))}
    {domains.length > 1 ? row('ALAN', [chip('Tümü', !domain, () => onDomain(null)), ...domains.map(item => chip(item, domain === item, () => onDomain(domain === item ? null : item)))]) : null}
    {skills.length > 1 ? row('BECERİ', [chip('Tümü', !skill, () => onSkill(null)), ...skills.map(item => chip(displaySkill(item), skill === item, () => onSkill(skill === item ? null : item)))]) : null}
  </View>;
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  group: { marginBottom: 8 },
  label: { color: '#657482', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6 },
  row: { gap: 6, paddingRight: 8 },
  chip: { borderRadius: 14, borderWidth: 1, borderColor: '#D5DFDA', backgroundColor: 'white', paddingHorizontal: 11, paddingVertical: 7 },
  chipOn: { backgroundColor: teal, borderColor: teal },
  chipText: { color: '#3D4B58', fontSize: 12, fontWeight: '700' },
  chipTextOn: { color: 'white' },
});
