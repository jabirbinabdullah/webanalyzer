const globals = require('globals');
const js = require('@eslint/js');
const jest = require('eslint-plugin-jest');
const react = require('eslint-plugin-react');

module.exports = [
  {
    ignores: ['node_modules/', 'frontend/build/', 'dist/'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': [
        'warn',
        { args: 'after-used', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['frontend/src/**/*.{js,jsx}'],
    plugins: {
      react,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
     settings: {
        react: {
          version: 'detect',
        },
      },
  },
  {
    files: ['**/*.test.{js,jsx}'],
    plugins: {
      jest,
    },
    rules: jest.configs.recommended.rules,
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    settings: {
      jest: {
        version: '30.2.0',
      },
    },
  },
];
