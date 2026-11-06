import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir: '.', timeout: 20000, fullyParallel: true, workers: 2,
  reporter: [['list'], ['html', {open: 'never'}], ['json', {outputFile: 'test-results/results.json'}]],
  use: {baseURL: 'http://127.0.0.1:4187', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {}},
  projects: [
    {name: 'phone', use: {browserName: 'chromium', viewport: {width: 390, height: 650}, isMobile: true, hasTouch: true, deviceScaleFactor: 2}},
    {name: 'narrow-phone', use: {browserName: 'chromium', viewport: {width: 320, height: 568}, isMobile: true, hasTouch: true, deviceScaleFactor: 2}},
    {name: 'landscape', use: {browserName: 'chromium', viewport: {width: 844, height: 390}, isMobile: true, hasTouch: true, deviceScaleFactor: 2}},
    {name: 'desktop', use: {browserName: 'chromium', viewport: {width: 1180, height: 757}}},
  ],
  webServer: {command: 'node server.mjs', url: 'http://127.0.0.1:4187', reuseExistingServer: false},
});
