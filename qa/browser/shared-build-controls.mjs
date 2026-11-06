// Shared UI routing for existing browser tests. Open the real Build drawer
// before clicking a card; never reveal cards by changing styles or app state.
// Legacy frozen pages without this drawer retain their original controls.
export async function openBuildControls(page) {
  const button = page.locator('#compactBuild');
  if (!await button.count() || !await button.isVisible()) return;
  // After Resume the visible button may retain disabled=true until the next
  // HUD frame. Native tap/click waits for enabled; an early return strands the
  // requested command behind the closed drawer. Never force or click hidden UI.
  const press = async () => {
    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await button.tap();
    else await button.click();
  };
  if (await button.getAttribute('aria-label') === 'Cancel placement') await press();
  if (await button.getAttribute('aria-expanded') !== 'true') await press();
}
export async function prepareBuildControl(page, selector) {
  const target = page.locator(selector);
  if (await target.count() !== 1 || await target.isVisible()) return false;
  const compact = page.locator('#compactBuild');
  if (selector === '#cancelBuild' && await compact.count() && await compact.isVisible() && await compact.getAttribute('aria-label') === 'Cancel placement') {
    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await compact.tap();
    else await compact.click();
    return true; // The real mobile Cancel placement control handled this action.
  }
  if (await target.evaluate(element => !!element.closest('#commandDeck'))) await openBuildControls(page);
  return false;
}
