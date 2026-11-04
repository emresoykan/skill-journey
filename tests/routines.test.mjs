// Günlük rutinlerin tik, ilerleme ve ad doğrulama kurallarını sabitler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountDescription, amountReached, renameLegacyHabit, dayKey, formatMeasures, formatTime, habitSettingsError, isAmountHabit, parseAmount, weeklyTotals, habitAnalysis, habitCountToday, habitEntriesToday, habitGoal, habitTitleError, HABIT_XP, MAX_AMOUNT, MAX_HABITS, reminderPlan, routinesProgress } from '../src/routines.ts';

const now = new Date(2026, 9, 21, 15, 0);
const yesterday = new Date(2026, 9, 20, 9, 0);
const habit = (id, title = id) => ({ id, title, icon: '⭐', skill: 'Self Care', createdAt: yesterday.toISOString() });
const entry = (id, habitId, date = now) => ({ id, habitId, createdAt: date.toISOString(), description: id, skill: 'Self Care', xp: HABIT_XP, reason: '', awards: [{ skill: 'Self Care', xp: HABIT_XP }] });

test('yalnız bugünün rutin kayıtları tik sayılır', () => {
  const done = habitEntriesToday([entry('a', 'h1'), entry('b', 'h2', yesterday), entry('c', undefined)], now);
  assert.deepEqual([...done.keys()], ['h1']);
});

test('ilerleme rutin sayısına göre hesaplanır', () => {
  const habits = [habit('h1'), habit('h2'), habit('h3')];
  const progress = routinesProgress(habits, [entry('a', 'h1'), entry('b', 'h3')], now);
  assert.equal(progress.count, 2);
  assert.equal(progress.total, 3);
  assert.equal(progress.complete, false);
});

test('tüm rutinler tiklenince tamam olur', () => {
  const habits = [habit('h1'), habit('h2')];
  assert.equal(routinesProgress(habits, [entry('a', 'h1'), entry('b', 'h2')], now).complete, true);
});

test('kaldırılmış rutinin eski tiki ilerlemeyi bozmaz', () => {
  const progress = routinesProgress([habit('h1')], [entry('a', 'h1'), entry('b', 'silinmis')], now);
  assert.equal(progress.count, 1);
  assert.equal(progress.complete, true);
});

test('hiç rutin yokken "tamam" sayılmaz', () => {
  assert.equal(routinesProgress([], [], now).complete, false);
});

test('rutin tiki rutinin becerisine sabit XP verir', () => {
  const analysis = habitAnalysis({ ...habit('h1'), skill: 'Learning' });
  assert.equal(analysis.xp, HABIT_XP);
  assert.deepEqual(analysis.awards, [{ skill: 'Learning', xp: HABIT_XP }]);
});

test('rutin adı doğrulanır', () => {
  const habits = [habit('h1', 'Su iç')];
  assert.equal(habitTitleError('   ', habits), 'Rutin adı boş olamaz.');
  assert.equal(habitTitleError('  su   İÇ ', habits), 'Bu rutin zaten listende.');
  assert.equal(habitTitleError('Yürüyüş yap', habits), null);
  const full = Array.from({ length: MAX_HABITS }, (_, i) => habit(`h${i}`));
  assert.match(habitTitleError('Yeni', full), /En fazla/);
});


const on = { enabled: true, hour: 20, minute: 0 };

test('hatırlatıcı kapalıysa ya da rutin yoksa bildirim kurulmaz', () => {
  assert.equal(reminderPlan({ ...on, enabled: false }, [habit('h1')], [], now).length, 0);
  assert.equal(reminderPlan(on, [], [], now).length, 0);
});

test('saat geçmediyse bugünden başlayarak 14 gün kurulur ve kalan rutin sayısı yazılır', () => {
  const plan = reminderPlan(on, [habit('h1'), habit('h2')], [entry('a', 'h1')], now);
  assert.equal(plan.length, 14);
  assert.deepEqual([plan[0].date.getDate(), plan[0].date.getHours(), plan[0].date.getMinutes()], [21, 20, 0]);
  assert.match(plan[0].body, /^1 rutinin/);
  assert.match(plan[1].body, /^2 rutinin/);
});

test('bugünün rutinleri tamamsa bugünkü hatırlatma atlanır', () => {
  const plan = reminderPlan(on, [habit('h1')], [entry('a', 'h1')], now);
  assert.equal(plan.length, 13);
  assert.equal(plan[0].date.getDate(), 22);
});

test('saat geçtiyse ilk hatırlatma yarın', () => {
  const plan = reminderPlan({ ...on, hour: 9, minute: 0 }, [habit('h1')], [], now);
  assert.equal(plan[0].date.getDate(), 22);
  assert.equal(plan.length, 13);
});

test('saat iki haneli biçimlenir', () => {
  assert.equal(formatTime(7, 30), '07:30');
  assert.equal(formatTime(20, 0), '20:00');
});

test('rutin türü: birimi olan miktarlı, olmayan tek tik', () => {
  assert.equal(isAmountHabit({ ...habit('h1', 'İngilizce'), unit: 'kelime' }), true);
  assert.equal(isAmountHabit({ ...habit('h1', 'Meditasyon'), unit: '  ' }), false);
  assert.equal(isAmountHabit(habit('h1', 'Su iç')), false, 'hazır öneriye bakılmaz; ayar rutinin kendisinde');
});

test('günlük hedef: yalnız miktarlı rutinde; yoksa ilk giriş yeter', () => {
  assert.deepEqual(habitGoal({ ...habit('h1'), unit: 'kelime', target: 20 }), { target: 20, unit: 'kelime', hasTarget: true });
  assert.deepEqual(habitGoal({ ...habit('h1'), unit: 'kelime' }), { target: 1, unit: 'kelime', hasTarget: false });
  assert.deepEqual(habitGoal({ ...habit('h1'), target: 5 }), { target: 1, unit: '', hasTarget: false }, 'birimsiz hedef sayılmaz');
});

test('hedefe ulaşma ve kayıt metni', () => {
  const english = { ...habit('h1', 'İngilizce'), unit: 'kelime', target: 20 };
  assert.equal(amountReached(english, 19), false);
  assert.equal(amountReached(english, 20), true);
  assert.equal(amountReached(english, 35), true, 'hedefi aşmak serbest');
  assert.equal(amountReached({ ...english, target: undefined }, 1), true);
  assert.equal(amountReached({ ...english, target: undefined }, 0), false);
  assert.equal(amountDescription(english, 1250), 'İngilizce · 1.250 kelime');
});

test('bugünkü miktar: yalnız bugünün sayısı; eski sürümde tamamlanmış rutin kayıttaki miktarla', () => {
  const english = { ...habit('h1', 'İngilizce'), unit: 'kelime', target: 20 };
  assert.equal(habitCountToday({ h1: { day: dayKey(now), count: 35 } }, english, undefined, now), 35);
  assert.equal(habitCountToday({ h1: { day: dayKey(yesterday), count: 6 } }, english, undefined, now), 0);
  assert.equal(habitCountToday({}, english, { ...entry('a', 'h1'), amount: { value: 25, unit: 'kelime' } }, now), 25);
  assert.equal(habitCountToday({}, { ...habit('w', 'Su iç'), unit: 'bardak', target: 8 }, entry('b', 'w'), now), 8);
});

test('rutin ayarları doğrulanır', () => {
  assert.equal(habitSettingsError('kelime', 20), null);
  assert.equal(habitSettingsError('', null), null);
  assert.match(habitSettingsError('', 20), /birim/);
  assert.match(habitSettingsError('kelime', 2.5), /tam sayı/);
  assert.match(habitSettingsError('kelime', MAX_AMOUNT + 1), /arasında/);
  assert.match(habitSettingsError('x'.repeat(21), null), /en fazla 20/);
});

test('eski ad yeni ada taşınır, kullanıcının adı değişmez', () => {
  const legacy = habit('h1', '20 dk kitap oku');
  assert.equal(renameLegacyHabit(legacy).title, 'Kitap okuma');
  assert.equal(renameLegacyHabit(legacy).id, 'h1');
  assert.equal(renameLegacyHabit(habit('h2', '30 dk roman oku')).title, '30 dk roman oku');
});

test('yazılan sayı çevrilir', () => {
  assert.equal(parseAmount('6.500'), 6500);
  assert.equal(parseAmount(' 20 '), 20);
  assert.equal(parseAmount(''), null);
  assert.ok(Number.isNaN(parseAmount('abc')));
  assert.ok(Number.isNaN(parseAmount('0')));
});

test('eski kayıtlardaki ölçüler okunur biçimde yazılır', () => {
  assert.equal(formatMeasures({ steps: 6500, duration: 45 }), '6.500 adım · 45 dk');
  assert.equal(formatMeasures({ pages: 30, duration: 90 }), '1 sa 30 dk · 30 sayfa');
  assert.equal(formatMeasures(undefined), '');
});

test('haftalık toplam: son 7 gün, yalnız o rutin, gün sayısı tekil', () => {
  const walk = habit('w', 'Yürüyüş yap');
  const day = n => new Date(2026, 9, 21 - n, 10, 0);
  const log = (id, n, measures, habitId = 'w') => ({ ...entry(id, habitId, day(n)), measures });
  const entries = [
    log('a', 0, { steps: 6000, duration: 45 }),
    log('b', 0, { steps: 1000 }),
    log('c', 3, { steps: 8000, duration: 60 }),
    log('d', 6, { duration: 30 }),
    log('e', 7, { steps: 99999 }),
    log('f', 1, { steps: 5000 }, 'baska'),
    log('g', 2, undefined),
  ];
  assert.deepEqual(weeklyTotals(walk, entries, now), { days: 4, amount: 0, totals: { steps: 15000, duration: 135 } });
  assert.deepEqual(weeklyTotals(habit('x'), entries, now), { days: 0, amount: 0, totals: {} });
});

test('haftalık toplam: miktarlı rutinde girilen miktarlar toplanır (aynı birimle)', () => {
  const english = { ...habit('en', 'İngilizce'), unit: 'kelime' };
  const day = n => new Date(2026, 9, 21 - n, 10, 0);
  const log = (id, n, value, unit = 'kelime') => ({ ...entry(id, 'en', day(n)), amount: { value, unit } });
  const entries = [log('a', 0, 20), log('b', 2, 15), log('c', 5, 50), log('d', 8, 99), log('e', 1, 3, 'sayfa')];
  assert.deepEqual(weeklyTotals(english, entries, now), { days: 4, amount: 85, totals: {} });
});
