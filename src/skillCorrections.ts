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

// Önerilen bir beceri kayıttan çıkarılır; XP'si de düşer. Son beceri çıkarılamaz (yerine başkası seçilir).
export function removeSkillAward(entry: Entry, skill: string): Entry {
  const awards = entry.awards.filter(award => award.skill !== skill);
  if (awards.length === entry.awards.length) throw new Error('Beceri kayıtta bulunamadı.');
  if (!awards.length) throw new Error('Son beceri çıkarılamaz; istersen değiştir.');
  return { ...entry, skill: awards[0].skill, awards, xp: awards.reduce((sum, award) => sum + award.xp, 0) };
}

// Düzenleme becerileri yeniden belirler ama XP'yi artıramaz: aksi halde aynı kaydı
// uzatarak puan kasılabilir. Toplam ilk kazanılan XP'yi aşarsa beceriler orantılı küçültülür.
export function capAwards(awards: Entry['awards'], maxXp: number): Entry['awards'] {
  const total = awards.reduce((sum, award) => sum + award.xp, 0);
  if (total <= maxXp) return awards;
  const scaled = awards.map(award => ({ skill: award.skill, xp: Math.max(1, Math.floor(award.xp * maxXp / total)) }));
  // Yuvarlamadan kalan puanı en büyük beceriye ekle; toplam tam olarak maxXp olsun.
  const rest = maxXp - scaled.reduce((sum, award) => sum + award.xp, 0);
  if (rest > 0) scaled[0] = { ...scaled[0], xp: scaled[0].xp + rest };
  return scaled;
}
