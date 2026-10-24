// Deneyimden beceriye: yerel, açıklanabilir kural motoru ve beceri kataloğu.
// Ağ bağlantısı, API anahtarı ya da yapay zekâ kullanmaz; her öneri metindeki kelimelere dayanır.
// Saf modül (yalnız tip içe aktarır); npm test doğrudan çalıştırabilir.

export type SkillAward = { skill: string; xp: number };
export type Depth = 'exposure' | 'learned' | 'practiced' | 'applied' | 'produced' | 'taught' | 'mastery';
// Motorun bir beceri önerisi: neden önerildiği (rationale), metindeki dayanağı (evidence) ve güveni.
export type Suggestion = { skill: string; xp: number; confidence: number; evidence: string[]; rationale: string };
// engine/depth/suggestions yalnız yeni motorla oluşan kayıtlarda bulunur; eski kayıtlar olduğu gibi kalır.
export type Analysis = {
  skill: string; xp: number; reason: string; awards: SkillAward[];
  engine?: typeof ENGINE; depth?: Depth; depthEvidence?: string; suggestions?: Suggestion[]; xpNote?: string;
};
export const ENGINE = 'rules@2';

// ── Beceri kataloğu ────────────────────────────────────────────────────────────
// id'ler İngilizce ve kalıcıdır (eski kayıtlar bunlarla saklı); ad Türkçe gösterilir.
export type Domain = 'career' | 'finance' | 'learning' | 'health' | 'mind' | 'social' | 'creative' | 'life';
export type SkillDef = { id: string; name: string; domain: Domain; parent?: string };

export const domains: Record<Domain, string> = {
  career: 'Kariyer ve İş',
  finance: 'Finans',
  learning: 'Öğrenme',
  health: 'Sağlık ve Hareket',
  mind: 'Zihin ve Öz Farkındalık',
  social: 'İletişim ve İlişkiler',
  creative: 'Yaratıcılık ve Hobiler',
  life: 'Yaşam Becerileri',
};

export const catalog: SkillDef[] = [
  { id: 'Problem Solving', name: 'Problem Çözme', domain: 'career' },
  { id: 'Analytical Thinking', name: 'Analitik Düşünme', domain: 'career' },
  { id: 'Data Analysis', name: 'Veri Analizi', domain: 'career', parent: 'Analytical Thinking' },
  { id: 'Productivity', name: 'Üretkenlik', domain: 'career' },
  { id: 'Project Management', name: 'Proje Yönetimi', domain: 'career', parent: 'Productivity' },
  { id: 'Collaboration', name: 'İş Birliği', domain: 'career' },
  { id: 'Leadership', name: 'Liderlik', domain: 'career' },
  { id: 'Software Development', name: 'Yazılım Geliştirme', domain: 'career' },
  { id: 'Energy Markets', name: 'Enerji Piyasaları', domain: 'career' },
  { id: 'Finance', name: 'Finans', domain: 'finance' },
  { id: 'Financial Analysis', name: 'Finansal Analiz', domain: 'finance', parent: 'Finance' },
  { id: 'Financial Reporting', name: 'Finansal Raporlama', domain: 'finance', parent: 'Financial Analysis' },
  { id: 'Cash Flow Forecasting', name: 'Nakit Akış Tahmini', domain: 'finance', parent: 'Financial Analysis' },
  { id: 'Budgeting', name: 'Bütçeleme', domain: 'finance', parent: 'Financial Analysis' },
  { id: 'Treasury Management', name: 'Hazine Yönetimi', domain: 'finance', parent: 'Finance' },
  { id: 'Interest Rate Risk', name: 'Faiz Riski', domain: 'finance', parent: 'Treasury Management' },
  { id: 'Debt Management', name: 'Borç Yönetimi', domain: 'finance', parent: 'Treasury Management' },
  { id: 'Investment Analysis', name: 'Yatırım Analizi', domain: 'finance', parent: 'Finance' },
  { id: 'Valuation', name: 'Değerleme', domain: 'finance', parent: 'Investment Analysis' },
  { id: 'Portfolio Management', name: 'Portföy Yönetimi', domain: 'finance', parent: 'Investment Analysis' },
  { id: 'Accounting', name: 'Muhasebe', domain: 'finance', parent: 'Finance' },
  { id: 'Personal Finance', name: 'Kişisel Finans', domain: 'finance', parent: 'Finance' },
  { id: 'Learning', name: 'Öğrenme', domain: 'learning' },
  { id: 'Languages', name: 'Yabancı Dil', domain: 'learning', parent: 'Learning' },
  { id: 'Reading', name: 'Okuma', domain: 'learning', parent: 'Learning' },
  { id: 'Research', name: 'Araştırma', domain: 'learning', parent: 'Learning' },
  { id: 'Fitness', name: 'Fitness', domain: 'health' },
  { id: 'Self Care', name: 'Öz Bakım', domain: 'health' },
  { id: 'Self Awareness', name: 'Öz Farkındalık', domain: 'mind' },
  { id: 'Resilience', name: 'Dayanıklılık', domain: 'mind' },
  { id: 'Confidence', name: 'Özgüven', domain: 'mind' },
  { id: 'Mindfulness', name: 'Meditasyon ve Farkındalık', domain: 'mind' },
  { id: 'Communication', name: 'İletişim', domain: 'social' },
  { id: 'Public Speaking', name: 'Sunum', domain: 'social', parent: 'Communication' },
  { id: 'Negotiation', name: 'Müzakere', domain: 'social', parent: 'Communication' },
  { id: 'Assertiveness', name: 'Kendini Savunma', domain: 'social', parent: 'Communication' },
  { id: 'Relationships', name: 'İlişkiler', domain: 'social' },
  { id: 'Parenting', name: 'Ebeveynlik', domain: 'social' },
  { id: 'Creativity', name: 'Yaratıcılık', domain: 'creative' },
  { id: 'Writing', name: 'Yazarlık', domain: 'creative', parent: 'Creativity' },
  { id: 'Design', name: 'Tasarım', domain: 'creative', parent: 'Creativity' },
  { id: 'Music', name: 'Müzik', domain: 'creative' },
  { id: 'Household', name: 'Ev Düzeni', domain: 'life' },
  { id: 'Cooking', name: 'Yemek Yapma', domain: 'life' },
  { id: 'Organization', name: 'Planlama', domain: 'life' },
];

const byId = new Map(catalog.map(skill => [skill.id, skill]));
// Katalogda olmayan ad, kullanıcının kendi eklediği beceridir; olduğu gibi gösterilir.
export const displaySkill = (skill: string) => byId.get(skill)?.name ?? skill;
export const isCustomSkill = (skill: string) => !byId.has(skill);
export const ancestorsOf = (skill: string): string[] => {
  const result: string[] = [];
  for (let parent = byId.get(skill)?.parent; parent; parent = byId.get(parent)?.parent) result.push(parent);
  return result;
};
// skill, ancestor'ın kendisi ya da alt becerisi mi? (ör. Sunum, İletişim'in altındadır)
export const isWithin = (skill: string, ancestor: string) => skill === ancestor || ancestorsOf(skill).includes(ancestor);
// "Finans › Finansal Analiz" gibi üst kategori yolu (becerinin kendisi hariç).
export const parentPath = (skill: string) => ancestorsOf(skill).reverse().map(displaySkill).join(' › ');
export const domainOf = (skill: string): string => {
  const def = byId.get(skill);
  return def ? domains[def.domain] : 'Kendi becerilerin';
};

// Kullanıcının kendi beceri adını temizler; boşsa ya da çok uzunsa null.
export function customSkillName(name: string): string | null {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean || clean.length > 40) return null;
  const known = catalog.find(skill => skill.name.toLocaleLowerCase('tr-TR') === clean.toLocaleLowerCase('tr-TR'));
  return known?.id ?? clean;
}

// ── Kurallar ───────────────────────────────────────────────────────────────────
// stems: kelime başı eşleşir ("koş" → koştum). Boşluk içeren kök ifade olarak aranır ("nakit akış").
// weak: tek başına zayıf kanıt; alana özgü bir beceri bulunduysa sayılmaz ("created a forecast" yaratıcılık değildir).
// support: kural başka bir kanıtla eşleştiyse güveni artırır, tek başına öneri doğurmaz ("tahmin").
// specific: belirli bir alan; eşitlikte genel becerinin önüne geçer.
type Rule = { skill: string; reason: string; stems: readonly string[]; weak?: readonly string[]; support?: readonly string[]; specific?: boolean };

const rules: Rule[] = [
  { skill: 'Communication', reason: 'Düşüncelerini ifade ettin veya birini dinledin.', stems: ['talk', 'spoke', 'explain', 'listen', 'message', 'mesaj', 'konuş', 'anlat', 'dinle', 'paylaş', 'toplant', 'meeting'] },
  { skill: 'Public Speaking', reason: 'Bir topluluğun önünde fikirlerini sundun.', stems: ['sunum', 'sundum', 'present', 'konuşma yaptım', 'webinar'] },
  { skill: 'Problem Solving', reason: 'Bir sorunu ele alıp çözüm için adım attın.', stems: ['solve', 'fix', 'debug', 'issue', 'problem', 'tricky', 'çöz', 'hata', 'sorun', 'düzelt'] },
  { skill: 'Collaboration', reason: 'Birine destek oldun veya birlikte ilerledin.', stems: ['team', 'help', 'together', 'support', 'friend', 'colleague', 'ekip', 'yardım', 'birlikte', 'arkadaş', 'destek'] },
  { skill: 'Learning', reason: 'Yeni bir şey öğrenmeye veya anlamaya zaman ayırdın.', stems: ['learn', 'study', 'studied', 'practice', 'course', 'vocabulary', 'concept', 'meaning', 'öğren', 'çalış', 'pratik', 'kelime', 'kavram', 'konu', 'terim', 'anlamı', 'anlamın', 'demekmiş', 'demektir', 'ezber', 'ders', 'eğitim'], weak: ['new', 'yeni'] },
  { skill: 'Reading', reason: 'Okuyarak bilgi edindin.', stems: ['oku', 'read', 'kitap', 'book', 'makale okudum'] },
  { skill: 'Research', reason: 'Bir konuyu araştırıp kaynaklara baktın.', stems: ['araştır', 'research'] },
  { skill: 'Languages', reason: 'Yabancı bir dil üzerinde çalıştın.', specific: true, stems: ['ingilizce', 'almanca', 'fransızca', 'ispanyolca', 'italyanca', 'rusça', 'arapça', 'japonca', 'çince', 'hintçe', 'korece', 'yabancı dil', 'dil kursu', 'english', 'german', 'french', 'spanish', 'language', 'duolingo'] },
  { skill: 'Creativity', reason: 'Bir fikri geliştirdin veya ortaya yeni bir şey koydun.', stems: ['draw', 'çiz', 'resim', 'boya'], weak: ['create', 'make', 'yarat', 'üret'] },
  { skill: 'Writing', reason: 'Düşüncelerini yazıya döktün.', stems: ['blog', 'yazı', 'şiir', 'hikaye', 'hikâye', 'makale', 'essay', 'poem'], weak: ['yaz', 'write', 'wrote'] },
  { skill: 'Design', reason: 'Bir şeyin görünüşünü ya da yapısını tasarladın.', stems: ['tasar', 'design', 'logo', 'figma'] },
  { skill: 'Resilience', reason: 'Zorluk karşısında çabalamaya devam ettin.', stems: ['hard', 'difficult', 'failed', 'again', 'challenge', 'zor', 'tekrar', 'başarısız', 'vazgeç'] },
  { skill: 'Finance', reason: 'Finansla ilgili bir konuya zaman ayırdın.', specific: true, stems: ['finans', 'borsa', 'dolar', 'sermaye', 'finance'] },
  { skill: 'Financial Analysis', reason: 'Finansal verileri yorumlayıp sonuç çıkardın.', specific: true, stems: ['karlılık', 'kârlılık', 'finansal analiz', 'oran analiz', 'marj', 'ebitda', 'financial analysis', 'profitability', 'margin'] },
  { skill: 'Financial Reporting', reason: 'Finansal tabloları hazırladın ya da inceledin.', specific: true, stems: ['bilanço', 'gelir tablosu', 'mali tablo', 'finansal tablo', 'dipnot', 'konsolid', 'balance sheet', 'income statement', 'financial statement'] },
  { skill: 'Cash Flow Forecasting', reason: 'Nakit girişlerini ve çıkışlarını ileriye dönük planladın.', specific: true, stems: ['nakit akış', 'nakit akım', 'cash flow'], support: ['tahmin', 'forecast', 'projeksiyon'] },
  { skill: 'Budgeting', reason: 'Gelir ve giderleri bir plana bağladın.', specific: true, stems: ['bütçe', 'budget'] },
  { skill: 'Treasury Management', reason: 'Nakit, likidite ya da fon yönetimiyle uğraştın.', specific: true, stems: ['hazine', 'likidite', 'nakit yönetim', 'mevduat', 'kur riski', 'treasury', 'liquidity', 'cash management'] },
  { skill: 'Interest Rate Risk', reason: 'Faiz değişimlerinin etkisini değerlendirdin.', specific: true, stems: ['faiz', 'interest rate'] },
  { skill: 'Debt Management', reason: 'Borç ya da kredi kararlarıyla uğraştın.', specific: true, stems: ['kredi', 'borç', 'refinans', 'loan', 'debt'] },
  { skill: 'Investment Analysis', reason: 'Bir yatırımı ya da piyasayı inceledin.', specific: true, stems: ['yatırım', 'hisse', 'invest', 'stock'] },
  { skill: 'Valuation', reason: 'Bir varlığın değerini hesapladın.', specific: true, stems: ['değerleme', 'dcf', 'valuation', 'çarpan'] },
  { skill: 'Portfolio Management', reason: 'Bir portföyün dağılımını yönettin.', specific: true, stems: ['portföy', 'portfolio'] },
  { skill: 'Accounting', reason: 'Muhasebe kayıtlarıyla çalıştın.', specific: true, stems: ['muhasebe', 'yevmiye', 'mizan', 'kayıt fişi', 'accounting', 'journal entry', 'ledger'] },
  { skill: 'Personal Finance', reason: 'Kendi parasal düzenin için adım attın.', specific: true, stems: ['tasarruf', 'birikim', 'kişisel bütçe', 'savings'] },
  { skill: 'Analytical Thinking', reason: 'Bilgiyi inceleyip değerlendirdin.', stems: ['analiz', 'analy', 'incele', 'gözden geçir', 'değerlendir', 'karşılaştır', 'review', 'evaluate', 'compare'] },
  { skill: 'Data Analysis', reason: 'Verilerle çalışıp anlam çıkardın.', specific: true, stems: ['veri analiz', 'data analysis', 'excel', 'sql', 'pivot', 'dashboard', 'power bi'] },
  { skill: 'Software Development', reason: 'Kod yazdın ya da bir yazılım üzerinde çalıştın.', specific: true, stems: ['kod', 'yazılım', 'python', 'javascript', 'typescript', 'react', 'commit', 'deploy', 'coding', 'programming', 'code'] },
  { skill: 'Energy Markets', reason: 'Enerji piyasası ya da üretim verileriyle çalıştın.', specific: true, stems: ['ptf', 'smf', 'epiaş', 'epias', 'yekdem', 'santral', 'dengesizlik', 'elektrik piyasa', 'enerji piyasa', 'power market'] },
  { skill: 'Leadership', reason: 'Başkalarına yön verdin ya da onları motive ettin.', stems: ['lider', 'ekibimi', 'ekibime', 'leadership', 'motivate'] },
  { skill: 'Project Management', reason: 'Bir projeyi planlayıp yürüttün.', stems: ['proje', 'project', 'yürüt', 'koordine', 'milestone'] },
  { skill: 'Productivity', reason: 'Bir işi ilerletip sonuca bağladın.', stems: ['bitir', 'tamamla', 'teslim', 'rapor', 'mail', 'posta', 'görev', 'gönder', 'finish', 'done'], weak: ['hazırla'] },
  { skill: 'Fitness', reason: 'Fiziksel gelişimin için harekete geçtin.', specific: true, stems: ['spor', 'koş', 'antrenman', 'egzersiz', 'yüzme', 'yüzdü', 'yürü', 'bisiklet', 'fitness', 'workout', 'run', 'yoga', 'pilates', 'gym'] },
  { skill: 'Music', reason: 'Müzikle uğraşarak kendini geliştirdin.', specific: true, stems: ['müzik', 'gitar', 'piyano', 'keman', 'bateri', 'davul', 'enstrüman', 'şarkı', 'nota', 'beste', 'konser', 'music', 'guitar', 'piano', 'sing'] },
  { skill: 'Cooking', reason: 'Yemek yapma konusunda deneyim kazandın.', specific: true, stems: ['makarna', 'yemek', 'pişir', 'tarif', 'mutfak', 'cook', 'recipe'] },
  { skill: 'Parenting', reason: 'Ailenle ilgili bir deneyim yaşadın.', specific: true, stems: ['çocuğ', 'çocuk', 'ebeveyn', 'oğlum', 'kızım', 'parent', 'child'] },
  { skill: 'Confidence', reason: 'Kendini ortaya koyma pratiği yaptın.', stems: ['cesaret', 'kendime güvend', 'savun', 'çekinmed', 'confidence'] },
  { skill: 'Assertiveness', reason: 'Görüşünü veya sınırlarını ifade ettin.', stems: ['savun', 'hakkımı', 'sınır', 'hayır', 'assertive'] },
  { skill: 'Negotiation', reason: 'Ortak bir sonuca ulaşmak için görüşme yaptın.', stems: ['müzakere', 'pazarlık', 'uzlaş', 'ikna', 'negotiat'] },
  { skill: 'Household', reason: 'Yaşadığın alanı düzene soktun.', stems: ['temizl', 'çamaşır', 'bulaşık', 'ütü', 'süpür', 'toparla', 'düzenle', 'tamir', 'bahçe', 'clean', 'laundry'] },
  { skill: 'Organization', reason: 'Hayatının bir parçasını planlayıp yoluna koydun.', stems: ['fatura', 'öde', 'plan', 'liste', 'alışveriş', 'market', 'randevu', 'organize', 'takvim', 'hallett', 'ayarla', 'schedule'] },
  { skill: 'Self Care', reason: 'Kendine iyi bakmak için zaman ayırdın.', stems: ['uyudu', 'uyku', 'dinlen', 'doktor', 'ilaç', 'yürü', 'nefes', 'sleep', 'rest'] },
  { skill: 'Mindfulness', reason: 'Zihnini dinlendirip ana odaklandın.', specific: true, stems: ['meditasyon', 'meditation', 'mindfulness'] },
  { skill: 'Self Awareness', reason: 'Kendi düşünce ve duygularını fark ettin.', stems: ['fark ettim', 'farkettim', 'düşündüm', 'hisset', 'realized', 'reflect'] },
  { skill: 'Relationships', reason: 'Sevdiklerinle bağını güçlendirdin.', stems: ['aile', 'anne', 'baba', 'eşim', 'kardeş', 'ziyaret', 'sohbet', 'aradım', 'buluş', 'family', 'visit'] },
];

export const ruleSkills = rules.map(rule => rule.skill);

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
  'yazı': ['yazın'],
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
  yönet: ['yönetmel'],
  run: ['runway'],
  plan: ['planet'],
};

const tokenize = (text: string) => text.toLocaleLowerCase('tr-TR').match(/[\p{L}\p{N}]+/gu) ?? [];

// Eşleşen kelimeyi (ya da ifadeyi) döner; yoksa null. Kanıt olarak kullanıcıya gösterilir.
function findStem(stem: string, words: string[], text: string): string | null {
  if (stem.includes(' ')) return text.includes(` ${stem}`) ? stem : null;
  return words.find(word => word.startsWith(stem) && !falseFriends[stem]?.some(prefix => word.startsWith(prefix))) ?? null;
}

// ── Derinlik ───────────────────────────────────────────────────────────────────
// Ne kadar derin bir deneyim olduğu fiilden anlaşılır. Sıra önemlidir: ilk eşleşen (en derin) kazanır.
export const DEPTH_XP: Record<Depth, number> = { exposure: 5, learned: 10, practiced: 15, applied: 20, produced: 30, taught: 35, mastery: 40 };
export const depthLabels: Record<Depth, string> = {
  exposure: 'İlk temas', learned: 'Öğrendin', practiced: 'Pratik yaptın', applied: 'Uyguladın',
  produced: 'Bir şey ürettin', taught: 'Başkasına öğrettin', mastery: 'Ustalık kanıtı',
};
const depthWords: [Depth, readonly string[]][] = [
  ['mastery', ['sertifika', 'sınavı geçt', 'sınavını geçt', 'certified', 'certification', 'passed the exam']],
  ['taught', ['öğrett', 'eğitim verd', 'ders verd', 'mentorluk', 'taught', 'teach', 'mentored', 'coached']],
  ['produced', ['hazırla', 'oluştur', 'tamamla', 'bitir', 'teslim', 'yayınla', 'geliştird', 'kurdum', 'tasarla', 'yazdım', 'ürett', 'created', 'built', 'prepared', 'delivered', 'completed', 'finished', 'published', 'wrote', 'designed', 'developed']],
  ['applied', ['uygula', 'kullan', 'analiz ett', 'çözd', 'hesapla', 'yönett', 'gözden geçir', 'incele', 'düzelt', 'sundum', 'sunum yapt', 'sunumu yapt', 'applied', 'used', 'analyzed', 'analysed', 'solved', 'reviewed', 'managed', 'calculated', 'fixed', 'presented']],
  ['practiced', ['pratik', 'çalıştım', 'antrenman', 'alıştırma', 'egzersiz', 'koştum', 'yürüd', 'yüzdüm', 'tekrar ett', 'practic', 'trained', 'rehears', 'exercis', 'workout']],
  ['learned', ['öğrend', 'okudum', 'izledim', 'kurs', 'ders', 'araştır', 'keşfett', 'learn', 'read', 'studied', 'course', 'watched']],
  ['exposure', ['ilk kez', 'ilk defa', 'denedim', 'tanıştım', 'first time', 'tried']],
];

export function detectDepth(description: string): { depth: Depth; evidence?: string } {
  const words = tokenize(description);
  const text = ` ${words.join(' ')}`;
  for (const [depth, stems] of depthWords) {
    for (const stem of stems) {
      const found = findStem(stem, words, text);
      if (found) return { depth, evidence: found };
    }
  }
  // Fiil anlaşılmazsa yapılmış bir şey sayılır (ör. "parka gittik").
  return { depth: 'practiced' };
}

// ── Puanlama ───────────────────────────────────────────────────────────────────
// Bir kayıtta en fazla 3 beceri. Ana beceri derinliğin XP'sini, diğerleri yarısını alır.
// XP kelime sayısına ya da kaç anahtar kelime yazıldığına bağlı değildir; uzun yazmak puanı artırmaz.
export const MAX_SKILLS = 3;
export const ENTRY_XP_CAP = 60;
export const REFLECTION_XP = 10;
// Aynı gün çok sayıda serbest kayıt: ilk 5 tam, 6–10 yarım, sonrası dörtte bir XP.
export const dailyFactor = (sameDayCount: number) => sameDayCount < 5 ? 1 : sameDayCount < 10 ? 0.5 : 0.25;

const CONFIDENCE = { phrase: 0.8, specific: 0.65, normal: 0.5, weak: 0.35, support: 0.2 };
const combine = (scores: number[]) => Math.min(0.95, 1 - scores.reduce((rest, score) => rest * (1 - score), 1));
export const confidenceLabel = (confidence: number) => confidence >= 0.75 ? 'yüksek' : confidence >= 0.55 ? 'orta' : 'düşük';

type Match = { rule: Rule; index: number; confidence: number; evidence: string[] };

function matchRules(words: string[], text: string): Match[] {
  const raw = rules.map((rule, index) => {
    const found = (stems: readonly string[] | undefined, kind: 'normal' | 'weak') => (stems ?? [])
      .map(stem => ({ stem, word: findStem(stem, words, text), kind: stem.includes(' ') ? 'phrase' as const : kind === 'normal' && rule.specific ? 'specific' as const : kind }))
      .filter((hit): hit is { stem: string; word: string; kind: 'phrase' | 'specific' | 'normal' | 'weak' } => !!hit.word);
    return { rule, index, strong: found(rule.stems, 'normal'), weak: found(rule.weak, 'weak'), support: (rule.support ?? []).map(stem => findStem(stem, words, text)).filter((word): word is string => !!word) };
  });
  const anySpecific = raw.some(item => item.rule.specific && item.strong.length > 0);
  return raw
    .map(item => {
      const hits = [...item.strong, ...(anySpecific ? [] : item.weak)];
      if (!hits.length) return null;
      const evidence = [...new Set([...hits.map(hit => hit.word), ...item.support])];
      const confidence = combine([...hits.map(hit => CONFIDENCE[hit.kind]), ...item.support.map(() => CONFIDENCE.support)]);
      return { rule: item.rule, index: item.index, confidence: Math.round(confidence * 100) / 100, evidence };
    })
    .filter((match): match is Match => !!match)
    .sort((a, b) => b.confidence - a.confidence || Number(!!b.rule.specific) - Number(!!a.rule.specific) || a.index - b.index);
}

export function scoreExperience(description: string, sameDayCount = 0): Analysis {
  const words = tokenize(description);
  const text = ` ${words.join(' ')}`;
  const matches = matchRules(words, text);
  // Bir alt beceri bulunduysa üst becerisi ayrıca önerilmez (XP iki kez sayılmasın); ağaçta üste yine yansır.
  const picked = matches.filter(match => !matches.some(other => other !== match && ancestorsOf(other.rule.skill).includes(match.rule.skill))).slice(0, MAX_SKILLS);
  const { depth, evidence: depthEvidence } = detectDepth(description);
  const factor = dailyFactor(sameDayCount);
  const scale = (xp: number) => Math.max(1, Math.round(xp * factor));

  let suggestions: Suggestion[];
  if (!picked.length) {
    suggestions = [{ skill: 'Self Awareness', xp: scale(REFLECTION_XP), confidence: 0.3, evidence: [], rationale: 'Metinde belirgin bir beceri bulunamadı; gününü yazmak öz farkındalık sayıldı. İstersen beceriyi değiştir.' }];
  } else {
    const base = DEPTH_XP[depth];
    let left = ENTRY_XP_CAP;
    suggestions = picked.map((match, i) => {
      const xp = Math.min(left, i === 0 ? base : Math.round(base / 2));
      left -= xp;
      return { skill: match.rule.skill, xp: scale(xp), confidence: match.confidence, evidence: match.evidence, rationale: match.rule.reason };
    });
  }
  const awards = suggestions.map(({ skill, xp }) => ({ skill, xp }));
  const xpNote = factor < 1 ? `Bugünkü ${sameDayCount + 1}. kaydın: aynı gün çok kayıt olduğu için XP ${factor === 0.5 ? 'yarıya' : 'dörtte bire'} indi.` : undefined;
  return {
    skill: awards[0].skill,
    xp: awards.reduce((sum, award) => sum + award.xp, 0),
    reason: suggestions[0].rationale,
    awards,
    engine: ENGINE,
    ...(picked.length ? { depth, ...(depthEvidence ? { depthEvidence } : {}) } : {}),
    suggestions,
    ...(xpNote ? { xpNote } : {}),
  };
}

export async function analyzeExperience(description: string, sameDayCount = 0): Promise<Analysis> {
  // Kısa bir bekleme: "hesaplanıyor" geri bildirimi göz kırpması gibi kaybolmasın.
  await new Promise(resolve => setTimeout(resolve, 300));
  return scoreExperience(description, sameDayCount);
}

// ── Tekrar kontrolü ────────────────────────────────────────────────────────────
const normalize = (text: string) => tokenize(text).join(' ');
// Aynı ya da neredeyse aynı metin (kelime kümelerinin %80'i ortak) tekrar sayılır.
export function isNearDuplicate(a: string, b: string): boolean {
  if (normalize(a) === normalize(b)) return true;
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size < 3 || setB.size < 3) return false;
  const shared = [...setA].filter(word => setB.has(word)).length;
  return shared / new Set([...setA, ...setB]).size >= 0.8;
}
