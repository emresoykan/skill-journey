// Mock analizin beceri eşleşmelerini sabitleyen örnek cümleler.
// Çalıştırma: npm test (Node 22.18+ .ts dosyalarını doğrudan içe aktarabilir).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreExperience } from '../src/mockAnalysis.ts';

// [cümle, gelmesi gereken beceriler, gelmemesi gereken beceriler]
const cases = [
  // Doğru eşleşmeler: bunlar bozulmamalı.
  ['Toplantıda yeni bütçeyi ekibe sundum ve sorularını dinledim', ['Communication'], []],
  ['Excel makrosundaki hatayı buldum ve düzelttim', ['Problem Solving'], []],
  ['Arkadaşıma taşınmasında yardım ettim', ['Collaboration'], []],
  ['Python ile veri analizi öğrendim', ['Learning'], []],
  ['Kitabın iki bölümünü okudum', ['Learning'], []],
  ['Blog yazısı yazdım', ['Creativity'], []],
  ['Yeni logo tasarladım', ['Creativity'], []],
  ['Sınavda başarısız oldum ama tekrar denedim', ['Resilience'], []],
  ['Şirketin bilançosunu inceledim ve kârlılık oranlarını çıkardım', ['Finance'], []],
  ['Hisse fiyatlarını takip ettim', ['Finance'], []],
  ['Akşam makarna pişirdim', ['Cooking'], []],
  ['Sabah 5 km koştum', ['Fitness'], []],
  ['Havuzda yarım saat yüzdüm', ['Fitness'], []],
  ['Yüzme antrenmanına gittim', ['Fitness'], []],
  ['Oğlumu parka götürdüm', ['Parenting'], []],
  ['Toplantıda kendime güvendim ve fikrimi savundum', ['Confidence', 'Assertiveness'], []],
  ['Sunumda kendime güvendim', ['Confidence'], []],
  ['Kira artışında pazarlık yaptım', ['Negotiation'], []],
  ['Evi temizledim ve çamaşırları yıkadım', ['Household'], []],
  ['Dolabı düzenledim', ['Household'], []],
  ['Elektrik faturasını ödedim', ['Organization'], []],
  ['Bütün gün dinlendim', ['Self Care'], ['Communication']],
  ['Akşam 30 dakika yürüdüm', ['Self Care'], []],
  ['Doktora gittim', ['Self Care'], []],
  ['Aylık raporu bitirip teslim ettim', ['Productivity'], []],
  ['Annemi aradım', ['Relationships'], []],
  ['Bugün sadece düşündüm', ['Self Awareness'], []],

  // Yanlış eşleşmeler: kısa kökler alakasız kelimelere takılmamalı.
  ['Brüt marjı yüzde 5 artırdım', [], ['Fitness']],
  ['Yüz lira harcadım', [], ['Fitness']],
  ['Yüzüğümü kaybettim', [], ['Fitness']],
  ['Çocuğu okula bıraktım', ['Parenting'], ['Learning']],
  ['Yeniden başladım', [], ['Learning']],
  ['Ready for tomorrow', [], ['Learning']],
  ['İş deneyimimi özgeçmişe ekledim', [], ['Resilience']],
  ['İç denetim toplantısına katıldım', [], ['Resilience']],
  ['Zorunlu eğitimi tamamladım', [], ['Resilience']],
  ['Kendimi iyi hissettim', [], ['Finance']],
  ['Ay sonu için tasarruf planı yaptım', ['Organization'], ['Creativity']],
  ['Santralin üretim verilerini kontrol ettim', [], ['Creativity']],
  ['Yazın tatile gittik', [], ['Creativity']],
  ['Ekipmanları depoya taşıdım', [], ['Collaboration']],
  ['Ödevimi yaptım', [], ['Organization']],
  ['Yeni elektrik tarifesini inceledim', [], ['Cooking']],
  ['Sözleşmedeki koşulları okudum', ['Learning'], ['Fitness']],
  ['Düzenleyici kurumun kararını okudum', ['Learning'], ['Household']],
  ['Yeni yönetmelik yürürlüğe girdi', [], ['Self Care']],
  ['Projeyi ben yürüttüm', ['Productivity'], ['Self Care']],
  ['Restoranda akşam yemeği', [], ['Self Care']],
  ['Sınırlı bütçeyle tatil planladım', ['Organization'], ['Assertiveness']],
  ['Hayırlı olsun mesajı attım', ['Communication'], ['Assertiveness']],
];

for (const [text, expected, forbidden] of cases) {
  test(text, () => {
    const skills = scoreExperience(text).awards.map(award => award.skill);
    for (const skill of expected) assert.ok(skills.includes(skill), `${skill} bekleniyordu, gelen: ${skills.join(', ')}`);
    for (const skill of forbidden) assert.ok(!skills.includes(skill), `${skill} gelmemeliydi, gelen: ${skills.join(', ')}`);
  });
}

test('en fazla üç beceri ve pozitif XP döner', () => {
  const result = scoreExperience('Ekiple toplantıda sunum yaptım, hatayı çözdüm, rapor yazdım ve yeni şeyler öğrendim');
  assert.ok(result.awards.length <= 3);
  assert.ok(result.awards.every(award => award.xp > 0 && award.xp <= 18));
  assert.equal(result.xp, result.awards.reduce((sum, award) => sum + award.xp, 0));
  assert.equal(result.skill, result.awards[0].skill);
});
