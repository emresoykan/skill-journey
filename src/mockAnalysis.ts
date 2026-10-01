export type SkillAward = { skill: string; xp: number };
export type Analysis = { skill: string; xp: number; reason: string; awards: SkillAward[] };

const rules = [
  { skill: 'Communication', words: ['talk', 'spoke', 'explain', 'present', 'listen', 'message', 'konuş', 'anlat', 'sunum', 'dinle', 'paylaş', 'toplant'], reason: 'Düşüncelerini ifade ettin veya birini dinledin.' },
  { skill: 'Problem Solving', words: ['solve', 'fix', 'debug', 'issue', 'problem', 'tricky', 'çöz', 'hata', 'sorun', 'düzelt'], reason: 'Bir sorunu ele alıp çözüm için adım attın.' },
  { skill: 'Collaboration', words: ['team', 'help', 'together', 'support', 'friend', 'colleague', 'ekip', 'yardım', 'birlikte', 'arkadaş', 'destek'], reason: 'Birine destek oldun veya birlikte ilerledin.' },
  { skill: 'Learning', words: ['learn', 'study', 'read', 'practice', 'course', 'new', 'öğren', 'çalış', 'oku', 'pratik', 'yeni', 'araştır'], reason: 'Yeni bir şey öğrenmeye veya anlamaya zaman ayırdın.' },
  { skill: 'Creativity', words: ['create', 'write', 'design', 'draw', 'make', 'yarat', 'tasar', 'çiz', 'yaz', 'üret'], reason: 'Bir fikri geliştirdin veya ortaya yeni bir şey koydun.' },
  { skill: 'Resilience', words: ['hard', 'difficult', 'failed', 'again', 'try', 'challenge', 'zor', 'tekrar', 'dene', 'başarısız', 'vazgeç'], reason: 'Zorluk karşısında çabalamaya devam ettin.' },
  { skill: 'Finance', words: ['finans', 'borsa', 'dolar', 'sermaye', 'yatırım', 'bilanço', 'karlılık', 'kârlılık', 'hisse', 'budget', 'finance'], reason: 'Finansla ilgili bir konuya zaman ayırdın.' },
  { skill: 'Cooking', words: ['makarna', 'yemek', 'pişir', 'tarif', 'mutfak', 'cook', 'recipe'], reason: 'Yemek yapma konusunda deneyim kazandın.' },
  { skill: 'Fitness', words: ['spor', 'koş', 'antrenman', 'egzersiz', 'yüz', 'fitness', 'workout', 'run'], reason: 'Fiziksel gelişimin için harekete geçtin.' },
  { skill: 'Parenting', words: ['çocuğ', 'çocuk', 'ebeveyn', 'oğlum', 'kızım', 'parent', 'child'], reason: 'Ailenle ilgili bir deneyim yaşadın.' },
  { skill: 'Confidence', words: ['cesaret', 'kendime güvend', 'savun', 'çekinmed', 'confidence'], reason: 'Kendini ortaya koyma pratiği yaptın.' },
  { skill: 'Assertiveness', words: ['savun', 'hakkımı', 'sınır', 'hayır', 'assertive'], reason: 'Görüşünü veya sınırlarını ifade ettin.' },
  { skill: 'Negotiation', words: ['müzakere', 'pazarlık', 'uzlaş', 'ikna', 'negotiat'], reason: 'Ortak bir sonuca ulaşmak için görüşme yaptın.' },
] as const;

const skillNames: Record<string, string> = {
  Communication: 'İletişim',
  'Problem Solving': 'Problem Çözme',
  Collaboration: 'İş Birliği',
  Learning: 'Öğrenme',
  Creativity: 'Yaratıcılık',
  Resilience: 'Dayanıklılık',
  'Self Awareness': 'Öz Farkındalık',
  Finance: 'Finans',
  Cooking: 'Yemek Yapma',
  Fitness: 'Fitness',
  Parenting: 'Ebeveynlik',
  Confidence: 'Özgüven',
  Assertiveness: 'Kendini Savunma',
  Negotiation: 'Müzakere',
};

export const displaySkill = (skill: string) => skillNames[skill] ?? skill;
export const availableSkills = [...rules.map(rule => rule.skill), 'Self Awareness'];

export async function analyzeExperience(description: string): Promise<Analysis> {
  // Yerel örnek analiz: ağ bağlantısı ve API anahtarı gerekmez.
  await new Promise(resolve => setTimeout(resolve, 450));
  const words = description.toLocaleLowerCase('tr-TR').match(/[\p{L}\p{N}]+/gu) ?? [];
  const ranked = rules.map((rule, index) => ({
    rule,
    index,
    matches: rule.words.filter(stem => words.some(word => word.startsWith(stem))).length,
  })).sort((a, b) => b.matches - a.matches || a.index - b.index);
  const matched = ranked.filter(item => item.matches > 0).slice(0, 3);
  const awards: SkillAward[] = matched.length
    ? matched.map(item => ({
        skill: item.rule.skill,
        xp: Math.min(18, 8 + item.matches * 3 + Math.min(4, Math.floor(words.length / 8))),
      }))
    : [{ skill: 'Self Awareness', xp: 10 }];
  const primary = awards[0];
  const xp = awards.reduce((sum, award) => sum + award.xp, 0);
  return {
    skill: primary.skill,
    xp,
    awards,
    reason: matched.length ? matched[0].rule.reason : 'Gününü düşünmek, kendi gelişimini fark etmene yardımcı olur.',
  };
}
