import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { dayLabel } from './game';
import { useJourney } from './journey-state';
import { MicButton } from './MicButton';
import { isMastered, LEARN_XP, LEARNING_LIMITS, learningCategories, REVIEW_INTERVALS, REVIEW_XP, reviewEntryToday, reviewStateOf, splitLearning, stageIcon, upcomingReviews, type ReviewState } from './learning';
import type { Entry } from './storage';

const teal = '#166B65';
const gold = '#F5C45A';
// Tekrar sonuçları: "✓ 3 · ✗ 1" (sayım bu özellikten önceki tekrarları içermez).
const score = (state: ReviewState) => state.correct || state.wrong ? `✓ ${state.correct ?? 0} · ✗ ${state.wrong ?? 0}` : '';
const formatDue = (due: string) => {
  const [year, month, day] = due.split('-').map(Number);
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day));
};

// Bugün sekmesi: öğrenilen kavram/kelime ve anlamı.
export function LearnCard({ children }: { children?: ReactNode }) {
  const { busy, loading, learnError, setLearnError, addLearning, entries } = useJourney();
  const [text, setText] = useState('');
  const [details, setDetails] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [example, setExample] = useState('');
  const [category, setCategory] = useState('');
  if (loading) return null;
  const categories = learningCategories(entries);
  const parsed = splitLearning(text);
  const change = (value: string) => { setText(value); setLearnError(''); };

  async function submit() {
    if (!parsed.meaning) {
      setLearnError('Anlamını da yaz: kavramla arasına “:” koy (sesle “anlamı” de). Örn. Serendipity: şans eseri güzel bir keşif');
      return;
    }
    if (!(await addLearning({ ...parsed, explanation, example, category }))) return;
    setText(''); setExplanation(''); setExample('');
    // Kategori bir sonraki kavram için kalır: aynı konudan art arda kelime eklenir.
  }

  return <View style={s.card}>
    <View style={s.head}>
      <Text style={s.title}>📚 Bugün öğrendiğim</Text>
      <Text style={s.xpChip}>+{LEARN_XP} XP</Text>
    </View>
    <Text style={s.sub}>Kavram ya da kelime ve anlamı, arasına “:” koyarak. Unutmaman için ara ara sana soracağız.</Text>
    <View style={s.fieldRow}><TextInput
      accessibilityLabel="Kavram ve anlamı"
      placeholder="örn. Serendipity: şans eseri keşif"
      placeholderTextColor="#9AA6A8"
      maxLength={320}
      returnKeyType="done"
      submitBehavior="submit"
      onSubmitEditing={submit}
      value={text}
      onChangeText={change}
      style={s.input}
    /><MicButton value={text} onChangeText={change} size={48} /></View>
    {parsed.meaning ? <Text style={s.preview} numberOfLines={2}>{`Kavram: ${parsed.term}  ·  Anlamı: ${parsed.meaning}`}</Text> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)} style={s.detailsToggle}>
      <Text style={s.detailsToggleText}>{details ? '− Ayrıntıları gizle' : `+ Açıklama, örnek, kategori${category ? ` (${category})` : ''}`}</Text>
    </Pressable>
    {details ? <View style={s.details}>
      <TextInput accessibilityLabel="Açıklama (isteğe bağlı)" placeholder="Açıklama: nasıl, neden, ne zaman kullanılır" placeholderTextColor="#9AA6A8"
        multiline maxLength={LEARNING_LIMITS.explanation} value={explanation} onChangeText={setExplanation} style={[s.input, s.multiline]} />
      <TextInput accessibilityLabel="Örnek (isteğe bağlı)" placeholder="Örnek cümle ya da durum" placeholderTextColor="#9AA6A8"
        maxLength={LEARNING_LIMITS.example} value={example} onChangeText={setExample} style={[s.input, { marginTop: 8 }]} />
      <TextInput accessibilityLabel="Kategori (isteğe bağlı)" placeholder="Kategori: İngilizce, Finans, Tarih…" placeholderTextColor="#9AA6A8"
        maxLength={LEARNING_LIMITS.category} value={category} onChangeText={setCategory} style={[s.input, { marginTop: 8 }]} />
      {categories.length ? <View style={s.chips}>
        {categories.slice(0, 8).map(item => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected: item === category }} aria-checked={item === category}
          onPress={() => setCategory(item === category ? '' : item)} style={[s.chip, item === category && s.chipOn]}>
          <Text style={[s.chipText, item === category && s.chipTextOn]}>{item}</Text>
        </Pressable>)}
      </View> : null}
    </View> : null}
    <Pressable accessibilityRole="button" disabled={busy || !text.trim()} onPress={submit} style={[s.primary, (busy || !text.trim()) && { opacity: 0.45 }]}>
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
    {entry.learning!.category ? <Text style={s.category}>{entry.learning!.category}</Text> : null}
    <Text style={s.term}>{entry.learning!.term}</Text>
    {revealed ? <>
      <View style={s.answerBox}>
        <Text style={s.meaningText}>{entry.learning!.meaning}</Text>
        {entry.learning!.explanation ? <Text style={s.explanation}>{entry.learning!.explanation}</Text> : null}
        {entry.learning!.example ? <Text style={s.example}>{`Örnek: ${entry.learning!.example}`}</Text> : null}
      </View>
      {score(state) ? <Text style={s.score}>{score(state)}</Text> : null}
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
  const [category, setCategory] = useState<string | null>(null);
  if (loading) return null;
  const terms = query.trim().toLocaleLowerCase('tr-TR').split(/\s+/).filter(Boolean);
  const all = entries.filter(entry => entry.learning);
  if (!all.length) return null;
  const categories = learningCategories(entries);
  const upcoming = upcomingReviews(entries, reviews);
  const matching = all.filter(entry => {
    if (category && entry.learning!.category !== category) return false;
    const l = entry.learning!;
    const text = [l.term, l.meaning, l.explanation, l.example, l.category].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
    return terms.every(term => text.includes(term));
  });
  const mastered = all.filter(entry => isMastered(reviewStateOf(entry, reviews))).length;
  const shown = expanded || query ? matching : matching.slice(0, 5);

  return <View style={s.card}>
    <View style={s.head}>
      <Text style={s.title}>📚 Öğrendiklerim</Text>
      <Text style={s.countChip}>{all.length} · 🌳 {mastered}</Text>
    </View>
    <Text style={s.sub}>🌱 yeni · 🌿 oturuyor · 🌳 ustalaşıldı ({REVIEW_INTERVALS.length} tekrar){upcoming ? ` · Önümüzdeki 7 günde ${upcoming} tekrar` : ''}</Text>
    {categories.length ? <View style={s.chips}>
      {[null, ...categories].map(item => <Pressable key={item ?? 'all'} accessibilityRole="radio" accessibilityState={{ selected: item === category }} aria-checked={item === category}
        onPress={() => setCategory(item)} style={[s.chip, item === category && s.chipOn]}>
        <Text style={[s.chipText, item === category && s.chipTextOn]}>{item ?? 'Tümü'}</Text>
      </Pressable>)}
    </View> : null}
    {shown.length === 0 ? <Text style={s.sub}>Aramana uyan kavram yok.</Text> : shown.map(entry => {
      const state = reviewStateOf(entry, reviews);
      return <View key={entry.id} style={s.noteRow}>
        <Text style={s.noteIcon}>{stageIcon(state)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.noteTerm}>{entry.learning!.term}</Text>
          <Text style={s.noteMeaning}>{entry.learning!.meaning}</Text>
          {entry.learning!.explanation ? <Text style={s.noteExtra} numberOfLines={3}>{entry.learning!.explanation}</Text> : null}
          {entry.learning!.example ? <Text style={s.noteExample} numberOfLines={2}>{`Örnek: ${entry.learning!.example}`}</Text> : null}
          <Text style={s.noteMeta}>{[entry.learning!.category, isMastered(state) ? 'Ustalaşıldı' : `Sıradaki tekrar: ${formatDue(state.due)}`, score(state)].filter(Boolean).join(' · ')}</Text>
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
  preview: { color: teal, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: -2, marginBottom: 8 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  input: { flex: 1, minWidth: 0, height: 48, borderColor: '#D5DFDA', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, color: '#182637', fontSize: 15, backgroundColor: '#FAFBF9' },
  primary: { height: 48, borderRadius: 12, backgroundColor: teal, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '800' },
  error: { color: '#B34242', fontSize: 12, marginTop: 8 },
  when: { color: '#6B62A8', fontSize: 12, fontWeight: '700', marginTop: 12 },
  term: { color: '#182637', fontSize: 26, fontWeight: '800', marginTop: 6 },
  answerBox: { marginTop: 8, backgroundColor: 'white', borderRadius: 12, padding: 12 },
  meaningText: { color: '#344150', fontSize: 15, lineHeight: 22 },
  explanation: { color: '#4F5D6A', fontSize: 13, lineHeight: 19, marginTop: 6 },
  example: { color: '#6B62A8', fontSize: 13, lineHeight: 19, marginTop: 6, fontStyle: 'italic' },
  score: { color: '#6B62A8', fontSize: 11, fontWeight: '700', marginTop: 6 },
  category: { alignSelf: 'flex-start', color: '#4B3FA0', backgroundColor: '#E6E0FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11, fontWeight: '800', marginTop: 8, overflow: 'hidden' },
  detailsToggle: { marginTop: 8, paddingVertical: 4 },
  detailsToggleText: { color: teal, fontSize: 12, fontWeight: '800' },
  details: { marginTop: 2 },
  multiline: { height: 72, paddingTop: 10, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { borderRadius: 14, borderWidth: 1, borderColor: '#D5DFDA', backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { backgroundColor: teal, borderColor: teal },
  chipText: { color: '#3D4B58', fontSize: 12, fontWeight: '700' },
  chipTextOn: { color: 'white' },
  noteExtra: { color: '#4F5D6A', fontSize: 12, lineHeight: 17, marginTop: 3 },
  noteExample: { color: '#6B62A8', fontSize: 12, lineHeight: 17, marginTop: 3, fontStyle: 'italic' },
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
