import { expect, test } from '@playwright/test';

for (const scale of [1, 2, 3]) {
  test(`design system renders all sections at S=${scale}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 700 * scale, height: 450 * scale });
    await page.goto('/dev/ui');
    await page.getByRole('button', { name: `${scale}×`, exact: true }).click();
    const root = page.locator('.dev');
    await expect(root).toHaveAttribute('data-scale', String(scale));
    await page.locator('.dev-header').getByRole('switch', { name: 'Giảm chuyển động' }).click();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    );

    const violations = await root.evaluate((root) => {
      const style = getComputedStyle(root);
      const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas2D is unavailable');
      const colors = new Map<string, string>();
      const normalize = (color: string) => {
        const cached = colors.get(color);
        if (cached) return cached;
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const alpha = context.getImageData(0, 0, 1, 1).data[3];
        // DOM scrims may use token colors with opacity; compare their underlying RGB.
        context.fillStyle = `rgb(from ${color} r g b / 1)`;
        context.fillRect(0, 0, 1, 1);
        const value = alpha === 0 ? 'transparent' : [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).join(',');
        colors.set(color, value);
        return value;
      };
      const palette = new Set(['transparent']);
      for (const property of style) {
        if (!property.startsWith('--')) continue;
        const value = style.getPropertyValue(property).trim();
        if (CSS.supports('color', value)) palette.add(normalize(value));
      }
      const errors: string[] = [];
      for (const element of root.querySelectorAll('*')) {
        if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
        const computed = getComputedStyle(element);
        const properties = ['background-color'];
        if ([...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()))
          properties.push('color');
        for (const side of ['top', 'right', 'bottom', 'left']) {
          if (Number.parseFloat(computed.getPropertyValue(`border-${side}-width`)) > 0)
            properties.push(`border-${side}-color`);
        }
        for (const property of properties) {
          const value = normalize(computed.getPropertyValue(property));
          if (!palette.has(value)) errors.push(`${element.tagName}.${element.className}: ${property}=${value}`);
        }
      }
      return [...new Set(errors)];
    });
    expect(violations, 'DOM colors must come from design tokens').toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    const sections = page.locator('.dev-section');
    expect(await sections.evaluateAll((sections) => sections.map((section) => section.id))).toEqual(
      expect.arrayContaining([
        'screen',
        'app-screens',
        'benchmark',
        'employees',
        'match-feedback',
        'match-intro',
        'color',
        'type',
        'shape',
        'icons',
        'motion',
        'buttons',
        'panel',
        'forms',
        'feedback',
        'seats',
        'hud',
        'rooms',
        'depts',
      ]),
    );
    for (const section of await sections.all()) {
      const id = await section.getAttribute('id');
      await section.scrollIntoViewIfNeeded();
      await expect(section.locator('h2')).toBeVisible();
      for (const canvas of await section.locator('canvas').all()) {
        const dimensions = await canvas.evaluate((canvas: HTMLCanvasElement) => ({
          width: canvas.width,
          height: canvas.height,
          cssWidth: Number.parseFloat(getComputedStyle(canvas).width),
          cssHeight: Number.parseFloat(getComputedStyle(canvas).height),
          rendering: getComputedStyle(canvas).imageRendering,
        }));
        expect(dimensions.width).toBe(dimensions.cssWidth);
        expect(dimensions.height).toBe(dimensions.cssHeight);
        expect(dimensions.rendering).toBe('pixelated');
      }
      // Nine full-screen states in one S=3 image exhaust Chromium's screenshot memory.
      const captures =
        id === 'app-screens' || id === 'match-intro'
          ? await section.locator('.screen-preview, canvas[aria-label="Ân hạn đầu trận"]').all()
          : [section];
      for (const [index, capture] of captures.entries()) {
        const name = `${id}${captures.length > 1 ? `-${index + 1}` : ''}`;
        const path = info.outputPath(`dev-ui-s${scale}-${name}.png`);
        await capture.screenshot({ path, animations: 'disabled' });
        await info.attach(`S${scale}: ${name}`, { path, contentType: 'image/png' });
      }
    }
  });
}
