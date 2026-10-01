import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { displaySkill } from './mockAnalysis';
import { ProgressChart } from './ProgressChart';
import { SkillEvidence } from './SkillEvidence';
import { PastSelf } from './PastSelf';
import { useJourney } from './journey-state';
import { entryXp, level } from './game';
import { PlayerCard } from './PlayerCard';
import { DailyQuest } from './DailyQuest';
import { RewardCard } from './RewardCard';
import { Badges } from './Badges';
import { Confetti } from './Confetti';
import { setSoundEnabled, useSoundEnabled } from './sounds';
const teal = '#166B65';
export function JourneyScreen({ section }: { section: 'today' | 'growth' | 'memories' }) {
  const { entries,draft,setDraft,reward,quest,questDone,streak,busy,loading,error,setError,timelineError,confirmDeleteId,setConfirmDeleteId,editingId,editDraft,setEditDraft,editError,setEditError,totalXp,skillTotals,addMoment,deleteMoment,startEditing,cancelEditing,saveEdit,correctAward } = useJourney();
  const soundOn = useSoundEnabled();
  const [query, setQuery] = useState('');
  const terms = query.trim().toLocaleLowerCase('tr-TR').split(/\s+/).filter(Boolean);
  const visibleEntries = entries.filter(entry => {
    const haystack = [entry.description, ...entry.awards.map(award => displaySkill(award.skill))].join(' ').toLocaleLowerCase('tr-TR');
    return terms.every(term => haystack.includes(term));
  });
  return <View style={s.safe}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <View style={s.header}><Text style={s.brand}>✦  skill journey</Text><View style={s.headerRight}>
          <Pressable accessibilityRole="button" accessibilityLabel={soundOn ? 'Sesi kapat' : 'Sesi aç'} hitSlop={8} onPress={() => setSoundEnabled(!soundOn)} style={s.soundButton}><Text style={s.soundIcon}>{soundOn ? '🔊' : '🔇'}</Text></Pressable>
          <Text style={s.levelPill}>SEVİYE {level(totalXp)}</Text>
        </View></View>
        {section === 'growth' ? <>
        <PlayerCard totalXp={totalXp} streak={streak} />
        {!loading ? <Badges entries={entries} /> : null}
        {!loading ? <ProgressChart entries={entries} /> : null}
        </> : null}
        {section === 'today' ? <>
        <PlayerCard totalXp={totalXp} streak={streak} />
        {!loading ? <DailyQuest quest={quest} done={questDone} /> : null}
        <Text style={s.section}>Bugün ne yaşadın?</Text>
        <Text style={[s.muted, { marginBottom: 18 }]}>Küçük bir anını yaz, geliştirdiğin becerileri keşfet.</Text>
        <View style={s.card}>
          <Text style={s.label}>Bugün ne oldu?</Text>
          <TextInput accessibilityLabel="Bugün ne oldu?" multiline maxLength={1000} placeholder="Bugün yeni bir şey öğrendim..." placeholderTextColor="#9AA6A8" style={s.input} textAlignVertical="top" value={draft} onChangeText={v => { setDraft(v); setError(''); }} />
          <View style={s.inputFoot}><Text style={s.muted}>Her deneyim değerli.</Text><Text style={s.muted}>{draft.length}/1000</Text></View>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={busy || loading} onPress={addMoment} style={[s.button, (busy || loading) && { opacity: 0.7 }]}>{busy ? <ActivityIndicator color="white" /> : <Text style={s.buttonText}>⚡  Anını kaydet, XP kazan</Text>}</Pressable>
          <Text style={s.note}>Örnek analiz · hesap veya API anahtarı gerekmez</Text>
        </View>
        {reward ? <RewardCard key={reward.id} reward={reward} /> : null}
        </> : null}
        {section === 'growth' ? <>
        <View style={s.row}><Text style={s.section}>Beceri ağacın</Text><Text style={s.muted}>{skillTotals.length} beceri · {entries.length} kayıt</Text></View>
        <SkillEvidence entries={entries} busy={busy} onCorrectAward={correctAward} />
        </> : null}
        {section === 'memories' ? <>
        <Text style={s.section}>Anılarını bul</Text>
        <TextInput accessibilityLabel="Anılarda ara" placeholder="Deneyim veya beceri ara..." placeholderTextColor="#657482" value={query} onChangeText={setQuery} style={[s.editInput, { minHeight: 48, fontSize: 15, color: '#182637', backgroundColor: 'white', marginBottom: 12 }]} />
        {query ? <Pressable accessibilityRole="button" onPress={() => setQuery('')}><Text style={[s.editText, { marginBottom: 12 }]}>Aramayı temizle · {visibleEntries.length} kayıt bulundu</Text></Pressable> : null}
        {!loading && !query ? <PastSelf entries={entries} /> : null}
        <Text style={s.section}>Zaman çizelgesi</Text>
        {timelineError ? <Text style={s.error}>{timelineError}</Text> : null}
        {loading ? <ActivityIndicator color={teal} /> : visibleEntries.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>✧</Text>
            <Text style={s.emptyTitle}>{query ? 'Eşleşen anı bulunamadı' : 'Hikâyen burada başlıyor'}</Text>
            <Text style={s.emptyText}>{query ? 'Başka bir kelimeyle aramayı deneyebilirsin.' : 'Bugün sekmesinden ilk deneyimini ekle.'}</Text>
          </View>
        ) : visibleEntries.map(entry => (
          <View key={entry.id} style={s.timeline}>
            <View style={s.dot} />
            <View style={[s.card, { flex: 1, marginBottom: 0 }]}>
              <View style={s.row}>
                <Text style={s.label}>{displaySkill(entry.skill)}</Text>
                <Text style={s.muted}>{new Intl.DateTimeFormat('tr-TR', { month: 'short', day: 'numeric' }).format(new Date(entry.createdAt))}</Text>
              </View>
              {editingId === entry.id ? (
                <View>
                  <TextInput
                    accessibilityLabel="Kaydı düzenle"
                    multiline
                    maxLength={1000}
                    style={[s.input, s.editInput]}
                    textAlignVertical="top"
                    value={editDraft}
                    onChangeText={value => { setEditDraft(value); setEditError(''); }}
                  />
                  <Text style={s.muted}>{editDraft.length}/1000</Text>
                  {editError ? <Text style={s.error}>{editError}</Text> : null}
                  <View style={s.confirmActions}>
                    <Pressable accessibilityRole="button" disabled={busy} onPress={cancelEditing}>
                      <Text style={s.cancelText}>Vazgeç</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={busy} onPress={() => saveEdit(entry.id)}>
                      <Text style={s.saveText}>Kaydet</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={s.description}>{entry.description}</Text>
                  <Text style={s.awardSummary}>{entry.awards.map(award => `${displaySkill(award.skill)} +${award.xp}`).join(' · ')}{entry.bonusXp ? ` · 🎯 Görev +${entry.bonusXp}` : ''}</Text>
                  <View style={s.entryFoot}>
                    <Text style={s.timelineXp}>+{entryXp(entry)} XP</Text>
                    <View style={s.entryActions}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Kaydı düzenle: ${entry.description}`} disabled={busy} onPress={() => startEditing(entry)}>
                        <Text style={s.editText}>Düzenle</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Kaydı sil: ${entry.description}`} disabled={busy} onPress={() => setConfirmDeleteId(entry.id)}>
                        <Text style={s.deleteText}>Sil</Text>
                      </Pressable>
                    </View>
                  </View>
                  {confirmDeleteId === entry.id ? (
                    <View style={s.confirmBox}>
                      <Text style={s.confirmText}>Bu kaydı silmek istiyor musun? Kazanılan {entryXp(entry)} XP de düşecek.</Text>
                      <View style={s.confirmActions}>
                        <Pressable accessibilityRole="button" onPress={() => setConfirmDeleteId(null)}><Text style={s.cancelText}>Vazgeç</Text></Pressable>
                        <Pressable accessibilityRole="button" disabled={busy} onPress={() => deleteMoment(entry.id)}><Text style={s.deleteText}>Evet, sil</Text></Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        ))}
        </> : null}
        <Text style={s.footer}>Her gün biraz daha ileri. ✦</Text>
      </ScrollView>
    </KeyboardAvoidingView>
    {section === 'today' && reward && !reward.leveledUp ? <Confetti burstKey={reward.id} /> : null}
  </View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8F4' }, page: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 22, paddingBottom: 55 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }, headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 }, soundButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2EE', alignItems: 'center', justifyContent: 'center' }, soundIcon: { fontSize: 16 }, brand: { color: '#182637', fontSize: 19, fontWeight: '800' }, levelPill: { color: teal, backgroundColor: '#DDF1E9', padding: 9, borderRadius: 16, fontSize: 11, fontWeight: '800' },
  hero: { backgroundColor: '#DDF1E9', borderRadius: 26, padding: 24, marginBottom: 26 }, eyebrow: { color: teal, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 }, title: { color: '#182637', fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -1 }, sub: { color: '#657482', fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 22 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, progressLabel: { color: teal, fontSize: 12, fontWeight: '800', marginBottom: 9 }, track: { backgroundColor: '#BEDDD1', height: 9, borderRadius: 9, overflow: 'hidden' }, fill: { backgroundColor: teal, height: 9 }, foot: { color: '#657482', fontSize: 11, marginTop: 9 },
  section: { color: '#182637', fontSize: 20, fontWeight: '800', marginBottom: 12 }, card: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 21, padding: 18, marginBottom: 24 }, label: { color: '#182637', fontSize: 14, fontWeight: '800' }, input: { minHeight: 115, marginTop: 13, color: '#182637', fontSize: 15, lineHeight: 22, padding: 0 }, inputFoot: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E9E4', paddingTop: 12, marginTop: 8, marginBottom: 14 }, muted: { color: '#657482', fontSize: 11 }, error: { color: '#B34242', fontSize: 12, marginBottom: 10 }, button: { backgroundColor: teal, borderRadius: 14, height: 49, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: 'white', fontSize: 14, fontWeight: '800' }, note: { textAlign: 'center', color: '#657482', fontSize: 10, marginTop: 11 },
  result: { backgroundColor: '#FFF7DF', borderColor: '#F3D990', borderWidth: 1, borderRadius: 21, padding: 20, marginBottom: 25 }, resultTitle: { color: '#182637', fontSize: 24, fontWeight: '800' }, xp: { alignSelf: 'flex-start', backgroundColor: '#F5C45A', color: '#664708', borderRadius: 10, padding: 8, fontWeight: '800' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 26 }, chip: { color: teal, backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 18, padding: 9, fontSize: 12, fontWeight: '700' }, empty: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 21, alignItems: 'center', padding: 26 }, emptyIcon: { color: teal, fontSize: 31 }, emptyTitle: { color: '#182637', fontSize: 16, fontWeight: '800', marginTop: 5 }, emptyText: { color: '#657482', fontSize: 12, marginTop: 6 }, timeline: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 12 }, dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: teal, marginTop: 20 }, description: { color: '#657482', fontSize: 12, lineHeight: 18, marginTop: 8 }, entryFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }, entryActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, timelineXp: { color: teal, fontSize: 11, fontWeight: '800' }, editText: { color: teal, fontSize: 12, fontWeight: '800', padding: 6 }, deleteText: { color: '#A33D3D', fontSize: 12, fontWeight: '800', padding: 6 }, editInput: { minHeight: 85, borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 }, saveText: { color: teal, fontSize: 12, fontWeight: '800', padding: 6 }, confirmBox: { backgroundColor: '#FFF5F3', borderRadius: 12, padding: 12, marginTop: 10 }, confirmText: { color: '#6E3C37', fontSize: 12, lineHeight: 18 }, confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 15, marginTop: 8 }, cancelText: { color: '#657482', fontSize: 12, fontWeight: '700', padding: 6 }, footer: { color: '#9AA6A8', fontSize: 11, textAlign: 'center', marginTop: 28 },
  discovery: { color: '#8B5B00', fontSize: 14, fontWeight: '800', marginTop: 4 },
  awardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1E5C9' },
  awardSkill: { color: '#182637', fontSize: 15, fontWeight: '700' },
  awardXp: { color: teal, fontSize: 14, fontWeight: '800' },
  resultTotal: { color: '#664708', fontSize: 12, fontWeight: '800', marginTop: 12 },
  skillsCard: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 21, padding: 18, marginBottom: 26 },
  skillItem: { marginBottom: 16 },
  skillLevel: { color: teal, fontSize: 12, fontWeight: '800' },
  skillTrack: { height: 7, borderRadius: 7, backgroundColor: '#DDECE5', overflow: 'hidden', marginTop: 9, marginBottom: 6 },
  skillFill: { height: 7, backgroundColor: teal },
  awardSummary: { color: teal, fontSize: 11, lineHeight: 17, marginTop: 9 },
});
