/** Run in the page. The activation deadline starts only after the browser's
 * update job resolves; Chromium may defer that job for roughly a minute.
 * Completion still requires a different, activated controlling worker. */
export async function updateAndAwaitController({basePath,claimTimeoutMs=30000}) {
  const registration=await navigator.serviceWorker.getRegistration(basePath);
  if(!registration)throw new Error('No prior worker registration exists for the update test.');
  const old=navigator.serviceWorker.controller,started=performance.now();
  if(!old)throw new Error('The prior document has no controlling worker.');
  await registration.update();
  const updateFinished=performance.now();
  await new Promise((resolve,reject)=>{
    let timer=null,watched=null,settled=false;
    function cleanup(){
      if(timer!==null)clearTimeout(timer);
      navigator.serviceWorker.removeEventListener('controllerchange',check);
      watched?.removeEventListener('statechange',check);
    }
    function check(){
      if(settled)return;
      const current=navigator.serviceWorker.controller;
      if(current!==watched){
        watched?.removeEventListener('statechange',check);
        watched=current;
        watched?.addEventListener('statechange',check);
      }
      if(current&&current!==old&&current.state==='activated'){
        settled=true;cleanup();resolve();
      }
    }
    navigator.serviceWorker.addEventListener('controllerchange',check);
    timer=setTimeout(()=>{
      if(settled)return;settled=true;cleanup();
      reject(new Error('Updated worker did not become the activated controller within '+claimTimeoutMs+'ms after registration.update resolved.'));
    },claimTimeoutMs);
    // If takeover occurred during update(), no event needs to be replayed.
    check();
  });
  return {updateJobMs:Math.round(updateFinished-started),claimAfterUpdateMs:Math.round(performance.now()-updateFinished),controllerState:navigator.serviceWorker.controller.state};
}
