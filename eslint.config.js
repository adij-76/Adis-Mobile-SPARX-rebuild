// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'scripts/*.mjs'],
  },
  {
    // The React-compiler-era hooks rules are guidance, not correctness — the
    // existing code trips them in ~30 places. Keep them VISIBLE as warnings
    // (fix opportunistically / ratchet to errors later) so lint's errors stay
    // meaningful and CI-gateable from day one.
    rules: {
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
