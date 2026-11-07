import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../qa/browser/server.mjs',import.meta.url),'utf8');
const marker='createServer(async (req, res) => {';
const start=source.indexOf(marker),end=source.lastIndexOf("}).listen(4187, '127.0.0.1');");
assert.ok(start>=0&&end>start,'extract the actual QA request handler, not a second implementation');
const root=fileURLToPath(new URL('../dist',import.meta.url));
function handler(read=readFile){
  // Execute the source handler without starting a listener or browser. The
  // ordinary-file requests below do not enter the immutable fixture routes.
  return runInNewContext('(async (req, res) => {'+source.slice(start+marker.length,end)+'})',{
    URL,resolve,extname,root,readFile:read,
    LEGACY_QA_PATH:'/__fixture_legacy/',REPORT_LEGACY_PATH:'/__fixture_report/',PRODUCTION_V012_PATH:'/__fixture_production/',
    mime:{'.html':'text/html','.css':'text/css'},
  });
}
function response(){
  return {status:null,headers:null,body:null,ended:false,
    writeHead(status,headers){
      if(this.status!==null)throw Object.assign(new Error('Headers already sent'),{code:'ERR_HTTP_HEADERS_SENT'});
      this.status=status;this.headers=headers;return this;
    },
    end(body){assert.equal(this.ended,false);this.ended=true;this.body=body;return this;},
  };
}
test('QA missing-file GET/HEAD returns one 404 and the same handler serves the next real file',async()=>{
  const serve=handler();
  for(const method of ['GET','HEAD']){
    const missing=response();
    await serve({url:'/favicon.ico',method},missing);
    assert.equal(missing.status,404);assert.equal(missing.ended,true);
    const success=response();
    await serve({url:'/',method:'GET'},success);
    assert.equal(success.status,200);assert.equal(success.headers['Content-Type'],'text/html');
    assert.equal(success.headers['Cache-Control'],'no-store');assert.equal(success.ended,true);
    assert.deepEqual(success.body,await readFile(resolve(root,'index.html')));
  }
});
test('QA file response sends no success headers while its read is pending or rejected',async()=>{
  let rejectRead;
  const serve=handler(()=>new Promise((resolve,reject)=>{rejectRead=reject;}));
  const res=response(),pending=serve({url:'/missing.txt',method:'GET'},res);
  assert.equal(res.status,null);assert.equal(res.ended,false);
  rejectRead(Object.assign(new Error('missing'),{code:'ENOENT'}));
  await pending;
  assert.equal(res.status,404);assert.equal(res.ended,true);
});
