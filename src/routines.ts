// Günlük rutinlerin saf mantığı. Yalnız tip içe aktarır; npm test doğrudan çalıştırabilir.
import type { Analysis } from './mockAnalysis';
import type { Entry } from './storage';

export type Habit = { id: string; title: string; icon: string; skill: string; createdAt: string };
export type HabitPreset = Pick<Habit, 'title' | 'icon' | 'skill'>;

export const HABIT_XP = 10;
export const MAX_HABITS = 12;

export const habitPresets: HabitPreset[] = [
  { icon: '💧', title: 'Su iç', skill: 'Self Care' },
  { icon: '📖', title: '20 dk kitap oku', skill: 'Learning' },
  { icon: '🚶', title: 'Yürüyüş yap', skill: 'Fitness' },
  { icon: '🧘', title: 'Meditasyon', skill: 'Self Care' },
  { icon: '🛏️', title: 'Yatağını topla', skill: 'Household' },
  { icon: '📝', title: 'Günlük yaz', skill: 'Self Awareness' },
  { icon: '🏋️', title: 'Spor yap', skill: 'Fitness' },
  { icon: '📵', title: 'Ekransız akşam', skill: 'Self Care' },
];

// Düzenleme modunda rutine seçilebilecek simgeler.
export const habitIcons = ['⭐', '💧', '📖', '🚶', '🧘', '🛏️', '📝', '🏋️', '📵', '🥗', '💊', '🦷', '☀️', '🌙', '🧹', '🎸', '💻', '🚴', '🙏', '❤️'];

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const isSameDay = (iso: string, now: Date) => dayKey(new Date(iso)) === dayKey(now);
export const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');

// Rutine tik atmak, habitId taşıyan sıradan bir kayıt oluşturur; böylece XP, seri,
// günlük hedef ve rozetler ayrı bir sistem gerektirmeden çalışır.
export function habitEntriesToday(entries: Entry[], now = new Date()): Map<string, Entry> {
  const done = new Map<string, Entry>();
  for (const entry of entries) {
    if (entry.habitId && isSameDay(entry.createdAt, now) && !done.has(entry.habitId)) done.set(entry.habitId, entry);
  }
  return done;
}

export function routinesProgress(habits: Habit[], entries: Entry[], now = new Date()) {
  const done = habitEntriesToday(entries, now);
  const count = habits.filter(habit => done.has(habit.id)).length;
  return { done, count, total: habits.length, complete: habits.length > 0 && count === habits.length };
}

export function habitAnalysis(habit: Habit): Analysis {
  return {
    skill: habit.skill,
    xp: HABIT_XP,
    reason: 'Rutinini sürdürdün; küçük tekrarlar büyük fark yaratır.',
    awards: [{ skill: habit.skill, xp: HABIT_XP }],
  };
}

export function habitTitleError(title: string, habits: Habit[]): string | null {
  if (!title.trim()) return 'Rutin adı boş olamaz.';
  if (habits.length >= MAX_HABITS) return `En fazla ${MAX_HABITS} rutin ekleyebilirsin.`;
  if (habits.some(habit => normalizeTitle(habit.title) === normalizeTitle(title))) return 'Bu rutin zaten listende.';
  return null;
}

export const availablePresets = (habits: Habit[]) =>
  habitPresets.filter(preset => !habits.some(habit => normalizeTitle(habit.title) === normalizeTitle(preset.title)));

// Günlük rutin hatırlatıcısı. Bildirimler önümüzdeki günler için tek tek kurulur;
// böylece o günün rutinleri tamamsa o günün hatırlatması hiç gelmez.
export type ReminderSettings = { enabled: boolean; hour: number; minute: number };
export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 20, minute: 0 };
export const REMINDER_DAYS = 14;
export const reminderTimes: [number, number][] = [[7, 30], [9, 0], [12, 30], [18, 0], [20, 0], [21, 30]];
export const formatTime = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

export function reminderPlan(settings: ReminderSettings, habits: Habit[], entries: Entry[], now = new Date(), days = REMINDER_DAYS) {
  if (!settings.enabled || habits.length === 0) return [];
  const doneToday = routinesProgress(habits, entries, now).count;
  const plan: { date: Date; body: string }[] = [];
  for (let offset = 0; offset < days; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, settings.hour, settings.minute);
    if (date <= now) continue;
    const left = offset === 0 ? habits.length - doneToday : habits.length;
    if (left > 0) plan.push({ date, body: `${left} rutinin seni bekliyor. Serini koru 🔥` });
  }
  return plan;
}
