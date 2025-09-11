module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2021,
  },
  ignorePatterns: ['dist/', '**/*.ts'],
  rules: {
    'no-unused-vars': 'off',
    'no-undef': 'off',
  },
};
