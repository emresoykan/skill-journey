// Beceri ağacının verisi: alan → beceri → alt beceri. Her düğümün ilerlemesi yalnız kayıtlardan hesaplanır.
// Saf modül; npm test doğrudan çalıştırabilir.
import { LEVEL_XP, level } from './game';
import { catalog, displaySkill, domains, type Domain } from './skillEngine';
import type { Entry } from './storage';

export type TreeNode = {
  id: string;
  name: string;
  ownXp: number; // doğrudan bu beceriye verilen XP
  totalXp: number; // kendisi + alt becerileri; seviye ve ilerleme bundan hesaplanır
  count: number; // bu beceriye ya da alt becerilerine XP veren farklı kayıt sayısı
  level: number;
  progress: number; // sonraki seviyeye 0–1
  toNext: number; // sonraki seviyeye kalan XP
  discovered: boolean; // kendisi ya da bir alt becerisi en az bir kayıtta geçti
  children: TreeNode[];
};
export type DomainKey = Domain | 'custom';
export type DomainTree = { key: DomainKey; name: string; nodes: TreeNode[]; totalXp: number; discovered: number; total: number };

export const CUSTOM_DOMAIN = 'Kendi becerilerin';

function makeNode(id: string, own: Map<string, number>, entryIds: Map<string, Set<string>>, children: TreeNode[]): TreeNode {
  const ownXp = own.get(id) ?? 0;
  const totalXp = ownXp + children.reduce((sum, child) => sum + child.totalXp, 0);
  const ids = new Set(entryIds.get(id));
  const collect = (nodes: TreeNode[]) => nodes.forEach(node => { entryIds.get(node.id)?.forEach(entry => ids.add(entry)); collect(node.children); });
  collect(children);
  const lvl = level(totalXp);
  return {
    id, name: displaySkill(id), ownXp, totalXp, count: ids.size, level: lvl,
    progress: (totalXp % LEVEL_XP) / LEVEL_XP, toNext: lvl * LEVEL_XP - totalXp,
    discovered: ownXp > 0 || entryIds.has(id) || children.some(child => child.discovered), children,
  };
}

// Kayıtlardan bütün alanların ağacı. Katalogdaki her beceri görünür (keşfedilmemişler soluk gösterilir);
// katalogda olmayan (kullanıcının kendi yazdığı) beceriler "Kendi becerilerin" alanında düz liste olur.
export function buildSkillTree(entries: Entry[]): DomainTree[] {
  const own = new Map<string, number>();
  const entryIds = new Map<string, Set<string>>();
  for (const entry of entries) {
    for (const award of entry.awards) {
      own.set(award.skill, (own.get(award.skill) ?? 0) + award.xp);
      entryIds.set(award.skill, (entryIds.get(award.skill) ?? new Set()).add(entry.id));
    }
  }
  const build = (id: string): TreeNode => makeNode(id, own, entryIds, catalog.filter(skill => skill.parent === id).map(skill => build(skill.id)));
  const trees: DomainTree[] = (Object.keys(domains) as Domain[]).map(key => {
    const nodes = catalog.filter(skill => skill.domain === key && !skill.parent).map(skill => build(skill.id));
    const all = catalog.filter(skill => skill.domain === key);
    return { key, name: domains[key], nodes, totalXp: nodes.reduce((sum, node) => sum + node.totalXp, 0), discovered: all.filter(skill => entryIds.has(skill.id)).length, total: all.length };
  });
  const known = new Set(catalog.map(skill => skill.id));
  const custom = [...own.keys()].filter(id => !known.has(id)).sort((a, b) => (own.get(b) ?? 0) - (own.get(a) ?? 0)).map(id => makeNode(id, own, entryIds, []));
  if (custom.length) trees.push({ key: 'custom', name: CUSTOM_DOMAIN, nodes: custom, totalXp: custom.reduce((sum, node) => sum + node.totalXp, 0), discovered: custom.length, total: custom.length });
  return trees;
}

// Bir becerinin (ve alt becerilerinin) kanıt kayıtları, en yeni önce; her kayıtta bu daldan gelen XP.
export function nodeEvidence(entries: Entry[], node: TreeNode): { entry: Entry; xp: number }[] {
  const ids = new Set<string>();
  const collect = (item: TreeNode) => { ids.add(item.id); item.children.forEach(collect); };
  collect(node);
  return entries
    .map(entry => ({ entry, xp: entry.awards.filter(award => ids.has(award.skill)).reduce((sum, award) => sum + award.xp, 0) }))
    .filter(item => item.xp > 0)
    .sort((a, b) => b.entry.createdAt.localeCompare(a.entry.createdAt));
}

// Ağaçta bir düğümü bulur (kimliğe göre).
export function findNode(trees: DomainTree[], id: string): TreeNode | null {
  const walk = (nodes: TreeNode[]): TreeNode | null => {
    for (const node of nodes) { if (node.id === id) return node; const found = walk(node.children); if (found) return found; }
    return null;
  };
  for (const tree of trees) { const found = walk(tree.nodes); if (found) return found; }
  return null;
}
