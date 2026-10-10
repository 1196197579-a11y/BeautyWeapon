(() => {
  'use strict';
  const PREF='beauty_weapon_v7_preferences',BRIDGE='http://127.0.0.1:38560';
  // A viewer is session data; template geometry and assets are durable settings.
  if(!window.BW_QUEUE_WORKER){const bootAt=Date.now(),originalRenderProfile=renderProfile;renderProfile=function(){if(state.profile&&state.profileTs<bootAt){state.profile=null;state.profileTs=0;}return originalRenderProfile();};if(startupState)startupState.manualName='';state.profile=null;state.profileTs=0;state.manualName='';nicknameInput.value='';state.locked=false;clearComposition();renderProfile();}
  let preferences={autoCompose:true,mode:'normal',randomTemplates:true};
  try{Object.assign(preferences,JSON.parse(localStorage.getItem(PREF)||'{}'));}catch{}
  const m={suspended:0,templateBusy:false,pollBusy:false,targetSource:'',readProblem:'',assetProblem:'',pending:null,failedKey:'',attemptKey:'',readyKey:'',timer:0,lastProfile:'',connected:false,lastSelection:0,playingUser:'',posterToken:0,started:false,playBusy:false,randomBusy:false,randomPreparedKey:'',randomProblem:'',randomTemplate:null,randomSkipped:[],randomFailedKey:''};
  const canonical=value=>{try{const u=new URL(value);return u.origin+u.pathname.replace(/\/$/,'');}catch{return '';}};
  const isProfile=value=>{try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='douyin.com'||u.hostname.endsWith('.douyin.com'))&&/^\/user\/[^/]+\/?$/.test(u.pathname);}catch{return false;}};
  const signature=p=>JSON.stringify([p?.nickname||'',p?.avatarDataUrl||'',canonical(p?.sourceUrl||'')]);
  const blobs=new WeakMap();let nextBlob=1;
  const blobKey=b=>{if(!b)return null;if(!blobs.has(b))blobs.set(b,nextBlob++);return[blobs.get(b),b.size,b.type];};
  const rounded=o=>o&&Object.fromEntries(Object.entries(o).map(([k,v])=>[k,typeof v==='number'?Math.round(v*100000)/100000:v]));
  compKey=function(){const s=currentState();return JSON.stringify([blobKey(state.videoBlob),blobKey(state.fontBlob),blobKey(state.decoBlob),signature(state.profile),state.manualName.trim(),s.appearTime,s.entryEffect,s.textColor,rounded(s.profileNorm),rounded(s.decoNorm),s.fontSize,s.effectiveFontSize,preferences.randomTemplates?m.lastSelection:0]);};
  const originalSync=sync;
  sync=function(){originalSync();if(m.started&&!m.suspended){schedule();update();}};
  const style=document.createElement('style');
  style.textContent=`
  .topbar{gap:12px}.brand{min-width:0;font-size:21px}.brand span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bw7-mode{max-width:132px;flex-shrink:0}.top-status{max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bw7-tools{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}.bw7-tools button{flex:1;font-size:11px;padding:6px}.bw7-status{padding:9px 11px;background:#08272d;border:1px solid #28636b;border-radius:10px;line-height:1.5;font-size:12px;margin:8px 0;color:#aaf6e7}.bw7-status.warn{border-color:#865f28;color:#ffd89a}.bw7-status.bad{border-color:#a84852;color:#ffb8bf}.bw7-auto{margin:8px 0;font-size:12px;color:#b3d6dc}.bw7-materials{margin-top:8px;padding-top:8px;border-top:1px solid #214049;font-size:11px;line-height:1.7;color:#9bbdc6}
  #bw7Live{display:none}.bw7-live .workspace{position:absolute;left:-12000px;top:52px;width:100vw;height:calc(100vh - 52px);pointer-events:none}.bw7-live #topStatus{display:none}.bw7-live .brand{font-size:18px}.bw7-live #bw7Live{position:fixed;inset:62px 12px 12px;display:flex;flex-direction:column;gap:10px;max-width:680px;margin:0 auto;background:#0b1b22;border:1px solid #284852;border-radius:16px;padding:14px;overflow:auto}
  .bw7-preview{position:relative;border:1px solid #244d58;border-radius:12px;background:#030c10;overflow:hidden;aspect-ratio:16/9;flex-shrink:0}.bw7-preview canvas{display:block;width:100%;height:100%;object-fit:contain}.bw7-preview-label{position:absolute;left:9px;top:9px;font-size:11px;border-radius:6px;padding:4px 7px;background:#061b21d9;color:#9debdc}.bw7-person{display:flex;gap:12px;align-items:center;min-height:68px}.bw7-person img{width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #59d8bb;background:#102a33}.bw7-person strong{display:block;font-size:20px;word-break:break-all}.bw7-person small{display:block;font-size:12px;margin-top:5px;color:#9ebfc8}.bw7-live-status{font-size:14px;line-height:1.65;padding:10px 12px;border-radius:10px;background:#09282f;border:1px solid #2b6167;color:#b5eee3}.bw7-live-status.bad{border-color:#a84852;color:#ffbdc4}.bw7-live-status.warn{border-color:#8a632d;color:#ffd99d}#bw7LivePlay{min-height:54px;font-size:18px;background:#44dfb7;color:#06251e;flex-shrink:0}#bw7LivePlay:disabled{background:#173842;color:#91b2bc;opacity:1}.bw7-foot{font-size:11px;color:#8ab2bd;line-height:1.6;margin-top:0}
  @media(max-width:900px){.topbar .top-status{display:none}}`;
  document.head.appendChild(style);
  const brand=$('.brand');if(brand){const img=brand.querySelector('img');brand.replaceChildren();if(img)brand.append(img);const text=document.createElement('span');text.textContent='美丽武器 V8.1.5 | 直播回馈';brand.append(text);}
  document.title='美丽武器 V8.1.5  ｜直播回馈';
  const mode=document.createElement('button');mode.className='bw7-mode';mode.id='bw7Mode';mode.setAttribute('aria-label','工作模式');mode.type='button';mode.title='点击切换普通模式和直播模式';$('.topbar').append(mode);
  const live=document.createElement('section');live.id='bw7Live';live.innerHTML='<div class="bw7-preview"><canvas id="bw7Poster" width="640" height="360"></canvas><span class="bw7-preview-label">待播放成片 · 核对画面</span></div><div class="bw7-person"><img id="bw7Avatar" alt="已识别用户头像"><div><strong id="bw7Name">等待识别用户</strong><small id="bw7Identity">打开送礼用户的抖音主页</small></div></div><div id="bw7LiveStatus" class="bw7-live-status" role="status" aria-live="polite">等待头像和昵称</div><button id="bw7LivePlay" disabled>立即播放</button><button class="secondary" id="bw71LiveOutput">打开直播输出窗口</button><div class="bw7-foot">头像和完整昵称在这里独立显示。核对正确且合成完成后再播放。切回普通模式可调整模板和素材。</div>';
  document.body.append(live);
  const templateLabel=document.createElement('small');templateLabel.id='bw711Template';$('#bw7Identity').after(templateLabel);
  const ordinaryStatus=document.createElement('div');ordinaryStatus.id='bw7Status';ordinaryStatus.className='bw7-status';ordinaryStatus.setAttribute('role','status');$('.manual-card').insertBefore(ordinaryStatus,$('.manual-card').children[1]);
  const autoRow=document.createElement('label');autoRow.className='bw7-auto';autoRow.innerHTML='<input type="checkbox" id="bw7Auto"> 读取头像和昵称后自动合成';ordinaryStatus.after(autoRow);$('#bw7Auto').checked=preferences.autoCompose;
  const randomRow=document.createElement('label');randomRow.className='bw7-auto';randomRow.innerHTML='<input type="checkbox" id="bw711Random"> 随机使用所有未归档模板';autoRow.after(randomRow);$('#bw711Random').checked=preferences.randomTemplates;
  const toolRow=document.createElement('div');toolRow.className='bw7-tools';toolRow.innerHTML='<button class="secondary" id="bw7Export">导出模板＋素材</button><button class="secondary" id="bw7Import">导入模板包</button><button class="secondary" id="bw7RestoreArchive" title="恢复最近一次归档的模板">恢复归档</button>';$('#templateStatus').after(toolRow);
  const materials=document.createElement('div');materials.id='bw7Materials';materials.className='bw7-materials';toolRow.after(materials);
  const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='.bwtemplate';fileInput.hidden=true;document.body.append(fileInput);
  $('.manual-card').style.overflowY='auto';$('.right').style.overflowY='auto';
  function savePreferences(){if(window.BW_QUEUE_WORKER)return;localStorage.setItem(PREF,JSON.stringify(preferences));}
  function setMode(value){preferences.mode=value==='live'?'live':'normal';mode.textContent=preferences.mode==='live'?'切换普通模式':'切换直播模式';mode.setAttribute('aria-pressed',String(preferences.mode==='live'));document.body.classList.toggle('bw7-live',preferences.mode==='live');savePreferences();update();if(!window.BW_QUEUE_WORKER&&window.bw71Resize)window.bw71Resize(preferences.mode);}
  mode.onclick=()=>setMode(preferences.mode==='live'?'normal':'live');
  $('#bw7Auto').onchange=()=>{preferences.autoCompose=$('#bw7Auto').checked;savePreferences();m.failedKey='';schedule();update();};
  function setRandomTemplates(value){preferences.randomTemplates=!!value;savePreferences();m.randomPreparedKey='';m.randomProblem='';m.randomTemplate=null;m.randomSkipped=[];m.failedKey='';m.randomFailedKey='';clearComposition();clearPoster();schedule();update();}
  $('#bw711Random').onchange=()=>setRandomTemplates($('#bw711Random').checked);
  const randomIdentityKey=()=>JSON.stringify([m.lastSelection,signature(state.profile)]);
  const randomFailureKey=()=>randomIdentityKey()+'|'+(m.randomTemplate?.id||'');
  function complete(){return !!(state.profile?.nickname?.trim()&&state.profile?.avatarDataUrl&&isProfile(state.profile?.sourceUrl)&&avatarImg.src===state.profile.avatarDataUrl&&avatarImg.complete&&avatarImg.naturalWidth>0);}
  function timingProblem(){const appear=Number($('#appearTime').value),duration=pv.duration,entry={none:0,fade:.55,pop:.5,sweep:.7,revealLeft:1,revealRight:1}[$('#entryEffect').value]||0;if(!Number.isFinite(appear)||appear<0)return '出场时间无效，请回普通模式调整';if(Number.isFinite(duration)&&duration>0&&appear+entry+.05>=duration)return '视频结尾不足以完整显示用户信息，请回普通模式调早出场时间';return '';}
  avatarImg.addEventListener('load',()=>{if(complete()&&m.readProblem.startsWith('头像无法显示'))m.readProblem='';schedule();update();});
  avatarImg.addEventListener('error',()=>{if(state.profile?.avatarDataUrl){m.readProblem='头像无法显示，已停止自动合成；请在网页助手中重新读取';clearComposition();clearPoster();update();}});
  function readiness(){
    if(m.playBusy)return ['正在打开输出窗口…','warn'];
    if(!pv.paused&&state.playingComposed)return ['正在播放：'+(m.playingUser||state.profile?.nickname||'当前用户')+(m.pending?'；播完后准备下一位':'') ,'warn'];
    if(m.templateBusy)return ['正在载入模板和素材…','warn'];
    if(m.randomBusy)return ['正在随机选择可用模板…','warn'];
    if(preferences.randomTemplates&&m.randomProblem)return [m.randomProblem,'bad'];
    if(m.assetProblem)return [m.assetProblem,'bad'];
    if(m.readProblem)return [m.readProblem,'bad'];
    if(m.pending)return ['等待当前视频结束，再准备新用户','warn'];
    if(preferences.randomTemplates&&complete()&&m.randomPreparedKey!==randomIdentityKey())return ['已识别 '+state.profile.nickname+'，正在准备随机模板…','warn'];
    if(!state.videoBlob)return ['请切回普通模式，导入 PV 或加载完整模板','warn'];
    if(state.locked)return ['当前用户已锁定，请回普通模式解锁后使用自动直播流程','warn'];
    if(!state.autoReceive)return ['自动接收已关闭，请回普通模式开启后使用直播模式','warn'];
    if(timingProblem())return [timingProblem(),'bad'];
    if(state.manualName.trim())return ['手动昵称正在覆盖网页昵称；直播前请清空手动昵称','bad'];
    if(!complete())return [m.connected?'等待送礼用户的完整头像和昵称':'等待 V8.1.5 网页助手连接；请打开用户主页','warn'];
    if(state.composing)return [m.attemptKey!==compKey()?'已切换到 '+state.profile.nickname+'，正在准备最新用户…':'正在为 '+state.profile.nickname+' 合成，请稍候…','warn'];
    if(m.failedKey===compKey()||preferences.randomTemplates&&m.randomFailedKey===randomFailureKey())return ['合成失败，请切回普通模式点击“视频合成”重试','bad'];
    if(state.composedSrc&&state.composedKey===compKey())return ['可以播放：'+state.profile.nickname+(state.locked?'（当前用户已锁定）':''),''];
    return [preferences.autoCompose?'已识别 '+state.profile.nickname+'，正在准备合成…':'自动合成已关闭，请在普通模式手动合成','warn'];
  }
  function update(){
    if(window.bwQueueOwnsLive&&window.bwQueueRefreshLive){window.bwQueueRefreshLive();return;}const [message,kind]=readiness();ordinaryStatus.textContent=message;ordinaryStatus.className='bw7-status '+kind;$('#bw7LiveStatus').textContent=message;$('#bw7LiveStatus').className='bw7-live-status '+kind;
    const p=m.pending?.profile||state.profile;$('#bw7Name').textContent=p?.nickname||'等待识别用户';if(window.bw71Avatar)window.bw71Avatar($('#bw7Avatar'),p?.avatarDataUrl||'');else $('#bw7Avatar').style.visibility='hidden';
    $('#bw7Identity').textContent=m.pending?'下一位待处理用户':p?'已读取完整昵称 · '+(state.locked?'用户已锁定':'请核对头像'):'打开送礼用户的抖音主页';
    const chosen=m.randomTemplate&&(m.randomPreparedKey===randomIdentityKey()||state.playingComposed)?m.randomTemplate.name:'';
    templateLabel.textContent=preferences.randomTemplates?(chosen?'本次模板：'+chosen+(m.randomSkipped.length?' · 跳过 '+m.randomSkipped.length+' 个不可用模板':''):'随机模板：等待选择'):'固定使用当前模板';templateLabel.title=m.randomSkipped.join('\n');
    $('#bw711Random').checked=preferences.randomTemplates;if($('#bw711RandomSetting'))$('#bw711RandomSetting').checked=preferences.randomTemplates;
    $('#bw7LivePlay').disabled=!!kind||state.composing||m.playBusy||!pv.paused;
    for(const id of ['playBtn','bw7LivePlay'])$('#'+id).classList.toggle('bw815-ready',!kind&&!state.composing&&!m.playBusy&&pv.paused&&state.composedKey===compKey()&&!!state.composedSrc);
    $('#bw7LivePlay').textContent=m.playBusy?'正在打开输出窗口…':(!pv.paused&&state.playingComposed?'播放中…':'立即播放');
    materials.textContent=['视频：'+(state.videoName||'未导入'),'字体：'+(state.fontName||'系统默认'),'图片：'+(state.decoName||'无图片')].join('　');
  }
  function schedule(delay=650){clearTimeout(m.timer);if(window.BW_QUEUE_WORKER||!m.started||m.suspended||!preferences.autoCompose)return;m.timer=setTimeout(maybeCompose,delay);}
  async function maybeCompose(){
    if(window.bwQueueOwnsLive||m.suspended||m.templateBusy||m.randomBusy||m.readProblem||m.pending||state.composing||!pv.paused||!complete()||state.manualName.trim()||state.locked||!state.autoReceive)return;
    if(preferences.randomTemplates&&!await prepareRandomTemplate())return;
    if(preferences.randomTemplates&&m.randomFailedKey===randomFailureKey())return;
    if(m.assetProblem||!state.videoBlob||timingProblem())return;
    const key=compKey();if(state.composedKey===key&&state.composedSrc||m.failedKey===key)return;
    await compose(false);
  }
  const oldCompose=window.v680Compose;const originalCompose=async()=>{if(!window.bwQueueApi)return oldCompose();await window.bwQueueApi('manual',{action:'claim'});try{return await oldCompose();}finally{await window.bwQueueApi('manual',{action:'release'});}};
  async function compose(manual){
    if(m.suspended||m.templateBusy||m.randomBusy||state.composing)return;
    if(!pv.paused){toast('请等待当前视频播放结束，再准备下一条');return;}
    if(manual){m.failedKey='';m.randomFailedKey='';if(m.assetProblem&&state.videoBlob)m.assetProblem='';}
    if(m.readProblem&&!state.manualName.trim()){toast(m.readProblem);return;}
    if(preferences.randomTemplates&&complete()&&!state.manualName.trim()){if(manual&&m.randomProblem)m.randomPreparedKey='';if(!await prepareRandomTemplate())return;}
    if(timingProblem()){toast(timingProblem());return;}
    try{await originalCompose();}catch(e){toast(e.message);}update();
  }
  window.v680Compose=()=>compose(true);$('#composeBtn').onclick=window.v680Compose;
  async function makePoster(){
    if(window.bwQueueOwnsLive)return;
    const token=++m.posterToken,src=state.composedSrc,key=state.composedKey;if(!src)return;
    const video=document.createElement('video');video.muted=true;video.preload='auto';video.src=src;
    try{
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('预览读取超时')),12000);video.onloadedmetadata=()=>{clearTimeout(timer);resolve();};video.onerror=()=>{clearTimeout(timer);reject(Error('预览读取失败'));};});
      const point=Math.min(Math.max(0,video.duration-.1),Number($('#appearTime').value||0)+1.15);
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('预览定位超时')),12000);video.onseeked=()=>{clearTimeout(timer);resolve();};video.currentTime=Math.max(.001,point);});
      if(!window.bwQueueOwnsLive&&token===m.posterToken&&key===state.composedKey){$('#bw7Poster').getContext('2d').drawImage(video,0,0,640,360);}
    }catch(e){D('V7 POSTER '+e.message);}finally{video.pause();video.removeAttribute('src');video.load();}
  }
  const posterCtx=$('#bw7Poster').getContext('2d');
  function clearPoster(){m.posterToken++;if(window.bwQueueOwnsLive)return;posterCtx.fillStyle='#030c10';posterCtx.fillRect(0,0,640,360);posterCtx.fillStyle='#90b9c3';posterCtx.font='18px Microsoft YaHei';posterCtx.textAlign='center';posterCtx.fillText('合成完成后显示核对画面',320,180);}
  window.bw7={
    composeStarted(key){m.attemptKey=key;m.readyKey='';update();},
    composeReady(key){m.readyKey=key;m.failedKey='';m.randomFailedKey='';makePoster();},
    composeFailed(key,error){if(key===compKey())m.failedKey=key;else m.failedKey='';if(preferences.randomTemplates&&m.randomPreparedKey===randomIdentityKey())m.randomFailedKey=randomFailureKey();},
    composeEnded(key){setTimeout(()=>{update();if(compKey()!==key)schedule(100);},0);},
    setMode,setRandomTemplates,loadTemplateById:async id=>{ $('#templateSelect').value=id;return loadTemplate(); },
    exportTemplate:()=>exportTemplate(),importTemplate:blob=>importTemplate(blob),
    state:()=>({lastSelection:m.lastSelection,targetSource:m.targetSource,readProblem:m.readProblem,assetProblem:m.assetProblem,pending:!!m.pending,complete:complete(),ready:state.composedKey===compKey()&&!!state.composedSrc&&!m.randomProblem,templateBusy:m.templateBusy||m.randomBusy,randomTemplate:m.randomTemplate?{...m.randomTemplate}:null,randomSkipped:[...m.randomSkipped],randomProblem:m.randomProblem,randomPrepared:m.randomPreparedKey===randomIdentityKey(),randomFailed:m.randomFailedKey===randomFailureKey(),preferences:{...preferences}})
  };
  const originalPlay=doPlay;
  doPlay=async function(){
    if(m.templateBusy||m.randomBusy||m.randomProblem||m.pending||m.readProblem||m.assetProblem){toast(readiness()[0]);return;}
    if(preferences.mode==='live'){
      if(readiness()[1]||state.composedKey!==compKey()){toast(readiness()[0]);return;}
      m.playBusy=true;update();
      try{if(!state.nativeOutputActive)await openNativeOutput();if(!state.nativeOutputActive)throw Error('直播输出窗口未打开，请在普通模式重试');}
      catch(e){toast(e.message);return;}finally{m.playBusy=false;update();}
    }
    m.playingUser=state.profile?.nickname||state.manualName||'当前视频';await originalPlay();update();
  };
  $('#playBtn').onclick=()=>doPlay();$('#bw7LivePlay').onclick=()=>doPlay();$('#bw71LiveOutput').onclick=$('#openOutputBtn').onclick;
  function applyProfile(p){
    const sig=signature(p);if(sig===m.lastProfile&&state.profile)return;
    m.lastProfile=sig;state.manualName='';nicknameInput.value='';state.profile=p;state.profileTs=Date.now();m.readProblem='';m.failedKey='';clearComposition();clearPoster();renderProfile();schedule();update();
  }
  function incoming(p){if(!pv.paused&&state.playingComposed){if(signature(p)!==signature(state.profile))m.pending={profile:p};update();return;}applyProfile(p);}
  function flushPending(){if(m.pending&&pv.paused){const pending=m.pending;m.pending=null;if(pending.profile)applyProfile(pending.profile);else{state.profile=null;m.lastProfile='';m.readProblem=pending.message||'正在读取下一位用户';clearComposition();clearPoster();renderProfile();}}schedule();update();}
  pv.addEventListener('ended',()=>setTimeout(flushPending,80));pv.addEventListener('pause',()=>setTimeout(flushPending,80));pv.addEventListener('play',update);
  async function readBridge(){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);try{const r=await fetch(BRIDGE+'/api/assistant-state?x='+Date.now(),{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('助手服务不可用');return await r.json();}finally{clearTimeout(timer);}}
  window.bw7Poll=async function(){
    if(window.BW_QUEUE_WORKER||window.bwQueueActivePlaying||m.pollBusy)return;m.pollBusy=true;
    try{
      const d=await readBridge();m.connected=!!d.connected;
      $('#recvState').textContent=d.connected?'V8.1.5 网页助手已连接':'等待 V8.1.5 网页助手';$('#recvState').classList.toggle('off',!d.connected);$('#topStatus').textContent=d.connected?'V8.1.5 本地服务正常 · 助手已连接':'V8.1.5 服务正常 · 等待网页助手';
      if(!state.autoReceive||state.locked){update();return;}
      const s=d.status||{},source=canonical(s.sourceUrl);
      if(isProfile(s.sourceUrl)&&Number(d.selection)>m.lastSelection){m.lastSelection=Number(d.selection);if(state.manualName){state.manualName='';nicknameInput.value='';m.failedKey='';if(pv.paused){clearComposition();clearPoster();}renderProfile();schedule();}if(preferences.randomTemplates){if(pv.paused){clearComposition();clearPoster();}schedule();}}
      if(isProfile(s.sourceUrl)&&source!==m.targetSource){
        m.targetSource=source;m.failedKey='';state.manualName='';nicknameInput.value='';
        if(!pv.paused&&state.playingComposed)m.pending={message:'正在读取下一位用户'};
        else{state.profile=null;m.lastProfile='';m.readProblem='正在读取新用户的头像和昵称…';clearComposition();clearPoster();renderProfile();}
      }
      const latest=canonical(d.acceptedSource);
      if(isProfile(s.sourceUrl)&&source===m.targetSource&&s.status!=='ready'){
        const message=s.status==='loading'?'正在读取头像和昵称…':s.detail||'读取失败，请在网页助手中重新读取';
        if(!pv.paused&&state.playingComposed)m.pending={message};else m.readProblem=message;
      }else if(d.profile&&latest===m.targetSource&&(!isProfile(s.sourceUrl)||source===latest)&&(!isProfile(s.sourceUrl)||s.status==='ready')){
        if(d.profile.nickname&&d.profile.avatarDataUrl){m.readProblem='';incoming(d.profile);}else m.readProblem='头像下载失败，未准备可播放视频；请重新读取';
      }
      update();
    }catch(e){m.connected=false;$('#recvState').textContent='V8.1.5 助手服务未连接';$('#recvState').classList.add('off');update();}
    finally{m.pollBusy=false;}
  };
  const oldClear=$('#clearProfile').onclick;$('#clearProfile').onclick=()=>{oldClear();m.lastProfile='';m.targetSource='';m.readProblem='';m.pending=null;clearComposition();clearPoster();update();};
  const oldLock=$('#lockProfile').onclick;$('#lockProfile').onclick=()=>{oldLock();update();if(!state.locked)window.bw7Poll();};
  const originalSetVideo=setVideoBlob,originalSetFont=setFontBlob,originalSetDeco=setDecoBlob;
  setVideoBlob=function(...args){m.failedKey='';m.assetProblem='';const result=originalSetVideo(...args);clearPoster();schedule();return result;};
  setFontBlob=async function(...args){m.suspended++;try{return await originalSetFont(...args);}finally{m.suspended--;m.failedKey='';schedule();update();}};
  setDecoBlob=async function(...args){m.suspended++;try{return await originalSetDeco(...args);}finally{m.suspended--;m.failedKey='';schedule();update();}};
  function assetManifest(){return Object.fromEntries(['video','font','deco'].map(k=>[k,state[k+'Blob']?{name:state[k+'Name']||k,size:state[k+'Blob'].size,type:state[k+'Blob'].type}:null]));}
  async function backupCurrent(){const stamp='v7-recovery:'+Date.now()+':'+Math.random().toString(16).slice(2);for(const k of ['video','font','deco'])if(state[k+'Blob'])await idbPut(stamp+':'+k,state[k+'Blob']);await idbPut(stamp+':state',currentState());return stamp;}
  async function checkAsset(kind,blob){
    if(!blob)return;
    if(kind==='deco'){const bitmap=await createImageBitmap(blob);bitmap.close();}
    if(kind==='font'){const face=new FontFace('BW7_Validate_'+Date.now(),await blob.arrayBuffer());await face.load();}
    if(kind==='video'){const video=document.createElement('video'),src=URL.createObjectURL(blob);video.preload='metadata';video.src=src;try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('视频无法读取')),12000);video.onloadedmetadata=()=>{clearTimeout(timer);if(!Number.isFinite(video.duration)||!video.videoWidth)reject(Error('视频信息无效'));else resolve();};video.onerror=()=>{clearTimeout(timer);reject(Error('视频无法读取'));};});return {duration:video.duration,width:video.videoWidth,height:video.videoHeight};}finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(src);}}
  }
  function clearAsset(kind){
    const src=state[kind+'Src'];if(src)URL.revokeObjectURL(src);state[kind+'Blob']=null;state[kind+'Src']='';state[kind+'Name']='';
    if(kind==='video'){pv.pause();pv.removeAttribute('src');pv.load();$('#videoTag').textContent='未导入 PV';}
    if(kind==='font'){if(window.BW_QUEUE_WORKER)for(const face of document.fonts)if(face.family===state.fontFamily)document.fonts.delete(face);state.fontFamily='';nameText.style.fontFamily='';$('#fontTag').textContent='系统默认字体';}
    if(kind==='deco'){decoImg.removeAttribute('src');state.decoAspect=1;state.decoBaseWidth=0;decoLayer.style.width='0px';decoLayer.style.height='0px';$('#decoTag').textContent='无透明图片';}
  }
  saveTemplate=async function(){
    if(m.templateBusy||state.composing){toast('请等待当前操作结束');return;}
    const a=templateIndex(),selected=a.find(t=>t.id===$('#templateSelect').value);let name=prompt('模板名称：',selected?.name||state.videoName.replace(/\.[^.]+$/,'')||'新模板');if(!name?.trim())return;name=name.trim();
    const old=a.find(t=>t.name===name)||selected,id=crypto.randomUUID();
    try{
      if(old){const stamp='v7-template-history:'+id+':'+Date.now();await idbPut(stamp+':manifest',old);for(const k of ['video','font','deco']){const b=await idbGet('tpl:'+id+':'+k);if(b)await idbPut(stamp+':'+k,b);}}
      for(const k of ['video','font','deco'])await idbPut('tpl:'+id+':'+k,state[k+'Blob']||null);
      const item={id,name,state:templateState(),assets:assetManifest(),formatVersion:7,updatedAt:Date.now()},index=old?a.findIndex(t=>t.id===old.id):-1;if(index<0)a.push(item);else a[index]=item;
      saveTemplateIndex(a);refreshTemplates(id);$('#templateStatus').textContent='已保存完整素材清单：'+name;toast('模板与素材已保存');
    }catch(e){toast('保存失败：'+e.message);}
  };
  loadTemplate=async function(options={}){
    const id=$('#templateSelect').value,item=templateIndex().find(t=>t.id===id);if(!item){toast('请先选择模板');return false;}
    if(!pv.paused){toast('请等待视频播放结束后切换模板');return false;}
    if(state.composing||m.templateBusy){toast('当前正在准备视频，请稍后再加载模板');return false;}
    const previous={blobs:['video','font','deco'].map(k=>state[k+'Blob']),names:['video','font','deco'].map(k=>state[k+'Name']),settings:currentState(),manualName:state.manualName};let changed=false;
    m.templateBusy=true;m.suspended++;clearComposition();clearPoster();update();
    try{
      const items=await Promise.all(['video','font','deco'].map(k=>idbGet('tpl:'+id+':'+k))),missing=[];
      ['video','font','deco'].forEach((k,i)=>{const expected=item.assets?!!item.assets[k]:(k==='video'||k==='font'&&!!item.state?.fontFamily||k==='deco'&&(item.state?.decoNorm?.w||0)>0);if(expected&&!items[i])missing.push({video:'PV 视频',font:'字体',deco:'透明图片'}[k]);});
      if(missing.length)throw Error('模板缺少 '+missing.join('、')+'；已停止加载，请重新导入素材或模板包');
      if(options.random&&!items[0])throw Error('模板没有 PV 视频');
      const checks=[];for(let i=0;i<3;i++)checks[i]=await checkAsset(['video','font','deco'][i],items[i]);
      if(options.random){const appear=Number(item.state?.appearTime),effect=item.state?.entryEffect,entry={none:0,fade:.55,pop:.5,sweep:.7,revealLeft:1,revealRight:1}[effect];if(!Number.isFinite(appear)||appear<0||entry===undefined||appear+entry+.05>=checks[0].duration)throw Error('模板出场时间不足以完整显示用户信息');}
      if(options.isCurrent&&!options.isCurrent())return false;
      if(!options.queue)await backupCurrent();
      changed=true;
      for(const k of ['video','font','deco'])clearAsset(k);
      const [v,f,d]=items;if(v)setVideoBlob(v,item.assets?.video?.name||v.name||'模板视频');if(f)await setFontBlob(f,item.assets?.font?.name||f.name||'模板字体');if(d)await setDecoBlob(d,item.assets?.deco?.name||d.name||'模板图片',{resetLayout:false});
      state.manualName='';nicknameInput.value='';applySaved(item.state,true);
      if(!options.queue)for(let i=0;i<3;i++)await idbPut(['video','font','deco'][i],items[i]||null);
      m.assetProblem='';m.failedKey='';$('#templateStatus').textContent='已加载：'+item.name+' · 仅使用本模板素材';if(!options.random)toast('模板已完整加载');return true;
    }catch(e){
      if(changed)try{for(const k of ['video','font','deco'])clearAsset(k);if(previous.blobs[0])setVideoBlob(previous.blobs[0],previous.names[0]);if(previous.blobs[1])await setFontBlob(previous.blobs[1],previous.names[1]);if(previous.blobs[2])await setDecoBlob(previous.blobs[2],previous.names[2],{resetLayout:false});state.manualName=previous.manualName;nicknameInput.value=previous.manualName;applySaved(previous.settings,true);if(!options.queue)for(let i=0;i<3;i++)await idbPut(['video','font','deco'][i],previous.blobs[i]||null);}catch(restoreError){D('V7 TEMPLATE RESTORE '+restoreError.message);}
      m.assetProblem=e.message;$('#templateStatus').textContent=e.message;if(!options.random)toast(e.message);return false;
    }
    finally{m.suspended--;m.templateBusy=false;schedule();update();}
  };
  function randomIndex(length){const sample=new Uint32Array(1),limit=4294967296-(4294967296%length);do{crypto.getRandomValues(sample);}while(sample[0]>=limit);return sample[0]%length;}
  async function prepareRandomTemplate(){
    const key=randomIdentityKey();if(m.randomPreparedKey===key)return !m.randomProblem;if(m.randomBusy)return false;
    m.randomBusy=true;m.randomProblem='';m.randomSkipped=[];m.randomFailedKey='';clearComposition();clearPoster();update();
    const current=()=>preferences.randomTemplates&&randomIdentityKey()===key&&pv.paused&&!m.pending&&!m.readProblem&&complete();
    try{
      const pool=[...templateIndex()];
      while(pool.length&&current()){
        const index=randomIndex(pool.length),item=pool[index];pool[index]=pool[pool.length-1];pool.pop();
        $('#templateSelect').value=item.id;m.assetProblem='';
        const loaded=await loadTemplate({random:true,isCurrent:current});
        if(!current())return false;
        if(loaded){m.randomTemplate={id:item.id,name:item.name};m.randomPreparedKey=key;m.randomProblem='';return true;}
        m.randomSkipped.push(item.name+'：'+(m.assetProblem||'模板已变化或无法加载'));
      }
      if(current()){m.randomPreparedKey=key;m.randomTemplate=null;m.assetProblem='';m.randomProblem=templateIndex().length?'所有模板均不可用，请检查素材和出场时间；本次停止合成':'没有可用模板，请先保存或导入模板；本次停止合成';}
      return false;
    }catch(e){if(current()){m.randomPreparedKey=key;m.randomTemplate=null;m.assetProblem='';m.randomProblem='随机模板准备失败：'+e.message+'；本次停止合成';}return false;}
    finally{m.randomBusy=false;update();if(preferences.randomTemplates&&randomIdentityKey()!==key)schedule(100);}
  }
  $('#saveTemplateBtn').onclick=saveTemplate;$('#loadTemplateBtn').onclick=loadTemplate;
  $('#deleteTemplateBtn').textContent='归档';$('#deleteTemplateBtn').onclick=async()=>{const id=$('#templateSelect').value,a=templateIndex(),item=a.find(t=>t.id===id);if(!item)return;if(!confirm('归档模板“'+item.name+'”？素材会保留，不删除文件。'))return;const archived=JSON.parse(localStorage.getItem(TEMPLATE_KEY+'_archived')||'[]');archived.push({...item,archivedAt:Date.now()});localStorage.setItem(TEMPLATE_KEY+'_archived',JSON.stringify(archived));saveTemplateIndex(a.filter(t=>t.id!==id));refreshTemplates();toast('模板已归档，素材仍保留');};
  $('#bw7RestoreArchive').onclick=()=>{try{const archived=JSON.parse(localStorage.getItem(TEMPLATE_KEY+'_archived')||'[]');if(!archived.length){toast('暂无归档模板');return;}const item=archived[archived.length-1],a=templateIndex();if(!a.some(t=>t.id===item.id)){if(a.some(t=>t.name===item.name))item.name+='（恢复）';a.push(item);saveTemplateIndex(a);}localStorage.setItem(TEMPLATE_KEY+'_archived',JSON.stringify(archived.slice(0,-1)));refreshTemplates(item.id);toast('已恢复归档：'+item.name);}catch(e){toast('恢复失败：'+e.message);}};
  async function digest(blob){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');}
  async function exportTemplate(){
    const item=templateIndex().find(t=>t.id===$('#templateSelect').value);if(!item)throw Error('请先选择一个模板');
    const files=[],parts=[];let offset=0;
    for(const k of ['video','font','deco']){const blob=await idbGet('tpl:'+item.id+':'+k);if(!blob){if(item.assets?.[k]||!item.assets&&(k==='video'||k==='font'&&item.state?.fontFamily||k==='deco'&&(item.state?.decoNorm?.w||0)>0))throw Error('模板素材缺失，无法导出完整模板包');continue;}files.push({kind:k,name:item.assets?.[k]?.name||blob.name||k,type:blob.type,size:blob.size,offset,sha256:await digest(blob)});parts.push(blob);offset+=blob.size;}
    const manifest={format:'BeautyWeaponTemplate',version:7,name:item.name,state:item.state,assets:item.assets||Object.fromEntries(files.map(f=>[f.kind,{name:f.name,size:f.size,type:f.type}])),files};
    const encoded=new TextEncoder().encode(JSON.stringify(manifest)),length=new Uint8Array(4);new DataView(length.buffer).setUint32(0,encoded.length,true);
    return {blob:new Blob([new TextEncoder().encode('BWTP7\r\n'),length,encoded,...parts],{type:'application/octet-stream'}),filename:item.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+'.bwtemplate'};
  }
  function validateSettings(s){
    if(!s||typeof s!=='object'||Array.isArray(s))throw Error('模板设置无效');
    const t={appearTime:Number(s.appearTime),entryEffect:s.entryEffect,fontSize:Number(s.fontSize),textColor:s.textColor,decoScale:Number(s.decoScale)||100};
    if(!Number.isFinite(t.appearTime)||t.appearTime<0||t.appearTime>86400||!['none','fade','pop','sweep','revealLeft','revealRight'].includes(t.entryEffect)||!Number.isFinite(t.fontSize)||t.fontSize<1||t.fontSize>1000||!/^#[0-9a-f]{6}$/i.test(t.textColor))throw Error('模板参数超出允许范围');
    for(const key of ['profileNorm','decoNorm']){const r=s[key];if(r){if(!['x','y','w','h'].every(k=>Number.isFinite(r[k])&&Math.abs(r[k])<=100)||r.w<0||r.h<0)throw Error('模板布局无效');t[key]={x:r.x,y:r.y,w:r.w,h:r.h};}}
    return t;
  }
  async function importTemplate(blob){
    if(blob.size<11||blob.size>2147483648)throw Error('模板包大小无效');
    const start=new Uint8Array(await blob.slice(0,11).arrayBuffer());if(new TextDecoder().decode(start.slice(0,7))!=='BWTP7\r\n')throw Error('不是 V7 模板包');
    const size=new DataView(start.buffer).getUint32(7,true);if(!size||size>524288||11+size>blob.size)throw Error('模板包清单损坏');
    const manifest=JSON.parse(await blob.slice(11,11+size).text());if(manifest.format!=='BeautyWeaponTemplate'||manifest.version!==7||!Array.isArray(manifest.files)||manifest.files.length>3||typeof manifest.name!=='string'||!manifest.name.trim()||manifest.name.length>160)throw Error('模板包格式无效');
    const settings=validateSettings(manifest.state),files={},seen=new Set();let end=0;
    for(const info of manifest.files){if(!['video','font','deco'].includes(info.kind)||seen.has(info.kind)||!Number.isSafeInteger(info.size)||info.size<1||!Number.isSafeInteger(info.offset)||info.offset!==end||typeof info.name!=='string'||info.name.length>512||!/^\w{64}$/.test(info.sha256))throw Error('模板素材清单无效');seen.add(info.kind);end+=info.size;if(11+size+end>blob.size)throw Error('模板包素材被截断');const asset=new File([blob.slice(11+size+info.offset,11+size+end)],info.name,{type:typeof info.type==='string'?info.type:''});if(await digest(asset)!==info.sha256)throw Error('素材校验失败：'+info.name);await checkAsset(info.kind,asset);files[info.kind]=asset;}
    if(11+size+end!==blob.size)throw Error('模板包含有未声明的数据');
    const id=crypto.randomUUID(),a=templateIndex();let name=manifest.name.trim();if(a.some(t=>t.name===name))name+='（导入 '+new Date().toLocaleTimeString()+ '）';
    const assets={};for(const k of ['video','font','deco']){assets[k]=files[k]?{name:files[k].name,size:files[k].size,type:files[k].type}:null;await idbPut('tpl:'+id+':'+k,files[k]||null);}
    const item={id,name,state:settings,assets,formatVersion:7,updatedAt:Date.now()};a.push(item);saveTemplateIndex(a);refreshTemplates(id);$('#templateStatus').textContent='已导入：'+name+' · 点击“加载模板”应用';return item;
  }
  $('#bw7Export').onclick=async()=>{try{const result=await exportTemplate(),a=document.createElement('a'),url=URL.createObjectURL(result.blob);a.href=url;a.download=result.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);toast('模板与素材已导出');}catch(e){toast(e.message);}};
  $('#bw7Import').onclick=()=>fileInput.click();fileInput.onchange=async()=>{const file=fileInput.files[0];if(!file)return;$('#bw7Import').disabled=true;try{await importTemplate(file);toast('模板包校验通过并已导入');}catch(e){toast('导入失败：'+e.message);}finally{$('#bw7Import').disabled=false;fileInput.value='';}};
  window.bwQueueTemplates={index:templateIndex,load:async id=>{refreshTemplates(id);$('#templateSelect').value=id;return loadTemplate({queue:true,random:true});},error:()=>m.assetProblem};clearPoster();setMode(window.BW_QUEUE_WORKER?'normal':preferences.mode);m.started=!window.BW_QUEUE_WORKER;setTimeout(()=>{schedule();window.bw7Poll();update();},900);
})();

