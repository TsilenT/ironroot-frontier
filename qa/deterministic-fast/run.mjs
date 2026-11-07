import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';

const mode=process.argv[2];
if(!['real','virtual'].includes(mode))throw Error('Expected real or virtual.');
const directory=fileURLToPath(new URL('.',import.meta.url));
const output=process.env.IRONROOT_DETERMINISTIC_OUTPUT || fileURLToPath(new URL('../browser/test-results/deterministic-'+mode,import.meta.url));
mkdirSync(output,{recursive:true});
const started=performance.now();
const child=spawn(process.execPath,[fileURLToPath(new URL('../browser/node_modules/@playwright/test/cli.js',import.meta.url)),
  'test','-c','playwright.config.mjs',...process.argv.slice(3)],{
  cwd:directory,stdio:'inherit',env:{...process.env,IRONROOT_DETERMINISTIC_CLOCK:mode,IRONROOT_DETERMINISTIC_OUTPUT:output},
});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',(code,signal)=>{
  const result={mode,wallHostSeconds:(performance.now()-started)/1000,exitCode:code,signal,
    timing:'Host command wall time, including browser/server startup, setup, gameplay, evidence readback, oracle checks and teardown.'};
  writeFileSync(output+'/command.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));process.exitCode=code??1;
});
