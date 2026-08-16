module.exports = {
  env: {
    browser: true,
    es2022: true,
  },
  extends: [
    'next/core-web-vitals',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react/no-unescaped-entities': 'off',
  },
  ignorePatterns: ['node_modules/', '.next/', 'out/', '*.config.js', '*.config.ts'],
};