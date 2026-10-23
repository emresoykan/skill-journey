// Yapılacakların listelenme ve doğrulama kurallarını sabitler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_OPEN_TODOS, parseTodos, pruneTodos, todoTitleError, visibleTodos } from '../src/todos.ts';

const now = new Date(2026, 9, 23, 20, 0);
const yesterday = new Date(2026, 9, 22, 18, 0);
const todo = (id, title, extra = {}) => ({ id, title, createdAt: yesterday.toISOString(), ...extra });

test('boş ve tekrarlanan açık iş eklenemez; tamamlanmış aynı iş tekrar eklenebilir', () => {
  assert.match(todoTitleError('   ', []), /boş/);
  assert.match(todoTitleError('Faturayı öde', [todo('a', 'faturayı  öde')]), /zaten/);
  assert.equal(todoTitleError('Faturayı öde', [todo('a', 'Faturayı öde', { doneAt: yesterday.toISOString() })]), null);
});

test('açık iş sınırı', () => {
  const many = Array.from({ length: MAX_OPEN_TODOS }, (_, i) => todo(`t${i}`, `İş ${i}`));
  assert.match(todoTitleError('Yeni iş', many), /En fazla/);
});

test('liste: açık işler eskiden yeniye, bugün bitenler ayrı, dün bitenler gizli', () => {
  const list = [
    todo('b', 'İkinci', { createdAt: new Date(2026, 9, 23, 9).toISOString() }),
    todo('a', 'Birinci'),
    todo('c', 'Bugün bitti', { doneAt: new Date(2026, 9, 23, 12).toISOString(), entryId: 'e1' }),
    todo('d', 'Dün bitti', { doneAt: yesterday.toISOString(), entryId: 'e0' }),
  ];
  const { open, doneToday } = visibleTodos(list, now);
  assert.deepEqual(open.map(t => t.id), ['a', 'b']);
  assert.deepEqual(doneToday.map(t => t.id), ['c']);
});

test('30 günden eski tamamlanmış işler atılır, açık işler hiç atılmaz', () => {
  const old = new Date(2026, 8, 1).toISOString();
  const kept = pruneTodos([todo('a', 'Açık', { createdAt: old }), todo('b', 'Eski bitmiş', { doneAt: old }), todo('c', 'Yeni bitmiş', { doneAt: yesterday.toISOString() })], now);
  assert.deepEqual(kept.map(t => t.id), ['a', 'c']);
});

test('saklanan veri: bozuk öğeler atılır, fazla alanlar alınmaz', () => {
  assert.deepEqual(parseTodos('x'), []);
  assert.deepEqual(parseTodos([null, { id: 1 }, { id: 'a', title: 'İş', createdAt: 'c', doneAt: 5, junk: true }]), [{ id: 'a', title: 'İş', createdAt: 'c' }]);
});
