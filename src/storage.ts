import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Analysis, SkillAward } from './mockAnalysis';
import type { Habit, HabitCounts, Measure, MeasureValues } from './routines';
import type { Learning, Reviews } from './learning';

// bonusXp: günlük görevden gelen ek XP; beceriye değil toplam XP'ye eklenir.
// habitId: kayıt bir rutine tik atılarak oluştuysa o rutinin kimliği.
// measures: rutin tikiyle girilen ölçüler (adım, dakika, sayfa).
// learning: "Öğrendiklerim" kaydının kavramı ve anlamı. review: günün tekrar oturumu (kaç kavram hatırlandı).
export type Entry = Analysis & { id: string; createdAt: string; description: string; bonusXp?: number; habitId?: string; measures?: MeasureValues; learning?: Learning; review?: { count: number } };
const KEY = 'skill-journey:entries:v1';
const HABITS_KEY = 'skill-journey:habits:v1';
const REVIEWS_KEY = 'skill-journey:reviews:v1';
const HABIT_COUNTS_KEY = 'skill-journey:habit-counts:v1';
const MEASURES: Measure[] = ['steps', 'duration', 'pages'];
const validMeasures = (value: unknown): MeasureValues | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const values = Object.fromEntries(MEASURES.filter(key => typeof (value as MeasureValues)[key] === 'number' && (value as MeasureValues)[key]! > 0).map(key => [key, (value as MeasureValues)[key]]));
  return Object.keys(values).length ? values : undefined;
};

export async function loadEntries(): Promise<Entry[]> {
  const stored = await AsyncStorage.getItem(KEY);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((entry): entry is Entry => !!entry && typeof entry === 'object' && typeof entry.id === 'string' && typeof entry.description === 'string' && typeof entry.skill === 'string' && typeof entry.xp === 'number' && typeof entry.createdAt === 'string')
    .map(entry => {
      const awards: SkillAward[] = Array.isArray(entry.awards) && entry.awards.every(award =>
        !!award && typeof award.skill === 'string' && typeof award.xp === 'number'
      ) && entry.awards.length > 0
        ? entry.awards
        : [{ skill: entry.skill, xp: entry.xp }];
      const learning = typeof entry.learning?.term === 'string' && typeof entry.learning?.meaning === 'string' ? { term: entry.learning.term, meaning: entry.learning.meaning } : undefined;
      const review = Number.isInteger(entry.review?.count) && entry.review!.count > 0 ? { count: entry.review!.count } : undefined;
      return { ...entry, awards, bonusXp: typeof entry.bonusXp === 'number' && entry.bonusXp > 0 ? entry.bonusXp : undefined, habitId: typeof entry.habitId === 'string' ? entry.habitId : undefined, measures: validMeasures(entry.measures), learning, review };
    });
}

export async function saveEntries(entries: Entry[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(entries));
}

export async function loadHabits(): Promise<Habit[]> {
  const stored = await AsyncStorage.getItem(HABITS_KEY);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((habit): habit is Habit => !!habit && typeof habit === 'object'
    && ['id', 'title', 'icon', 'skill', 'createdAt'].every(key => typeof habit[key] === 'string'))
    .map(habit => ({ ...habit, target: Number.isInteger(habit.target) && habit.target! >= 1 ? habit.target : undefined, unit: typeof habit.unit === 'string' && habit.unit.trim() ? habit.unit : undefined,
      measures: Array.isArray(habit.measures) ? habit.measures.filter((m: unknown): m is Measure => MEASURES.includes(m as Measure)) : undefined }));
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

export async function loadReviews(): Promise<Reviews> {
  const stored = await AsyncStorage.getItem(REVIEWS_KEY);
  if (!stored) return {};
  const parsed: unknown = JSON.parse(stored);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed).filter(([, state]) =>
    !!state && Number.isInteger(state.stage) && typeof state.due === 'string'));
}

export async function saveReviews(reviews: Reviews): Promise<void> {
  await AsyncStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
}

export async function loadHabitCounts(): Promise<HabitCounts> {
  const stored = await AsyncStorage.getItem(HABIT_COUNTS_KEY);
  if (!stored) return {};
  const parsed: unknown = JSON.parse(stored);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed).filter(([, state]) =>
    !!state && typeof state.day === 'string' && Number.isInteger(state.count) && state.count >= 0));
}

export async function saveHabitCounts(counts: HabitCounts): Promise<void> {
  await AsyncStorage.setItem(HABIT_COUNTS_KEY, JSON.stringify(counts));
}
