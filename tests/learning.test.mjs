// "Öğrendiklerim" kayıtlarının ve aralıklı tekrarın kurallarını sabitler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, dueLearnings, initialReview, isMastered, learningError, MASTERED_STAGE, nextReview, REVIEW_INTERVALS, reviewAnalysis, REVIEW_XP, reviewEntryToday, reviewStateOf } from '../src/learning.ts';

const day = (d, h = 12) => new Date(2026, 9, d, h, 0);
const learned = (id, d, term = id) => ({ id, createdAt: day(d).toISOString(), description: term, skill: 'Learning', xp: 12, reason: '', awards: [], learning: { term, meaning: 'anlamı' } });

test('ilk tekrar öğrenildiği günün ertesi günü', () => {
  assert.deepEqual(initialReview(day(22)), { stage: 0, due: '2026-10-23' });
});

test('hatırladıkça aralık uzar: 3, 7, 14, 30 gün', () => {
  let state = initialReview(day(22));
  const dues = [];
  for (let i = 0; i < REVIEW_INTERVALS.length - 1; i++) {
    state = nextReview(state, true, day(22));
    dues.push(state.due);
  }
  assert.deepEqual(dues, ['2026-10-25', '2026-10-29', '2026-11-05', '2026-11-21']);
});

test('son aralığı da geçen kavram ustalaşılmış olur', () => {
  const state = nextReview({ stage: MASTERED_STAGE - 1, due: '2026-10-22' }, true, day(22));
  assert.equal(isMastered(state), true);
});

test('unutulan kavram başa döner ve ertesi gün tekrar sorulur', () => {
  assert.deepEqual(nextReview({ stage: 3, due: '2026-10-22' }, false, day(22)), { stage: 0, due: '2026-10-23' });
});

test('tekrarı gelenler en eski tarihliden başlayarak listelenir', () => {
  const entries = [learned('bugun', 22), learned('dun', 21), learned('evvelsi', 20), { ...learned('not', 20), learning: undefined }];
  assert.deepEqual(dueLearnings(entries, {}, day(22)).map(entry => entry.id), ['evvelsi', 'dun']);
});

test('ileri tarihli ya da ustalaşılmış kavram sorulmaz', () => {
  const entries = [learned('ileri', 20), learned('usta', 20)];
  const reviews = { ileri: { stage: 1, due: '2026-10-25' }, usta: { stage: MASTERED_STAGE, due: '' } };
  assert.deepEqual(dueLearnings(entries, reviews, day(22)), []);
});

test('kaydı olmayan kavramın durumu kayıt tarihinden hesaplanır', () => {
  assert.deepEqual(reviewStateOf(learned('a', 20), {}), { stage: 0, due: '2026-10-21' });
});

test('tekrar XP\'si hatırlanan kavram sayısıyla artar', () => {
  assert.equal(reviewAnalysis(3).xp, 3 * REVIEW_XP);
  assert.equal(reviewAnalysis(3).skill, 'Learning');
});

test('günün tekrar kaydı yalnız bugünden bulunur', () => {
  const entries = [{ ...learned('dunku', 21), review: { count: 2 } }, { ...learned('bugunku', 22), review: { count: 1 } }];
  assert.equal(reviewEntryToday(entries, day(22)).id, 'bugunku');
  assert.equal(reviewEntryToday(entries.slice(0, 1), day(22)), undefined);
});

test('kavram ve anlam zorunlu, aynı gün aynı kavram tekrar eklenmez', () => {
  assert.match(learningError(' ', 'x', [], day(22)), /kavramı/);
  assert.match(learningError('x', ' ', [], day(22)), /Anlamını/);
  assert.equal(learningError('SERENDIPITY', 'x', [learned('a', 22, 'serendipity')], day(22)), 'Bunu bugün zaten ekledin.');
  assert.equal(learningError('serendipity', 'x', [learned('a', 21, 'serendipity')], day(22)), null);
});

test('gün anahtarı iki haneli biçimlenir', () => {
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
});
