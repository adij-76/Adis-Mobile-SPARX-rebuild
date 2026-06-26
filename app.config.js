// Extends the static app.json. The only dynamic piece is the web `baseUrl`,
// which GitHub Pages needs (the site is served from /<repo>/, not the root).
// CI sets EXPO_PUBLIC_BASE_URL; locally and on root-domain hosts it's unset,
// so the app builds at "/" as normal.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;
  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};
