(()=>{
  if(window.__BW7__)return;window.__BW7__=true;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const isProfile=()=>/^\/user\/[^/]+\/?$/.test(location.pathname);
  let last='',route='',stable='',stableAt=0,readingSince=Date.now(),lastIdentity='',staleIdentity='';
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
  chrome.runtime.onMessage.addListener((m,s,reply)=>{if(m?.type==='BW7_GET'){const p=profile(),sig=p&&JSON.stringify([p.nickname,p.avatarUrl,location.origin+location.pathname]);reply({ok:true,profile:p&&JSON.stringify([p.nickname,p.avatarUrl])!==staleIdentity&&sig===stable&&Date.now()-stableAt>=900?p:null});return false;}});
  const observer=new MutationObserver(()=>{clearTimeout(emit.timer);emit.timer=setTimeout(()=>emit(),180);});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','alt','class']});
  document.addEventListener('visibilitychange',()=>emit(true));window.addEventListener('focus',()=>emit(true));
  setInterval(()=>emit(),600);emit();
})();
