const API = 'http://127.0.0.1:38560';
const isProfile = url => { try { const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='douyin.com'||u.hostname.endsWith('.douyin.com'))&&/^\/user\/[^/]+\/?$/.test(u.pathname); } catch { return false; } };
let lastSignature='',lastSentAt=0;
let selectedSource='',selection=0,lastActiveTab=-1;
let selectionReady;
async function restoreSelection(){return selectionReady||(selectionReady=(async()=>{const {manualSelection}=await chrome.storage.local.get('manualSelection');if(manualSelection){selectedSource=manualSelection.source||'';selection=manualSelection.epoch||0;lastActiveTab=manualSelection.tabId??-1;}})());}
function select(source){let key='';try{const u=new URL(source);key=u.origin+u.pathname;}catch{}if(key!==selectedSource){selectedSource=key;selection=Math.max(Date.now(),selection+1);}chrome.storage.local.set({manualSelection:{source:selectedSource,epoch:selection,tabId:lastActiveTab}}).catch(()=>{});return selection;}
async function api(path,body) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetch(API+path,{method:body===undefined?'GET':'POST',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
    const data=await response.json();if(!response.ok||data.ok===false)throw Error(data.error||'本机连接失败');return data;
  } finally {clearTimeout(timer);}
}
async function enabled(){return (await chrome.storage.local.get({autoPush:true})).autoPush!==false;}
async function activeTab(){return (await chrome.tabs.query({active:true,lastFocusedWindow:true}))[0]||null;}
async function fromCurrent(sender,source) {
  await restoreSelection();
  if(await isOwned(sender.tab))return false;
  const t=await activeTab();if(!t||!sender.tab||sender.tab.id!==t.id)return false;
  try { const a=new URL(t.url),b=new URL(source);const current=a.origin===b.origin&&a.pathname===b.pathname;if(current){if(lastActiveTab!==t.id){lastActiveTab=t.id;selectedSource='';lastSignature='';}select(t.url);}return current; } catch{return false;}
}
async function setStatus(status,sourceUrl,detail='',epoch=selection) {
  if(epoch!==selection)return;
  const value={status,sourceUrl,detail,selection:epoch,updatedAt:Date.now()};await chrome.storage.local.set({readState:value});
  try {await api('/api/read-status',value);} catch(e){await chrome.storage.local.set({connectionError:e.message});}
}
async function push(profile,force=false) {
  if(!profile||!isProfile(profile.sourceUrl)||!profile.nickname?.trim()||!profile.avatarUrl)throw Error('头像或昵称尚未读全');
  const sig=JSON.stringify([profile.sourceUrl.split('?')[0],profile.nickname,profile.avatarUrl]);
  if(!force&&sig===lastSignature&&Date.now()-lastSentAt<5000){await api('/api/ping',{});return{ok:true,duplicate:true};}
  const epoch=selection;
  const result=await api('/api/douyin-profile',{...profile,selection:epoch,force});if(epoch!==selection||result.ignored)return{ok:true,ignored:true};lastSignature=sig;lastSentAt=Date.now();
  await chrome.storage.local.set({connectionError:'',lastProfile:profile,readState:{status:'ready',sourceUrl:profile.sourceUrl,detail:'头像和昵称已发送',updatedAt:Date.now()}});return result;
}
async function syncActive(force=false) {
  await restoreSelection();
  if(!await enabled())return;
  const t=await activeTab();if(!t)return;
  if(await isOwned(t))return;
  let activeSource='';try{const u=new URL(t.url);activeSource=u.origin+u.pathname;}catch{}
  if(force||lastActiveTab!==t.id){lastActiveTab=t.id;selectedSource='';lastSignature='';}
  const changed=activeSource!==selectedSource,epoch=select(t.url||'');
  if(!isProfile(t.url)){await setStatus('not-profile',t.url||'','请打开抖音用户主页');return;}
  if(changed||force)await setStatus('loading',t.url,'正在读取用户资料');else try{await api('/api/ping',{});}catch{}
  try {
    let result;
    try{result=await chrome.tabs.sendMessage(t.id,{type:'BW7_GET'});}catch{await chrome.scripting.executeScript({target:{tabId:t.id},files:['content.js']});result=await chrome.tabs.sendMessage(t.id,{type:'BW7_GET'});}
    const latest=await activeTab();if(!latest||latest.id!==t.id||latest.url?.split('?')[0]!==t.url?.split('?')[0])return;
    if(result?.profile){await push(result.profile,force);}else{await setStatus('incomplete',t.url,'网页资料仍在加载；头像和昵称读全后会自动发送');}
  } catch(e){await setStatus('error',t.url,e.message,epoch);}
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  (async()=>{
    if(message?.type?.startsWith('BW8_'))return giftMessage(message,sender);
    if(message?.type==='BW7_STATUS') {
      if(!await enabled()||!await fromCurrent(sender,message.sourceUrl))return {ok:false,ignored:true};
      await setStatus(message.status,message.sourceUrl,message.detail);return{ok:true};
    }
    if(message?.type==='BW7_PROFILE') {
      if(!await enabled()||!await fromCurrent(sender,message.profile?.sourceUrl))return {ok:false,ignored:true};
      const epoch=selection;try{return await push(message.profile);}catch(e){await setStatus('error',message.profile?.sourceUrl||'',e.message,epoch);throw e;}
    }
    if(message?.type==='BW7_SYNC'){lastSignature='';await syncActive(true);return{ok:true};}
    return{ok:false};
  })().then(respond,e=>respond({ok:false,error:e.message}));return true;
});
chrome.runtime.onInstalled.addListener(async()=>{const saved=await chrome.storage.local.get('autoPush');if(saved.autoPush===undefined)await chrome.storage.local.set({autoPush:true});chrome.alarms.create('bw7-heartbeat',{periodInMinutes:.5});syncActive();});
chrome.runtime.onStartup.addListener(()=>{chrome.alarms.create('bw7-heartbeat',{periodInMinutes:.5});syncActive();});
chrome.alarms.onAlarm.addListener(a=>{if(a.name==='bw7-heartbeat')syncActive();});
chrome.tabs.onActivated.addListener(()=>syncActive());
chrome.tabs.onUpdated.addListener((id,change,t)=>{if(t.active&&(change.url||change.status==='complete'))syncActive(!!change.url||change.status==='complete');});
chrome.windows.onFocusChanged.addListener(id=>{if(id!==chrome.windows.WINDOW_ID_NONE)syncActive();});
chrome.alarms.create('bw7-heartbeat',{periodInMinutes:.5});
importScripts('gift-background.js');
