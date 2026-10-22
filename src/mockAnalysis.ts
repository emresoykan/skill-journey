export type SkillAward = { skill: string; xp: number };
export type Analysis = { skill: string; xp: number; reason: string; awards: SkillAward[] };

const rules = [
  { skill: 'Communication', words: ['talk', 'spoke', 'explain', 'present', 'listen', 'message', 'mesaj', 'konuş', 'anlat', 'sunum', 'dinle', 'paylaş', 'toplant'], reason: 'Düşüncelerini ifade ettin veya birini dinledin.' },
  { skill: 'Problem Solving', words: ['solve', 'fix', 'debug', 'issue', 'problem', 'tricky', 'çöz', 'hata', 'sorun', 'düzelt'], reason: 'Bir sorunu ele alıp çözüm için adım attın.' },
  { skill: 'Collaboration', words: ['team', 'help', 'together', 'support', 'friend', 'colleague', 'ekip', 'yardım', 'birlikte', 'arkadaş', 'destek'], reason: 'Birine destek oldun veya birlikte ilerledin.' },
  // "Kelime: anlamı" gibi kısa öğrenme notları da sayılır (kelime, kavram, terim, anlamı, demekmiş).
  { skill: 'Learning', words: ['learn', 'study', 'read', 'practice', 'course', 'new', 'vocabulary', 'concept', 'meaning', 'öğren', 'çalış', 'oku', 'pratik', 'yeni', 'araştır', 'kelime', 'kavram', 'konu', 'terim', 'anlamı', 'anlamın', 'demekmiş', 'demektir'], reason: 'Yeni bir şey öğrenmeye veya anlamaya zaman ayırdın.' },
  { skill: 'Creativity', words: ['create', 'write', 'design', 'draw', 'make', 'yarat', 'tasar', 'çiz', 'yaz', 'üret'], reason: 'Bir fikri geliştirdin veya ortaya yeni bir şey koydun.' },
  // "denedim" tek başına yeni bir şeyi denemektir; azim ancak "tekrar", "zor", "vazgeçmedim" gibi sözcüklerle anlaşılır.
  { skill: 'Resilience', words: ['hard', 'difficult', 'failed', 'again', 'challenge', 'zor', 'tekrar', 'başarısız', 'vazgeç'], reason: 'Zorluk karşısında çabalamaya devam ettin.' },
  { skill: 'Finance', specific: true, words: ['finans', 'borsa', 'dolar', 'sermaye', 'yatırım', 'bilanço', 'karlılık', 'kârlılık', 'hisse', 'budget', 'finance'], reason: 'Finansla ilgili bir konuya zaman ayırdın.' },
  { skill: 'Cooking', specific: true, words: ['makarna', 'yemek', 'pişir', 'tarif', 'mutfak', 'cook', 'recipe'], reason: 'Yemek yapma konusunda deneyim kazandın.' },
  { skill: 'Fitness', specific: true, words: ['spor', 'koş', 'antrenman', 'egzersiz', 'yüzme', 'yüzdü', 'yürü', 'bisiklet', 'fitness', 'workout', 'run'], reason: 'Fiziksel gelişimin için harekete geçtin.' },
  { skill: 'Music', specific: true, words: ['müzik', 'gitar', 'piyano', 'keman', 'bateri', 'davul', 'enstrüman', 'şarkı', 'nota', 'beste', 'konser', 'music', 'guitar', 'piano', 'sing'], reason: 'Müzikle uğraşarak kendini geliştirdin.' },
  { skill: 'Parenting', specific: true, words: ['çocuğ', 'çocuk', 'ebeveyn', 'oğlum', 'kızım', 'parent', 'child'], reason: 'Ailenle ilgili bir deneyim yaşadın.' },
  { skill: 'Confidence', words: ['cesaret', 'kendime güvend', 'savun', 'çekinmed', 'confidence'], reason: 'Kendini ortaya koyma pratiği yaptın.' },
  { skill: 'Assertiveness', words: ['savun', 'hakkımı', 'sınır', 'hayır', 'assertive'], reason: 'Görüşünü veya sınırlarını ifade ettin.' },
  { skill: 'Negotiation', words: ['müzakere', 'pazarlık', 'uzlaş', 'ikna', 'negotiat'], reason: 'Ortak bir sonuca ulaşmak için görüşme yaptın.' },
  // Gündelik işler: kısa "bugün yaptıklarım" kayıtları için.
  { skill: 'Household', words: ['temizl', 'çamaşır', 'bulaşık', 'ütü', 'süpür', 'toparla', 'düzenle', 'tamir', 'bahçe', 'clean', 'laundry'], reason: 'Yaşadığın alanı düzene soktun.' },
  { skill: 'Organization', words: ['fatura', 'öde', 'plan', 'liste', 'alışveriş', 'market', 'randevu', 'organize', 'takvim', 'hallett', 'ayarla', 'schedule'], reason: 'Hayatının bir parçasını planlayıp yoluna koydun.' },
  { skill: 'Self Care', words: ['uyudu', 'uyku', 'dinlen', 'meditasyon', 'doktor', 'ilaç', 'yürü', 'nefes', 'sleep', 'rest'], reason: 'Kendine iyi bakmak için zaman ayırdın.' },
  { skill: 'Productivity', words: ['bitir', 'tamamla', 'teslim', 'rapor', 'mail', 'posta', 'proje', 'görev', 'hazırla', 'gönder', 'finish', 'done'], reason: 'Bir işi ilerletip sonuca bağladın.' },
  { skill: 'Relationships', words: ['aile', 'anne', 'baba', 'eşim', 'kardeş', 'ziyaret', 'sohbet', 'aradım', 'buluş', 'family', 'visit'], reason: 'Sevdiklerinle bağını güçlendirdin.' },
] as const satisfies readonly { skill: string; words: readonly string[]; reason: string; specific?: boolean }[];

// Kısa kökler alakasız kelimelere takılmasın: kök → bu öneklerle başlayan kelimeler o kök için sayılmaz.
const falseFriends: Record<string, readonly string[]> = {
  dinle: ['dinlen'],
  read: ['ready'],
  oku: ['okul'],
  konu: ['konuş', 'konut', 'konum', 'konuk'],
  yeni: ['yeniden'],
  ekip: ['ekipman'],
  tasar: ['tasarruf'],
  yaz: ['yazın', 'yazlık', 'yazık'],
  üret: ['üretim', 'üretici'],
  dene: ['deneyim', 'denet'],
  zor: ['zorunlu'],
  hisse: ['hisset'],
  tarif: ['tarife'],
  koş: ['koşul'],
  sınır: ['sınırlı'],
  hayır: ['hayırlı', 'hayırsever'],
  düzenle: ['düzenleyici', 'düzenleme'],
  öde: ['ödev', 'ödenek'],
  yürü: ['yürürl', 'yürüt'],
  rest: ['resta', 'resto'],
  sing: ['singl', 'singap'],
};

// Boşluk içeren kökler ("kendime güvend") kelime sınırından başlayan ifade olarak aranır.
const matchesStem = (stem: string, words: string[], text: string) =>
  stem.includes(' ')
    ? text.includes(` ${stem}`)
    : words.some(word => word.startsWith(stem) && !falseFriends[stem]?.some(prefix => word.startsWith(prefix)));

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
  Music: 'Müzik',
  Parenting: 'Ebeveynlik',
  Confidence: 'Özgüven',
  Assertiveness: 'Kendini Savunma',
  Negotiation: 'Müzakere',
  Household: 'Ev Düzeni',
  Organization: 'Planlama',
  'Self Care': 'Öz Bakım',
  Productivity: 'Üretkenlik',
  Relationships: 'İlişkiler',
};

export const displaySkill = (skill: string) => skillNames[skill] ?? skill;
export const availableSkills = [...rules.map(rule => rule.skill), 'Self Awareness'];

export async function analyzeExperience(description: string): Promise<Analysis> {
  // Yerel örnek analiz: ağ bağlantısı ve API anahtarı gerekmez.
  await new Promise(resolve => setTimeout(resolve, 450));
  return scoreExperience(description);
}

// Bekleme olmadan çalışan saf eşleştirme; testler bunu doğrudan kullanır.
export function scoreExperience(description: string): Analysis {
  const words = description.toLocaleLowerCase('tr-TR').match(/[\p{L}\p{N}]+/gu) ?? [];
  const text = ` ${words.join(' ')}`;
  const ranked = rules.map((rule, index) => ({
    rule,
    index,
    specific: 'specific' in rule && rule.specific ? 1 : 0,
    matches: rule.words.filter(stem => matchesStem(stem, words, text)).length,
  // Eşitlikte belirli bir alan (Müzik, Yemek Yapma...) genel beceriden (Öğrenme...) önce gelir.
  })).sort((a, b) => b.matches - a.matches || b.specific - a.specific || a.index - b.index);
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
