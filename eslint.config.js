import js from '@eslint/js';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    // TODO: setup separate React lint rules
    ignores: ['client/'],
    env: {
      'jest/globals': true
    },
  },
  js.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      'prefer-const': 'warn',
      'no-console': 'off',
      'no-undef': 'on',
      'no-unused-vars': 'warn',
      quotes: [2, 'single', { avoidEscape: true }],
    },
  },
];
