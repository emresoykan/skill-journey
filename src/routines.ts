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
