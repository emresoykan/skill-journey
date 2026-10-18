// GitHub Pages builds set EXPO_BASE_URL (e.g. /skill-journey) so the web export
// works under a subpath; local `npm run web` and native builds are unaffected.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;
  return {
    ...config,
    web: { ...config.web, output: 'static' },
    experiments: { ...config.experiments, baseUrl },
  };
};
