import { expect, type Page, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { digits, digitsWidth } from '../packages/design/src';

async function start(page: Page, scale: number, keepIntro = false) {
  await page.setViewportSize({ width: 640 * scale, height: 360 * scale });
  await page.addInitScript(() => {
    localStorage.setItem('office-settings', JSON.stringify({ volume: 0, telemetry: false, reducedMotion: true }));
    Object.defineProperty(crypto, 'getRandomValues', {
      value: (array: Uint32Array) => {
        // Seed 2's ordinary shuffled order happens to be [0,1,2,3]. No benchmark bypass.
        array.fill(2);
        return array;
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chơi với bot', exact: true }).click();
  await page.getByRole('button', { name: 'Bỏ Bot An', exact: true }).click();
  await page.getByRole('button', { name: 'Bỏ Bot Chi', exact: true }).click();
  await expect(page.getByText('1 / 3 bot', { exact: true })).toBeVisible();
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  await expect
    .poll(async () => {
      await page.clock.runFor(16);
      return (
        (await page.locator('.game-host canvas').count()) === 1 && (await page.locator('.app-loading').count()) === 0
      );
    })
    .toBe(true);
  await expect(page.locator('.game-host canvas')).toBeVisible();
  // Canvas attachment and asset readiness precede Phaser's first painted frame.
  await expect(async () => {
    await page.clock.runFor(16);
    await troops(page, scale, 10);
  }).toPass({ timeout: 10000, intervals: [50] });
  if (!keepIntro) {
    await page.keyboard.press('Enter');
    await page.clock.runFor(32);
  }
}

async function point(page: Page, scale: number, x: number, y: number) {
  const box = await page.locator('.game-host canvas').boundingBox();
  if (!box) throw new Error('Game canvas is missing');
  return { x: box.x + x * scale, y: box.y + y * scale };
}

async function click(page: Page, scale: number, x: number, y: number, button: 'left' | 'right' = 'left') {
  const position = await point(page, scale, x, y);
  await page.mouse.click(position.x, position.y, { button });
  await page.clock.runFor(32);
}

async function drag(page: Page, scale: number, from: [number, number], to: [number, number]) {
  const a = await point(page, scale, ...from);
  const b = await point(page, scale, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
  await page.clock.runFor(200);
}

// Read the rendered door sign, not private scene state or mocked input handlers.
// The font is shared; expected troop counts are independent, literal game outcomes.
async function expectDigits(page: Page, scale: number, text: string, x: number, y: number, white = true) {
  const width = digitsWidth(text);
  const origin = await point(page, scale, x, y);
  const image = PNG.sync.read(await page.screenshot({ clip: { ...origin, width: width * scale, height: 7 * scale } }));
  const mask = Array<boolean>(7 * width).fill(false);
  digits(
    {
      rect(x, y, w, h) {
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) mask[j * width + i] = true;
      },
      text() {},
    },
    0,
    0,
    text,
    '#ffffff',
  );
  const rgb = white ? [255, 255, 255] : [24, 20, 37];
  const pixels = mask.map((_, i) => {
    const index = ((Math.floor(i / width) * scale * 2 + scale) * image.width + (i % width) * scale * 2 + scale) * 4;
    return rgb.every((value, channel) => image.data[index + channel] === value);
  });
  expect(pixels, `Rendered number should show ${text}`).toEqual(mask);
}

async function troops(page: Page, scale: number, expected: number, right = 132) {
  const text = String(expected);
  const plateWidth = text.length >= 3 ? 32 : text.length === 2 ? 26 : 20;
  await expectDigits(page, scale, text, right - Math.floor(plateWidth / 2) - Math.floor(digitsWidth(text) / 2), 27);
}

async function percentage(page: Page, scale: number, expected: number) {
  const text = `${expected}%`;
  await expectDigits(page, scale, text, 390 - digitsWidth(text), 347, false);
}

async function pixel(page: Page, scale: number, x: number, y: number) {
  const origin = await point(page, scale, x, y);
  const image = PNG.sync.read(await page.screenshot({ clip: { ...origin, width: scale, height: scale } }));
  const offset = (scale * image.width + scale) * 4;
  return [...image.data.subarray(offset, offset + 3)];
}

async function expectLabel(page: Page, scale: number, text: string, x: number, baseline: number) {
  // Derive only the font mask in a separate canvas; the expected wording/count is literal.
  const mask = await page.evaluate(
    ({ scale, text }) => {
      const canvas = document.createElement('canvas');
      canvas.width = text.length * 6 * scale;
      canvas.height = 14 * scale;
      const g = canvas.getContext('2d');
      if (!g) throw new Error('Canvas2D is unavailable');
      g.font = `${11 * scale}px VT323`;
      g.fillText(text, 0, 11 * scale);
      const pixels = g.getImageData(0, 0, canvas.width, canvas.height).data;
      const opaque: number[] = [];
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] === 255) opaque.push(i / 4);
      return { width: canvas.width, height: canvas.height, opaque };
    },
    { scale, text },
  );
  expect(mask.opaque.length).toBeGreaterThan(10);
  const origin = await point(page, scale, x, baseline - 11);
  const image = PNG.sync.read(await page.screenshot({ clip: { ...origin, width: mask.width, height: mask.height } }));
  const matches = mask.opaque.every((i) => {
    const index = ((Math.floor(i / mask.width) * 2 + 1) * image.width + (i % mask.width) * 2 + 1) * 4;
    return [24, 20, 37].every((value, channel) => image.data[index + channel] === value);
  });
  expect(matches, `Rendered label should say ${text}`).toBe(true);
}

for (const scale of [1, 2]) {
  test.describe(`gameplay S=${scale}`, () => {
    test('intro freezes recruitment and ignores commands, then starts automatically', async ({ page }) => {
      await start(page, scale, true);
      const canvas = page.locator('.game-host canvas');
      await expect(canvas).toHaveAttribute('aria-label', /Giới thiệu trận: 3\. Phòng của bạn: TEAM DEV/);
      for (const key of ['4', 'e', 'q', 'w']) await page.keyboard.press(key);
      const position = await point(page, scale, 76, 75);
      await page.mouse.move(position.x, position.y);
      await page.mouse.wheel(0, 200);
      await page.clock.runFor(1100);
      await expect(canvas).toHaveAttribute('aria-label', /Giới thiệu trận: 2\./);
      await page.clock.runFor(1000);
      await expect(canvas).toHaveAttribute('aria-label', /Giới thiệu trận: 1\./);
      await troops(page, scale, 10);
      await percentage(page, scale, 50);
      await page.clock.runFor(1100);
      await expect(canvas).toHaveAttribute('aria-label', /Trận đang chơi/);
      await click(page, scale, 200, 75, 'right');
      await troops(page, scale, 10); // Ignored input did not queue a selection/dispatch/upgrade.
      await page.clock.runFor(1000);
      await troops(page, scale, 11);
    });

    for (const skip of ['Space', 'Enter', 'click'] as const) {
      test(`${skip} skips intro without selecting or dispatching`, async ({ page }) => {
        await start(page, scale, true);
        if (skip === 'click') await click(page, scale, 76, 75);
        else await page.keyboard.press(skip);
        await page.clock.runFor(32);
        await expect(page.locator('.game-host canvas')).toHaveAttribute('aria-label', /Trận đang chơi/);
        await click(page, scale, 200, 75, 'right');
        await page.clock.runFor(200);
        await troops(page, scale, 10);
        await page.keyboard.press('Space');
        await click(page, scale, 200, 75, 'right');
        await page.clock.runFor(200);
        await troops(page, scale, 5);
      });
    }

    test('grace label counts game ticks, survives pause and disappears at 45 seconds', async ({ page }) => {
      await start(page, scale);
      await expectLabel(page, scale, 'Bot chưa tấn công bạn: 45s', 68, 353);
      await page.keyboard.press('Escape');
      await page.clock.runFor(10000);
      await page.keyboard.press('Escape');
      await page.clock.runFor(32);
      await expectLabel(page, scale, 'Bot chưa tấn công bạn: 45s', 68, 353);
      await page.clock.runFor(44000);
      await expectLabel(page, scale, 'Bot chưa tấn công bạn: 1s', 68, 353);
      await page.clock.runFor(1100);
      await expectLabel(page, scale, 'Q Deadline · W Coffee Break', 68, 353);
    });

    for (const [key, remaining] of [
      ['1', 8],
      ['2', 5],
      ['3', 3],
      ['4', 0],
    ] as const) {
      test(`key ${key} and drag dispatch the correct troop count`, async ({ page }) => {
        await start(page, scale);
        await troops(page, scale, 10);
        await page.keyboard.press(key === '1' ? '4' : '1');
        await page.keyboard.press(key);
        await drag(page, scale, [76, 75], [200, 75]);
        await troops(page, scale, remaining);
      });
    }

    test('click selects the source for right-click dispatch', async ({ page }) => {
      await start(page, scale);
      await click(page, scale, 76, 75);
      const [cancelled] = await Promise.all([
        page.evaluate(
          () =>
            new Promise<boolean>((resolve) =>
              window.addEventListener('contextmenu', (event) => resolve(event.defaultPrevented), { once: true }),
            ),
        ),
        click(page, scale, 200, 75, 'right'),
      ]);
      expect(cancelled, 'Native context menu must be suppressed').toBe(true);
      await page.clock.runFor(200);
      await troops(page, scale, 5);
    });

    test('drag threshold is six logical pixels and preview follows the corridor with a troop count', async ({
      page,
    }, info) => {
      await start(page, scale);
      const canvas = page.locator('.game-host canvas');
      const source = await point(page, scale, 76, 75);
      await page.mouse.move(source.x, source.y);
      await page.clock.runFor(32);
      const defaultCursor = await canvas.evaluate((canvas) => canvas.style.cursor);
      await page.mouse.down();
      await page.mouse.move(source.x + 5 * scale, source.y);
      await page.clock.runFor(32);
      expect(await canvas.evaluate((canvas) => canvas.style.cursor)).toBe(defaultCursor);
      await page.mouse.move(source.x + 6 * scale, source.y);
      await page.clock.runFor(32);
      expect(await canvas.evaluate((canvas) => canvas.style.cursor)).not.toBe(defaultCursor);
      const target = await point(page, scale, 200, 75);
      await page.mouse.move(target.x, target.y, { steps: 12 });
      await page.clock.runFor(32);
      expect(await pixel(page, scale, 100, 125), 'Guide follows the lower corridor').toEqual([0, 153, 219]);
      expect(await pixel(page, scale, 145, 75), 'Guide must not cut straight through the wall').not.toEqual([
        0, 153, 219,
      ]);
      await expectLabel(page, scale, 'Điều 5 nhân viên', 208, 67);
      const path = info.outputPath(`drag-preview-s${scale}.png`);
      await page.screenshot({ path });
      await info.attach(`Held drag S${scale}`, { path, contentType: 'image/png' });
      await page.mouse.up();
      await page.clock.runFor(200);
      await troops(page, scale, 5);
    });

    test('Escape clears selection without pausing or dispatching', async ({ page }) => {
      await start(page, scale);
      await click(page, scale, 76, 75);
      await page.keyboard.press('Escape');
      await click(page, scale, 200, 75, 'right');
      await page.clock.runFor(200);
      await troops(page, scale, 10);
      await expect(page.getByRole('region', { name: 'Trận đang tạm dừng' })).toHaveCount(0);
    });

    test('background deselects and skill aiming can be cancelled three ways', async ({ page }) => {
      await start(page, scale);
      await click(page, scale, 76, 75);
      await click(page, scale, 320, 120);
      await click(page, scale, 200, 75, 'right');
      await page.clock.runFor(100);
      await troops(page, scale, 10);
      await page.keyboard.press('Space');
      await page.keyboard.press('w');
      await page.keyboard.press('Escape');
      await click(page, scale, 200, 75, 'right');
      await page.clock.runFor(100);
      await troops(page, scale, 5);
      await page.keyboard.press('w');
      await page.keyboard.press('w');
      await click(page, scale, 200, 75, 'right');
      await page.clock.runFor(100);
      await troops(page, scale, 3);
      await page.keyboard.press('w');
      await click(page, scale, 200, 75, 'right');
      await click(page, scale, 200, 75, 'right');
      await page.clock.runFor(100);
      await troops(page, scale, 2);
    });

    test('wheel changes dispatch percentage during a drag from the room wall', async ({ page }) => {
      await start(page, scale);
      await page.keyboard.press('1');
      const source = await point(page, scale, 17, 30);
      const target = await point(page, scale, 200, 75);
      await page.mouse.move(source.x, source.y);
      await page.mouse.down();
      await page.mouse.move(target.x, target.y, { steps: 12 });
      await page.mouse.wheel(0, 200);
      await page.clock.runFor(32);
      await page.mouse.up();
      await page.clock.runFor(200);
      await troops(page, scale, 5);
    });

    test('wheel clamps percentages and HUD cycles them', async ({ page }) => {
      await start(page, scale);
      await percentage(page, scale, 50);
      await click(page, scale, 340, 350);
      await percentage(page, scale, 75);
      await click(page, scale, 340, 350);
      await percentage(page, scale, 100);
      const position = await point(page, scale, 320, 120);
      await page.mouse.move(position.x, position.y);
      await page.mouse.wheel(0, 200);
      await page.clock.runFor(32);
      await percentage(page, scale, 100);
      await page.mouse.wheel(0, -200);
      await page.clock.runFor(32);
      await percentage(page, scale, 75);
      await page.keyboard.press('1');
      await page.mouse.wheel(0, -200);
      await page.clock.runFor(32);
      await percentage(page, scale, 25);
    });

    for (const upgrade of ['E', 'double-click', 'HUD'] as const) {
      test(`${upgrade} upgrades the selected room and spends ten employees`, async ({ page }) => {
        await start(page, scale);
        if (upgrade === 'double-click') {
          const position = await point(page, scale, 76, 75);
          await page.mouse.dblclick(position.x, position.y);
        } else {
          await click(page, scale, 76, 75);
          if (upgrade === 'E') await page.keyboard.press('e');
          else await click(page, scale, 500, 350);
        }
        await page.clock.runFor(200);
        await troops(page, scale, 0);
        // Level 2 recruits every 0.8s: three by 2.7s; an unupgraded room has only two.
        await page.clock.runFor(2500);
        await troops(page, scale, 3);
      });
    }

    test('Escape pauses real match time and resumes; menu can return home', async ({ page }) => {
      await start(page, scale);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('region', { name: 'Trận đang tạm dừng' })).toBeVisible();
      await page.clock.runFor(2000);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('region', { name: 'Trận đang tạm dừng' })).toHaveCount(0);
      await page.clock.runFor(32);
      await troops(page, scale, 10);
      await page.clock.runFor(2000);
      await troops(page, scale, 12);
      await click(page, scale, 555, 10);
      await page.getByRole('button', { name: 'Về trang chủ', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Trang chủ', exact: true })).toBeVisible();
    });

    for (const group of ['Control', 'drag-through', 'Space', 'HUD', 'box'] as const) {
      test(`${group} groups two owned rooms for one dispatch`, async ({ page }) => {
        await start(page, scale);
        await page.keyboard.press('4');
        await drag(page, scale, [76, 75], [200, 75]);
        await page.clock.runFor(3000);
        await troops(page, scale, 3);
        await troops(page, scale, 5, 246);
        if (group === 'Control') {
          await click(page, scale, 76, 75);
          await page.keyboard.down('Control');
          await click(page, scale, 200, 75);
          await page.keyboard.up('Control');
          await click(page, scale, 320, 75, 'right');
          await page.clock.runFor(200);
        } else if (group === 'drag-through') {
          await drag(page, scale, [76, 75], [320, 75]);
        } else if (group === 'box') {
          await click(page, scale, 320, 120);
          await drag(page, scale, [10, 10], [250, 120]);
          await click(page, scale, 320, 75, 'right');
          await page.clock.runFor(200);
        } else {
          await click(page, scale, 320, 120);
          if (group === 'Space') await page.keyboard.press('Space');
          else await click(page, scale, 570, 350);
          await click(page, scale, 320, 75, 'right');
          await page.clock.runFor(200);
        }
        await troops(page, scale, 0);
        await troops(page, scale, 0, 246);
      });
    }

    for (const skills of ['keyboard', 'HUD'] as const) {
      test(`${skills} Coffee adds fifteen employees and Deadline doubles travel speed`, async ({ page }, info) => {
        await start(page, scale);
        await page.clock.runFor(31000);
        await troops(page, scale, 30);
        expect(await pixel(page, scale, 244, 26), 'KẾ TOÁN starts bot-owned').toEqual([99, 199, 77]);
        if (skills === 'keyboard') await page.keyboard.press('w');
        else await click(page, scale, 40, 350);
        await click(page, scale, 76, 75);
        await page.clock.runFor(200);
        await troops(page, scale, 45);
        if (skills === 'keyboard') await page.keyboard.press('q');
        else await click(page, scale, 20, 350);
        // The 138px corridor takes ~1.4s with Deadline, not ~2.8s without it.
        await drag(page, scale, [76, 75], [200, 75]);
        await page.clock.runFor(1500);
        expect(await pixel(page, scale, 244, 26), 'KẾ TOÁN was captured before normal arrival').toEqual([0, 153, 219]);
        const path = info.outputPath(`skills-s${scale}-${skills}.png`);
        await page.screenshot({ path });
        await info.attach(`Skills S${scale}: ${skills}`, { path, contentType: 'image/png' });
      });
    }

    test('keyboard and HUD trigger emote wheel and display emote bubble', async ({ page }, info) => {
      await start(page, scale);
      await page.keyboard.press('t');
      await page.clock.runFor(50);
      await page.keyboard.press('1');
      await page.clock.runFor(100);
      const path = info.outputPath(`emote-s${scale}.png`);
      await page.screenshot({ path });
      await info.attach(`Emote S${scale}`, { path, contentType: 'image/png' });

      await click(page, scale, 616, 350);
      await page.clock.runFor(50);
      await click(page, scale, 540, 320);
      await page.clock.runFor(200);
    });

    test('holding Alt displays room stat badges and skill cooldown info', async ({ page }, info) => {
      await start(page, scale);
      await click(page, scale, 76, 75);
      await page.keyboard.down('Alt');
      await page.clock.runFor(100);
      const path = info.outputPath(`alt-stats-s${scale}.png`);
      await page.screenshot({ path });
      await info.attach(`Alt stats S${scale}`, { path, contentType: 'image/png' });
      await page.keyboard.up('Alt');
      await page.clock.runFor(100);
    });
  });
}
