import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { displaySkill } from './skillEngine';
import { ProgressChart } from './ProgressChart';
import { SkillEvidence } from './SkillEvidence';
import { PastSelf } from './PastSelf';
import { useJourney } from './journey-state';
import { dayLabel, entryXp, groupByDay, level } from './game';
import { PlayerCard } from './PlayerCard';
import { DailyQuest } from './DailyQuest';
import { RewardCard, isSpecialReward } from './RewardCard';
import { TodayLog } from './TodayLog';
import { MicButton } from './MicButton';
import { LearnCard, LearningNotebook, ReviewCard } from './LearningCards';
import { RoutineStreaks, Routines, WeeklyTotals } from './RoutinesCard';
import { Badges } from './Badges';
import { BackupCard } from './BackupCard';
import { EntryActionButtons, EntryDeleteConfirm, EntryEditForm, EntryEditNotice } from './EntryControls';
import { Confetti } from './Confetti';
import { setSoundEnabled, useSoundEnabled } from './sounds';
import { useHydrated } from './useHydrated';
import { GrowthOverview } from './GrowthOverview';
import { SkillTree } from './SkillTree';
import { MemoryFilters } from './MemoryFilters';
import { discoveriesByEntry, filterEntries, filterOptions, type DateRange } from './insights';

type GrowthTab = 'overview' | 'skills' | 'badges' | 'analytics';
const growthTabs: { key: GrowthTab; label: string }[] = [
  { key: 'overview', label: 'Genel' },
  { key: 'skills', label: 'Beceriler' },
  { key: 'badges', label: 'Başarılar' },
  { key: 'analytics', label: 'Analiz' },
];
const teal = '#166B65';
export function JourneyScreen({ section }: { section: 'today' | 'growth' | 'memories' }) {
  const { earnedBadges,syncNotice,dismissSyncNotice,analyzing,entries,draft,setDraft,reward,quest,questDone,streak,today,busy,loading,error,setError,timelineError,editingId,totalXp,skillTotals,addMoment,correctAward } = useJourney();
  const soundOn = useSoundEnabled();
  const hydrated = useHydrated();
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<DateRange>('all');
  const [domain, setDomain] = useState<string | null>(null);
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [growthTab, setGrowthTab] = useState<GrowthTab>('overview');
  const [skillView, setSkillView] = useState<'tree' | 'list'>('tree');
  const filtering = !!query.trim() || range !== 'all' || !!domain || !!skillFilter;
  const visibleEntries = section === 'memories' ? filterEntries(entries, { query, range, domain, skill: skillFilter }) : entries;
  const options = section === 'memories' ? filterOptions(entries) : { skills: [], domains: [] };
  const discoveries = section === 'memories' ? discoveriesByEntry(entries) : new Map<string, string[]>();
  const clearFilters = () => { setQuery(''); setRange('all'); setDomain(null); setSkillFilter(null); };
  // Statik HTML'de yalnız boş zemin; içerik tarayıcıda çizilir (bkz. useHydrated).
  if (!hydrated) return <View style={s.safe} />;
  return <View style={s.safe}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <View style={s.header}><Text style={s.brand}>✦  skill journey</Text><View style={s.headerRight}>
          <Pressable accessibilityRole="button" accessibilityLabel={soundOn ? 'Sesi kapat' : 'Sesi aç'} hitSlop={8} onPress={() => setSoundEnabled(!soundOn)} style={s.soundButton}><Text style={s.soundIcon}>{soundOn ? '🔊' : '🔇'}</Text></Pressable>
          <Text style={s.levelPill}>SEVİYE {level(totalXp)}</Text>
        </View></View>
        {syncNotice ? <Pressable accessibilityRole="button" accessibilityHint="Uyarıyı kapatır" onPress={dismissSyncNotice} style={s.sync}><Text style={s.syncText}>{`🔄 ${syncNotice}  ✕`}</Text></Pressable> : null}
        {section === 'growth' ? <>
        <View style={s.tabs} accessibilityRole="tablist">
          {growthTabs.map(tab => <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: growthTab === tab.key }} aria-selected={growthTab === tab.key} onPress={() => setGrowthTab(tab.key)} style={[s.tab, growthTab === tab.key && s.tabOn]}>
            <Text style={[s.tabText, growthTab === tab.key && s.tabTextOn]} numberOfLines={1}>{tab.label}</Text>
          </Pressable>)}
        </View>
        {loading ? <ActivityIndicator color={teal} /> : growthTab === 'overview' ? <>
          <PlayerCard totalXp={totalXp} streak={streak} />
          <GrowthOverview entries={entries} />
          <BackupCard />
        </> : growthTab === 'skills' ? <>
          <View style={s.row}>
            <View style={{ flexShrink: 1 }}><Text style={[s.section, { marginBottom: 2 }]}>Becerilerin</Text><Text style={s.muted}>{skillTotals.length} beceri · {entries.length} kayıt</Text></View>
            <View style={s.viewToggle} accessibilityRole="radiogroup">
              {([['tree', '🌳 Ağaç'], ['list', '☰ Liste']] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ selected: skillView === key }} aria-checked={skillView === key} onPress={() => setSkillView(key)} style={[s.viewOption, skillView === key && s.viewOptionOn]}>
                <Text style={[s.viewText, skillView === key && s.viewTextOn]}>{label}</Text>
              </Pressable>)}
            </View>
          </View>
          <View style={{ height: 12 }} />
          {/* Liste görünümü: erişilebilir sade liste; kaydın becerisini düzeltmek de buradan yapılır. */}
          {skillView === 'tree' ? <SkillTree entries={entries} /> : <SkillEvidence entries={entries} busy={busy} onCorrectAward={correctAward} />}
        </> : growthTab === 'badges' ? <Badges entries={entries} earned={earnedBadges} /> : <>
          <ProgressChart entries={entries} />
          <WeeklyTotals />
          <RoutineStreaks />
        </>}
        </> : null}
        {section === 'today' ? <>
        <PlayerCard totalXp={totalXp} streak={streak} compact />
        <TodayLog today={today} draft={draft} error={error} busy={busy} disabled={loading} onChangeDraft={v => { setDraft(v); setError(''); }} onAdd={addMoment}>
          {reward && (reward.kind === 'moment' || reward.kind === 'habit') ? <RewardCard key={reward.id} reward={reward} /> : analyzing ? <Text style={s.analyzing}>✦ Becerilerin hesaplanıyor…</Text> : null}
        </TodayLog>
        <Routines />
        <ReviewCard>{reward?.kind === 'review' ? <RewardCard key={reward.id} reward={reward} /> : null}</ReviewCard>
        <LearnCard>{reward?.kind === 'learning' ? <RewardCard key={reward.id} reward={reward} /> : null}</LearnCard>
        {!loading ? <DailyQuest quest={quest} done={questDone} /> : null}
        </> : null}
        {section === 'memories' ? <>
        <Text style={s.section}>Anılarını bul</Text>
        <View style={s.searchRow}>
          <TextInput accessibilityLabel="Anılarda ara" placeholder="Kayıt veya beceri ara..." placeholderTextColor="#657482" value={query} onChangeText={setQuery} style={[s.editInput, { flex: 1, minWidth: 0, minHeight: 48, fontSize: 15, color: '#182637', backgroundColor: 'white', marginBottom: 0 }]} />
          <MicButton value="" onChangeText={setQuery} size={48} />
        </View>
        {!loading && entries.length ? <MemoryFilters range={range} domain={domain} skill={skillFilter} domains={options.domains} skills={options.skills} onRange={setRange} onDomain={setDomain} onSkill={setSkillFilter} /> : null}
        {filtering ? <Pressable accessibilityRole="button" onPress={clearFilters}><Text style={[s.editText, { marginBottom: 12 }]}>Filtreleri temizle · {visibleEntries.length} kayıt bulundu</Text></Pressable> : null}
        {!loading && !filtering ? <PastSelf entries={entries} /> : null}
        {/* Defter kendi aramasını kullanır; tarih, alan ya da beceri filtresi seçiliyken gizlenir. */}
        {range === 'all' && !domain && !skillFilter ? <LearningNotebook query={query} /> : null}
        <Text style={s.section}>Zaman çizelgesi</Text>
        {timelineError ? <Text style={s.error}>{timelineError}</Text> : null}
        {loading ? <ActivityIndicator color={teal} /> : visibleEntries.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>✧</Text>
            <Text style={s.emptyTitle}>{filtering ? 'Eşleşen kayıt bulunamadı' : 'Hikâyen burada başlıyor'}</Text>
            <Text style={s.emptyText}>{filtering ? 'Başka bir kelime ya da filtre deneyebilirsin.' : 'Bugün sekmesinden ilk kaydını ekle.'}</Text>
          </View>
        ) : groupByDay(visibleEntries).map(group => <View key={group.key} style={s.dayGroup}>
          <View style={s.dayHead}><Text style={s.dayTitle}>{dayLabel(group.date)}</Text><Text style={s.muted}>{group.entries.length} şey · +{group.xp} XP</Text></View>
          {group.entries.map(entry => (
          <View key={entry.id} style={s.timeline}>
            <View style={s.dot} />
            <View style={[s.card, { flex: 1, marginBottom: 0 }]}>
              <View style={s.row}>
                <Text style={s.label}>{displaySkill(entry.skill)}</Text>
                <Text style={s.muted}>{new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(entry.createdAt))}</Text>
              </View>
              {editingId === entry.id ? <EntryEditForm entry={entry} /> : (
                <View>
                  {discoveries.has(entry.id) ? <Text style={s.milestone}>{`✦ İlk kez: ${discoveries.get(entry.id)!.map(displaySkill).join(', ')}`}</Text> : null}
                  <Text style={s.description}>{entry.description}</Text>
                  <Text style={s.awardSummary}>{entry.awards.map(award => `${displaySkill(award.skill)} +${award.xp}`).join(' · ')}{entry.bonusXp ? ` · 🎯 Görev +${entry.bonusXp}` : ''}{entry.habitId ? ' · 🔁 Rutin' : ''}</Text>
                  <View style={s.entryFoot}>
                    <Text style={s.timelineXp}>+{entryXp(entry)} XP</Text>
                    <EntryActionButtons entry={entry} />
                  </View>
                  <EntryDeleteConfirm entry={entry} />
                  <EntryEditNotice entry={entry} />
                </View>
              )}
            </View>
          </View>
          ))}
        </View>)}
        </> : null}
        <Text style={s.footer}>Her gün biraz daha ileri. ✦</Text>
      </ScrollView>
    </KeyboardAvoidingView>
    {section === 'today' && reward && !reward.leveledUp && isSpecialReward(reward) ? <Confetti burstKey={reward.id} /> : null}
  </View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8F4' }, searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }, dayGroup: { marginBottom: 14 }, dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, marginTop: 4 }, dayTitle: { color: '#182637', fontSize: 15, fontWeight: '800' }, page: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 22, paddingBottom: 55 },
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
  sync: { backgroundColor: '#FCEBB5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  syncText: { color: '#664708', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  tabs: { flexDirection: 'row', backgroundColor: '#EEF2EE', borderRadius: 14, padding: 4, gap: 4, marginBottom: 18 },
  tab: { flex: 1, minWidth: 0, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  tabOn: { backgroundColor: 'white', shadowColor: '#182637', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  tabText: { color: '#657482', fontSize: 13, fontWeight: '800' },
  tabTextOn: { color: teal },
  viewToggle: { flexDirection: 'row', backgroundColor: '#EEF2EE', borderRadius: 12, padding: 3, gap: 3 },
  viewOption: { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  viewOptionOn: { backgroundColor: 'white' },
  viewText: { color: '#657482', fontSize: 12, fontWeight: '800' },
  viewTextOn: { color: teal },
  milestone: { alignSelf: 'flex-start', color: '#664708', backgroundColor: '#FCEBB5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: '800', marginTop: 8, overflow: 'hidden' },
  analyzing: { color: '#8B5B00', backgroundColor: '#FFF7DF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 12, fontSize: 13, fontWeight: '700', overflow: 'hidden' },
});
