// Web push sunucusunun (push-worker) ne zaman bildirim göndereceğini sabitler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueAction, localParts, parseSync } from '../push-worker/src/schedule.js';

// 21 Ekim 2026, İstanbul (UTC+3) saatiyle verilen saat.
const istanbul = (hour, minute) => new Date(Date.UTC(2026, 9, 21, hour - 3, minute));
const record = (extra = {}) => ({ tz: 'Europe/Istanbul', hour: 20, minute: 0, lastSent: null, status: null, ...extra });

test('yerel tarih ve dakika saat dilimine göre hesaplanır', () => {
  assert.deepEqual(localParts(istanbul(20, 15), 'Europe/Istanbul'), { date: '2026-10-21', minutes: 20 * 60 + 15 });
  // Aynı an UTC'de hâlâ 17:15.
  assert.equal(localParts(istanbul(20, 15), 'UTC').minutes, 17 * 60 + 15);
});

test('saat gelmeden gönderilmez', () => {
  assert.equal(dueAction(record(), istanbul(19, 45)).type, 'wait');
});

test('saat gelince genel mesajla gönderilir', () => {
  const action = dueAction(record(), istanbul(20, 0));
  assert.equal(action.type, 'send');
  assert.equal(action.date, '2026-10-21');
  assert.match(action.body, /^Bugünkü rutinlerin/);
});

test('bugünün durumu biliniyorsa kalan rutin sayısı yazılır', () => {
  const action = dueAction(record({ status: { date: '2026-10-21', left: 2 } }), istanbul(20, 15));
  assert.match(action.body, /^2 rutinin/);
});

test('dünkü durum bugüne sayılmaz', () => {
  const action = dueAction(record({ status: { date: '2026-10-20', left: 0 } }), istanbul(20, 0));
  assert.equal(action.type, 'send');
});

test('bugünün rutinleri bittiyse gönderilmez, gün kapatılır', () => {
  assert.deepEqual(dueAction(record({ status: { date: '2026-10-21', left: 0 } }), istanbul(20, 0)), { type: 'skip', date: '2026-10-21' });
});

test('aynı gün ikinci kez gönderilmez', () => {
  assert.equal(dueAction(record({ lastSent: '2026-10-21' }), istanbul(20, 30)).type, 'wait');
});

test('kaçan cron 60 dakika içinde telafi edilir, sonrası beklenir', () => {
  assert.equal(dueAction(record(), istanbul(20, 45)).type, 'send');
  assert.equal(dueAction(record(), istanbul(21, 0)).type, 'wait');
});

const sub = { endpoint: 'https://web.push.apple.com/abc', keys: { p256dh: 'BKey', auth: 'auth' } };

test('geçerli senkron isteği kabul edilir', () => {
  const parsed = parseSync({ subscription: sub, hour: 7, minute: 30, tz: 'Europe/Istanbul', status: { date: '2026-10-21', left: 3 } });
  assert.deepEqual(parsed.status, { date: '2026-10-21', left: 3 });
  assert.equal(parsed.subscription.endpoint, sub.endpoint);
});

test('geçersiz senkron istekleri reddedilir', () => {
  const base = { subscription: sub, hour: 20, minute: 0, tz: 'Europe/Istanbul' };
  assert.equal(parseSync({ ...base, hour: 24 }), null);
  assert.equal(parseSync({ ...base, tz: 'Ay/Üssü' }), null);
  assert.equal(parseSync({ ...base, subscription: { ...sub, endpoint: 'http://düz-http' } }), null);
  assert.equal(parseSync(null), null);
});

test('bozuk durum bilgisi yok sayılır ama abonelik kaydedilir', () => {
  const parsed = parseSync({ subscription: sub, hour: 20, minute: 0, tz: 'Europe/Istanbul', status: { date: 'dün', left: -1 } });
  assert.equal(parsed.status, null);
});
