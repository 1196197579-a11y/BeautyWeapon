(()=>{
  if(window.__BW7__)return;window.__BW7__=true;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const isProfile=()=>/^\/user\/[^/]+\/?$/.test(location.pathname);
  let last='',route='',stable='',stableAt=0,readingSince=Date.now(),lastIdentity='',staleIdentity='',queueNonce='',queueReadSince=0;
  function visible(el){const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>24&&r.height>24&&s.display!=='none'&&s.visibility!=='hidden';}
  function profile(){
    if(!isProfile())return null;
    const h=document.querySelector('h1'),heading=clean(h?.innerText||h?.textContent);
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
      const id=url=>{if(!url)return '';try{const u=new URL(url,location.href);return u.protocol==='https:'&&['www.douyin.com','douyin.com'].includes(u.hostname)&&/^\/user\/[A-Za-z0-9_-]{3,200}\/?$/.test(u.pathname)?u.pathname.split('/')[2]:'';}catch{return '';}};
      const p=profile(),current=id(location.href),canonical=id(document.querySelector('link[rel="canonical"]')?.href||document.querySelector('meta[property="og:url"]')?.content||'');
      if(canonical&&canonical!==m.expectedId){reply({ok:false,error:'主页公开账号标识与送礼任务不匹配，已停止读取'});return false;}
      const heading=clean(document.querySelector('h1')?.textContent);
      if(current!==m.expectedId||canonical!==current||location.hash!=='#bw8-task='+m.nonce||!heading){reply({ok:true,profile:null});return false;}
      // A generic navigation/avatar image must never stand in for this account.
      const candidates=[...document.images].filter(img=>visible(img)).filter(img=>{
        const named=clean(img.alt).replace(/头像$/,'').trim(),owner=img.closest('a[href*="/user/"]');
        return named===heading&&!['用户','头像'].includes(named)||owner&&id(owner.href)===current;
      });
      const unique=[...new Set(candidates.map(img=>img.currentSrc||img.src).filter(src=>/^https:\/\//.test(src)))];
      if(unique.length!==1){reply(Date.now()-queueReadSince<8000?{ok:true,profile:null}:{ok:false,error:'头像缺少明确的当前用户关联或存在多个候选，未采用通用头像；请人工核对页面'});return false;}
      if(!candidates.some(img=>img.complete&&img.naturalWidth)){reply({ok:true,profile:null});return false;}
      reply({ok:true,profile:{nickname:heading,avatarUrl:unique[0],sourceUrl:location.href,title:document.title||'',identityId:current,canonicalId:canonical}});return false;
    }
    if(m?.type==='BW7_GET'){const p=profile(),sig=p&&JSON.stringify([p.nickname,p.avatarUrl,location.origin+location.pathname]);reply({ok:true,profile:p&&JSON.stringify([p.nickname,p.avatarUrl])!==staleIdentity&&sig===stable&&Date.now()-stableAt>=900?p:null});return false;}
  });
  const observer=new MutationObserver(()=>{clearTimeout(emit.timer);emit.timer=setTimeout(()=>emit(),180);});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','alt','class']});
  document.addEventListener('visibilitychange',()=>emit(true));window.addEventListener('focus',()=>emit(true));
  setInterval(()=>emit(),600);emit();
})();
