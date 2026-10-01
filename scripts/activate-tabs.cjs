const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
require.resolve('expo-router/entry', { paths: [root] });
const packagePath = path.join(root, 'package.json');
const appPath = path.join(root, 'app.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
pkg.main = 'expo-router/entry';
app.expo.scheme = app.expo.scheme || 'skill-journey';
app.expo.plugins = app.expo.plugins || [];
if (!app.expo.plugins.some(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-router')) {
  app.expo.plugins.push('expo-router');
}
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n');
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
console.log('Bugun, Gelisim ve Anilar sekmeleri etkinlestirildi.');
