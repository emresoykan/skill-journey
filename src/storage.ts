import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Analysis, SkillAward } from './mockAnalysis';
import type { Habit } from './routines';

// bonusXp: günlük görevden gelen ek XP; beceriye değil toplam XP'ye eklenir.
// habitId: kayıt bir rutine tik atılarak oluştuysa o rutinin kimliği.
export type Entry = Analysis & { id: string; createdAt: string; description: string; bonusXp?: number; habitId?: string };
const KEY = 'skill-journey:entries:v1';
const HABITS_KEY = 'skill-journey:habits:v1';

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
      return { ...entry, awards, bonusXp: typeof entry.bonusXp === 'number' && entry.bonusXp > 0 ? entry.bonusXp : undefined, habitId: typeof entry.habitId === 'string' ? entry.habitId : undefined };
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
    && ['id', 'title', 'icon', 'skill', 'createdAt'].every(key => typeof habit[key] === 'string'));
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}
