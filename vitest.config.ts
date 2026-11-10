import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage',
      // 純粋ロジックと音声生成を単体テストの測定対象にする。
      // DOM 結合部と Worker は Playwright の全ブラウザ E2E で検証する。
      include: [
        'src/domain/remix-*.ts',
        'src/application/remix-*.ts',
        'src/ai/remix-search.ts',
        'src/infrastructure/remix-replays.ts',
        'src/infrastructure/synth-audio.ts',
        'src/presentation/onboarding.ts',
        'src/presentation/impact-profile.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
