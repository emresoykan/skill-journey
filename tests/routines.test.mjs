// Günlük rutinlerin tik, ilerleme ve ad doğrulama kurallarını sabitler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { availablePresets, habitAnalysis, habitEntriesToday, habitPresets, habitTitleError, HABIT_XP, MAX_HABITS, routinesProgress } from '../src/routines.ts';

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
