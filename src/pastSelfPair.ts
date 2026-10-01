import type { Entry } from './storage';

export type PastSelfPair = {
  earlier: Entry;
  later: Entry;
  skill: string;
  daysApart: number;
};

const dayNumber = (date: Date) =>
  Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);

export function findPastSelfPair(entries: Entry[]): PastSelfPair | null {
  const dated = entries
    .map(entry => ({ entry, date: new Date(entry.createdAt) }))
    .filter(item => Number.isFinite(item.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  for (let laterIndex = 0; laterIndex < dated.length; laterIndex++) {
    const later = dated[laterIndex];
    for (let earlierIndex = laterIndex + 1; earlierIndex < dated.length; earlierIndex++) {
      const earlier = dated[earlierIndex];
      const daysApart = dayNumber(later.date) - dayNumber(earlier.date);
      if (daysApart < 7) continue;
      const earlierSkills = new Set(earlier.entry.awards.map(award => award.skill));
      const shared = later.entry.awards.find(award => earlierSkills.has(award.skill));
      if (shared) return {
        earlier: earlier.entry,
        later: later.entry,
        skill: shared.skill,
        daysApart,
      };
    }
  }
  return null;
}
