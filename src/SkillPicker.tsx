import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { catalog, customSkillName, displaySkill, domains, type Domain } from './skillEngine';

const teal = '#166B65';

type Props = {
  exclude: string[];
  disabled?: boolean;
  onPick: (skill: string) => void;
  onCancel: () => void;
};

// Beceri seçici: katalog alanlara göre gruplanır; listede olmayan beceri elle yazılabilir.
export function SkillPicker({ exclude, disabled, onPick, onCancel }: Props) {
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const groups = (Object.keys(domains) as Domain[]).map(domain => ({
    domain,
    skills: catalog.filter(skill => skill.domain === domain && !exclude.includes(skill.id)),
  })).filter(group => group.skills.length);

  function addCustom() {
    const skill = customSkillName(custom);
    if (!skill) { setError('Beceri adı 1–40 karakter olmalı.'); return; }
    if (exclude.includes(skill)) { setError('Bu beceri zaten kayıtta.'); return; }
    onPick(skill);
  }

  return <View style={s.wrap}>
    <Text style={s.title}>Bu deneyim hangi beceriye ait?</Text>
    {groups.map(group => <View key={group.domain} style={s.group}>
      <Text style={s.domain}>{domains[group.domain].toLocaleUpperCase('tr-TR')}</Text>
      <View style={s.options}>
        {group.skills.map(skill => <Pressable key={skill.id} accessibilityRole="button" disabled={disabled} onPress={() => onPick(skill.id)} style={s.option}>
          <Text style={s.optionText}>{displaySkill(skill.id)}</Text>
        </Pressable>)}
      </View>
    </View>)}
    <Text style={s.domain}>LİSTEDE YOKSA KENDİN YAZ</Text>
    <View style={s.customRow}>
      <TextInput
        accessibilityLabel="Kendi beceri adın"
        placeholder="örn. Satranç"
        placeholderTextColor="#9AA6A8"
        maxLength={40}
        value={custom}
        onChangeText={value => { setCustom(value); setError(''); }}
        onSubmitEditing={addCustom}
        style={s.input}
      />
      <Pressable accessibilityRole="button" disabled={disabled || !custom.trim()} onPress={addCustom} style={[s.add, (disabled || !custom.trim()) && { opacity: 0.45 }]}>
        <Text style={s.addText}>Seç</Text>
      </Pressable>
    </View>
    {error ? <Text style={s.error}>{error}</Text> : null}
    <Pressable accessibilityRole="button" onPress={onCancel}><Text style={s.cancel}>Vazgeç</Text></Pressable>
  </View>;
}

const s = StyleSheet.create({
  wrap: { borderTopWidth: 1, borderTopColor: '#E2E9E4', marginTop: 10, paddingTop: 10 },
  title: { color: '#182637', fontSize: 13, fontWeight: '800', marginBottom: 6 },
  group: { marginBottom: 4 },
  domain: { color: '#657482', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginTop: 8, marginBottom: 6 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: { borderColor: '#BEDDD1', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'white' },
  optionText: { color: teal, fontSize: 12, fontWeight: '700' },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, minWidth: 0, height: 40, borderColor: '#D5DFDA', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, color: '#182637', fontSize: 14, backgroundColor: 'white' },
  add: { height: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: teal, alignItems: 'center', justifyContent: 'center' },
  addText: { color: 'white', fontSize: 13, fontWeight: '800' },
  error: { color: '#B34242', fontSize: 11, marginTop: 6 },
  cancel: { color: '#657482', fontSize: 12, fontWeight: '700', marginTop: 10, paddingVertical: 4 },
});
