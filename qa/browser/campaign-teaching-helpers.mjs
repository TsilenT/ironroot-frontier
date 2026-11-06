// For existing non-teaching regression scenarios only. This is an explicit UI
// choice, never a global press hook or a change to app state/hidden controls.
export async function startRunning(page, press) {
  await press(page, '#start');
  if (await page.locator('#coachingModal').isVisible()) await press(page, '#coachingPlay');
}
