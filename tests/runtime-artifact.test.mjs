import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectRuntime} from '../scripts/verify-runtime.mjs';
function fixture(run){const root=mkdtempSync(join(tmpdir(),'ironroot-runtime-'));try{writeFileSync(join(root,'service-worker.js'),"const FILES = ['./', './index.html', './app.js', './engine.js'];");writeFileSync(join(root,'index.html'),'<html></html>');writeFileSync(join(root,'app.js'),"import {Game} from './engine.js';");writeFileSync(join(root,'engine.js'),'export class Game {}');run(root);}finally{rmSync(root,{recursive:true,force:true});}}
test('release preflight hashes only the exact complete precached source runtime',()=>fixture(root=>{const report=inspectRuntime(root);assert.equal(report.runtimeFiles,4);assert.match(report.scope,/not publication approval/);for(const hash of Object.values(report.files))assert.match(hash,/^[a-f0-9]{64}$/);}));
test('release preflight rejects stray backup and QA files instead of publishing them',()=>{for(const name of ['app.js.orig','__qa_profile.html','.secret'])fixture(root=>{writeFileSync(join(root,name),'temporary');assert.throws(()=>inspectRuntime(root),/Unexpected:/);});});
test('release preflight rejects missing and uncached imports and symlink entries',()=>{fixture(root=>{rmSync(join(root,'engine.js'));assert.throws(()=>inspectRuntime(root),/Missing: engine.js/);});fixture(root=>{writeFileSync(join(root,'app.js'),"import './missing.js';");assert.throws(()=>inspectRuntime(root),/Uncached module/);});fixture(root=>{symlinkSync('app.js',join(root,'linked.js'));assert.throws(()=>inspectRuntime(root),/symlink/);});});
