import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { dayLabel } from './game';
import { useJourney } from './journey-state';
import { MicButton } from './MicButton';
import { isMastered, LEARN_XP, REVIEW_INTERVALS, REVIEW_XP, reviewEntryToday, reviewStateOf, stageIcon } from './learning';
import type { Entry } from './storage';

const teal = '#166B65';
const gold = '#F5C45A';
const formatDue = (due: string) => {
  const [year, month, day] = due.split('-').map(Number);
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day));
};

// Bugün sekmesi: öğrenilen kavram/kelime ve anlamı.
export function LearnCard({ children }: { children?: ReactNode }) {
  const { busy, loading, learnError, setLearnError, addLearning } = useJourney();
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const meaningInput = useRef<TextInput>(null);
  if (loading) return null;
  const ready = !!term.trim() && !!meaning.trim();

  async function submit() {
    if (!(await addLearning(term, meaning))) return;
    setTerm('');
    setMeaning('');
  }

  return <View style={s.card}>
    <View style={s.head}>
      <Text style={s.title}>📚 Bugün öğrendiğim</Text>
      <Text style={s.xpChip}>+{LEARN_XP} XP</Text>
    </View>
    <Text style={s.sub}>Bir kavram, konu ya da kelime ve anlamı. Unutmaman için ara ara sana soracağız.</Text>
    <View style={s.fieldRow}><TextInput
      accessibilityLabel="Kavram ya da kelime"
      placeholder="Kavram ya da kelime, örn. Serendipity"
      placeholderTextColor="#9AA6A8"
      maxLength={80}
      returnKeyType="next"
      submitBehavior="submit"
      onSubmitEditing={() => meaningInput.current?.focus()}
      value={term}
      onChangeText={value => { setTerm(value); setLearnError(''); }}
      style={s.input}
    /><MicButton value={term} onChangeText={value => { setTerm(value); setLearnError(''); }} size={48} /></View>
    <View style={s.fieldRow}><TextInput
      ref={meaningInput}
      accessibilityLabel="Anlamı"
      placeholder="Anlamı, örn. Şans eseri güzel bir keşif"
      placeholderTextColor="#9AA6A8"
      maxLength={240}
      returnKeyType="done"
      onSubmitEditing={submit}
      value={meaning}
      onChangeText={value => { setMeaning(value); setLearnError(''); }}
      style={s.input}
    /><MicButton value={meaning} onChangeText={value => { setMeaning(value); setLearnError(''); }} size={48} /></View>
    <Pressable accessibilityRole="button" disabled={busy || !ready} onPress={submit} style={[s.primary, (busy || !ready) && { opacity: 0.45 }]}>
      <Text style={s.primaryText}>Öğrendiklerime ekle</Text>
    </Pressable>
    {learnError ? <Text style={s.error}>{learnError}</Text> : null}
    {children}
  </View>;
}

// Bugün sekmesi: tekrarı gelmiş kavramlar, birer birer. Tekrar yoksa ve bugün hiç tekrar edilmediyse görünmez.
export function ReviewCard({ children }: { children?: ReactNode }) {
  const { dueReviews, entries, loading } = useJourney();
  if (loading) return null;
  const todayReview = reviewEntryToday(entries);
  const current = dueReviews[0];
  if (!current && !todayReview) return null;

  return <View style={[s.card, s.reviewCard]}>
    <View style={s.head}>
      <Text style={s.title}>🧠 Tekrar zamanı</Text>
      {current ? <Text style={s.countChip}>{dueReviews.length} kaldı</Text> : <Text style={[s.countChip, s.countDone]}>✓ Bitti</Text>}
    </View>
    {current ? <ReviewItem key={current.id} entry={current} />
      : <Text style={s.sub}>Bugünün tekrarları bitti. {todayReview?.review?.count} kavramı hatırladın, +{todayReview?.xp} XP.</Text>}
    {children}
  </View>;
}

// Anahtar (key) kayda bağlı: her kavramda anlam yeniden gizli başlar.
function ReviewItem({ entry }: { entry: Entry }) {
  const { reviews, busy, reviewLearning } = useJourney();
  const [revealed, setRevealed] = useState(false);
  const state = reviewStateOf(entry, reviews);
  return <View>
    <Text style={s.when}>{stageIcon(state)} {dayLabel(new Date(entry.createdAt))} öğrendin · hatırlıyor musun?</Text>
    <Text style={s.term}>{entry.learning!.term}</Text>
    {revealed ? <>
      <Text style={s.meaning}>{entry.learning!.meaning}</Text>
      <View style={s.answers}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => reviewLearning(entry, false)} style={[s.answer, s.forgot]}>
          <Text style={s.forgotText}>✗ Unuttum</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => reviewLearning(entry, true)} style={[s.answer, s.remembered]}>
          <Text style={s.rememberedText}>✓ Hatırladım +{REVIEW_XP}</Text>
        </Pressable>
      </View>
    </> : <Pressable accessibilityRole="button" onPress={() => setRevealed(true)} style={s.reveal}>
      <Text style={s.revealText}>Anlamını göster</Text>
    </Pressable>}
  </View>;
}

// Anılar sekmesi: tüm öğrenilenler, anlamları ve ne kadar oturdukları.
export function LearningNotebook({ query }: { query: string }) {
  const { entries, reviews, loading } = useJourney();
  const [expanded, setExpanded] = useState(false);
  if (loading) return null;
  const terms = query.trim().toLocaleLowerCase('tr-TR').split(/\s+/).filter(Boolean);
  const all = entries.filter(entry => entry.learning);
  if (!all.length) return null;
  const matching = all.filter(entry => {
    const text = `${entry.learning!.term} ${entry.learning!.meaning}`.toLocaleLowerCase('tr-TR');
    return terms.every(term => text.includes(term));
  });
  const mastered = all.filter(entry => isMastered(reviewStateOf(entry, reviews))).length;
  const shown = expanded || query ? matching : matching.slice(0, 5);

  return <View style={s.card}>
    <View style={s.head}>
      <Text style={s.title}>📚 Öğrendiklerim</Text>
      <Text style={s.countChip}>{all.length} · 🌳 {mastered}</Text>
    </View>
    <Text style={s.sub}>🌱 yeni · 🌿 oturuyor · 🌳 ustalaşıldı ({REVIEW_INTERVALS.length} tekrar)</Text>
    {shown.length === 0 ? <Text style={s.sub}>Aramana uyan kavram yok.</Text> : shown.map(entry => {
      const state = reviewStateOf(entry, reviews);
      return <View key={entry.id} style={s.noteRow}>
        <Text style={s.noteIcon}>{stageIcon(state)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.noteTerm}>{entry.learning!.term}</Text>
          <Text style={s.noteMeaning}>{entry.learning!.meaning}</Text>
          <Text style={s.noteMeta}>{isMastered(state) ? 'Ustalaşıldı' : `Sıradaki tekrar: ${formatDue(state.due)}`}</Text>
        </View>
      </View>;
    })}
    {!query && matching.length > 5 ? <Pressable accessibilityRole="button" onPress={() => setExpanded(!expanded)} style={s.more}>
      <Text style={s.moreText}>{expanded ? 'Daha az göster' : `Tümünü göster (${matching.length})`}</Text>
    </Pressable> : null}
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 18 },
  reviewCard: { backgroundColor: '#F4F1FF', borderColor: '#DCD5FA' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { flexShrink: 1, color: '#182637', fontSize: 20, fontWeight: '800' },
  xpChip: { color: '#664708', backgroundColor: gold, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  countChip: { color: '#4B3FA0', backgroundColor: '#E6E0FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
  countDone: { color: teal, backgroundColor: '#DDF1E9' },
  sub: { color: '#657482', fontSize: 13, lineHeight: 19, marginTop: 8 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  input: { flex: 1, height: 48, borderColor: '#D5DFDA', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, color: '#182637', fontSize: 15, backgroundColor: '#FAFBF9' },
  primary: { height: 48, borderRadius: 12, backgroundColor: teal, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '800' },
  error: { color: '#B34242', fontSize: 12, marginTop: 8 },
  when: { color: '#6B62A8', fontSize: 12, fontWeight: '700', marginTop: 12 },
  term: { color: '#182637', fontSize: 26, fontWeight: '800', marginTop: 6 },
  meaning: { color: '#344150', fontSize: 15, lineHeight: 22, marginTop: 8, backgroundColor: 'white', borderRadius: 12, padding: 12, overflow: 'hidden' },
  reveal: { marginTop: 12, height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#C9BFF5', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  revealText: { color: '#4B3FA0', fontSize: 14, fontWeight: '800' },
  answers: { flexDirection: 'row', gap: 10, marginTop: 12 },
  answer: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  forgot: { backgroundColor: '#FFF5F3', borderWidth: 1, borderColor: '#F2D3CD' },
  forgotText: { color: '#A33D3D', fontSize: 14, fontWeight: '800' },
  remembered: { backgroundColor: teal },
  rememberedText: { color: 'white', fontSize: 14, fontWeight: '800' },
  noteRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEF2EE' },
  noteIcon: { fontSize: 20, marginTop: 1 },
  noteTerm: { color: '#182637', fontSize: 15, fontWeight: '800' },
  noteMeaning: { color: '#344150', fontSize: 13, lineHeight: 19, marginTop: 2 },
  noteMeta: { color: '#9AA6A8', fontSize: 11, marginTop: 4 },
  more: { marginTop: 10, paddingVertical: 4 },
  moreText: { color: teal, fontSize: 13, fontWeight: '800' },
});
