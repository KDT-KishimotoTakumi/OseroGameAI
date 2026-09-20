import { expect, test } from '@playwright/test';

test('BGMの実音出力、音源共有、独立消音と音量保存', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('jiso.settings'))
      localStorage.setItem(
        'jiso.settings',
        JSON.stringify({ sound: true, music: true, motion: true }),
      );
    const Original = window.AudioContext;
    const probe: { contexts: AudioContext[]; analyser?: AnalyserNode; starts: number } = {
      contexts: [],
      starts: 0,
    };
    Object.assign(window, { audioProbe: probe });
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        probe.contexts.push(this);
      }
      override createDynamicsCompressor() {
        const compressor = super.createDynamicsCompressor();
        probe.analyser = this.createAnalyser();
        compressor.connect(probe.analyser);
        return compressor;
      }
      override createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (when?: number) => {
          probe.starts++;
          start(when);
        };
        return oscillator;
      }
    };
  });
  await page.goto('/');
  const probe = () =>
    page.evaluate(() => {
      const value = (
        window as unknown as {
          audioProbe: { contexts: AudioContext[]; analyser?: AnalyserNode; starts: number };
        }
      ).audioProbe;
      const samples = new Float32Array(value.analyser?.fftSize ?? 1);
      value.analyser?.getFloatTimeDomainData(samples);
      return {
        contexts: value.contexts.length,
        starts: value.starts,
        peak: Math.max(...samples.map(Math.abs)),
      };
    });
  expect((await probe()).contexts).toBe(0);
  await page.getByText('演出設定', { exact: true }).click();
  await expect.poll(async () => (await probe()).peak).toBeGreaterThan(0.001);
  await page.locator('#music').uncheck();
  const afterMute = (await probe()).starts;
  await page.waitForTimeout(350);
  expect((await probe()).starts).toBe(afterMute);
  await page.locator('.cell[aria-disabled="false"]').first().click();
  await page.locator('#confirm').click();
  await expect.poll(async () => (await probe()).starts).toBeGreaterThan(afterMute);
  await page.locator('#sound').uncheck();
  const silent = (await probe()).starts;
  await page.locator('.cell[aria-disabled="false"]').first().click();
  await page.locator('#confirm').click();
  expect((await probe()).starts).toBe(silent);
  await page.locator('#music').check();
  await expect.poll(async () => (await probe()).starts).toBeGreaterThan(silent);
  for (const [id, value] of [
    ['music-volume', '22'],
    ['sound-volume', '41'],
  ]) {
    await page.locator('#' + id).fill(value);
    await page.locator('#' + id).dispatchEvent('input');
  }
  expect((await probe()).contexts).toBe(1);
  await page.reload();
  await page.getByText('演出設定', { exact: true }).click();
  await expect(page.locator('#music-volume')).toHaveValue('22');
  await expect(page.locator('#sound-volume')).toHaveValue('41');
  await expect(page.locator('#sound')).not.toBeChecked();
});

test('反転の光と粒子、マス寸法、取消と軽減設定', async ({ page }, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'jiso.settings',
      JSON.stringify({ sound: false, music: false, motion: false, duration: 'long' }),
    ),
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const sizes = () =>
    page.locator('.cell').evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return [r.width, r.height];
      }),
    );
  const before = await sizes();
  await page.locator('.cell[aria-disabled="false"]').first().click();
  await expect(page.locator('.flip-ring')).toHaveCount(0);
  await page.locator('#confirm').click();
  await expect(page.locator('.flip-ring').first()).toBeAttached();
  await expect(page.locator('.flip-particle').first()).toBeAttached();
  await page.screenshot({ path: testInfo.outputPath('反転エフェクト.png') });
  expect(await sizes()).toEqual(before);
  await page.locator('#new').click();
  await expect(page.locator('.flip-ring,.flip-particle')).toHaveCount(0);
  await page.getByText('演出設定', { exact: true }).click();
  await page.locator('#motion').check();
  await page.locator('.cell[aria-disabled="false"]').first().click();
  await page.locator('#confirm').click();
  await expect(page.locator('.status')).toContainText('1手');
  await expect(page.locator('.flip-ring,.flip-particle')).toHaveCount(0);
  expect(await sizes()).toEqual(before);
});
