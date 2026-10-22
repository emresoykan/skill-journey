import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { habitStreak } from './game';
import { useJourney } from './journey-state';
import { displaySkill } from './mockAnalysis';
import { availablePresets, formatTime, HABIT_XP, MAX_HABITS, reminderTimes, type HabitPreset } from './routines';
import { reminderNote, remindersSupported } from './reminders';

const teal = '#166B65';
const gold = '#F5C45A';

// Bugün sekmesi: her gün tekrarlanan rutinler; dokununca tik atılır ya da kaldırılır.
export function Routines() {
  const { habits, routines, entries, busy, loading, habitError, setHabitError, toggleHabit, addHabit, removeHabit } = useJourney();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  if (loading) return null;
  const managing = editing || habits.length === 0;
  const presets = availablePresets(habits);

  // Ekledikten sonra panel açık kalır; birkaç rutin art arda eklenip "Bitti" ile kapatılır.
  async function add(name: string, preset?: HabitPreset) {
    if (!(await addHabit(name, preset))) return;
    setEditing(true);
    if (!preset) setTitle('');
  }
  const submit = () => add(title);

  return <View style={s.card}>
    <View style={s.head}>
      <Text style={s.title}>Rutinlerim</Text>
      <View style={s.headRight}>
        {habits.length ? <Text style={[s.count, routines.complete && s.countDone]}>{routines.complete ? '🌟 Hepsi tamam' : `${routines.count}/${routines.total}`}</Text> : null}
        {habits.length ? <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { setEditing(!editing); setHabitError(''); }}>
          <Text style={s.link}>{editing ? 'Bitti' : 'Düzenle'}</Text>
        </Pressable> : null}
      </View>
    </View>
    {habits.length ? <View style={s.track}><View style={[s.fill, { width: `${routines.count / routines.total * 100}%` }]} /></View>
      : <Text style={s.intro}>Her gün tekrarlamak istediğin küçük alışkanlıkları ekle. Her tik +{HABIT_XP} XP getirir ve kendi serisini tutar.</Text>}

    {habits.map(habit => {
      const done = routines.done.has(habit.id);
      const streak = habitStreak(entries, habit.id).count;
      return <View key={habit.id} style={s.rowWrap}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done, disabled: busy || editing }}
          aria-checked={done}
          accessibilityLabel={`${habit.title}${streak ? `, ${streak} günlük seri` : ''}`}
          disabled={busy || editing}
          onPress={() => toggleHabit(habit)}
          style={[s.row, done && s.rowDone]}
        >
          <Text style={s.icon}>{habit.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.habitTitle, done && s.habitTitleDone]}>{habit.title}</Text>
            <Text style={s.meta}>{displaySkill(habit.skill)} · +{HABIT_XP} XP{streak ? `  ·  🔥 ${streak} gün` : ''}</Text>
          </View>
          {editing ? null : <View style={[s.circle, done && s.circleDone]}><Text style={s.circleMark}>{done ? '✓' : ''}</Text></View>}
        </Pressable>
        {editing ? <Pressable accessibilityRole="button" accessibilityLabel={`Rutini kaldır: ${habit.title}`} hitSlop={6} onPress={() => removeHabit(habit.id)} style={s.remove}>
          <Text style={s.removeText}>Kaldır</Text>
        </Pressable> : null}
      </View>;
    })}

    {managing ? <View style={s.manage}>
      {habits.length < MAX_HABITS ? <View style={s.inputRow}>
        <TextInput
          accessibilityLabel="Yeni rutin"
          placeholder="Yeni rutin, örn. Sabah esneme"
          placeholderTextColor="#9AA6A8"
          maxLength={60}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={submit}
          value={title}
          onChangeText={value => { setTitle(value); setHabitError(''); }}
          style={s.input}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Rutin ekle" disabled={busy || !title.trim()} onPress={submit} style={[s.add, (busy || !title.trim()) && { opacity: 0.45 }]}>
          <Text style={s.addText}>Ekle</Text>
        </Pressable>
      </View> : null}
      {presets.length && habits.length < MAX_HABITS ? <>
        <Text style={s.presetLabel}>Hazır öneriler</Text>
        <View style={s.presets}>
          {presets.map(preset => <Pressable key={preset.title} accessibilityRole="button" accessibilityLabel={`Rutin ekle: ${preset.title}`} disabled={busy} onPress={() => add(preset.title, preset)} style={s.chip}>
            <Text style={s.chipText}>{preset.icon} {preset.title}</Text>
          </Pressable>)}
        </View>
      </> : null}
      {editing ? <Text style={s.note}>{"Kaldırdığın rutinin geçmiş tikleri ve XP'si silinmez."}</Text> : null}
    </View> : null}
    {habitError ? <Text style={s.error}>{habitError}</Text> : null}
    {habits.length && !editing ? <Reminder /> : null}
  </View>;
}

// Günde bir rutin hatırlatması. Telefonda yerel bildirim, web'de push-worker üzerinden.
function Reminder() {
  const { reminder, setReminder, reminderError, reminderNotice, testReminder } = useJourney();
  if (!remindersSupported) return <Text style={s.reminderNote}>{reminderNote}</Text>;
  return <View style={s.reminder}>
    <View style={s.reminderHead}>
      <Text style={s.reminderTitle}>🔔 Hatırlatıcı</Text>
      <Switch accessibilityLabel="Rutin hatırlatıcısı" value={reminder.enabled} onValueChange={enabled => setReminder({ ...reminder, enabled })} trackColor={{ true: teal, false: '#D5DFDA' }} thumbColor="white" />
    </View>
    {reminder.enabled ? <>
      <View style={s.times}>
        {reminderTimes.map(([hour, minute]) => {
          const selected = reminder.hour === hour && reminder.minute === minute;
          return <Pressable key={`${hour}:${minute}`} accessibilityRole="radio" accessibilityState={{ selected }} aria-checked={selected} onPress={() => setReminder({ ...reminder, hour, minute })} style={[s.time, selected && s.timeOn]}>
            <Text style={[s.timeText, selected && s.timeTextOn]}>{formatTime(hour, minute)}</Text>
          </Pressable>;
        })}
      </View>
      <Text style={s.reminderNote}>Her gün saat {formatTime(reminder.hour, reminder.minute)} · O günün rutinleri bitmişse hatırlatma gelmez.</Text>
      <Pressable accessibilityRole="button" onPress={testReminder} style={s.testButton}><Text style={s.link}>Test bildirimi gönder</Text></Pressable>
      {reminderNotice ? <Text style={s.reminderNote}>{reminderNotice}</Text> : null}
    </> : null}
    {reminderError ? <Text style={s.error}>{reminderError}</Text> : null}
  </View>;
}

// Gelişim sekmesi: her rutinin serisi ve son 7 günü.
export function RoutineStreaks() {
  const { habits, entries } = useJourney();
  if (!habits.length) return null;
  return <View style={s.card}>
    <Text style={[s.title, { marginBottom: 6 }]}>Rutin serilerin</Text>
    {habits.map(habit => {
      const streak = habitStreak(entries, habit.id);
      return <View key={habit.id} style={s.streakRow}>
        <Text style={s.icon}>{habit.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.habitTitle} numberOfLines={1}>{habit.title}</Text>
          <View style={s.week}>
            {streak.week.map(day => <View key={day.key} accessibilityLabel={`${day.label}: ${day.active ? 'yapıldı' : 'yapılmadı'}`} style={[s.day, day.active && s.dayOn, day.today && !day.active && s.dayToday]} />)}
          </View>
        </View>
        <Text style={[s.streakCount, !streak.count && { opacity: 0.4 }]}>🔥 {streak.count}</Text>
      </View>;
    })}
    <Text style={s.note}>Kutular son 7 günü gösterir; en sağdaki bugün.</Text>
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: 'white', borderColor: '#E2E9E4', borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: '#182637', fontSize: 20, fontWeight: '800' },
  count: { color: '#8B5B00', backgroundColor: '#FFF0C2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
  countDone: { color: teal, backgroundColor: '#DDF1E9' },
  link: { color: teal, fontSize: 13, fontWeight: '800' },
  track: { height: 7, borderRadius: 4, backgroundColor: '#E2E9E4', overflow: 'hidden', marginTop: 12, marginBottom: 6 },
  fill: { height: 7, backgroundColor: gold },
  intro: { color: '#657482', fontSize: 13, lineHeight: 19, marginTop: 8 },
  rowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E2E9E4', paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FAFBF9' },
  rowDone: { backgroundColor: '#EEF8F3', borderColor: '#BEDDD1' },
  icon: { fontSize: 22 },
  habitTitle: { color: '#182637', fontSize: 15, fontWeight: '700' },
  habitTitleDone: { color: teal },
  meta: { color: '#657482', fontSize: 11, marginTop: 2 },
  circle: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#C9D5CF', alignItems: 'center', justifyContent: 'center' },
  circleDone: { backgroundColor: teal, borderColor: teal },
  circleMark: { color: 'white', fontSize: 16, fontWeight: '800' },
  remove: { paddingHorizontal: 8, paddingVertical: 10 },
  removeText: { color: '#A33D3D', fontSize: 12, fontWeight: '800' },
  manage: { marginTop: 14 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, height: 46, borderColor: '#D5DFDA', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, color: '#182637', fontSize: 14, backgroundColor: '#FAFBF9' },
  add: { height: 46, paddingHorizontal: 16, borderRadius: 12, backgroundColor: teal, alignItems: 'center', justifyContent: 'center' },
  addText: { color: 'white', fontSize: 14, fontWeight: '800' },
  presetLabel: { color: '#657482', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: '#E2E9E4', backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { color: '#182637', fontSize: 13, fontWeight: '600' },
  note: { color: '#9AA6A8', fontSize: 11, marginTop: 12 },
  error: { color: '#B34242', fontSize: 12, marginTop: 10 },
  reminder: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEF2EE' },
  reminderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reminderTitle: { color: '#182637', fontSize: 14, fontWeight: '800' },
  reminderNote: { color: '#657482', fontSize: 11, lineHeight: 16, marginTop: 10 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  time: { borderRadius: 12, borderWidth: 1, borderColor: '#E2E9E4', paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'white' },
  timeOn: { backgroundColor: teal, borderColor: teal },
  timeText: { color: '#182637', fontSize: 13, fontWeight: '700' },
  timeTextOn: { color: 'white' },
  testButton: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 4 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEF2EE' },
  week: { flexDirection: 'row', gap: 5, marginTop: 6 },
  day: { width: 18, height: 18, borderRadius: 5, backgroundColor: '#E2E9E4' },
  dayOn: { backgroundColor: gold },
  dayToday: { borderWidth: 2, borderColor: gold, backgroundColor: 'white' },
  streakCount: { color: '#8B5B00', fontSize: 15, fontWeight: '800' },
});
