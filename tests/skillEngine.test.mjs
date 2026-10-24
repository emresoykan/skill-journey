// Açıklanabilir beceri motoru: kanıt, güven, derinlik, XP ekonomisi ve katalog bütünlüğü.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, customSkillName, DEPTH_XP, detectDepth, displaySkill, ENTRY_XP_CAP, isNearDuplicate, isWithin, parentPath, REFLECTION_XP, ruleSkills, scoreExperience } from '../src/skillEngine.ts';

const skillsOf = text => scoreExperience(text).awards.map(award => award.skill);

test('İngilizce nakit akış tahmini: alana özgü beceri, "created" yaratıcılık sayılmaz', () => {
  const result = scoreExperience('Today I created and reviewed a cash flow forecast for my company.');
  const skills = result.awards.map(award => award.skill);
  assert.equal(result.skill, 'Cash Flow Forecasting');
  assert.ok(skills.includes('Analytical Thinking'));
  assert.ok(!skills.includes('Creativity'));
  assert.equal(result.depth, 'produced');
  const top = result.suggestions[0];
  assert.ok(top.evidence.includes('cash flow') && top.evidence.includes('forecast'), top.evidence.join(','));
  assert.ok(top.confidence >= 0.75);
});

test('Türkçe nakit akış tahmini', () => {
  const result = scoreExperience('Bugün şirketin nakit akış tahminini hazırladım ve gözden geçirdim.');
  assert.equal(result.skill, 'Cash Flow Forecasting');
  assert.ok(result.awards.some(award => award.skill === 'Analytical Thinking'));
  assert.ok(!result.awards.some(award => award.skill === 'Productivity'), 'hazırla zayıf kanıt; alana özgü beceri varken sayılmaz');
  assert.equal(result.depth, 'produced');
  assert.equal(result.depthEvidence, 'hazırladım');
});

test('Faiz riski: hazine alt becerileri ve analiz', () => {
  const skills = skillsOf('Kredi faiz riskini analiz ettim');
  assert.deepEqual([...skills].sort(), ['Analytical Thinking', 'Debt Management', 'Interest Rate Risk']);
  assert.equal(scoreExperience('Kredi faiz riskini analiz ettim').depth, 'applied');
});

test('üst beceri, alt becerisi bulunduysa ayrıca önerilmez', () => {
  const skills = skillsOf('Toplantıda kendime güvendim ve fikrimi savundum');
  assert.ok(skills.includes('Assertiveness'));
  assert.ok(!skills.includes('Communication'));
});

test('derinlik fiilden anlaşılır ve XP\'yi belirler', () => {
  for (const [text, depth] of [
    ['Bugün ilk kez yoga denedim', 'exposure'],
    ['İngilizce yeni kelimeler öğrendim', 'learned'],
    ['Akşam 5 km koştum', 'practiced'],
    ['Excel makrosundaki hatayı düzelttim', 'applied'],
    ['Aylık finansal raporu hazırladım', 'produced'],
    ['Stajyere Excel pivot tablolarını öğrettim', 'taught'],
    ['Muhasebe sertifikası aldım', 'mastery'],
  ]) {
    const result = scoreExperience(text);
    assert.equal(result.depth, depth, text);
    assert.equal(result.awards[0].xp, DEPTH_XP[depth], text);
  }
  assert.equal(detectDepth('Oğlumla parka gittik').depth, 'practiced');
});

test('ikincil beceriler yarım XP alır, toplam üst sınırı aşmaz', () => {
  const result = scoreExperience('Ekibe nakit akış modelini Excel ile öğrettim ve sunum yaptım');
  assert.equal(result.awards[0].xp, DEPTH_XP.taught);
  for (const award of result.awards.slice(1)) assert.ok(award.xp <= Math.round(DEPTH_XP.taught / 2));
  assert.ok(result.xp <= ENTRY_XP_CAP);
});

test('anahtar kelime doldurmak ve uzun yazmak XP\'yi artırmaz', () => {
  const short = scoreExperience('Gitar çalıştım');
  const stuffed = scoreExperience('yaz yaz yaz çiz tasarla üret yarat çalış öğren oku konuş anlat sunum dinle mesaj toplantı paylaş bir iki üç dört beş altı yedi sekiz dokuz on');
  assert.ok(stuffed.awards.length <= 3);
  assert.ok(stuffed.xp <= ENTRY_XP_CAP);
  const once = scoreExperience('Akşam 5 km koştum');
  const padded = scoreExperience('Akşam 5 km koştum, hava güzeldi, parkta biraz durdum, eve döndüm ve duş aldım sonra da uzun uzun dinlenip çay içtim');
  assert.equal(padded.awards.find(award => award.skill === 'Fitness').xp, once.awards[0].xp);
  assert.ok(short.xp > 0);
});

test('eşleşme yoksa öz farkındalık, düşük güven ve açık bir not', () => {
  const result = scoreExperience('Hello');
  assert.equal(result.skill, 'Self Awareness');
  assert.equal(result.xp, REFLECTION_XP);
  assert.equal(result.suggestions[0].confidence, 0.3);
  assert.equal(result.depth, undefined);
  assert.match(result.suggestions[0].rationale, /değiştir/);
});

test('her öneride kanıt ve gerekçe var; kayıt motoru işaretli', () => {
  const result = scoreExperience('Toplantıda yeni bütçeyi ekibe sundum');
  assert.equal(result.engine, 'rules@2');
  for (const suggestion of result.suggestions) {
    assert.ok(suggestion.evidence.length > 0, suggestion.skill);
    assert.ok(suggestion.rationale.length > 0);
    assert.ok(suggestion.confidence > 0 && suggestion.confidence <= 0.95);
  }
  assert.deepEqual(result.awards, result.suggestions.map(({ skill, xp }) => ({ skill, xp })));
});

test('aynı gün çok kayıt: 6.–10. yarım, sonrası dörtte bir XP', () => {
  const full = scoreExperience('Akşam 5 km koştum', 4);
  const half = scoreExperience('Akşam 5 km koştum', 5);
  const quarter = scoreExperience('Akşam 5 km koştum', 10);
  assert.equal(full.xpNote, undefined);
  assert.equal(half.awards[0].xp, Math.round(full.awards[0].xp / 2));
  assert.equal(quarter.awards[0].xp, Math.round(full.awards[0].xp / 4));
  assert.match(half.xpNote, /6\. kaydın/);
});

test('neredeyse aynı metin tekrar sayılır', () => {
  assert.ok(isNearDuplicate('Akşam 5 km koştum', 'akşam 5 km  koştum!'));
  assert.ok(isNearDuplicate('Bugün nakit akış tablosunu hazırladım ve gönderdim', 'Bugün nakit akış tablosunu hazırladım, gönderdim'));
  assert.ok(!isNearDuplicate('Akşam 5 km koştum', 'Sabah 10 km koştum'));
  assert.ok(!isNearDuplicate('Annemi aradım', 'Babamı aradım'));
});

test('katalog bütün: üst beceriler var, döngü yok, kurallar katalogda', () => {
  const ids = new Set(catalog.map(skill => skill.id));
  assert.equal(ids.size, catalog.length, 'tekrarlı id');
  for (const skill of catalog) {
    if (!skill.parent) continue;
    const parent = catalog.find(item => item.id === skill.parent);
    assert.ok(parent, `${skill.id} üstü yok`);
    assert.equal(parent.domain, skill.domain, `${skill.id} üstüyle aynı alanda değil`);
  }
  for (const skill of ruleSkills) assert.ok(ids.has(skill), `${skill} katalogda yok`);
  // Eski kayıtların beceri adları hâlâ Türkçe görünür.
  for (const old of ['Communication', 'Problem Solving', 'Collaboration', 'Learning', 'Creativity', 'Resilience', 'Self Awareness', 'Finance', 'Cooking', 'Fitness', 'Music', 'Parenting', 'Confidence', 'Assertiveness', 'Negotiation', 'Household', 'Organization', 'Self Care', 'Productivity', 'Relationships']) {
    assert.ok(ids.has(old), old);
    assert.notEqual(displaySkill(old), old === 'Fitness' ? 'x' : old, old);
  }
});

test('hiyerarşi yardımcıları ve kendi becerin', () => {
  assert.ok(isWithin('Cash Flow Forecasting', 'Finance'));
  assert.ok(isWithin('Public Speaking', 'Communication'));
  assert.ok(!isWithin('Communication', 'Public Speaking'));
  assert.equal(parentPath('Cash Flow Forecasting'), 'Finans › Finansal Analiz');
  assert.equal(customSkillName('  Satranç   oynama '), 'Satranç oynama');
  assert.equal(customSkillName('finansal analiz'), 'Financial Analysis');
  assert.equal(customSkillName('   '), null);
  assert.equal(displaySkill('Satranç oynama'), 'Satranç oynama');
});
