import { expect, test, type Page } from '@playwright/test';

const open = async (page: Page, settings: Record<string, unknown>) => {
  await page.addInitScript((value) => {
    if (!localStorage.getItem('jiso.settings'))
      localStorage.setItem('jiso.settings', JSON.stringify(value));
  }, settings);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
};

test('手番案内はクリック・キー操作で飛ばせ、飛ばした操作は着手にならない', async ({ page }) => {
  await open(page, { motion: true, sound: false, music: false });
  await expect(page.locator('#turn-notice')).toContainText('シアンの番です');
  const started = Date.now();
  // 案内中は盤面が操作不可。盤面をクリックすると案内だけが閉じる。
  await page.locator('.board').click({ force: true });
  await expect(page.locator('#turn-notice')).toHaveCount(0);
  expect(Date.now() - started).toBeLessThan(1500);
  await expect(page.locator('#place-mode')).toBeEnabled();
  await expect(page.locator('.selected-cell')).toHaveCount(0);
  await expect(page.locator('#confirm')).toBeDisabled();
  await page.locator('.cell[aria-disabled="false"]').first().click();
  await page.locator('#confirm').click();
  await expect(page.locator('#turn-notice')).toContainText('オレンジの番です');
  await page.keyboard.press('Enter');
  await expect(page.locator('#turn-notice')).toHaveCount(0);
  await expect(page.locator('.status')).toContainText('1手');
  await expect(page.locator('#confirm')).toBeDisabled();
});

test('決着の一撃の演出中は勝敗を出さず、演出後に表示する', async ({ page }) => {
  await open(page, { motion: false, sound: false, music: false, duration: 'long' });
  await page.locator('#tutorial').click();
  const next = async () => {
    await expect(page.locator('#next')).toBeEnabled({ timeout: 15000 });
    await page.locator('#next').click();
  };
  await page.locator('[data-index="0"]').click();
  await page.locator('#confirm').click();
  await next();
  await page.locator('#rotate-mode').click();
  await page.locator('[data-quarter="0"]').click();
  await page.locator('#right').click();
  await page.locator('#confirm').click();
  await next();
  await page.locator('#rotate-mode').click();
  await page.locator('#left').click();
  await page.locator('[data-quarter="0"]').click();
  await page.locator('#cancel').click();
  await page.locator('[data-quarter="0"]').click();
  await page.locator('#confirm').click();
  await next();
  await page.locator('[data-index="0"]').click();
  await page.locator('#confirm').click();
  await next();
  // 練習5：この一撃で相手HPが0になる。
  await page.locator('[data-index="0"]').click();
  await page.locator('#confirm').click();
  await expect(page.locator('#attack-status')).toContainText('連鎖');
  await expect(page.locator('.status strong')).not.toContainText('勝利');
  await expect(page.locator('.status')).not.toContainText('対局終了');
  await expect(page.locator('.status strong')).toHaveText('シアンの勝利', { timeout: 15000 });
  await expect(page.locator('#hp2')).toHaveText('0 / 50 HP');
});

test('回転の予告に、次の自分の番に狙える最大ダメージを表示する', async ({ page }) => {
  await open(page, { motion: true, sound: false, music: false });
  await expect(page.locator('#turn-notice')).toHaveCount(0);
  await page.locator('#rotate-mode').click();
  await page.locator('[data-quarter="0"]').click();
  await expect(page.locator('#preview')).toContainText(/次の自分の番に最大 \d+ ダメージ/);
  await page.locator('#place-mode').click();
  await page.locator('.cell[aria-disabled="false"]').first().click();
  await expect(page.locator('#preview')).not.toContainText('次の自分の番');
});

test('ページアイコンを設定し、読み込みエラーを出さない', async ({ page }) => {
  await open(page, { motion: true, sound: false, music: false });
  const href = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(href).toContain('piece-cyan.svg');
  const response = await page.request.get(new URL(href!, page.url()).toString());
  expect(response.status()).toBe(200);
});

test('攻撃の予告に、相手の次の番の最大ダメージ（反撃）を表示する', async ({ page }) => {
  await open(page, { motion: true, sound: false, music: false });
  await expect(page.locator('#turn-notice')).toHaveCount(0);
  await page.locator('.cell[aria-disabled="false"]').first().click();
  await expect(page.locator('#preview')).toContainText(
    /相手の反撃：次の相手の番に最大 \d+ ダメージ/,
  );
  await page.locator('#rotate-mode').click();
  await page.locator('[data-quarter="0"]').click();
  await expect(page.locator('#preview')).toContainText(
    /相手の反撃：次の相手の番に最大 \d+ ダメージ/,
  );
});

test('終局後、勝利バナー内の再戦ボタンがスクロールせずに見え、押すと再戦する', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, { motion: true, sound: false, music: false });
  for (let n = 0; n < 1000; n++) {
    await expect
      .poll(
        async () =>
          (await page.locator('#victory-rematch').count()) +
          (await page.locator('#place-mode:not([disabled])').count()),
      )
      .toBeGreaterThan(0);
    if (await page.locator('#victory-rematch').count()) break;
    await page.locator('#place-mode').click();
    await page.locator('.cell[aria-disabled="false"]').first().click();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.locator('#confirm').click();
  }
  // 盤面を下へスクロールした状態で決着しても、勝利バナー全体が画面内に入る。
  await expect(page.locator('#victory-banner')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('#victory-rematch')).toBeInViewport();
  await expect(page.locator('.panel-card').first()).not.toContainText('白点のマスをクリック');
  await expect(page.locator('.victory-banner')).toContainText(/HPが0|判定/);
  await expect(page.locator('#rotation-rule')).toHaveText('対局は終了しました。');
  await page.locator('#victory-rematch').click();
  await expect(page.locator('#victory-banner')).toHaveCount(0);
  await expect(page.locator('.status')).toContainText('0手');
});

test('相手の反撃で自分のHPが0になり得る手には警告を出す', async ({ page }) => {
  // 開始HPだけを試験用に変更し、製品コードに局面注入APIを追加しない。
  await page.route('**/src/domain/remix-match.ts*', async (route) => {
    const response = await route.fetch();
    const source = (await response.text()).replace(/hp:\s*\{\s*1:\s*50,/, 'hp: { 1: 1,');
    await route.fulfill({ response, body: source });
  });
  await open(page, { motion: true, sound: false, music: false });
  await expect(page.locator('#turn-notice')).toHaveCount(0);
  await expect(page.locator('#hp1')).toHaveText('1 / 50 HP');
  await page.locator('.cell[aria-disabled="false"]').first().click();
  await expect(page.locator('#danger')).toContainText('相手の反撃でHPが0になる危険があります');
  await page.locator('#cancel').click();
  await expect(page.locator('#danger')).toHaveCount(0);
});
