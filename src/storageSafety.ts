// Saklanan verinin doğrulanması ve okunamayan verinin korunması. Saf mantık; npm test doğrudan çalıştırabilir.
import type { SkillAward } from './mockAnalysis';
import type { Measure, MeasureValues } from './routines';
import type { Entry } from './storage';

const MEASURES: Measure[] = ['steps', 'duration', 'pages'];
export const validMeasures = (value: unknown): MeasureValues | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const values = Object.fromEntries(MEASURES.filter(key => typeof (value as MeasureValues)[key] === 'number' && (value as MeasureValues)[key]! > 0).map(key => [key, (value as MeasureValues)[key]]));
  return Object.keys(values).length ? values : undefined;
};

const isEntryShape = (entry: unknown): entry is Entry => {
  const item = entry as Entry;
  return !!item && typeof item === 'object' && typeof item.id === 'string' && typeof item.description === 'string'
    && typeof item.skill === 'string' && typeof item.xp === 'number' && Number.isFinite(item.xp) && typeof item.createdAt === 'string';
};

// Geçerli kayıtları onarıp döner; okunamayanları rejected'da ham haliyle verir (çağıran korur).
export function parseEntries(value: unknown): { entries: Entry[]; rejected: unknown[] } {
  if (!Array.isArray(value)) return { entries: [], rejected: value === undefined || value === null ? [] : [value] };
  const rejected = value.filter(entry => !isEntryShape(entry));
  const entries = value.filter(isEntryShape).map(entry => {
    const awards: SkillAward[] = Array.isArray(entry.awards) && entry.awards.every(award =>
      !!award && typeof award.skill === 'string' && typeof award.xp === 'number'
    ) && entry.awards.length > 0
      ? entry.awards
      : [{ skill: entry.skill, xp: entry.xp }];
    const learning = typeof entry.learning?.term === 'string' && typeof entry.learning?.meaning === 'string' ? { term: entry.learning.term, meaning: entry.learning.meaning } : undefined;
    const review = Number.isInteger(entry.review?.count) && entry.review!.count > 0 ? { count: entry.review!.count } : undefined;
    return { ...entry, awards, bonusXp: typeof entry.bonusXp === 'number' && entry.bonusXp > 0 ? entry.bonusXp : undefined, habitId: typeof entry.habitId === 'string' ? entry.habitId : undefined, measures: validMeasures(entry.measures), learning, review };
  });
  return { entries, rejected };
}

// Dizi biçimli veride geçerli ögeleri ayırır; geri kalanlar rejected.
export function splitArray<T>(value: unknown, valid: (item: unknown) => item is T): { items: T[]; rejected: unknown[] } {
  if (!Array.isArray(value)) return { items: [], rejected: value === undefined || value === null ? [] : [value] };
  return { items: value.filter(valid), rejected: value.filter(item => !valid(item)) };
}

// Kimlik → durum biçimli veride (tekrarlar, sayılı rutinler) aynı ayrım.
export function splitRecord<T>(value: unknown, valid: (item: unknown) => item is T): { items: Record<string, T>; rejected: unknown[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { items: {}, rejected: value === undefined || value === null ? [] : [value] };
  const pairs = Object.entries(value);
  return {
    items: Object.fromEntries(pairs.filter(([, item]) => valid(item))) as Record<string, T>,
    rejected: pairs.filter(([, item]) => !valid(item)).map(([id, item]) => ({ [id]: item })),
  };
}
