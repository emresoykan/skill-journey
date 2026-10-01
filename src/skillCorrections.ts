import type { Entry } from './storage';

export function correctSkillAward(entry: Entry, fromSkill: string, toSkill: string): Entry {
  if (fromSkill === toSkill) return entry;
  const source = entry.awards.find(award => award.skill === fromSkill);
  if (!source) throw new Error('Beceri kayıtta bulunamadı.');

  const awards = entry.awards.reduce<Entry['awards']>((merged, award) => {
    const skill = award.skill === fromSkill ? toSkill : award.skill;
    const existing = merged.find(item => item.skill === skill);
    if (existing) existing.xp += award.xp;
    else merged.push({ skill, xp: award.xp });
    return merged;
  }, []);

  return {
    ...entry,
    skill: awards[0].skill,
    awards,
    xp: awards.reduce((sum, award) => sum + award.xp, 0),
    reason: 'Beceri eşleşmesini sen düzelttin.',
  };
}
