export default [
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        requestAnimationFrame: 'readonly',
        HTMLElement: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        CustomEvent: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'semi': ['error', 'always'],
      'no-console': 'off',
      'eqeqeq': 'error',
    },
  },
];
