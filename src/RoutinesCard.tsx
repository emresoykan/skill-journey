import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { habitStreak } from './game';
import { useJourney } from './journey-state';
import { displaySkill } from './skillEngine';
import { formatAmount, formatMeasures, formatTime, HABIT_XP, habitGoal, habitIcons, isAmountHabit, MAX_HABITS, parseAmount, reminderTimes, weeklyTotals, type Habit } from './routines';
import { reminderNote, remindersSupported } from './reminders';
import { MicButton } from './MicButton';
import { SkillPicker } from './SkillPicker';

const teal = '#166B65';
const gold = '#F5C45A';

// Yazılan hedef/miktar: boş → null, geçersiz → NaN, aksi halde tam sayı.
const readNumber = (text: string) => {
  const value = parseAmount(text);
  return value === null || Number.isNaN(value) || Number.isInteger(value) ? value : NaN;
};

// Bugün sekmesi: kullanıcının kendi tanımladığı rutinler. Tik rutinine dokununca tik atılır ya da kaldırılır;
// miktarlı rutine dokununca bugünkü miktar girilir ("İngilizce · 20 kelime").
export function Routines() {
  const { habits, routines, entries, busy, loading, habitError, setHabitError, toggleHabit, habitCount } = useJourney();
  const [editing, setEditing] = useState(false);
  // Son rutin kaldırılınca düzenleme modu kapanır; yoksa "Bitti" düğmesi gizlendiği için kart boş
  // düzenleme modunda kalır ve ekleme formu görünmez.
  if (editing && habits.length === 0) setEditing(false);
  const [adding, setAdding] = useState(false);
  const [logging, setLogging] = useState<string | null>(null);
  if (loading) return null;
  const showAdd = !editing && (adding || habits.length === 0) && habits.length < MAX_HABITS;

  return <View style={s.card}>
    <View style={s.head}>
      <Text style={s.title}>Rutinlerim</Text>
      <View style={s.headRight}>
        {habits.length ? <Text style={[s.count, routines.complete && s.countDone]}>{routines.complete ? '🌟 Hepsi tamam' : `${routines.count}/${routines.total}`}</Text> : null}
        {habits.length ? <Pressable accessibilityRole="button" hitSlop={6} onPress={() => { setEditing(!editing); setAdding(false); setLogging(null); setHabitError(''); }} style={[s.editButton, editing && s.editButtonOn]}>
          <Text style={[s.editButtonText, editing && s.editButtonTextOn]}>{editing ? '✓ Bitti' : '✏️ Düzenle'}</Text>
        </Pressable> : null}
      </View>
    </View>
    {habits.length ? <View style={s.track}><View style={[s.fill, { width: `${routines.count / routines.total * 100}%` }]} /></View>
      : <Text style={s.intro}>Her gün takip etmek istediğin şeyi kendin tanımla: tek tikle yapılan (ör. Meditasyon) ya da miktarı olan (ör. İngilizce · kelime). Her gün +{HABIT_XP} XP getirir ve kendi serisini tutar.</Text>}

    {habits.map(habit => {
      if (editing) return <HabitEditRow key={habit.id} habit={habit} />;
      const done = routines.done.has(habit.id);
      const streak = habitStreak(entries, habit.id).count;
      const amount = isAmountHabit(habit);
      const { target, unit, hasTarget } = habitGoal(habit);
      const count = amount ? habitCount(habit) : 0;
      const progress = amount ? `${formatAmount(count)}${hasTarget ? `/${formatAmount(target)}` : ''} ${unit}` : '';
      return <View key={habit.id}>
        <Pressable
          accessibilityRole={amount ? 'button' : 'checkbox'}
          accessibilityState={amount ? { expanded: logging === habit.id, disabled: busy } : { checked: done, disabled: busy }}
          aria-checked={amount ? undefined : done}
          accessibilityLabel={`${habit.title}${amount ? `, bugün ${progress}, miktar gir` : ''}${streak ? `, ${streak} günlük seri` : ''}`}
          disabled={busy}
          onPress={() => amount ? setLogging(logging === habit.id ? null : habit.id) : toggleHabit(habit)}
          style={[s.row, done && s.rowDone]}
        >
          <Text style={s.icon}>{habit.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.habitTitle, done && s.habitTitleDone]}>{habit.title}</Text>
            {amount ? <Text style={s.summary}>{`Bugün ${progress}`}</Text> : null}
            <Text style={s.meta}>{displaySkill(habit.skill)} · +{HABIT_XP} XP{streak ? `  ·  🔥 ${streak} gün` : ''}</Text>
            {hasTarget ? <View style={s.amountTrack}><View style={[s.amountFill, { width: `${Math.min(1, count / target) * 100}%` }]} /></View> : null}
          </View>
          {amount && !done ? <View style={s.circle}><Text style={s.plus}>+</Text></View>
            : <View style={[s.circle, done && s.circleDone]}><Text style={s.circleMark}>{done ? '✓' : ''}</Text></View>}
        </Pressable>
        {logging === habit.id ? <AmountForm habit={habit} onClose={() => setLogging(null)} /> : null}
      </View>;
    })}

    {!editing && !showAdd && habits.length < MAX_HABITS ? <Pressable accessibilityRole="button" onPress={() => { setAdding(true); setHabitError(''); }} style={s.addRoutine}>
      <Text style={s.addRoutineText}>+ Rutin ekle</Text>
    </Pressable> : null}
    {showAdd ? <AddHabitForm canCancel={habits.length > 0} onClose={() => setAdding(false)} /> : null}
    {editing ? <Text style={s.note}>Simgeye dokunarak değiştir; adı, birimi ve hedefi buradan düzenle.</Text> : null}
    {habitError ? <Text style={s.error}>{habitError}</Text> : null}
    {habits.length && !editing ? <Reminder /> : null}
  </View>;
}

// Miktarlı rutinde bugünkü miktar: yazılan sayı bugünkü toplama eklenir. "+1" hızlı ekleme (ör. bir bardak su).
function AmountForm({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const { busy, habitCount, setHabitAmount } = useJourney();
  const { target, unit, hasTarget } = habitGoal(habit);
  const count = habitCount(habit);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  async function add(amount: number | null) {
    if (amount === null || Number.isNaN(amount)) { setError(`Kaç ${unit} olduğunu tam sayı olarak yaz.`); return; }
    if (await setHabitAmount(habit, count + amount)) { setValue(''); setError(''); }
  }

  return <View style={s.measure}>
    <Text style={s.measureTitle}>{`Bugün: ${formatAmount(count)}${hasTarget ? ` / ${formatAmount(target)}` : ''} ${unit}${hasTarget && count >= target ? '  ✓' : ''}`}</Text>
    <View style={s.field}>
      <TextInput accessibilityLabel={`${habit.title}: eklenecek ${unit}`} value={value} onChangeText={text => { setValue(text); setError(''); }}
        placeholder={`Kaç ${unit}?`} placeholderTextColor="#9AA6A8" inputMode="numeric" returnKeyType="done" onSubmitEditing={() => add(readNumber(value))} maxLength={7} style={s.fieldInput} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${habit.title}: ekle`} disabled={busy || !value.trim()} onPress={() => add(readNumber(value))} style={[s.saveButton, (busy || !value.trim()) && { opacity: 0.45 }]}>
        <Text style={s.saveText}>Ekle</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${habit.title}: bir ${unit} ekle`} disabled={busy} onPress={() => add(1)} style={s.quick}>
        <Text style={s.quickText}>+1</Text>
      </Pressable>
    </View>
    {error ? <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text> : null}
    <View style={s.measureActions}>
      {count > 0 ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => setHabitAmount(habit, 0)}><Text style={s.removeText}>Bugünü sıfırla</Text></Pressable> : null}
      <Pressable accessibilityRole="button" onPress={onClose}><Text style={s.cancel}>Tamam</Text></Pressable>
    </View>
  </View>;
}

// Yeni rutin: ad, isteğe bağlı birim ve günlük hedef. Birim yoksa rutin tek tikle yapılır.
function AddHabitForm({ canCancel, onClose }: { canCancel: boolean; onClose: () => void }) {
  const { busy, addHabit, setHabitError } = useJourney();
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('');
  const [target, setTarget] = useState('');

  async function submit() {
    const goal = target.trim() ? readNumber(target) : null;
    if (goal !== null && Number.isNaN(goal)) { setHabitError('Günlük hedef tam sayı olmalı.'); return; }
    if (!(await addHabit(title, { unit, target: goal }))) return;
    setTitle(''); setUnit(''); setTarget('');
    onClose();
  }
  const changeTitle = (value: string) => { setTitle(value); setHabitError(''); };

  return <View style={s.manage}>
    <View style={s.inputRow}>
      <TextInput accessibilityLabel="Yeni rutin adı" placeholder="Rutin adı, örn. İngilizce" placeholderTextColor="#9AA6A8" maxLength={60}
        returnKeyType="done" value={title} onChangeText={changeTitle} style={s.input} />
      <MicButton value={title} onChangeText={changeTitle} size={46} />
    </View>
    <View style={s.inputRow}>
      <TextInput accessibilityLabel="Birim (isteğe bağlı)" placeholder="Birim: kelime, sayfa, dk…" placeholderTextColor="#9AA6A8" maxLength={20}
        value={unit} onChangeText={value => { setUnit(value); setHabitError(''); }} style={s.input} />
      <TextInput accessibilityLabel="Günlük hedef (isteğe bağlı)" placeholder="Hedef" placeholderTextColor="#9AA6A8" inputMode="numeric" maxLength={7}
        value={target} onChangeText={value => { setTarget(value); setHabitError(''); }} style={[s.input, s.targetInput]} />
    </View>
    <Text style={s.help}>Birim yazarsan her gün miktar girersin (ör. 20 kelime). Boş bırakırsan rutin tek tikle yapılır. Hedef isteğe bağlı.</Text>
    <View style={s.formActions}>
      {canCancel ? <Pressable accessibilityRole="button" onPress={() => { onClose(); setHabitError(''); }}><Text style={s.cancel}>Vazgeç</Text></Pressable> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Rutini ekle" disabled={busy || !title.trim()} onPress={submit} style={[s.add, (busy || !title.trim()) && { opacity: 0.45 }]}>
        <Text style={s.addText}>Ekle</Text>
      </Pressable>
    </View>
  </View>;
}

// Düzenleme modunda bir rutin: simge, ad, birim, günlük hedef, beceri ve onaylı kaldırma.
function HabitEditRow({ habit }: { habit: Habit }) {
  const { busy, updateHabit, removeHabit, setHabitError } = useJourney();
  const [title, setTitle] = useState(habit.title);
  const [unit, setUnit] = useState(habit.unit ?? '');
  const [target, setTarget] = useState(habit.target && habit.unit ? String(habit.target) : '');
  const [picking, setPicking] = useState(false);
  const [choosingSkill, setChoosingSkill] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const settingsChanged = unit.trim() !== (habit.unit ?? '') || target.trim() !== (habit.target && habit.unit ? String(habit.target) : '');

  // Klavyeden çıkınca (Enter dahil) ya da sesle söylenince kaydedilir; geçersizse eski ada döner.
  async function renameTo(next: string) {
    if (!next.trim() || next.trim() === habit.title) { setTitle(habit.title); return; }
    if (!(await updateHabit(habit.id, { title: next }))) setTitle(habit.title);
  }
  async function saveSettings() {
    const goal = target.trim() ? readNumber(target) : null;
    if (goal !== null && Number.isNaN(goal)) { setHabitError('Günlük hedef tam sayı olmalı.'); return; }
    await updateHabit(habit.id, { unit, target: goal });
  }

  return <View style={s.editRow}>
    <View style={s.editLine}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Simgeyi değiştir: ${habit.title}`} accessibilityState={{ expanded: picking }} onPress={() => setPicking(!picking)} style={[s.iconButton, picking && s.iconButtonOn]}>
        <Text style={s.icon}>{habit.icon}</Text>
      </Pressable>
      <TextInput accessibilityLabel={`Rutin adı: ${habit.title}`} value={title} onChangeText={setTitle} onBlur={() => renameTo(title)} returnKeyType="done" maxLength={60} style={s.editInput} />
      <MicButton value="" onChangeText={setTitle} onFinal={renameTo} size={44} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Rutini kaldır: ${habit.title}`} onPress={() => setConfirming(true)} style={s.removePill}>
        <Text style={s.removeText}>Kaldır</Text>
      </Pressable>
    </View>
    <View style={s.goalLine}>
      <TextInput accessibilityLabel={`Birim: ${habit.title}`} placeholder="Birim (boş: tek tik)" placeholderTextColor="#9AA6A8" maxLength={20} value={unit} onChangeText={setUnit} style={s.editInput} />
      <TextInput accessibilityLabel={`Günlük hedef: ${habit.title}`} placeholder="Hedef" placeholderTextColor="#9AA6A8" inputMode="numeric" maxLength={7} value={target} onChangeText={setTarget} style={[s.editInput, s.targetInput]} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Birimi ve hedefi kaydet: ${habit.title}`} disabled={busy || !settingsChanged} onPress={saveSettings} style={[s.saveButton, (busy || !settingsChanged) && { opacity: 0.4 }]}>
        <Text style={s.saveText}>Kaydet</Text>
      </Pressable>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: choosingSkill }} onPress={() => setChoosingSkill(!choosingSkill)} style={s.skillLine}>
      <Text style={s.meta}>{`Beceri: ${displaySkill(habit.skill)} · `}<Text style={s.link}>Değiştir</Text></Text>
    </Pressable>
    {choosingSkill ? <SkillPicker exclude={[habit.skill]} disabled={busy} onCancel={() => setChoosingSkill(false)} onPick={async skill => { if (await updateHabit(habit.id, { skill })) setChoosingSkill(false); }} /> : null}
    {picking ? <View style={s.iconGrid}>
      {habitIcons.map(icon => <Pressable key={icon} accessibilityRole="button" accessibilityLabel={`Simge seç: ${icon}`} accessibilityState={{ selected: icon === habit.icon }} disabled={busy} onPress={() => { setPicking(false); if (icon !== habit.icon) updateHabit(habit.id, { icon }); }} style={[s.iconChoice, icon === habit.icon && s.iconChoiceOn]}>
        <Text style={s.iconChoiceText}>{icon}</Text>
      </Pressable>)}
    </View> : null}
    {confirming ? <View style={s.confirm}>
      <Text style={s.confirmText}>{`"${habit.title}" kaldırılsın mı? Geçmiş kayıtları ve XP'si silinmez.`}</Text>
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

// Gelişim sekmesi: miktarlı rutinlerin son 7 gündeki toplamı ("85 kelime · 5 gün"). Eski sürümde girilmiş
// adım/süre/sayfa ölçüleri de toplanır.
export function WeeklyTotals() {
  const { habits, entries, routines, habitCount } = useJourney();
  // Bugün hedefe henüz ulaşılmadıysa kayıt yoktur; bugünkü miktar yine de haftanın toplamına eklenir.
  const rows = habits.map(habit => {
    const week = weeklyTotals(habit, entries);
    const partial = isAmountHabit(habit) && !routines.done.has(habit.id) ? habitCount(habit) : 0;
    return { habit, ...week, amount: week.amount + partial, days: week.days + (partial ? 1 : 0) };
  }).filter(row => isAmountHabit(row.habit) || formatMeasures(row.totals));
  if (!rows.length) return null;
  return <View style={s.card}>
    <Text style={[s.title, { marginBottom: 6 }]}>Son 7 gün</Text>
    {rows.map(({ habit, days, amount, totals }) => {
      const parts = [amount ? `${formatAmount(amount)} ${habitGoal(habit).unit}` : '', formatMeasures(totals)].filter(Boolean).join(' · ');
      return <View key={habit.id} style={s.streakRow} accessibilityLabel={`${habit.title}: ${days ? `${parts || 'miktar yok'}, ${days} gün` : 'bu hafta yok'}`}>
        <Text style={s.icon}>{habit.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.habitTitle} numberOfLines={1}>{habit.title}</Text>
          <Text style={[s.weekTotal, !days && { color: '#9AA6A8' }]}>{days ? parts || 'Miktar girilmedi' : 'Bu hafta henüz yok'}</Text>
        </View>
        <Text style={[s.streakCount, !days && { opacity: 0.4 }]}>{days} gün</Text>
      </View>;
    })}
    <Text style={s.note}>Bugün dahil son 7 gün.</Text>
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
  summary: { color: teal, fontSize: 13, fontWeight: '800', marginTop: 2 },
  measure: { marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: '#BEDDD1', backgroundColor: '#F4FAF7', padding: 12, gap: 10 },
  measureTitle: { color: '#182637', fontSize: 14, fontWeight: '800' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldLabel: { width: 48, color: '#657482', fontSize: 13, fontWeight: '700' },
  fieldInput: { flex: 1, minWidth: 0, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#D5DFDA', backgroundColor: 'white', paddingHorizontal: 10, color: '#182637', fontSize: 15, fontWeight: '600' },
  fieldUnit: { width: 92, color: '#657482', fontSize: 13, fontWeight: '700' },
  fieldNote: { color: '#657482', fontSize: 12 },
  unitToggle: { width: 92, flexDirection: 'row', borderRadius: 10, borderWidth: 1, borderColor: '#D5DFDA', backgroundColor: 'white', overflow: 'hidden' },
  unitPill: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  unitPillOn: { backgroundColor: teal },
  unitText: { color: '#657482', fontSize: 13, fontWeight: '800' },
  unitTextOn: { color: 'white' },
  measureActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 },
  saveButton: { borderRadius: 12, backgroundColor: teal, paddingHorizontal: 14, paddingVertical: 10 },
  saveText: { color: 'white', fontSize: 13, fontWeight: '800' },
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
  weekTotal: { color: teal, fontSize: 14, fontWeight: '800', marginTop: 3 },
  amountTrack: { height: 5, borderRadius: 3, backgroundColor: '#E2E9E4', overflow: 'hidden', marginTop: 6 },
  amountFill: { height: 5, backgroundColor: gold },
  quick: { height: 42, minWidth: 46, borderRadius: 10, borderWidth: 1, borderColor: '#BEDDD1', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  quickText: { color: teal, fontSize: 14, fontWeight: '800' },
  targetInput: { flex: 0, width: 82 },
  help: { color: '#657482', fontSize: 11, lineHeight: 16, marginTop: 8 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 10 },
  skillLine: { marginTop: 8, paddingLeft: 4, paddingVertical: 4 },
});
