// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // push-worker/.wrangler: Wrangler'ın yerel geliştirmede ürettiği geçici paketler.
    ignores: ["dist/*", "push-worker/.wrangler/**", "push-worker/node_modules/**"],
  },
  {
    // scripts/ altındaki yardımcılar uygulamada değil, Node ile çalışır.
    files: ["scripts/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { __dirname: "readonly", Buffer: "readonly", console: "readonly", process: "readonly" },
    },
  },
]);
