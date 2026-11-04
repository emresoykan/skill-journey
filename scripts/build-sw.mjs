// Web derlemesinden sonra çalışır: dist/sw.js içine sitenin dosya listesini (önceden indirilecekler) ve
// içerik özetinden bir sürüm yazar. Sürüm değişince tarayıcı yeni service worker'ı kurar, eski önbelleği siler.
// Kullanım: node scripts/build-sw.mjs dist
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const dist = process.argv[2] ?? 'dist';
// Önbelleğe alınmayanlar: service worker'ın kendisi, rota listesi, site haritası.
const skip = new Set(['sw.js', '_expo/.routes.json', '_sitemap.html', '404.html', '+not-found.html', '.nojekyll']);

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(dist).map(path => relative(dist, path).split(sep).join('/')).filter(path => !skip.has(path)).sort();
const hash = createHash('sha256');
for (const path of files) hash.update(path).update(readFileSync(join(dist, path)));
const version = hash.digest('hex').slice(0, 12);

const swPath = join(dist, 'sw.js');
const source = readFileSync(swPath, 'utf8');
if (!source.includes('/*__PRECACHE__*/[]') || !source.includes("/*__VERSION__*/'dev'")) throw new Error('sw.js içinde yer tutucular bulunamadı');
// Dosya adlarında URL'ye uygun olmayan karakterler ("+") olabilir; yollar kodlanır.
const list = files.map(path => path.split('/').map(encodeURIComponent).join('/'));
writeFileSync(swPath, source.replace('/*__PRECACHE__*/[]', JSON.stringify(list)).replace("/*__VERSION__*/'dev'", JSON.stringify(version)));
console.log(`sw.js: ${files.length} dosya, sürüm ${version}`);
