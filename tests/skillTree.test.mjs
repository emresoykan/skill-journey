// Beceri ağacı: üst beceri alt becerilerinin XP'sini toplar, keşfedilmemiş beceriler görünür ama işaretlidir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSkillTree, findNode, nodeEvidence } from '../src/skillTree.ts';
import { catalog } from '../src/skillEngine.ts';

let n = 0;
const entry = (awards, createdAt = `2026-11-0${(n % 9) + 1}T10:00:00.000Z`) => ({ id: `e${n++}`, createdAt, description: `kayıt ${n}`, skill: awards[0][0], xp: awards.reduce((s, a) => s + a[1], 0), reason: 'r', awards: awards.map(([skill, xp]) => ({ skill, xp })) });

const entries = [
  entry([['Cash Flow Forecasting', 30], ['Analytical Thinking', 15]]),
  entry([['Cash Flow Forecasting', 20]]),
  entry([['Financial Analysis', 10]]),
  entry([['Interest Rate Risk', 20], ['Debt Management', 10]]),
  entry([['Satranç', 15]]),
];
const trees = buildSkillTree(entries);
const finance = trees.find(tree => tree.key === 'finance');

test('her alan katalogdaki bütün becerileri içerir', () => {
  for (const tree of trees.filter(t => t.key !== 'custom')) {
    const count = node => 1 + node.children.reduce((s, c) => s + count(c), 0);
    assert.equal(tree.nodes.reduce((s, node) => s + count(node), 0), catalog.filter(skill => skill.domain === tree.key).length, tree.key);
  }
});

test('üst beceri alt becerilerinin XP\'sini toplar; kendi XP\'si ayrı tutulur', () => {
  const root = finance.nodes.find(node => node.id === 'Finance');
  const analysis = findNode(trees, 'Financial Analysis');
  assert.equal(findNode(trees, 'Cash Flow Forecasting').totalXp, 50);
  assert.equal(analysis.ownXp, 10);
  assert.equal(analysis.totalXp, 60);
  assert.equal(analysis.count, 3, 'üç farklı kayıt');
  assert.equal(findNode(trees, 'Treasury Management').totalXp, 30);
  assert.equal(findNode(trees, 'Treasury Management').count, 1, 'aynı kayıttaki iki alt beceri tek kayıt sayılır');
  assert.equal(root.totalXp, 90);
  assert.equal(finance.totalXp, 90);
});

test('seviye ve ilerleme toplam XP\'den', () => {
  const analysis = findNode(trees, 'Financial Analysis');
  assert.equal(analysis.level, 1);
  assert.equal(analysis.progress, 0.6);
  assert.equal(analysis.toNext, 40);
  const big = buildSkillTree([entry([['Valuation', 250]])]);
  assert.deepEqual([findNode(big, 'Valuation').level, findNode(big, 'Investment Analysis').level, findNode(big, 'Finance').level], [3, 3, 3]);
});

test('keşif: kayıtta geçen ya da alt becerisi geçen düğüm keşfedilmiş sayılır', () => {
  assert.equal(findNode(trees, 'Cash Flow Forecasting').discovered, true);
  assert.equal(findNode(trees, 'Treasury Management').discovered, true, 'alt becerisi keşfedildi');
  assert.equal(findNode(trees, 'Valuation').discovered, false);
  assert.equal(findNode(trees, 'Valuation').totalXp, 0);
  assert.equal(finance.discovered, 4, 'Finans alanında doğrudan kayıtta geçen 4 beceri');
});

test('kendi beceriler ayrı alanda; yoksa alan hiç yok', () => {
  const custom = trees.find(tree => tree.key === 'custom');
  assert.deepEqual(custom.nodes.map(node => [node.id, node.totalXp]), [['Satranç', 15]]);
  assert.equal(buildSkillTree([]).some(tree => tree.key === 'custom'), false);
  assert.ok(buildSkillTree([]).every(tree => tree.totalXp === 0 && tree.discovered === 0));
});

test('kanıt: dalın bütün kayıtları, en yeni önce, daldan gelen XP ile', () => {
  const evidence = nodeEvidence(entries, findNode(trees, 'Financial Analysis'));
  assert.deepEqual(evidence.map(item => item.xp), [10, 20, 30]);
  assert.equal(nodeEvidence(entries, findNode(trees, 'Valuation')).length, 0);
});
