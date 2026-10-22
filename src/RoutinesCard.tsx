import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { habitStreak } from './game';
import { useJourney } from './journey-state';
import { displaySkill } from './mockAnalysis';
import { availablePresets, formatTime, HABIT_XP, habitGoal, habitIcons, MAX_HABITS, MAX_TARGET, reminderTimes, type Habit, type HabitPreset } from './routines';
import { reminderNote, remindersSupported } from './reminders';
import { MicButton } from './MicButton';

const teal = '#166B65';
const gold = '#F5C45A';

// Bugün sekmesi: her gün tekrarlanan rutinler; dokununca tik atılır ya da kaldırılır.
export function Routines() {
  const { habits, routines, entries, busy, loading, habitError, setHabitError, toggleHabit, stepHabit, habitCount, addHabit } = useJourney();
  const [editing, setEditing] = useState(false);
  const [focusAdd, setFocusAdd] = useState(false);
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
        {habits.length ? <Pressable accessibilityRole="button" hitSlop={6} onPress={() => { setEditing(!editing); setFocusAdd(false); setHabitError(''); }} style={[s.editButton, editing && s.editButtonOn]}>
          <Text style={[s.editButtonText, editing && s.editButtonTextOn]}>{editing ? '✓ Bitti' : '✏️ Düzenle'}</Text>
        </Pressable> : null}
      </View>
    </View>
    {habits.length ? <View style={s.track}><View style={[s.fill, { width: `${routines.count / routines.total * 100}%` }]} /></View>
      : <Text style={s.intro}>Her gün tekrarlamak istediğin küçük alışkanlıkları ekle. Her tik +{HABIT_XP} XP getirir ve kendi serisini tutar.</Text>}

    {habits.map(habit => {
      if (editing) return <HabitEditRow key={habit.id} habit={habit} />;
      const done = routines.done.has(habit.id);
      const streak = habitStreak(entries, habit.id).count;
      // Sayılı rutin (ör. 8 bardak su): her dokunuş bir ekler, "−" son eklemeyi geri alır.
      const { target, unit } = habitGoal(habit);
      const counted = target > 1;
      const count = habitCount(habit);
      return <View key={habit.id} style={s.rowWrap}>
        <Pressable
          accessibilityRole={counted ? 'button' : 'checkbox'}
          accessibilityState={counted ? { disabled: busy || done } : { checked: done, disabled: busy }}
          aria-checked={counted ? undefined : done}
          accessibilityLabel={`${habit.title}${counted ? `, ${count}/${target} ${unit}${done ? '' : `, bir ${unit} ekle`}` : ''}${streak ? `, ${streak} günlük seri` : ''}`}
          disabled={busy || (counted && done)}
          onPress={() => toggleHabit(habit)}
          style={[s.row, done && s.rowDone]}
        >
          <Text style={s.icon}>{habit.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.habitTitle, done && s.habitTitleDone]}>{habit.title}</Text>
            <Text style={s.meta}>{counted ? `${count}/${target} ${unit} · ` : ''}{displaySkill(habit.skill)} · +{HABIT_XP} XP{streak ? `  ·  🔥 ${streak} gün` : ''}</Text>
            {counted ? <View style={s.dots}>
              {Array.from({ length: target }, (_, i) => <View key={i} style={[s.dot, i < count && s.dotOn]} />)}
            </View> : null}
          </View>
          {counted && !done ? <View style={s.circle}><Text style={s.plus}>+</Text></View>
            : <View style={[s.circle, done && s.circleDone]}><Text style={s.circleMark}>{done ? '✓' : ''}</Text></View>}
        </Pressable>
        {counted && count > 0 ? <Pressable accessibilityRole="button" accessibilityLabel={`${habit.title}: bir ${unit} geri al`} hitSlop={6} disabled={busy} onPress={() => stepHabit(habit, -1)} style={s.minus}>
          <Text style={s.minusText}>−</Text>
        </Pressable> : null}
      </View>;
    })}

    {!managing && habits.length < MAX_HABITS ? <Pressable accessibilityRole="button" onPress={() => { setEditing(true); setFocusAdd(true); setHabitError(''); }} style={s.addRoutine}>
      <Text style={s.addRoutineText}>+ Rutin ekle</Text>
    </Pressable> : null}

    {managing ? <View style={s.manage}>
      {habits.length < MAX_HABITS ? <View style={s.inputRow}>
        <TextInput
          accessibilityLabel="Yeni rutin"
          autoFocus={focusAdd}
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
        <MicButton value={title} onChangeText={value => { setTitle(value); setHabitError(''); }} size={46} />
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
      {editing ? <Text style={s.note}>Simgeye dokunarak değiştir, adın üstüne dokunarak yeniden adlandır.</Text> : null}
    </View> : null}
    {habitError ? <Text style={s.error}>{habitError}</Text> : null}
    {habits.length && !editing ? <Reminder /> : null}
  </View>;
}

// Düzenleme modunda bir rutin: simge seçimi, yerinde yeniden adlandırma, onaylı kaldırma.
function HabitEditRow({ habit }: { habit: Habit }) {
  const { busy, updateHabit, removeHabit } = useJourney();
  const { target, unit } = habitGoal(habit);
  const [title, setTitle] = useState(habit.title);
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Klavyeden çıkınca (Enter dahil) ya da sesle söylenince kaydedilir; geçersizse eski ada döner.
  async function renameTo(next: string) {
    if (!next.trim() || next.trim() === habit.title) { setTitle(habit.title); return; }
    if (!(await updateHabit(habit.id, { title: next }))) setTitle(habit.title);
  }
  const saveTitle = () => renameTo(title);

  return <View style={s.editRow}>
    <View style={s.editLine}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Simgeyi değiştir: ${habit.title}`} accessibilityState={{ expanded: picking }} onPress={() => setPicking(!picking)} style={[s.iconButton, picking && s.iconButtonOn]}>
        <Text style={s.icon}>{habit.icon}</Text>
      </Pressable>
      <TextInput accessibilityLabel={`Rutin adı: ${habit.title}`} value={title} onChangeText={setTitle} onBlur={saveTitle} returnKeyType="done" maxLength={60} style={s.editInput} />
      <MicButton value="" onChangeText={setTitle} onFinal={renameTo} size={44} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Rutini kaldır: ${habit.title}`} onPress={() => setConfirming(true)} style={s.removePill}>
        <Text style={s.removeText}>Kaldır</Text>
      </Pressable>
    </View>
    <View style={s.goalLine}>
      <Text style={s.goalLabel}>Günde</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Hedefi azalt: ${habit.title}`} disabled={busy || target <= 1} onPress={() => updateHabit(habit.id, { target: target - 1 })} style={[s.step, target <= 1 && { opacity: 0.35 }]}>
        <Text style={s.stepText}>−</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={s.goalValue}>{target} {unit}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Hedefi artır: ${habit.title}`} disabled={busy || target >= MAX_TARGET} onPress={() => updateHabit(habit.id, { target: target + 1 })} style={[s.step, target >= MAX_TARGET && { opacity: 0.35 }]}>
        <Text style={s.stepText}>+</Text>
      </Pressable>
    </View>
    {picking ? <View style={s.iconGrid}>
      {habitIcons.map(icon => <Pressable key={icon} accessibilityRole="button" accessibilityLabel={`Simge seç: ${icon}`} accessibilityState={{ selected: icon === habit.icon }} disabled={busy} onPress={() => { setPicking(false); if (icon !== habit.icon) updateHabit(habit.id, { icon }); }} style={[s.iconChoice, icon === habit.icon && s.iconChoiceOn]}>
        <Text style={s.iconChoiceText}>{icon}</Text>
      </Pressable>)}
    </View> : null}
    {confirming ? <View style={s.confirm}>
      <Text style={s.confirmText}>{`"${habit.title}" kaldırılsın mı? Geçmiş tikleri ve XP'si silinmez.`}</Text>
      <View style={s.confirmActions}>
        <Pressable accessibilityRole="button" onPress={() => setConfirming(false)}><Text style={s.cancel}>Vazgeç</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => removeHabit(habit.id)}><Text style={s.removeText}>Evet, kaldır</Text></Pressable>
      </View>
    </View> : null}
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
  plus: { color: teal, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E2E9E4' },
  dotOn: { backgroundColor: '#4FA3D9' },
  minus: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: '#D5DFDA', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  minusText: { color: '#657482', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  removeText: { color: '#A33D3D', fontSize: 12, fontWeight: '800' },
  editButton: { borderRadius: 12, borderWidth: 1, borderColor: '#BEDDD1', backgroundColor: '#EEF8F3', paddingHorizontal: 10, paddingVertical: 6 },
  editButtonOn: { backgroundColor: teal, borderColor: teal },
  editButtonText: { color: teal, fontSize: 12, fontWeight: '800' },
  editButtonTextOn: { color: 'white' },
  addRoutine: { marginTop: 10, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#BEDDD1', paddingVertical: 12, alignItems: 'center' },
  addRoutineText: { color: teal, fontSize: 14, fontWeight: '800' },
  editRow: { marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: '#E2E9E4', backgroundColor: '#FAFBF9', padding: 8 },
  editLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingLeft: 4 },
  goalLabel: { color: '#657482', fontSize: 13, fontWeight: '700' },
  goalValue: { color: '#182637', fontSize: 14, fontWeight: '800', minWidth: 70, textAlign: 'center' },
  step: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: '#D5DFDA', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  stepText: { color: teal, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  iconButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#D5DFDA', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  iconButtonOn: { borderColor: teal },
  // minWidth 0: web'de <input> kendi varsayılan genişliğinin altına küçülmez; yoksa satırdaki düğmeler kartın dışına taşar.
  editInput: { flex: 1, minWidth: 0, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#D5DFDA', backgroundColor: 'white', paddingHorizontal: 10, color: '#182637', fontSize: 15, fontWeight: '600' },
  removePill: { borderRadius: 10, backgroundColor: '#FFF5F3', paddingHorizontal: 10, paddingVertical: 10 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  iconChoice: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#E2E9E4', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  iconChoiceOn: { borderColor: teal, backgroundColor: '#EEF8F3' },
  iconChoiceText: { fontSize: 20 },
  confirm: { backgroundColor: '#FFF5F3', borderRadius: 10, padding: 10, marginTop: 8 },
  confirmText: { color: '#6E3C37', fontSize: 12, lineHeight: 18 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 6 },
  cancel: { color: '#657482', fontSize: 12, fontWeight: '700' },
  manage: { marginTop: 14 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, minWidth: 0, height: 46, borderColor: '#D5DFDA', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, color: '#182637', fontSize: 14, backgroundColor: '#FAFBF9' },
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
