import {defineConfig} from '../browser/node_modules/@playwright/test/index.mjs';
import {fileURLToPath} from 'node:url';
import base from '../browser/playwright.config.mjs';

const mode=process.env.IRONROOT_DETERMINISTIC_CLOCK;
if(!['real','virtual'].includes(mode))throw Error('Use npm run test:deterministic-fast or test:deterministic-real from qa/browser.');
const output=process.env.IRONROOT_DETERMINISTIC_OUTPUT || fileURLToPath(new URL('../browser/test-results/deterministic-'+mode,import.meta.url));
export default defineConfig({
  ...base,testDir:'.',testMatch:'cases.mjs',fullyParallel:false,workers:1,retries:0,maxFailures:1,timeout:90000,
  outputDir:output+'/artifacts',
  reporter:[['list'],['json',{outputFile:output+'/results.json'}],['html',{open:'never',outputFolder:output+'/html'}]],
  use:{...base.use,baseURL:'http://127.0.0.1:4291'},
  webServer:{command:'node server.mjs',url:'http://127.0.0.1:4291',reuseExistingServer:false},
});
