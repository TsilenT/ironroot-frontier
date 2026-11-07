import {defineConfig} from '../browser/node_modules/@playwright/test/index.mjs';
import base from '../browser/playwright.config.mjs';
import {fileURLToPath} from 'node:url';
const output=process.env.IRONROOT_FIELD_TRIAL_OUTPUT || fileURLToPath(new URL('./test-results',import.meta.url));
export default defineConfig({...base,testDir:'.',testMatch:'paid.mjs',workers:1,fullyParallel:false,retries:0,timeout:360000,
  outputDir:output+'/artifacts',
  reporter:[['list'],['json',{outputFile:output+'/results.json'}]],
  use:{...base.use,trace:'off',baseURL:'http://127.0.0.1:4291'},
  webServer:{command:'node ../deterministic-fast/server.mjs',url:'http://127.0.0.1:4291',reuseExistingServer:false}});
