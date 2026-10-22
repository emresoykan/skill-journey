// Günlük rutinlerin tik, ilerleme ve ad doğrulama kurallarını sabitler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { availablePresets, dayKey, formatMeasures, formatTime, habitMeasures, measureError, parseAmount, toMinutes, weeklyTotals, habitAnalysis, habitCountToday, habitEntriesToday, habitGoal, habitPresets, habitTitleError, HABIT_XP, MAX_HABITS, reminderPlan, routinesProgress } from '../src/routines.ts';

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

test('eklenmiş hazır öneriler listeden çıkar', () => {
  const left = availablePresets([habit('h1', 'Su iç')]);
  assert.equal(left.length, habitPresets.length - 1);
  assert.ok(!left.some(preset => preset.title === 'Su iç'));
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

test('günlük hedef: rutinin kendi hedefi, yoksa aynı adlı hazır öneri, o da yoksa tek tik', () => {
  assert.deepEqual(habitGoal({ ...habit('h1', 'Su iç'), target: 5, unit: 'bardak' }), { target: 5, unit: 'bardak' });
  assert.deepEqual(habitGoal(habit('h1', '  su İÇ ')), { target: 8, unit: 'bardak' });
  assert.deepEqual(habitGoal(habit('h1', 'Yürüyüş yap')), { target: 1, unit: 'kez' });
});

test('sayılı rutinde yalnız bugünün sayısı geçerli', () => {
  const water = { ...habit('h1', 'Su iç'), target: 8, unit: 'bardak' };
  assert.equal(habitCountToday({ h1: { day: dayKey(now), count: 3 } }, water, false, now), 3);
  assert.equal(habitCountToday({ h1: { day: dayKey(yesterday), count: 6 } }, water, false, now), 0);
  assert.equal(habitCountToday({}, water, false, now), 0);
});

test('bugün tamamlanmış sayılı rutin hedefte görünür, hedefi aşmaz', () => {
  const water = { ...habit('h1', 'Su iç'), target: 8, unit: 'bardak' };
  assert.equal(habitCountToday({}, water, true, now), 8);
  assert.equal(habitCountToday({ h1: { day: dayKey(now), count: 12 } }, water, false, now), 8);
});

test('ölçüler: hazır öneriden gelir, kendi yazdığın rutinde yoktur', () => {
  assert.deepEqual(habitMeasures(habit('h1', 'Yürüyüş yap')), ['steps', 'duration']);
  assert.deepEqual(habitMeasures(habit('h1', '20 dk kitap oku')), ['duration', 'pages']);
  assert.deepEqual(habitMeasures(habit('h1', 'Spor yap')), ['duration']);
  assert.deepEqual(habitMeasures(habit('h1', 'Bitki sula')), []);
});

test('sayı okuma: binlik ayırıcı, saatte ondalık, boş ve geçersiz', () => {
  assert.equal(parseAmount('6.500'), 6500);
  assert.equal(parseAmount(' 6500 '), 6500);
  assert.equal(parseAmount(''), null);
  assert.ok(Number.isNaN(parseAmount('abc')));
  assert.ok(Number.isNaN(parseAmount('0')));
  assert.equal(parseAmount('1,5', true), 1.5);
  assert.equal(parseAmount('1.5', true), 1.5);
  assert.equal(toMinutes(1.5, 'saat'), 90);
  assert.equal(toMinutes(45, 'dk'), 45);
});

test('ölçü sınırları yazım hatasını yakalar', () => {
  assert.equal(measureError({ steps: 6500, duration: 45 }), null);
  assert.match(measureError({ duration: 25 * 60 }), /24 saat/);
  assert.match(measureError({ steps: 250000 }), /Adım en fazla 100\.000/);
  assert.match(measureError({ pages: NaN }), /Sayfa için geçerli/);
});

test('ölçüler okunur biçimde yazılır', () => {
  assert.equal(formatMeasures({ steps: 6500, duration: 45 }), '6.500 adım · 45 dk');
  assert.equal(formatMeasures({ pages: 30, duration: 90 }), '1 sa 30 dk · 30 sayfa');
  assert.equal(formatMeasures({ duration: 120 }), '2 sa');
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
  assert.deepEqual(weeklyTotals(walk, entries, now), { days: 4, totals: { steps: 15000, duration: 135 } });
  assert.deepEqual(weeklyTotals(habit('x'), entries, now), { days: 0, totals: {} });
});
