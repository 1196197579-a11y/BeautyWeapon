// Public browser APIs only. Every captured address carries the original click's
// context; elapsed time, an opener tab, a nickname or an avatar is not identity.
(() => {
 'use strict';
 if(window.__BW811_CAPTURE__)return;
 const originalOpen=window.open,originalThen=Promise.prototype.then;
 const delay=window.setTimeout.bind(window),cancelDelay=window.clearTimeout.bind(window);
 const sessions=new Map(),promiseOwners=new WeakMap();let context=null,enabled=false,trustedUntil=0;
 const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
 const profile=url=>{try{const u=new URL(url,location.href);return u.protocol==='https:'&&['www.douyin.com','douyin.com'].includes(u.hostname)&&/^\/user\/[A-Za-z0-9_-]{3,200}\/?$/.test(u.pathname)?'https://www.douyin.com/user/'+u.pathname.split('/')[2]:'';}catch{return '';}};
 function notice(){document.dispatchEvent(new CustomEvent('BW8_BLOCKED_PROFILE'));}
 function run(owner,fn,self,args){const old=context;context=owner;try{return Reflect.apply(fn,self,args);}finally{context=old;}}
 function wrap(fn,owner){return typeof fn==='function'?function(...args){return run(owner,fn,this,args);}:fn;}
 // Only callbacks created by our click are wrapped. Existing unrelated timers
 // cannot donate their URLs to a task, even while capture is waiting.
 for(const name of ['setTimeout','setInterval','queueMicrotask','requestAnimationFrame','requestIdleCallback']){
  const original=window[name];if(typeof original!=='function')continue;
  window[name]=function(callback,...args){return Reflect.apply(original,this,[context?wrap(callback,context):callback,...args]);};
 }
 Promise.prototype.then=function(yes,no){const owner=context||promiseOwners.get(this);const result=Reflect.apply(originalThen,this,[owner?wrap(yes,owner):yes,owner?wrap(no,owner):no]);if(owner)promiseOwners.set(result,owner);return result;};
 function validRow(s){const row=document.querySelector('[data-bw8-token="'+s.input.token+'"]'),nick=row?.querySelector('[class*="giftItemNickName"]');if(!row||!nick||clean(nick.textContent)!==s.input.nickname||clean(row.textContent)!==s.input.text)return false;const id=['data-record-id','data-event-id','data-message-id'].map(k=>row.getAttribute(k)).find(Boolean)||'';return id===s.input.recordId;}
 function finish(s,error=''){
  if(s.closed)return;s.closed=true;sessions.delete(s.input.token);cancelDelay(s.deadline);cancelDelay(s.quiet);
  if(error)s.resolve({error});else if(s.urls.size===1)s.resolve({sourceUrl:[...s.urls][0],captureProtocol:'causal-v1'});else s.resolve({error:'未取得属于原送礼点击的唯一主页地址；未猜测标签页或账号，请核对身份'});
 }
 function record(s,url){
  if(!s||s.closed){notice();return;}
  const target=profile(url);if(!target){if(url&&url!=='about:blank')finish(s,'送礼点击返回了非用户主页地址，已停止');return;}
  if(!validRow(s)){finish(s,'异步主页返回前原礼物行已移除或复用；已停止，未采用新用户资料');return;}
  s.urls.add(target);if(s.urls.size>1){finish(s,'同一送礼点击返回多个账号地址，无法唯一绑定，已停止');return;}
  cancelDelay(s.quiet);s.quiet=delay(()=>finish(s),350);
 }
 function proxy(s){
  let href='about:blank';const loc={assign:v=>{href=String(v);record(s,v);},replace:v=>{href=String(v);record(s,v);},toString:()=>href};
  Object.defineProperty(loc,'href',{get:()=>href,set:v=>{href=String(v);record(s,v);}});
  const target={focus(){},blur(){},close(){},postMessage(){}};
  Object.defineProperties(target,{location:{get:()=>loc,set:v=>{href=String(v);record(s,v);}},closed:{get:()=>s.closed}});return target;
 }
 window.open=function(url,...rest){
  if(context){const owner=context;if(owner.closed){notice();return null;}const result=proxy(owner);if(url)record(owner,url);return result;}
  if(enabled&&profile(url)&&Date.now()>trustedUntil){notice();return null;}
  return Reflect.apply(originalOpen,this,[url,...rest]);
 };
 document.addEventListener('click',event=>{if(event.isTrusted){trustedUntil=Date.now()+5000;for(const s of sessions.values())finish(s,'人工点击打断了自动身份获取；未混用用户资料，请重试');}else if(context)event.preventDefault();},true);
 document.addEventListener('BW8_LISTEN_STATE',e=>{enabled=!!e.detail;if(!enabled)for(const s of sessions.values())finish(s,'监听已关闭，未继续获取身份');});
 window.__BW811_CAPTURE__={protocol:'causal-v1',capture(input){
  if(sessions.size||sessions.has(input.token))return Promise.resolve({error:'另一条送礼点击仍在获取地址，请稍后重试'});
  return new Promise(resolve=>{
   const s={input,resolve,urls:new Set(),closed:false,deadline:null,quiet:null};sessions.set(input.token,s);
   if(!validRow(s)){finish(s,'礼物行已变化，未点击其他用户');return;}
   enabled=true;trustedUntil=0;s.deadline=delay(()=>finish(s),4000);
   const nick=document.querySelector('[data-bw8-token="'+input.token+'"]').querySelector('[class*="giftItemNickName"]');
   try{run(s,()=>nick.click(),nick,[]);}catch{finish(s,'用户昵称点击未成功，未猜测身份');}
  });
 }};
})();
