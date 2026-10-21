import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DAILY_GOAL, entryXp } from './game';
import { displaySkill } from './mockAnalysis';
import { EntryActionButtons, EntryDeleteConfirm, EntryEditForm, EntryEditNotice } from './EntryControls';
import { useJourney } from './journey-state';
import type { Entry } from './storage';

const teal = '#166B65';
const gold = '#F5C45A';

type Props = {
  today: Entry[];
  draft: string;
  error: string;
  busy: boolean;
  disabled: boolean;
  onChangeDraft: (value: string) => void;
  onAdd: () => void;
  children?: ReactNode;
};

// Bugün sekmesinin kalbi: hızlı tek satır giriş, günlük hedef ve günün listesi.
export function TodayLog({ today, draft, error, busy, disabled, onChangeDraft, onAdd, children }: Props) {
  const done = Math.min(today.length, DAILY_GOAL);
  const skills = new Set(today.flatMap(entry => entry.awards.map(award => award.skill)));
  const xp = today.reduce((sum, entry) => sum + entryXp(entry), 0);
  const { editingId } = useJourney();
  // Bir kayda dokununca Düzenle/Sil açılır; aynı kayda tekrar dokununca kapanır.
  const [openId, setOpenId] = useState<string | null>(null);

  return <View style={s.card}>
    <View style={s.head}>
      <Text style={s.title}>Bugün ne yaptın, ne yaşadın?</Text>
      <Text style={[s.goal, today.length >= DAILY_GOAL && s.goalDone]}>{today.length >= DAILY_GOAL ? '✅ Hedef tamam' : `${done}/${DAILY_GOAL} hedef`}</Text>
    </View>
    <View style={s.segments}>
      {Array.from({ length: DAILY_GOAL }, (_, i) => <View key={i} style={[s.segment, i < done && s.segmentOn]} />)}
    </View>
    <View style={s.inputRow}>
      <TextInput
        accessibilityLabel="Bugün ne yaptın, ne yaşadın?"
        placeholder="örn. İlk kez sunum yaptım"
        placeholderTextColor="#9AA6A8"
        maxLength={200}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={onAdd}
        value={draft}
        onChangeText={onChangeDraft}
        style={s.input}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Ekle" disabled={disabled || busy || !draft.trim()} onPress={onAdd} style={[s.add, (disabled || busy || !draft.trim()) && { opacity: 0.45 }]}>
        {busy ? <ActivityIndicator color="white" /> : <Text style={s.addText}>+</Text>}
      </Pressable>
    </View>
    {error ? <Text style={s.error}>{error}</Text> : null}
    {children}
    {today.length === 0 ? <Text style={s.empty}>Henüz bir şey yok. Küçük ya da büyük, yaptığın ya da yaşadığın ilk şeyi ekle.</Text> : <>
      {today.map(entry => <View key={entry.id} style={s.itemWrap}>
        {editingId === entry.id ? <EntryEditForm entry={entry} /> : <>
          <Pressable accessibilityRole="button" accessibilityLabel={`Kayıt seçenekleri: ${entry.description}`} accessibilityState={{ expanded: openId === entry.id }} onPress={() => setOpenId(openId === entry.id ? null : entry.id)} style={s.item}>
            <Text style={s.check}>✓</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.itemText} numberOfLines={openId === entry.id ? undefined : 2}>{entry.description}</Text>
              <Text style={s.itemSkills}>{entry.awards.map(award => displaySkill(award.skill)).join(' · ')}{entry.bonusXp ? ' · 🎯 Görev' : ''}{entry.habitId ? ' · 🔁 Rutin' : ''}</Text>
            </View>
            <Text style={s.itemXp}>+{entryXp(entry)}</Text>
          </Pressable>
          {openId === entry.id ? <View style={s.itemActions}><EntryActionButtons entry={entry} /></View> : null}
          <EntryDeleteConfirm entry={entry} />
          <EntryEditNotice entry={entry} />
        </>}
      </View>)}
      <Text style={s.summary}>Bugün {today.length} şey · {skills.size} beceri · +{xp} XP</Text>
    </>}
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flexShrink: 1, marginRight: 10, color: '#182637', fontSize: 20, fontWeight: '800' },
  goal: { flexShrink: 0, color: '#8B5B00', backgroundColor: '#FFF0C2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
  goalDone: { color: teal, backgroundColor: '#DDF1E9' },
  segments: { flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 14 },
  segment: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#E2E9E4' },
  segmentOn: { backgroundColor: gold },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, height: 50, borderColor: '#D5DFDA', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, color: '#182637', fontSize: 15, backgroundColor: '#FAFBF9' },
  add: { width: 50, height: 50, borderRadius: 14, backgroundColor: teal, alignItems: 'center', justifyContent: 'center' },
  addText: { color: 'white', fontSize: 28, fontWeight: '700', marginTop: -2 },
  error: { color: '#B34242', fontSize: 12, marginTop: 8 },
  empty: { color: '#657482', fontSize: 13, lineHeight: 19, marginTop: 16 },
  itemWrap: { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#EEF2EE' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  itemActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -4 },
  check: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#DDF1E9', color: teal, textAlign: 'center', lineHeight: 26, fontSize: 14, fontWeight: '800', overflow: 'hidden' },
  itemText: { color: '#182637', fontSize: 14, fontWeight: '600', lineHeight: 19 },
  itemSkills: { color: teal, fontSize: 11, marginTop: 2 },
  itemXp: { color: '#8B5B00', fontSize: 13, fontWeight: '800' },
  summary: { color: '#657482', fontSize: 12, fontWeight: '700', marginTop: 12 },
});
