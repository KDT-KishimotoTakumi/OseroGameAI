import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**', 'build/**', 'coverage/**', '**/*.min.js', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
  ...tseslint.configs.recommended,
);
