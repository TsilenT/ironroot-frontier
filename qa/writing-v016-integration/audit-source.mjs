// Re-run against the exact released tree, PR9 base, and downloaded PR9 head.
// No network access, Git operations, source changes, or browser execution.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const [mainArg,baseArg,incomingArg,currentArg='.']=process.argv.slice(2);
assert.ok(mainArg&&baseArg&&incomingArg,'Usage: node audit-source.mjs RELEASED_ROOT PR9_BASE PR9_INPUT [CURRENT_ROOT]');
const [main,base,incoming,current]=[mainArg,baseArg,incomingArg,currentArg].map(path=>resolve(path));
const read=(root,path)=>readFileSync(join(root,path));
const source=(root,path)=>read(root,path).toString('utf8');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const blobSha=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
let acorn,parserSource;
try {acorn=createRequire(import.meta.url)('acorn');parserSource='installed Acorn';}
catch {
  const bundled=process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'];
  assert.ok(bundled,'Acorn must be installed or included in the current Node executable');
  const module={exports:{}};
  new Function('exports','module',bundled)(module.exports,module);
  acorn=module.exports;parserSource='Acorn bundled with Node';
}

const inputs=JSON.parse(source(incoming,'SOURCE_BLOBS.json'));
assert.equal(inputs.length,37);
for(const input of inputs){
  const bytes=read(incoming,input.path);
  assert.equal(blobSha(bytes),input.sha,`${input.path}: incoming Git blob SHA1`);
}
const runtimePaths=inputs.map(input=>input.path).filter(path=>path.startsWith('dist/'));
const refinements=JSON.parse(source(current,'qa/writing-v016-integration/coordinator-refinements.json'));
function replaceExactly(text,before,after,count,label){
  assert.equal(text.split(before).length-1,count,`${label}: exact approved occurrence count`);
  return text.split(before).join(after);
}
function beforeRefinements(path,text){
  for(const edit of refinements.filter(edit=>edit.path===path))text=replaceExactly(text,edit.after,edit.before,1,path);
  return text;
}
const report={
  mainCommit:'2094b5fb71755ddd37677ae65d5b3d1438487366',
  mainTree:'ec5bd8832d89cee83bc8c8bfbd19cb577f2692dc',
  incomingBranch:'codex/player-copy-rhythm-2026-11-07',
  incomingCommit:'c359d325080fd07261f5fa92a73cac7ae2680e61',
  commonBase:'46d324b94754fe88ed9d324456f284af0aa4537d',
  parser:{source:parserSource,version:acorn.version,node:process.version},
  method:'Compare every JavaScript token and inter-token byte with released main. Only string/template token changes are allowed, and their ordered before/after pairs must exactly match the verified PR9 input against its common base. Preserve fixed numeric facts. Compare HTML markup byte-for-byte and require exactly the approved text-node transitions.',
  verifiedIncomingBlobs:inputs.length,
  incomingByteMetadataNote:'The source metadata uses text-character counts for Unicode files. Actual UTF-8 bytes are verified by the exact Git blob SHA1, including the true byte-length header.',
  coordinatorCopyRefinements:refinements,
  coordinatorWordingRefinementCount:new Set(refinements.map(edit=>edit.refinement)).size,
  coordinatorChangedTextTokens:refinements.length,
  files:[],changedTextTokens:0,finalChangedTextTokens:0,
};
function textTransitions(before,after,path){
  const left=[...acorn.tokenizer(before,{ecmaVersion:'latest',sourceType:'module'})];
  const right=[...acorn.tokenizer(after,{ecmaVersion:'latest',sourceType:'module'})];
  assert.equal(left.length,right.length,`${path}: token count`);
  let previousLeft=0,previousRight=0;
  const changes=[];
  for(let index=0;index<left.length;index++){
    const a=left[index],b=right[index];
    assert.equal(a.type.label,b.type.label,`${path}: token ${index} type`);
    assert.equal(before.slice(previousLeft,a.start),after.slice(previousRight,b.start),`${path}: inter-token bytes ${index}`);
    const oldText=before.slice(a.start,a.end),newText=after.slice(b.start,b.end);
    if(oldText!==newText){
      assert.ok(['string','template'].includes(a.type.label),`${path}: changed non-prose token ${index}`);
      assert.deepEqual((oldText.match(/\d+(?:\.\d+)?/g)||[]).sort(),(newText.match(/\d+(?:\.\d+)?/g)||[]).sort(),`${path}: fixed numeric facts`);
      changes.push({type:a.type.label,before:oldText,after:newText});
    }
    previousLeft=a.end;previousRight=b.end;
  }
  assert.equal(before.slice(previousLeft),after.slice(previousRight),`${path}: trailing bytes`);
  return changes;
}
for(const path of runtimePaths.filter(path=>path.endsWith('.js'))){
  const approved=textTransitions(source(base,path),source(incoming,path),path+' PR9');
  const actual=textTransitions(source(main,path),beforeRefinements(path,source(current,path)),path+' integration');
  assert.deepEqual(actual,approved,`${path}: exactly approved prose transitions`);
  const refined=textTransitions(beforeRefinements(path,source(current,path)),source(current,path),path+' coordinator refinement');
  assert.equal(refined.length,refinements.filter(edit=>edit.path===path).length,`${path}: one token per explicit refinement entry`);
  const finalChanges=textTransitions(source(main,path),source(current,path),path+' final');
  report.files.push({path,changedTextTokens:actual.length,finalChangedTextTokens:finalChanges.length,mainSha256:sha256(read(main,path)),integratedSha256:sha256(read(current,path))});
  report.changedTextTokens+=actual.length;
  report.finalChangedTextTokens+=finalChanges.length;
}
function htmlTransitions(before,after){
  const pattern=/<(?:[^>"']|"[^"]*"|'[^']*')*>/g;
  const left=[...before.matchAll(pattern)],right=[...after.matchAll(pattern)];
  assert.deepEqual(left.map(match=>match[0]),right.map(match=>match[0]),'HTML tags, attributes, comments and declarations');
  let previousLeft=0,previousRight=0;const changes=[];
  for(let index=0;index<=left.length;index++){
    const a=left[index],b=right[index];
    const oldText=before.slice(previousLeft,a?.index??before.length),newText=after.slice(previousRight,b?.index??after.length);
    if(oldText!==newText)changes.push({before:oldText,after:newText});
    if(a){previousLeft=a.index+a[0].length;previousRight=b.index+b[0].length;}
  }
  return changes;
}
const approvedHtml=htmlTransitions(source(base,'dist/index.html'),source(incoming,'dist/index.html'));
const htmlBeforeVersion=replaceExactly(source(current,'dist/index.html'),'<p class="welcome-foot">Campaign · Skirmish · Field trials · v0.16.1</p>','<p class="welcome-foot">Campaign · Skirmish · Field trials · v0.16.0</p>',1,'HTML version footer');
const actualHtml=htmlTransitions(source(main,'dist/index.html'),htmlBeforeVersion);
assert.deepEqual(actualHtml,approvedHtml,'HTML: exactly approved text-node transitions');
report.html={path:'dist/index.html',changedTextNodes:actualHtml.length,tagsAndAllAttributesUnchanged:true,mainSha256:sha256(read(main,'dist/index.html')),integratedSha256:sha256(read(current,'dist/index.html'))};

function walk(root,prefix=''){
  return readdirSync(join(root,prefix),{withFileTypes:true}).flatMap(entry=>{
    const path=prefix?prefix+'/'+entry.name:entry.name;
    return entry.isDirectory()?walk(root,path):[path];
  }).sort();
}
const runtimeFiles=walk(join(main,'dist'));
assert.deepEqual(walk(join(current,'dist')),runtimeFiles,'runtime file inventory');
const unchangedRuntime=runtimeFiles.filter(path=>!runtimePaths.includes('dist/'+path)&&path!=='service-worker.js');
for(const path of unchangedRuntime)assert.deepEqual(read(main,'dist/'+path),read(current,'dist/'+path),`${path}: all other runtime bytes`);
report.runtimeFiles=runtimeFiles.length;
report.unchangedRuntimeFiles=unchangedRuntime.length;
const metadata=[
  {path:'package.json',before:'"version": "0.16.0"',after:'"version": "0.16.1"',count:1},
  {path:'desktop/package.json',before:'"version": "0.16.0"',after:'"version": "0.16.1"',count:1},
  {path:'desktop/package-lock.json',before:'"version": "0.16.0"',after:'"version": "0.16.1"',count:2},
  {path:'dist/service-worker.js',before:"'ironroot-v0.16.0'",after:"'ironroot-v0.16.1'",count:1},
];
for(const edit of metadata)assert.equal(replaceExactly(source(main,edit.path),edit.before,edit.after,edit.count,edit.path),source(current,edit.path),`${edit.path}: exact release metadata change only`);
report.releaseMetadataChanges=[...metadata,{path:'dist/index.html',before:'footer v0.16.0',after:'footer v0.16.1',count:1}];
const packageBefore=JSON.parse(source(main,'qa/browser/package.json'));
const packageAfter=JSON.parse(source(current,'qa/browser/package.json'));
assert.equal(packageAfter.scripts.check,packageBefore.scripts.check+' && node --check player-copy-rhythm.spec.mjs');
packageAfter.scripts.check=packageBefore.scripts.check;
assert.deepEqual(packageBefore,packageAfter,'browser package changed only to add the writing syntax gate');
report.browserSyntaxGate='Retained every current command, appended player-copy-rhythm.spec.mjs';
const historical=inputs.map(input=>input.path).filter(path=>path.startsWith('qa/writing-rhythm/')||path==='docs/PLAYER_COPY_RHYTHM.md');
for(const path of historical)assert.deepEqual(read(current,path),read(incoming,path),`${path}: historical PR9 evidence unchanged`);
report.incomingHistoricalFilesPreserved=historical.length;
const allowedChangedPaths=new Set([
  ...inputs.map(input=>input.path),...metadata.map(edit=>edit.path),
  'README.md','docs/FEATURE_DELIVERY.md','tests/flight-orders-view.test.mjs',
]);
const unchangedBaselinePaths=walk(main).filter(path=>!allowedChangedPaths.has(path));
for(const path of unchangedBaselinePaths)assert.deepEqual(read(main,path),read(current,path),`${path}: preserve all other released source, tests, fixtures, docs and evidence`);
report.otherReleasedFilesPreserved=unchangedBaselinePaths.length;
report.frozenDescriptorHashes=[
  '3b08ea9aa1e101b3a187e2fd9c184a6cfd871f2f2fc4f4c384e5f7693baba69e',
  '42f459c491b5653c42efe8eeb946d75bb11e6a04c7d74e161ea1a5cf755248d4',
];
for(const hash of report.frozenDescriptorHashes){
  assert.ok(source(main,'tests/flight-campaign-identity.test.mjs').includes("'"+hash+"'"));
  assert.ok(source(current,'tests/flight-campaign-identity.test.mjs').includes("'"+hash+"'"));
}

const proseKeys=new Set(['description','subtitle','epilogue','victoryText','hint','briefing','title','prompt','successText']);
const datasets={
  'dist/campaign.js':['CAMPAIGN_CHAPTERS','CAMPAIGN_MISSIONS','CAMPAIGN_PROGRESS_MISSIONS','PROGRESSION_CAMPAIGN_MISSIONS','FLIGHT_CAMPAIGN_MISSIONS'],
  'dist/campaign-onboarding.js':['ONBOARDING_CHAPTER','ONBOARDING_MISSIONS'],
  'dist/intro-campaign.js':['INTRO_CHAPTER','INTRO_MISSIONS'],
  'dist/training.js':['TRAINING_LESSONS'],
};
report.dataParity={datasets:{},changedProseFields:[],nonProseChanges:0};
function compareData(a,b,path){
  if(a===b)return;
  if(typeof a==='string'&&typeof b==='string'){
    const field=path.split('.').filter(part=>!/^\d+$/.test(part)).at(-1);
    assert.ok(proseKeys.has(field)||path.endsWith('.dialogue.text'),`Non-prose data changed: ${path}`);
    report.dataParity.changedProseFields.push(path);return;
  }
  assert.equal(typeof a,typeof b,path);
  assert.equal(Array.isArray(a),Array.isArray(b),path);
  assert.ok(a&&b&&typeof a==='object',`Non-prose data changed: ${path}`);
  assert.deepEqual(Object.keys(a),Object.keys(b),`${path}: keys`);
  for(const key of Object.keys(a))compareData(a[key],b[key],path+'.'+key);
}
for(const [path,names] of Object.entries(datasets)){
  const before=await import(pathToFileURL(join(main,path))),after=await import(pathToFileURL(join(current,path)));
  for(const name of names){
    compareData(before[name],after[name],name);
    report.dataParity.datasets[name]=Array.isArray(after[name])?after[name].length:1;
  }
}
report.result='PASS: only the exact PR9 prose, two explicitly recorded coordinator wording refinements, and candidate version/cache metadata differ from released v0.16 runtime. All other runtime bytes and all exported non-prose descriptor fields are preserved.';
console.log(JSON.stringify(report,null,2));
