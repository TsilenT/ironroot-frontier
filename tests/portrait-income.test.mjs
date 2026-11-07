import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');

test('portrait income stays inline and readable without increasing HUD tracks',()=>{
 const rule=css.match(/\.protected-portrait #income\s*\{([^}]+)\}/)?.[1];
 assert.ok(rule);
 for(const property of ['display: block','position: static','inset: auto','flex-shrink: 0','font-size: 11px','line-height: 16px','white-space: nowrap'])assert.ok(rule.includes(property),property);
 assert.equal([...html.matchAll(/id="income"/g)].length,1,'reuse the live income readout');
 assert.match(css,/\.app\.protected-mobile\.protected-short-portrait \{ --mobile-header: 48px;/);
 assert.match(css,/\.protected-short-portrait \.topbar \{ grid-template-rows: 20px 26px;/);
 assert.match(css,/\.protected-portrait \.topbar \{[^}]*grid-template-rows: 28px 40px;/);
});
