import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { analyzeExperience, type Analysis } from './src/mockAnalysis';
import { loadEntries, saveEntries, type Entry } from './src/storage';

const teal = '#166B65';
const level = (xp: number) => Math.floor(xp / 100) + 1;

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState('');
  const [latest, setLatest] = useState<Analysis | null>(null);
  const [leveledUp, setLeveledUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const totalXp = entries.reduce((sum, entry) => sum + entry.xp, 0);
  const skillCounts = Object.entries(entries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.skill] = (counts[entry.skill] ?? 0) + 1;
    return counts;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3);

  useEffect(() => {
    loadEntries().then(setEntries).catch(() => setError('Could not load saved moments.')).finally(() => setLoading(false));
  }, []);

  async function addMoment() {
    const description = draft.trim();
    if (!description) { setError('Write a little about your day first.'); return; }
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await analyzeExperience(description);
      const next: Entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), description, ...result };
      const updated = [next, ...entries];
      await saveEntries(updated);
      setLeveledUp(level(totalXp + result.xp) > level(totalXp));
      setEntries(updated);
      setLatest(result);
      setDraft('');
    } catch { setError('Could not save this moment. Please try again.'); }
    finally { setBusy(false); }
  }

  return <SafeAreaView style={s.safe}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <View style={s.header}><Text style={s.brand}>✦  skill journey</Text><Text style={s.levelPill}>LEVEL {level(totalXp)}</Text></View>
        <View style={s.hero}>
          <Text style={s.eyebrow}>YOUR EVERYDAY GROWTH</Text>
          <Text style={s.title}>Small moments.{'\n'}Real progress.</Text>
          <Text style={s.sub}>Reflect on what happened today and see the skills you're building along the way.</Text>
          <View style={s.row}><Text style={s.progressLabel}>Level {level(totalXp)} progress</Text><Text style={s.progressLabel}>{totalXp % 100} / 100 XP</Text></View>
          <View style={s.track}><View style={[s.fill, { width: `${totalXp % 100}%` }]} /></View>
          <Text style={s.foot}>{100 - totalXp % 100} XP to your next level · {totalXp} XP earned overall</Text>
        </View>
        <Text style={s.section}>Capture a moment</Text>
        <View style={s.card}>
          <Text style={s.label}>What happened today?</Text>
          <TextInput accessibilityLabel="What happened today?" multiline maxLength={1000} placeholder="I helped a teammate solve a tricky problem..." placeholderTextColor="#9AA6A8" style={s.input} textAlignVertical="top" value={draft} onChangeText={v => { setDraft(v); setError(''); }} />
          <View style={s.inputFoot}><Text style={s.muted}>Every experience counts.</Text><Text style={s.muted}>{draft.length}/1000</Text></View>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={busy || loading} onPress={addMoment} style={[s.button, (busy || loading) && { opacity: 0.7 }]}>{busy ? <ActivityIndicator color="white" /> : <Text style={s.buttonText}>✦  Discover my skills</Text>}</Pressable>
          <Text style={s.note}>Preview analysis · no account or API key needed</Text>
        </View>
        {latest ? <View style={s.result}><Text style={s.eyebrow}>{leveledUp ? '🎉 LEVEL UP!' : 'MOMENT UNLOCKED'}</Text><Text style={s.resultTitle}>{latest.skill}</Text><Text style={s.sub}>{latest.reason}</Text><Text style={s.xp}>+{latest.xp} XP</Text></View> : null}
        <View style={s.row}><Text style={s.section}>Your skills</Text><Text style={s.muted}>{entries.length} moments</Text></View>
        <View style={s.chips}>{skillCounts.length ? skillCounts.map(([skill, count]) => <Text key={skill} style={s.chip}>{skill} · {count}</Text>) : <Text style={s.emptyText}>Your skills will appear here after your first moment.</Text>}</View>
        <Text style={s.section}>Timeline</Text>
        {loading ? <ActivityIndicator color={teal} /> : entries.length === 0 ? <View style={s.empty}><Text style={s.emptyIcon}>✧</Text><Text style={s.emptyTitle}>Your story starts here</Text><Text style={s.emptyText}>Add one moment above to begin your timeline.</Text></View> : entries.map(entry => <View key={entry.id} style={s.timeline}><View style={s.dot} /><View style={[s.card, { flex: 1, marginBottom: 0 }]}><View style={s.row}><Text style={s.label}>{entry.skill}</Text><Text style={s.muted}>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(entry.createdAt))}</Text></View><Text style={s.description}>{entry.description}</Text><Text style={s.timelineXp}>+{entry.xp} XP</Text></View></View>)}
        <Text style={s.footer}>A little progress, every day. ✦</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8F4' }, page: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 22, paddingBottom: 55 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }, brand: { color: '#182637', fontSize: 19, fontWeight: '800' }, levelPill: { color: teal, backgroundColor: '#DDF1E9', padding: 9, borderRadius: 16, fontSize: 11, fontWeight: '800' },
  hero: { backgroundColor: '#DDF1E9', borderRadius: 26, padding: 24, marginBottom: 26 }, eyebrow: { color: teal, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 }, title: { color: '#182637', fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -1 }, sub: { color: '#657482', fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 22 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, progressLabel: { color: teal, fontSize: 12, fontWeight: '800', marginBottom: 9 }, track: { backgroundColor: '#BEDDD1', height: 9, borderRadius: 9, overflow: 'hidden' }, fill: { backgroundColor: teal, height: 9 }, foot: { color: '#657482', fontSize: 11, marginTop: 9 },
  section: { color: '#182637', fontSize: 20, fontWeight: '800', marginBottom: 12 }, card: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 21, padding: 18, marginBottom: 24 }, label: { color: '#182637', fontSize: 14, fontWeight: '800' }, input: { minHeight: 115, marginTop: 13, color: '#182637', fontSize: 15, lineHeight: 22, padding: 0 }, inputFoot: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E9E4', paddingTop: 12, marginTop: 8, marginBottom: 14 }, muted: { color: '#657482', fontSize: 11 }, error: { color: '#B34242', fontSize: 12, marginBottom: 10 }, button: { backgroundColor: teal, borderRadius: 14, height: 49, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: 'white', fontSize: 14, fontWeight: '800' }, note: { textAlign: 'center', color: '#657482', fontSize: 10, marginTop: 11 },
  result: { backgroundColor: '#FFF7DF', borderColor: '#F3D990', borderWidth: 1, borderRadius: 21, padding: 20, marginBottom: 25 }, resultTitle: { color: '#182637', fontSize: 24, fontWeight: '800' }, xp: { alignSelf: 'flex-start', backgroundColor: '#F5C45A', color: '#664708', borderRadius: 10, padding: 8, fontWeight: '800' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 26 }, chip: { color: teal, backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 18, padding: 9, fontSize: 12, fontWeight: '700' }, empty: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 21, alignItems: 'center', padding: 26 }, emptyIcon: { color: teal, fontSize: 31 }, emptyTitle: { color: '#182637', fontSize: 16, fontWeight: '800', marginTop: 5 }, emptyText: { color: '#657482', fontSize: 12, marginTop: 6 }, timeline: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 12 }, dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: teal, marginTop: 20 }, description: { color: '#657482', fontSize: 12, lineHeight: 18, marginTop: 8 }, timelineXp: { color: teal, fontSize: 11, fontWeight: '800', marginTop: 10 }, footer: { color: '#9AA6A8', fontSize: 11, textAlign: 'center', marginTop: 28 },
});
