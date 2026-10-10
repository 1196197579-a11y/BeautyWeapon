// Reuses the V7.1.1 worker's api(), profile reader and manual route.
const taskUid=url=>{try{const u=new URL(url);return u.protocol==='https:'&&['www.douyin.com','douyin.com'].includes(u.hostname)&&/^\/user\/[A-Za-z0-9_-]{3,200}\/?$/.test(u.pathname)?u.pathname.split('/')[2]:'';}catch{return '';}};
let giftBusy=false,giftWrite=Promise.resolve(),targetPreparation=Promise.resolve(),epochPromise=null;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function editTabs(operation){const until=Date.now()+8000;let delay=80;for(;;){try{return await operation();}catch(e){if(!/Tabs cannot be edited right now/i.test(e.message||'')||Date.now()+delay>until)throw e;if(delay<1000)delay=Math.min(1000,delay*2);await wait(delay);}}}
async function checkOwnedTab(owned){
 const {bw8Owned}=await chrome.storage.local.get('bw8Owned');if(bw8Owned?.nonce!==owned.nonce||owned.epoch!==await browserEpoch())throw Error('临时标签页归属变化，停止操作');
 const t=await chrome.tabs.get(owned.tabId);
 if(t.pinned||!(owned.stage==='reserved'&&t.url==='about:blank#bw8-task='+owned.nonce)&&(taskUid(t.url)!==owned.expectedId||!t.url?.endsWith('#bw8-task='+owned.nonce)))throw Error('临时主页已被用户改变或跳转；未关闭这个标签页，请手动处理');
 return t;
}
async function createOwnedTab(owned,anchor){return editTabs(async()=>{
 const matches=(await chrome.tabs.query({})).filter(t=>t.url==='about:blank#bw8-task='+owned.nonce||t.pendingUrl==='about:blank#bw8-task='+owned.nonce);
 if(matches.length>1)throw Error('任务临时页标记不唯一，停止创建');if(matches.length===1)return matches[0];
 return chrome.tabs.create({url:'about:blank#bw8-task='+owned.nonce,active:false,windowId:anchor.windowId});
});}
async function bounded(p,ms=5000){let timer;try{return await Promise.race([p,new Promise((r,j)=>timer=setTimeout(()=>j(Error('网页响应超时，可能已休眠；未采用其他用户资料')),ms))]);}finally{clearTimeout(timer);}}
async function browserEpoch(){return epochPromise||(epochPromise=(async()=>{let {bw8Epoch}=await chrome.storage.session.get('bw8Epoch');if(!bw8Epoch){bw8Epoch=crypto.randomUUID();await chrome.storage.session.set({bw8Epoch});}return bw8Epoch;})());}
async function isOwned(t){if(!t)return false;const {bw8Owned}=await chrome.storage.local.get('bw8Owned');return !!bw8Owned&&(t.id===bw8Owned.tabId||t.url?.includes('#bw8-task='+bw8Owned.nonce));}
async function closeOwned(owned){const {bw8Owned}=await chrome.storage.local.get('bw8Owned');if(!owned||bw8Owned?.nonce!==owned.nonce)return false;
 if(owned.epoch!==await browserEpoch()){const all=await chrome.tabs.query({});if(all.some(t=>t.url?.includes('#bw8-task='+owned.nonce)))throw Error('浏览器重启后发现旧临时主页，无法重新证明标签页归属；请手动关闭该带任务标记的主页');await chrome.storage.local.remove('bw8Owned');return true;}
 if(owned.tabId===-1){const matches=(await chrome.tabs.query({})).filter(t=>t.url?.endsWith('#bw8-task='+owned.nonce));if(matches.length>1)throw Error('任务标记对应多个标签页，未猜测归属，请手动核对');if(!matches.length){await chrome.storage.local.remove('bw8Owned');return true;}owned.tabId=matches[0].id;await chrome.storage.local.set({bw8Owned:owned});}
 let t;try{t=await chrome.tabs.get(owned.tabId);}catch{await chrome.storage.local.remove('bw8Owned');return true;}
 if(t.pinned||!(owned.stage==='reserved'&&t.url==='about:blank#bw8-task='+owned.nonce)&&(taskUid(t.url)!==owned.expectedId||!t.url?.endsWith('#bw8-task='+owned.nonce)))throw Error('临时主页已被用户改变或跳转；未关闭这个标签页，请手动处理');
 await editTabs(async()=>{const current=await checkOwnedTab(owned);return chrome.tabs.remove(current.id);});await chrome.storage.local.remove('bw8Owned');return true;
}
async function captureTarget(task,anchor){const raw=task.raw;const check=await bounded(chrome.tabs.sendMessage(anchor.id,{type:'BW8_REVALIDATE',nodeToken:raw.nodeToken,fingerprint:raw.fingerprint}));if(!check?.ok)throw Error('礼物行已滚动、移除或复用；不再点击，需人工核对原始任务');
 const result=await bounded(chrome.scripting.executeScript({target:{tabId:anchor.id},world:'MAIN',args:[{token:raw.nodeToken,nickname:raw.nickname,text:raw.text,recordId:raw.recordId}],func:async input=>{
  const controller=window.__BW811_CAPTURE__;
  if(controller?.protocol!=='causal-v1')return {error:'请加载 V8.1.3 网页助手并刷新直播平台，异步身份捕获尚未就绪'};
  return await controller.capture(input);
 }}),6000);const value=result[0]?.result;if(!taskUid(value?.sourceUrl))throw Error(value?.error||'未捕获可绑定的主页地址');return value.sourceUrl;
}

let reportWrite=Promise.resolve();
function saveFailureReport(task,diagnostic,error){return reportWrite=reportWrite.catch(()=>{}).then(()=>saveFailureReportNow(task,diagnostic,error));}
function flushFailureReports(){return reportWrite=reportWrite.catch(()=>{}).then(()=>flushFailureReportsNow());}
async function saveFailureReportNow(task,diagnostic,error){
 const report={taskId:task.id,attempt:task.attempts||diagnostic.attempt,error,diagnostic};
 try{await api('/api/queue/diagnostic-report',report);return;}catch{}
 const {bw813FailureReports=[]}=await chrome.storage.local.get('bw813FailureReports');
 if(bw813FailureReports.length>=10)throw Error('失败日志离线缓冲已满（10份）；请恢复美丽武器服务，现有日志未删除');
 bw813FailureReports.push(report);await chrome.storage.local.set({bw813FailureReports});
}
async function flushFailureReportsNow(){const {bw813FailureReports=[]}=await chrome.storage.local.get('bw813FailureReports');while(bw813FailureReports.length){await api('/api/queue/diagnostic-report',bw813FailureReports[0]);bw813FailureReports.shift();await chrome.storage.local.set({bw813FailureReports});}}
async function runIdentity(anchor){const {bw8Owned}=await chrome.storage.local.get('bw8Owned');if(bw8Owned){await closeOwned(bw8Owned);if(bw8Owned.taskId)try{await api('/api/queue/identity-fail',{taskId:bw8Owned.taskId,lease:bw8Owned.lease,error:'助手恢复后清理了中断任务的专属主页，请重试'});}catch{}}
 const {task}=await api('/api/queue/identity-claim',{});if(!task)return;let owned=null,accepted=false;
 const started=Date.now(),diagnostic={version:'8.1.3',phase:'capture-target',attempt:task.attempts,expectedId:task.expectedId,sourceUrl:task.sourceUrl,extensionId:chrome.runtime.id,userAgent:navigator.userAgent,anchorTabId:anchor.id,polls:0,samples:[],cleanup:'not-started'};
 const sample=value=>{const item={...value,atMs:Date.now()-started};const signature=JSON.stringify(value);if(diagnostic._last===signature){diagnostic.samples.at(-1).repeats=(diagnostic.samples.at(-1).repeats||1)+1;diagnostic.samples.at(-1).atMs=item.atMs;return;}diagnostic._last=signature;if(diagnostic.samples.length>=64)diagnostic.samples.splice(1,1);diagnostic.samples.push(item);};
 try{
  const source=task.sourceUrl||await captureTarget(task,anchor);await api('/api/queue/identity-bind',{taskId:task.id,lease:task.lease,sourceUrl:source,basis:task.sourceUrl?'direct-href':'causal-open',nodeToken:task.raw.nodeToken,fingerprint:task.raw.fingerprint});const expectedId=taskUid(source);
  diagnostic.phase='create-profile-tab';diagnostic.expectedId=expectedId;diagnostic.sourceUrl=source;
  owned={taskId:task.id,lease:task.lease,expectedId,nonce:crypto.randomUUID(),epoch:await browserEpoch(),tabId:-1,stage:'reserved'};await chrome.storage.local.set({bw8Owned:owned});
  const targetUrl='https://www.douyin.com/user/'+expectedId+'#bw8-task='+owned.nonce;
  const tab=await createOwnedTab(owned,anchor);diagnostic.createdTabId=tab.id;owned.tabId=tab.id;await chrome.storage.local.set({bw8Owned:owned});await wait(200);await editTabs(async()=>{await checkOwnedTab(owned);return chrome.tabs.update(tab.id,{url:targetUrl,autoDiscardable:false});});owned.stage='navigating';await chrome.storage.local.set({bw8Owned:owned});
  diagnostic.phase='profile-read';
  const until=Math.min(Date.now()+35000,task.deadline-14000);let last='',stableAt=0,profile;
  while(Date.now()<until){const current=await chrome.tabs.get(tab.id);diagnostic.polls++;sample({tabStatus:current.status,tabActive:!!current.active,tabDiscarded:!!current.discarded,tabFrozen:!!current.frozen,currentId:taskUid(current.url),hashMatches:current.url?.endsWith('#bw8-task='+owned.nonce)});if(current.status==='loading'&&(current.url?.startsWith('about:blank')||!current.url)){await wait(400);continue;}if(current.pinned||taskUid(current.url)!==expectedId||!current.url.endsWith('#bw8-task='+owned.nonce))throw Error('临时主页身份或任务标记变化，停止读取');
   let reply;try{reply=await bounded(chrome.tabs.sendMessage(tab.id,{type:'BW8_PROFILE',expectedId,nonce:owned.nonce}));sample(reply?.diagnostic||{reason:reply?'reader-without-diagnostics':'empty-reply'});}catch(e){sample({reason:'content-script-communication-failed',messageError:e.message});}if(reply?.error)throw Error(reply.error);profile=reply?.profile;if(profile){const sig=JSON.stringify(profile);if(sig!==last){last=sig;stableAt=Date.now();}else if(Date.now()-stableAt>=1000)break;}else last='';
   await wait(400);
  }
  if(!profile||Date.now()-stableAt<1000)throw Error('未读全并验证头像、完整昵称和账号标识；任务可重试');diagnostic.phase='server-profile-validation-or-avatar-download';await api('/api/queue/identity-profile',{taskId:task.id,lease:task.lease,profile});accepted=true;
 }catch(e){diagnostic.error=e.message;diagnostic.elapsedMs=Date.now()-started;await api('/api/queue/identity-fail',{taskId:task.id,lease:task.lease,error:e.message}).catch(()=>{});await chrome.storage.local.set({bw8Error:e.message});}
 finally{let cleanupFailed=false;if(owned)try{diagnostic.cleanup=await closeOwned(owned)?'owned-tab-closed-or-already-absent':'ownership-not-confirmed';}catch(e){cleanupFailed=true;diagnostic.cleanup=e.message;await chrome.storage.local.set({bw8Error:e.message});}if(accepted)await chrome.storage.local.set({bw8LastVerified:task.id});if(!accepted||cleanupFailed){delete diagnostic._last;await saveFailureReport(task,diagnostic,diagnostic.error||diagnostic.cleanup||'任务未完成').catch(async e=>chrome.storage.local.set({bw8Error:e.message}));}}

}
async function prepareTargets(anchor){targetPreparation=targetPreparation.catch(()=>{}).then(async()=>{await giftWrite;const saved=await chrome.storage.local.get({bw8Outbox:[]});const until=Date.now()+8000;for(const e of saved.bw8Outbox.filter(e=>!taskUid(e.profileUrl)&&!e.targetPrepared).slice(0,50)){if(Date.now()>until)break;let result={targetPrepared:true,captureBasis:'causal-open'};try{result.capturedSourceUrl=await captureTarget({raw:e},anchor);}catch(error){result.captureError=error.message;}giftWrite=giftWrite.then(async()=>{const latest=await chrome.storage.local.get({bw8Outbox:[]});const original=latest.bw8Outbox.find(x=>x.eventKey===e.eventKey);if(original){Object.assign(original,result);await chrome.storage.local.set({bw8Outbox:latest.bw8Outbox});}});await giftWrite;}});return targetPreparation;}
async function flushGifts(anchor){await prepareTargets(anchor);const saved=await chrome.storage.local.get({bw8Outbox:[],bw8Stream:''});if(!saved.bw8Outbox.length)return;const result=await api('/api/queue/ingest',{stream:saved.bw8Stream,events:saved.bw8Outbox.slice(0,50)});if(result.accepted?.length){const set=new Set(result.accepted);giftWrite=giftWrite.then(async()=>{const current=await chrome.storage.local.get({bw8Outbox:[]});await chrome.storage.local.set({bw8Outbox:current.bw8Outbox.filter(e=>!set.has(e.eventKey))});});await giftWrite;}}
async function pumpGifts(){if(giftBusy)return;giftBusy=true;try{const {bw8Anchor,bw8Owned}=await chrome.storage.local.get(['bw8Anchor','bw8Owned']);if(!bw8Anchor)return;const anchor=await chrome.tabs.get(bw8Anchor);if(!anchor.url?.startsWith('https://anchor.douyin.com/'))return;await flushGifts(anchor);await runIdentity(anchor);}catch(e){await chrome.storage.local.set({bw8Error:e.message});}finally{giftBusy=false;}}
async function giftMessage(m,sender){const tab=sender.tab;if(!tab||!tab.url?.startsWith('https://anchor.douyin.com/'))throw Error('不是直播平台页面');const stored=await chrome.storage.local.get(['bw8Anchor','bw8Stream']);if(stored.bw8Anchor&&stored.bw8Anchor!==tab.id){try{const old=await chrome.tabs.get(stored.bw8Anchor);if(old.url?.startsWith('https://anchor.douyin.com/'))throw Error('只监听第一张直播平台标签页，请关闭多余平台页再重试');}catch(e){if(e.message.startsWith('只监听'))throw e;}}
 await chrome.storage.local.set({bw8Anchor:tab.id});
 if(m.type==='BW8_HEARTBEAT'){let r;try{const saved=await chrome.storage.local.get({bw8Error:'',bw8ReportedError:'',bw8Outbox:[]});r=await api('/api/queue/heartbeat',{url:m.url,state:m.state,warning:[m.warning,saved.bw8Error!==saved.bw8ReportedError?saved.bw8Error:''].filter(Boolean).join('；'),backlog:saved.bw8Outbox.length+(m.pendingCount||0),listenerEnabled:!!m.listenerEnabled,captureProtocol:m.captureProtocol||'',profileProtocol:m.profileProtocol||''});if(stored.bw8Stream&&r.stream!==stored.bw8Stream){const {bw8Outbox=[]}=await chrome.storage.local.get('bw8Outbox');if(bw8Outbox.length)throw Error('场次变化且仍有未确认礼物，已保留助手存档；请排查后恢复');}await chrome.storage.local.set({bw8Stream:r.stream,bw8ReportedError:saved.bw8Error});await flushFailureReports();pumpGifts();return r;}catch(e){await chrome.storage.local.set({bw8Error:e.message});throw e;}}
 if(m.type==='BW8_GIFTS'){if(!stored.bw8Stream)throw Error('尚未确认场次');if(!Array.isArray(m.events)||m.events.length>100)throw Error('礼物批次过大');giftWrite=giftWrite.then(async()=>{const {bw8Outbox=[]}=await chrome.storage.local.get('bw8Outbox');if(bw8Outbox.length+m.events.length>1000)throw Error('离线礼物缓冲已满，存在漏单风险，请恢复本机服务');const seen=new Set(bw8Outbox.map(e=>e.eventKey));for(const e of m.events){e.eventKey=stored.bw8Stream+':'+e.eventKey;if(!seen.has(e.eventKey)){e.anchorTab=tab.id;bw8Outbox.push(e);seen.add(e.eventKey);}}await chrome.storage.local.set({bw8Outbox});});try{await giftWrite;}catch(e){giftWrite=Promise.resolve();await chrome.storage.local.set({bw8Error:e.message});throw e;}await prepareTargets(tab);pumpGifts();return {ok:true};}
 return {ok:false};
}
chrome.alarms.create('bw8-queue',{periodInMinutes:.5});chrome.alarms.onAlarm.addListener(a=>{if(a.name==='bw8-queue')pumpGifts();});chrome.runtime.onStartup.addListener(()=>{chrome.alarms.create('bw8-queue',{periodInMinutes:.5});pumpGifts();});
