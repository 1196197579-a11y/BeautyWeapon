(()=>{
  if(window.__BW7__)return;window.__BW7__=true;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
 function nicknameText(el){
  const read=n=>{if(n.nodeType===3)return n.nodeValue||'';if(n.nodeType!==1)return '';if(n.tagName==='IMG'){const alt=n.getAttribute('alt')||'',src=n.getAttribute('src')||'';return alt&&(/emoji/i.test(src+' '+n.className)||(/\p{Extended_Pictographic}/u.test(alt)&&!/[\p{Letter}\p{Number}]/u.test(alt)))?alt:'';}if(n.tagName==='BR')return ' ';return [...n.childNodes].map(read).join('');};
  return clean(el?read(el):'');
 }
  const isProfile=()=>/^\/user\/[^/]+\/?$/.test(location.pathname);
  let last='',route='',stable='',stableAt=0,readingSince=Date.now(),lastIdentity='',staleIdentity='',queueNonce='',queueReadSince=0;
  function visible(el){const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>24&&r.height>24&&s.display!=='none'&&s.visibility!=='hidden';}
  const uid=url=>{if(!url)return '';try{const u=new URL(url,location.href);return u.protocol==='https:'&&['www.douyin.com','douyin.com'].includes(u.hostname)&&/^\/user\/[A-Za-z0-9_-]{3,200}\/?$/.test(u.pathname)?u.pathname.split('/')[2]:'';}catch{return '';}};
  function shown(el){const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';}
  function accountHeader(){
    const semantic=[...document.querySelectorAll('[data-e2e="user-title"], [data-e2e="user-nickname"]')].filter(shown);
    const nodes=semantic.length?semantic:[...document.querySelectorAll('h1')].filter(shown);
    const names=[...new Set(nodes.map(n=>nicknameText(n)).filter(Boolean))];
    return names.length===1?{node:nodes[0],name:names[0]}:null;
  }
  function imageKey(src){try{const u=new URL(src);if(u.protocol!=='https:')return '';u.hash='';u.pathname=u.pathname.split('~tplv-')[0];for(const k of ['x-oss-process','x-image-process','width','height'])u.searchParams.delete(k);return u.href;}catch{return '';}}
  function associatedAvatar(header,current,diagnostic={}){
    const eligible=img=>{if(!visible(img))return false;const owner=img.closest('a[href*="/user/"]');return !img.closest('nav,[role="navigation"],aside')&&(!owner||uid(owner.href)===current);};
    const avatarMark=img=>/头像|avatar/i.test(img.alt||'')||!!img.closest('[data-e2e="user-avatar"],[class*="avatar" i]');
    // Scope starts at the nickname, not at the page root or the largest image.
    let scope=header.node.parentElement,scoped=[];diagnostic.scope=[];
    for(let depth=0;scope&&depth<6&&!['BODY','HTML'].includes(scope.tagName);depth++,scope=scope.parentElement){
      if(scope.closest('nav,[role="navigation"],aside'))break;
      const rect=scope.getBoundingClientRect();diagnostic.scope.push({depth,tag:scope.tagName,className:scope.className,height:Math.round(rect.height)});if(rect.height>600)break;
      const headings=[...scope.querySelectorAll('h1,[data-e2e="user-title"],[data-e2e="user-nickname"]')].filter(shown);
      if(headings.some(n=>nicknameText(n)!==header.name))break;
      const imgs=[...scope.querySelectorAll('img')].filter(eligible).filter(avatarMark);
      if(imgs.length){scoped=imgs;break;}
    }
    const explicit=[...document.images].filter(eligible).filter(img=>{
      const named=clean(img.alt).replace(/头像$/,'').trim(),owner=img.closest('a[href*="/user/"]');
      return named===header.name&&!['用户','头像'].includes(named)||owner&&uid(owner.href)===current&&avatarMark(img);
    });
    const candidates=[...new Set([...scoped,...explicit])],groups=new Map();
    Object.assign(diagnostic,{scopedCount:scoped.length,explicitCount:explicit.length,candidateCount:candidates.length,candidates:candidates.slice(0,12).map(img=>{const r=img.getBoundingClientRect();return {src:img.currentSrc||img.src,alt:clean(img.alt),complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,width:Math.round(r.width),height:Math.round(r.height),ownerId:uid(img.closest('a[href*="/user/"]')?.href||'')};})});
    for(const img of candidates){const src=img.currentSrc||img.src,key=imageKey(src);if(key){const g=groups.get(key)||[];g.push({img,src});groups.set(key,g);}}
    diagnostic.groupCount=groups.size;
    if(groups.size!==1)return {error:groups.size?'主页头像区域存在多个不同头像，未猜测用户头像':'未找到与主页昵称区域关联的头像',count:groups.size};
    const ready=[...groups.values()][0].find(x=>x.img.complete&&x.img.naturalWidth);
    return ready?{src:ready.src,basis:scoped.length?'profile-header':'account-linked-avatar'}:{pending:true};
  }
  function profile(){
    if(!isProfile())return null;
    const current=uid(location.href),canonical=uid(document.querySelector('link[rel="canonical"]')?.href||document.querySelector('meta[property="og:url"]')?.content||''),header=accountHeader();
    if(header&&canonical===current&&current){const linked=associatedAvatar(header,current);return linked.src?{nickname:header.name,avatarUrl:linked.src,sourceUrl:location.href,title:document.title||''}:null;}
    const h=document.querySelector('h1'),heading=nicknameText(h);
    const titled=clean(document.title).match(/^(.*?)的抖音(?:\s*[-－|｜]\s*抖音)?$/)?.[1]||'';
    const candidates=[...document.images].filter(visible).map(img=>{
      const alt=clean(img.alt),r=img.getBoundingClientRect(),src=img.currentSrc||img.src||'';let score=0;
      if(/头像$/.test(alt))score+=100;
      if((heading&&alt.includes(heading))||(titled&&alt.includes(titled)))score+=60;
      if(r.width>=70&&r.width<=220&&Math.abs(r.width-r.height)<15&&r.top<innerHeight*.6)score+=20;
      if(src.includes('avatar'))score+=12;
      return{img,alt,src,score};
    }).sort((a,b)=>b.score-a.score);
    const avatar=candidates[0];if(!avatar||avatar.score<70||!avatar.img.complete||!avatar.img.naturalWidth)return null;
    const named=avatar.alt.replace(/头像$/,'').trim();
    const nickname=clean(named&&named!=='用户'&&named!=='头像'?named:heading||titled);
    if(!nickname||!/^https:\/\//.test(avatar.src))return null;
    return{nickname,avatarUrl:avatar.src,sourceUrl:location.href,title:document.title||''};
  }
  function message(value){try{chrome.runtime.sendMessage(value).catch(()=>{});}catch{}}
  function emit(force=false){
    if(document.hidden)return;
    const current=location.origin+location.pathname;
    if(route!==current){staleIdentity=route?lastIdentity:'';route=current;last='';stable='';readingSince=Date.now();message({type:'BW7_STATUS',status:isProfile()?'loading':'not-profile',sourceUrl:location.href,detail:isProfile()?'正在读取头像和昵称':'当前不是用户主页'});}
    if(!isProfile())return;
    const p=profile();if(!p){if(Date.now()-readingSince>8000)message({type:'BW7_STATUS',status:'incomplete',sourceUrl:location.href,detail:'未读全头像和昵称；请检查页面是否已加载或需要登录'});return;}
    const identity=JSON.stringify([p.nickname,p.avatarUrl]);if(identity===staleIdentity){if(Date.now()-readingSince>8000)message({type:'BW7_STATUS',status:'incomplete',sourceUrl:location.href,detail:'页面仍显示上一位用户的资料，请等待页面更新或重新加载'});return;}
    const sig=JSON.stringify([p.nickname,p.avatarUrl,current]);
    if(stable!==sig){stable=sig;stableAt=Date.now();return;}
    if(Date.now()-stableAt<900)return;
    if(force||sig!==last||Date.now()-emit.sentAt>2500){last=sig;lastIdentity=identity;emit.sentAt=Date.now();message({type:'BW7_PROFILE',profile:p});}
  }
  chrome.runtime.onMessage.addListener((m,s,reply)=>{
    if(m?.type==='BW8_PROFILE'){
      if(queueNonce!==m.nonce){queueNonce=m.nonce;queueReadSince=Date.now();}
      const current=uid(location.href),canonical=uid(document.querySelector('link[rel="canonical"]')?.href||document.querySelector('meta[property="og:url"]')?.content||'');
      const headers=[...document.querySelectorAll('h1,[data-e2e="user-title"],[data-e2e="user-nickname"]')],header=accountHeader(),heading=header?.name;
      const diagnostic={readerVersion:'8.1.3',protocol:'diagnostic-v1',phase:'profile-read',elapsedMs:Date.now()-queueReadSince,currentId:current,canonicalId:canonical,expectedId:m.expectedId,hashMatches:location.hash==='#bw8-task='+m.nonce,canonicalPresent:!!canonical,headingCount:headers.length,visibleHeadingCount:headers.filter(shown).length,headingNames:headers.filter(shown).slice(0,8).map(n=>nicknameText(n)),headerFound:!!header,readyState:document.readyState,visibility:document.visibilityState,title:document.title,sourceUrl:location.href,avatar:{},images:[...document.images].filter(img=>/头像|avatar/i.test((img.alt||'')+' '+img.className)||img.closest('[class*="avatar" i]')).slice(0,12).map(img=>{const r=img.getBoundingClientRect();return {alt:clean(img.alt),src:img.currentSrc||img.src,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,width:Math.round(r.width),height:Math.round(r.height),inNavigation:!!img.closest('nav,[role="navigation"],aside'),ownerId:uid(img.closest('a[href*="/user/"]')?.href||'')};})};
      const answer=(reason,error,profile=null)=>{diagnostic.reason=reason;reply({ok:!error,diagnostic,profile,...(error?{error}:{})});return false;};
      if(canonical&&canonical!==m.expectedId)return answer('canonical-mismatch','主页公开账号标识与送礼任务不匹配，已停止读取');
      if(current!==m.expectedId)return answer('current-account-mismatch');
      if(!canonical)return answer('canonical-missing');
      if(canonical!==current)return answer('canonical-current-mismatch');
      if(!diagnostic.hashMatches)return answer('task-marker-mismatch');
      if(!heading)return answer(headers.filter(shown).length?'heading-conflict-or-empty':'visible-heading-missing');
      const avatar=associatedAvatar(header,current,diagnostic.avatar);
      if(avatar.error)return answer('avatar-association-rejected',Date.now()-queueReadSince<8000?null:avatar.error+'；已停止制片，请核对主页');
      if(!avatar.src)return answer('avatar-image-not-loaded');
      return answer('profile-ready',null,{nickname:heading,avatarUrl:avatar.src,sourceUrl:location.href,title:document.title||'',identityId:current,canonicalId:canonical});
    }
    if(m?.type==='BW7_GET'){const p=profile(),sig=p&&JSON.stringify([p.nickname,p.avatarUrl,location.origin+location.pathname]);reply({ok:true,profile:p&&JSON.stringify([p.nickname,p.avatarUrl])!==staleIdentity&&sig===stable&&Date.now()-stableAt>=900?p:null});return false;}
  });
  const observer=new MutationObserver(()=>{clearTimeout(emit.timer);emit.timer=setTimeout(()=>emit(),180);});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','alt','class']});
  document.addEventListener('visibilitychange',()=>emit(true));window.addEventListener('focus',()=>emit(true));
  setInterval(()=>emit(),600);emit();
})();
