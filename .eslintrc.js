module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    mocha: true,
  },
  extends: [
    'airbnb-base',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    'no-console': 'off', // @@ turn on when done printf debugging
    indent: ['error', 2, { SwitchCase: 1 }],
    'no-unused-vars': 'off',
    'no-shadow': 'off',
    'max-classes-per-file': ['error', 10],
    'no-underscore-dangle': ['error', { allowAfterThis: true }],
    'no-use-before-define': 'off',
    'no-array-constructor': 'off',
    'no-restricted-syntax': 'off',
    'no-useless-constructor': 'off',
    'no-empty-function': 'off',
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    'max-len': ['error', {
      code: 150, ignoreTemplateLiterals: true, ignoreUrls: true, ignoreTrailingComments: true, ignoreComments: true, ignoreStrings: true,
    }],
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'import/no-default-export': ['error'],
    'import/prefer-default-export': 'off',
    'import/extensions': ['error', 'ignorePackages', { ts: 'never' }],
    '@typescript-eslint/array-type': ['error', { default: 'array' }],
    '@typescript-eslint/naming-convention': ['error', { selector: 'enumMember', format: ['UPPER_CASE'] }],
    '@typescript-eslint/no-useless-constructor': ['error'],
  },
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
};
