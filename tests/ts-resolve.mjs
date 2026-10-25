// npm test için: src/ içindeki saf modüller birbirini uzantısız içe aktarır ("./dates"); Metro bunu
// çözer, Node çözmez. Bu kanca çözülemeyen göreli yolu ".ts" ekleyerek yeniden dener.
import { register } from 'node:module';

register('./ts-resolve-hooks.mjs', import.meta.url);
