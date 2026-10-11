(()=>{
 if(window.__BW8_GIFTS__)return;window.__BW8_GIFTS__=true;
 document.documentElement.dataset.bw8Listener='8.1.6';
 const rowSelector='[class*="giftItem"]';
 const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
 function nicknameText(el){
  const strict=arguments.length<2||arguments[1]!==false;
  const emoji=/^(?:\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?(?:[\u{E0020}-\u{E007E}]+\u{E007F})?(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?)*)$/u;
  const emojiAlt=alt=>{const parts=[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(alt)].map(x=>x.segment);return parts.length>0&&parts.every(x=>emoji.test(x));};
  const read=n=>{
   if(n.nodeType===3)return n.nodeValue||'';if(n.nodeType!==1)return '';
   if(n.tagName==='IMG'){const alt=n.getAttribute('alt')||'',hint=(n.getAttribute('src')||'')+' '+n.className;
    if(emojiAlt(alt))return alt;
    if(strict&&/emoji/i.test(hint))throw Error('昵称中的表情图片没有可验证的 Unicode 表情文字；未删除表情猜测昵称');
    return '';
   }
   if(n.tagName==='BR')return ' ';return [...n.childNodes].map(read).join('');
  };return clean(el?read(el):'');
 }
 function nicknameKey(s){return clean(s).normalize('NFC').replace(/[\uFE0E\uFE0F]/g,'');}
 const uid=url=>{if(!url)return '';try{const u=new URL(url,location.href);return u.protocol==='https:'&&['www.douyin.com','douyin.com'].includes(u.hostname)&&/^\/user\/[A-Za-z0-9_-]{3,200}\/?$/.test(u.pathname)?u.pathname.split('/')[2]:'';}catch{return '';}};
 const knownRecordIds=new Set();const nodeState=new WeakMap();let previous=[],baseline=false,enabled=false,pending=[],sending=false,warning='',warningDiagnostic=null,lastWarning='',scrollAt=0,sequence=0,pageId=crypto.randomUUID(),stream='',sessionId='',emptySince=0,emptyGrid=null;
 function rows(){return [...document.querySelectorAll(rowSelector)].filter(e=>[...e.classList].some(c=>/(?:^|[_-])giftItem(?:[_-]|$)/.test(c))&&e.querySelectorAll('[class*="giftItemNickName"]').length===1);}
 // Only the empty-list -> first-row case uses this observation. Existing
 // record-id, bottom-append, account binding and profile validation stay intact.
 let firstEmpty=null;const firstBirths=new WeakMap();
 const rawGiftRows=()=>[...document.querySelectorAll(rowSelector)].filter(e=>[...e.classList].some(c=>/(?:^|[_-])giftItem(?:[_-]|$)/.test(c)));
 function visible(e){if(!e?.isConnected||e.closest('[hidden],[aria-hidden="true"]'))return false;const s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'&&e.getClientRects().length>0;}
 function activeTab(e){if(!visible(e))return false;const control=e.closest('[aria-selected],[data-state],[role="tab"]')||e;return control.getAttribute('aria-selected')!=='false'&&control.getAttribute('data-state')!=='inactive';}
 function loading(root){const selector='[aria-busy="true"],[role="progressbar"],[class*="loading" i],[class*="skeleton" i]';return root.matches(selector)||!!root.querySelector(selector);}
 function emptyPane(){
  if(document.readyState!=='complete')return null;
  const grid=document.querySelector('[class*=ReactVirtualized_Grid]');
  const leaves=[...document.querySelectorAll('[role="tab"],button,a,span,div,p')].filter(e=>!e.children.length&&visible(e));
  const tab=leaves.find(e=>clean(e.textContent)==='礼物明细'&&activeTab(e));
  if(tab){
   const controlled=document.getElementById(tab.getAttribute('aria-controls')||'');if(controlled&&visible(controlled)&&!loading(controlled))return {root:controlled,tab,basis:'opened-gift-pane'};
   const tabHeight=tab.getBoundingClientRect().height,roots=[];let root=tab.parentElement;
   for(let i=0;i<6&&root&&root!==document.body;i++,root=root.parentElement){if(loading(root))return null;if(!visible(root))continue;if(root.contains(grid)||root.getBoundingClientRect().height>tabHeight+12)roots.push(root);}
   if(roots.length)return {root:roots[0],roots,tab,basis:'opened-gift-pane'};
  }
  const hint=leaves.find(e=>/^(?:暂无(?:礼物|送礼记录|礼物记录|数据)|暂时没有礼物|还没有(?:礼物|送礼记录))$/.test(clean(e.textContent)));
  const hintRoot=hint&&(hint.parentElement===document.body?hint:hint.parentElement);
  if(hintRoot&&hintRoot!==document.body&&!loading(hintRoot))return {root:hintRoot,tab:null,basis:'explicit-empty-pane'};
  if(grid&&visible(grid)&&!loading(grid))return {root:grid,tab:null,basis:'existing-empty-grid'};
  return null;
 }
 function observeFirstEmpty(raw){
  if(raw.length){firstEmpty=null;return;}
  if(firstEmpty?.sessionId===sessionId&&firstEmpty?.root.isConnected&&visible(firstEmpty.root)&&!(firstEmpty.roots||[firstEmpty.root]).some(loading)&&(!firstEmpty.tab||activeTab(firstEmpty.tab)))return;
  const pane=emptyPane();firstEmpty=pane?{...pane,sessionId,at:Date.now()}:null;
 }
 function markFirstBirth(records,raw,moving){
  if(!enabled||moving||raw.length!==1||!firstEmpty||firstEmpty.sessionId!==sessionId)return;
  const e=raw[0],root=(firstEmpty.roots||[firstEmpty.root]).find(r=>r.isConnected&&visible(r)&&!loading(r)&&r.contains(e));if(!root||firstEmpty.tab&&!activeTab(firstEmpty.tab))return;
  // Require the observer's original insertion, not a heartbeat finding an
  // existing row. A late-created grid may contain this first row already.
  if(records.some(r=>r.type==='childList'&&[...r.addedNodes].some(n=>n===e||n.nodeType===1&&n.contains(e))))firstBirths.set(e,{root,sessionId,at:Date.now(),basis:firstEmpty.basis});
 }
 function read(e){const n=e.querySelector('[class*="giftItemNickName"]');if(!n)return null;const nickname=nicknameText(n);if(!nickname)return null;const href=n.closest('a[href]')?.href||n.querySelector('a[href]')?.href||e.querySelector('a[href*="/user/"]')?.href||'';const profileUrl=uid(href)?'https://www.douyin.com/user/'+uid(href):'';const recordId=['data-record-id','data-event-id','data-message-id'].map(k=>e.getAttribute(k)).find(Boolean)||'';const text=nicknameText(e,false),gift=clean(e.querySelector('[class*="giftName"]')?.textContent)||text;
  return {nickname,profileUrl,recordId,text,gift,count:clean(e.querySelector('[class*="count"],[class*="Count"]')?.textContent),fingerprint:JSON.stringify([nickname,profileUrl,recordId,text])};}
 const send=m=>chrome.runtime.sendMessage(m);
 function warn(s,details=null){warning=s;warningDiagnostic=details;}
 document.addEventListener('BW8_BLOCKED_PROFILE',()=>warn('阻止了一次没有原始点击归属或已过期的主页打开；未猜测用户身份'));
 async function flush(){if(sending||!pending.length)return;sending=true;let acknowledged=false;const batch=pending.slice(0,50);try{const r=await send({type:'BW8_GIFTS',events:batch,sessionId:batch[0]?.sessionId||sessionId,url:location.href});if(!r?.ok)throw Error(r?.error||'助手未确认');const keys=new Set(batch.map(e=>e.eventKey));pending=pending.filter(e=>!keys.has(e.eventKey));acknowledged=true;}catch(e){warn('礼物暂未确认入队，将重试：'+e.message);}finally{sending=false;if(acknowledged&&pending.length)queueMicrotask(flush);}}
 async function scan(records=[]){try{
  const current=rows(),values=current.map(read);const recordIds=values.filter(v=>v?.recordId).map(v=>v.recordId);if(baseline&&enabled&&new Set(recordIds).size<recordIds.length)warn("网页存在重复记录标识，无法证明它是每次送礼的唯一编号；重复行未另行猜测，需要核对，不能保证零漏单");const unknown=values.filter(v=>v&&!v.recordId);if(baseline&&enabled&&new Set(unknown.map(v=>v.fingerprint)).size<unknown.length)warn('列表存在内容相同且无记录标识的礼物；元素复用后可能无法区分新增记录，不能承诺零漏单');if(!baseline||!enabled){current.forEach((e,i)=>{if(values[i]){nodeState.set(e,{...values[i],baseline:true});if(values[i].recordId)knownRecordIds.add(values[i].recordId);}});previous=current;baseline=true;emptyGrid=!current.length?document.querySelector('[class*=ReactVirtualized_Grid]'):null;emptySince=emptyGrid?Date.now():0;observeFirstEmpty(rawGiftRows());return;}
  const events=[],moving=Date.now()-scrollAt<1200,raw=rawGiftRows();markFirstBirth(records,raw,moving);observeFirstEmpty(raw);
  const liveOld=current.filter(e=>previous.includes(e));const lastOld=liveOld.at(-1),lastIndex=lastOld?current.indexOf(lastOld):-1;
  for(let i=0;i<current.length;i++){const e=current[i],v=values[i];if(!v)continue;const old=nodeState.get(e);if(old?.fingerprint===v.fingerprint)continue;
   const stable=!!v.recordId;if(stable){if(knownRecordIds.has(v.recordId)){nodeState.set(e,{...v,baseline:true});continue;}if(knownRecordIds.size>=20000){warn("本场网页记录标识已达上限，请处理任务后开始新场次");continue;}knownRecordIds.add(v.recordId);}
   const birth=firstBirths.get(e),firstInserted=!!birth&&birth.sessionId===sessionId&&Date.now()-birth.at<20000&&birth.root.isConnected&&birth.root.contains(e)&&visible(birth.root)&&!loading(birth.root);
   const freshEmpty=firstInserted||!previous.length&&emptyGrid?.isConnected&&emptyGrid.contains(e)&&emptySince&&Date.now()-emptySince>=1200&&records.some(r=>r.type==='childList'&&[...r.addedNodes].some(n=>n===e||n.nodeType===1&&n.contains(e)));
   const append=!moving&&!old&&((lastIndex>=0&&i>lastIndex&&current.slice(i+1).every(x=>!previous.includes(x)))||freshEmpty);
   const unknown=!stable&&!append;
   if(unknown){warn(!previous.length?'首条礼物未获得可靠的空列表新增依据；可能仍在初始化或加载历史记录，请到设置查看捕获日志。':'虚拟列表复用、滚动或整批替换无法确认新增礼物；未猜测事件。请到设置查看捕获日志。',{reason:'unconfirmed-gift-row',rowCount:current.length,previousCount:previous.length,rowIndex:i,rowReused:!!old,scrolling:moving,recordId:v.recordId,nickname:v.nickname,gift:v.gift,appended:!!freshEmpty,detail:'firstInsertion='+firstInserted+'; observedEmptyPane='+(birth?.basis||'none')});nodeState.set(e,{...v,baseline:true});continue;}
   const token=crypto.randomUUID();e.setAttribute('data-bw8-token',token);nodeState.set(e,{...v,nodeToken:token});
   events.push({...v,sessionId,nodeToken:token,eventKey:stable?'record:'+v.recordId:'append:'+pageId+':'+(++sequence),pageId,observedAt:Date.now(),ambiguous:false});
  }
  previous=current;if(events.length){const available=Math.max(0,100-pending.length);pending.push(...events.slice(0,available));if(events.length>available)warn('网页重试缓冲已满，有 '+(events.length-available)+' 条记录未能保存，存在漏单风险');flush();}
 }catch(e){warn('礼物记录暂未确认入队：'+e.message);}}
 // No document.hidden gate: covered and inactive pages use the same observer.
 const observer=new MutationObserver(records=>{scan(records);});observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href','data-record-id','data-event-id','data-message-id','alt','src']});
 document.addEventListener('scroll',()=>{scrollAt=Date.now();},{capture:true,passive:true});
 document.addEventListener('readystatechange',()=>{if(document.readyState==='complete')observeFirstEmpty(rawGiftRows());});
 chrome.runtime.onMessage.addListener((m,s,reply)=>{if(m?.type==='BW8_REVALIDATE'){const e=rows().find(x=>x.getAttribute('data-bw8-token')===m.nodeToken),v=e&&read(e);reply({ok:!!v&&v.fingerprint===m.fingerprint,nickname:v?.nickname,text:v?.text,profileUrl:v?.profileUrl,recordId:v?.recordId});return false;}});
 async function heartbeat(){try{const result=await send({type:'BW8_HEARTBEAT',url:location.href,state:rows().length?'礼物明细已连接 · '+(document.hidden?'后台':'可见'):'已连接平台，等待展开礼物明细',warning:warning!==lastWarning?warning:'',pendingCount:pending.length,warningDiagnostic,sessionProtocol:'fresh-session-v1',sessionId,listenerEnabled:enabled,captureProtocol:'causal-v1',profileProtocol:'task-header-v3'});if(result?.ok){lastWarning=warning;if(sessionId&&sessionId!==result.sessionId){baseline=false;knownRecordIds.clear();warning='';warningDiagnostic=null;lastWarning='';emptyGrid=null;emptySince=0;}sessionId=result.sessionId;stream=result.stream;const next=!!result.enabled;document.dispatchEvent(new CustomEvent('BW8_LISTEN_STATE',{detail:next}));if(next!==enabled){enabled=next;baseline=false;}scan();flush();}}catch{}}
 scan();observeFirstEmpty(rawGiftRows());heartbeat();setInterval(heartbeat,5000);
})();

