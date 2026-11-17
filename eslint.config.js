const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const storageOnlyInStore = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@react-native-async-storage/async-storage',
            message: 'Saved progress goes through src/lib/progressStore.ts (CLAUDE.md rule 9).',
          },
        ],
      },
    ],
  },
};

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*'] },
  storageOnlyInStore,
  // The store, the tests that seed it, and the jest mock are the only places that touch storage.
  {
    files: ['src/lib/progressStore.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx', '__mocks__/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
