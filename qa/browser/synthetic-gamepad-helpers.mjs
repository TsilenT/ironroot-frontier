import { expect } from '@playwright/test';
import { installSyntheticGamepad } from './synthetic-gamepad-provider.mjs';

export async function installPad(page) {
  await page.addInitScript(installSyntheticGamepad);
}

export async function neutralPad(page) {
  const prior = await page.evaluate(() => window.__qaGamepad.neutral());
  // A pointer/context reset needs sampled neutral input, not elapsed time.
  await expect.poll(() => page.evaluate(() => window.__qaPadPolls),
    { intervals: [20, 40, 80] }).toBeGreaterThanOrEqual(prior + 3);
}

export async function padButton(page, index) {
  await neutralPad(page);
  const prior = await page.evaluate(index => window.__qaGamepad.tap(index), index);
  // The provider releases after the first pressed sample. Wait for that
  // sample and three neutral samples, without stretching the physical tap.
  await expect.poll(() => page.evaluate(() => window.__qaPadPolls),
    { intervals: [20, 40, 80] }).toBeGreaterThanOrEqual(prior + 4);
}

export async function holdPadButton(page, index, hold) {
  if (!Number.isFinite(hold) || hold <= 0) throw new RangeError('A hold requires a positive duration');
  await neutralPad(page);
  try {
    const prior = await page.evaluate(index => window.__qaGamepad.hold(index), index);
    await expect.poll(() => page.evaluate(() => window.__qaPadPolls),
      { intervals: [20, 40, 80] }).toBeGreaterThanOrEqual(prior + 2);
    // Deliberate long-held confirm/click-through coverage stays a real hold.
    await page.waitForTimeout(hold);
  } finally {
    await neutralPad(page);
  }
}

export async function steerTo(page, target) {
  await neutralPad(page);
  await expect(page.locator('#controllerCursor')).toBeVisible();
  try {
    await page.evaluate(target => window.__qaGamepad.steerTo(target), target);
    await expect.poll(() => page.evaluate(() => window.__qaGamepad.steering?.status),
      { intervals: [20, 40, 80] }).toBe('arrived');
  } finally {
    await neutralPad(page);
  }
  const box = await page.locator('#controllerCursor').boundingBox();
  expect(box).not.toBeNull();
  expect(Math.hypot(target.x - box.x - box.width / 2, target.y - box.y - box.height / 2)).toBeLessThan(15);
}
