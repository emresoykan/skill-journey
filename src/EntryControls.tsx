import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { entryXp } from './game';
import { useJourney } from './journey-state';
import type { Entry } from './storage';

const teal = '#166B65';

// Bugün ve Anılar sekmelerindeki kayıtların ortak düzenleme/silme parçaları.

export function EntryEditForm({ entry }: { entry: Entry }) {
  const { busy, editDraft, setEditDraft, editError, setEditError, cancelEditing, saveEdit } = useJourney();
  return <View>
    <TextInput
      accessibilityLabel="Kaydı düzenle"
      multiline
      maxLength={1000}
      style={s.editInput}
      textAlignVertical="top"
      value={editDraft}
      onChangeText={value => { setEditDraft(value); setEditError(''); }}
    />
    <Text style={s.muted}>{`${editDraft.length}/1000 · Düzenleme becerileri yeniler ama XP'yi artırmaz.`}</Text>
    {editError ? <Text style={s.error}>{editError}</Text> : null}
    <View style={s.actions}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={cancelEditing}><Text style={s.cancel}>Vazgeç</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => saveEdit(entry.id)}><Text style={s.primary}>Kaydet</Text></Pressable>
    </View>
  </View>;
}

export function EntryActionButtons({ entry }: { entry: Entry }) {
  const { busy, startEditing, setConfirmDeleteId } = useJourney();
  return <View style={s.buttons}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Kaydı düzenle: ${entry.description}`} disabled={busy} onPress={() => startEditing(entry)}>
      <Text style={s.primary}>Düzenle</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Kaydı sil: ${entry.description}`} disabled={busy} onPress={() => setConfirmDeleteId(entry.id)}>
      <Text style={s.danger}>Sil</Text>
    </Pressable>
  </View>;
}

export function EntryDeleteConfirm({ entry }: { entry: Entry }) {
  const { busy, confirmDeleteId, setConfirmDeleteId, deleteMoment } = useJourney();
  if (confirmDeleteId !== entry.id) return null;
  return <View style={s.confirmBox}>
    <Text style={s.confirmText}>Bu kaydı silmek istiyor musun? Kazanılan {entryXp(entry)} XP de düşecek.</Text>
    <View style={s.actions}>
      <Pressable accessibilityRole="button" onPress={() => setConfirmDeleteId(null)}><Text style={s.cancel}>Vazgeç</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => deleteMoment(entry.id)}><Text style={s.danger}>Evet, sil</Text></Pressable>
    </View>
  </View>;
}

// Düzenlemeden sonra becerilerin ve XP'nin nasıl değiştiğini açıkça gösterir.
export function EntryEditNotice({ entry }: { entry: Entry }) {
  const { editNotice } = useJourney();
  if (editNotice?.id !== entry.id) return null;
  return <Text style={s.notice}>{editNotice.text}</Text>;
}

const s = StyleSheet.create({
  editInput: { minHeight: 85, marginTop: 8, marginBottom: 8, borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 10, padding: 10, color: '#182637', fontSize: 15, lineHeight: 22 },
  muted: { color: '#657482', fontSize: 11 },
  error: { color: '#B34242', fontSize: 12, marginTop: 6 },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 15, marginTop: 8 },
  primary: { color: teal, fontSize: 12, fontWeight: '800', padding: 6 },
  danger: { color: '#A33D3D', fontSize: 12, fontWeight: '800', padding: 6 },
  cancel: { color: '#657482', fontSize: 12, fontWeight: '700', padding: 6 },
  confirmBox: { backgroundColor: '#FFF5F3', borderRadius: 12, padding: 12, marginTop: 10 },
  confirmText: { color: '#6E3C37', fontSize: 12, lineHeight: 18 },
  notice: { color: '#664708', backgroundColor: '#FCEBB5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12, fontWeight: '700', marginTop: 8, overflow: 'hidden' },
});
