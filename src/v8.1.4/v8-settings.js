(() => {
  'use strict';if(window.BW_QUEUE_WORKER)return;
  const endpoint='http://127.0.0.1:38560';
  const placeholder='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="#12343e"/><text x="40" y="57" text-anchor="middle" font-family="Microsoft YaHei,Arial" font-size="52" font-weight="bold" fill="#d3ecee">?</text></svg>');
  const avatarTokens=new WeakMap();
  window.bw71Avatar=(img,source)=>{
    const wanted=source||placeholder,previous=avatarTokens.get(img);if(previous?.wanted===wanted){const display=previous.good?source:placeholder;if(img.src!==display)img.src=display;return;}const record={wanted,good:false};avatarTokens.set(img,record);
    img.style.visibility='visible';img.src=placeholder;img.alt=source?'正在读取用户头像':'等待识别用户';
    if(!source)return;
    const probe=new Image();probe.onload=()=>{if(avatarTokens.get(img)===record&&probe.naturalWidth>0){record.good=true;img.src=source;img.alt='已识别用户头像';}};probe.onerror=()=>{if(avatarTokens.get(img)===record){img.src=placeholder;img.alt='头像未读取成功';}};probe.src=source;
  };
  const renderOld=renderProfile;
  renderProfile=function(...args){renderOld(...args);window.bw71Avatar($('#resultAvatar'),state.profile?.avatarDataUrl||'');};
  renderProfile();window.bw71Avatar($('#bw7Avatar'),state.profile?.avatarDataUrl||'');
  const style=document.createElement('style');style.textContent=`
  #recvState.off{background:#292619;border-color:#766322;color:#ffe068}.bw7-mode{max-width:140px;white-space:nowrap;font-size:12px}#bw71Settings{flex-shrink:0;padding:8px 12px;width:auto;font-size:12px}.bw7-live .brand{font-size:17px}.bw7-live .topbar{gap:8px}.bw7-live #bw7Live{gap:8px;padding:12px}.bw7-live .bw7-preview{max-height:270px;min-height:160px;flex-shrink:1}.bw7-live .bw7-person{min-height:60px}.bw7-live .bw7-person img{width:52px;height:52px}.bw7-live .bw7-person strong{font-size:18px}.bw7-live .bw7-live-status{font-size:12px;padding:8px 10px}.bw7-live #bw7LivePlay{min-height:46px;font-size:17px}.bw7-live #bw71LiveOutput{min-height:40px;font-size:13px;flex-shrink:0}.bw7-foot{font-size:10px;line-height:1.5}
  #bw71Dialog{width:min(540px,calc(100vw - 28px));max-height:calc(100vh - 28px);overflow:auto;border:1px solid #35616d;border-radius:16px;background:#0b1d25;color:#d6edf0;padding:20px;box-sizing:border-box}#bw71Dialog::backdrop{background:#020b10b8}.bw71-dialog-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px}.bw71-dialog-head strong{font-size:18px}.bw71-dialog-head button{width:auto;padding:5px 12px}.bw71-field{display:flex;flex-direction:column;gap:6px;font-size:12px;margin:12px 0}.bw71-field input,.bw71-field select{width:100%;box-sizing:border-box}.bw71-inline{display:flex;gap:6px}.bw71-inline input{min-width:0}.bw71-inline button{width:auto;flex-shrink:0;padding:7px 11px}.bw71-update-status{padding:12px;border-radius:10px;background:#102e37;font-size:12px;line-height:1.6;word-break:break-word;margin:12px 0}#bw71Progress{width:100%;accent-color:#41deb6}#bw71UpdateNotes{white-space:pre-wrap;font-size:12px;line-height:1.6;color:#adcbd1}.bw71-actions{display:flex;gap:8px}.bw71-actions button{flex:1}.bw71-note{font-size:11px;color:#94b7c0;line-height:1.6;margin-top:12px}#bw71Dialog summary{font-size:12px;cursor:pointer;color:#bce5ec}.bw71-source{font-size:11px;word-break:break-all;line-height:1.6}
  @media(max-width:620px){.bw7-live .brand span{max-width:180px;font-size:14px}.bw7-live .brand img{width:28px;height:28px}.bw7-live .topbar{padding:8px}.bw7-mode{font-size:11px;padding:7px}.bw7-live #bw7Live{inset:60px 8px 8px}}`;
  document.head.append(style);
  const button=document.createElement('button');button.id='bw71Settings';button.className='secondary';button.textContent='设置';$('#bw7Mode').before(button);
  const dialog=document.createElement('dialog');dialog.id='bw71Dialog';dialog.innerHTML=`<div class="bw71-dialog-head"><strong>设置 · 美丽武器 V8.1.4</strong><button class="secondary" id="bw71Close">关闭</button></div><div class="bw71-field"><label for="bw71Downloader">更新下载方式</label><select id="bw71Downloader"><option value="builtin">内置下载器</option><option value="ndm">本机 NDM 下载</option></select></div><details id="bw71NdmDetails"><summary>NDM 连接与下载目录</summary><label class="bw71-field">NDM 程序<div class="bw71-inline"><input id="bw71NdmPath" placeholder="自动发现正在运行的 NDM"><button id="bw71ChooseExe" class="secondary">选择</button></div></label><label class="bw71-field">NDM 实际下载目录<div class="bw71-inline"><input id="bw71NdmFolder"><button id="bw71ChooseFolder" class="secondary">选择</button></div></label><button id="bw71NdmTest" class="secondary">测试 NDM 连接</button><p class="bw71-note">目录须与 NDM 下载设置一致。配置跨版本保留，每次下载重新连接；下载结果必须通过大小与 SHA-256 校验。NDM 无法完成时会自动使用内置下载器，保留原文件。</p></details><details><summary>更新源</summary><label class="bw71-field">GitHub 更新清单<input id="bw71Source" spellcheck="false"></label><div class="bw71-source">仓库：1196197579-a11y / BeautyWeapon</div></details><div id="bw71UpdateStatus" class="bw71-update-status" role="status" aria-live="polite">正在读取设置…</div><progress id="bw71Progress" max="100" value="0"></progress><div id="bw71UpdateNotes"></div><div class="bw71-actions"><button id="bw71Check" class="primary">检查更新</button><button id="bw71Cancel" class="secondary" disabled>取消更新</button></div><p class="bw71-note">检查到新版后自动下载、校验并安装到独立目录。播放或合成结束后自动切换；旧版本、素材和下载包保留。浏览器扩展更新需要在浏览器中重新选择新版助手文件夹。</p>`;
  document.body.append(dialog);
  dialog.querySelector(':scope > .bw71-note:last-child').textContent='程序更新保留旧版、素材和队列。本次修复必须在 Edge 加载 V8.1.4 网页助手，禁用旧助手并刷新直播平台页面；只更新 EXE 不会更新浏览器中的助手。';
  const helperButton=document.createElement('button');helperButton.id='bw811HelperFolder';helperButton.className='secondary';helperButton.textContent='打开新版网页助手文件夹';dialog.querySelector(':scope > .bw71-note:last-child').before(helperButton);helperButton.onclick=()=>api('/api/app/helper-folder',{}).catch(e=>toast(e.message));
  const randomSetting=document.createElement('label');randomSetting.className='bw7-auto';randomSetting.innerHTML='<input id="bw711RandomSetting" type="checkbox"> 读取用户后随机使用所有未归档模板';dialog.querySelector('.bw71-field').before(randomSetting);randomSetting.querySelector('input').checked=window.bw7.state().preferences.randomTemplates;randomSetting.querySelector('input').onchange=()=>window.bw7.setRandomTemplates(randomSetting.querySelector('input').checked);
  let session='',config=null,configPromise=null,resizeSerial=0,requestedMode='',downloadRequested=false,restarting=false,lastPhase='',polling=false;
  async function api(path,data){
    const headers={};if(data!==undefined){await getConfig();headers['Content-Type']='application/json';headers['X-BW-Session']=session;}
    const response=await fetch(endpoint+path,{method:data===undefined?'GET':'POST',headers,body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});const result=await response.json();if(!response.ok||result.ok===false)throw Error(result.error||result.message||'本地设置服务不可用');return result;
  }
  async function getConfig(force=false){
    if(config&&!force)return config;
    if(configPromise)return configPromise;
    configPromise=(async()=>{const response=await fetch(endpoint+'/api/app/settings',{cache:'no-store'});const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'设置服务未连接');session=result.session;config=result.settings;return config;})();
    try{return await configPromise;}finally{configPromise=null;}
  }
  window.bw71Resize=async value=>{
    requestedMode=value;const serial=++resizeSerial;
    for(let i=0;i<15;i++){if(serial!==resizeSerial)return;try{await api('/api/app/window-mode',{mode:value});return;}catch(e){if(i===14){toast('窗口未能自动调整，可手动调整：'+e.message);return;}await new Promise(resolve=>setTimeout(resolve,600));}}
  };
  function fill(c){$('#bw71Downloader').value=c.downloader;$('#bw71NdmPath').value=c.ndmPath||'';$('#bw71NdmFolder').value=c.ndmFolder||'';$('#bw71Source').value=c.source;$('#bw71NdmDetails').open=c.downloader==='ndm';}
  async function save(){const result=await api('/api/app/settings',{source:$('#bw71Source').value.trim(),downloader:$('#bw71Downloader').value,ndmPath:$('#bw71NdmPath').value.trim(),ndmFolder:$('#bw71NdmFolder').value.trim()});config=result.settings;return config;}
  function message(text){$('#bw71UpdateStatus').textContent=text;}
  button.onclick=async()=>{dialog.showModal();try{fill(await getConfig(true));await pollUpdate();}catch(e){message(e.message);}};
  $('#bw71Close').onclick=()=>dialog.close();dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  $('#bw71Downloader').onchange=async()=>{$('#bw71NdmDetails').open=$('#bw71Downloader').value==='ndm';try{await save();message('下载方式已保存');}catch(e){message(e.message);}};
  for(const id of ['bw71NdmPath','bw71NdmFolder','bw71Source'])$('#'+id).onchange=async()=>{try{await save();message('设置已保存，后续版本继续使用');}catch(e){message(e.message);}};
  async function choose(kind,id){try{const result=await api('/api/app/choose-ndm',{kind});if(result.path){$('#'+id).value=result.path;await save();message('NDM 设置已保存');}}catch(e){message(e.message);}}
  $('#bw71ChooseExe').onclick=()=>choose('exe','bw71NdmPath');$('#bw71ChooseFolder').onclick=()=>choose('folder','bw71NdmFolder');
  $('#bw71NdmTest').onclick=async()=>{message('正在测试 NDM…');try{await save();const result=await api('/api/update/ndm-test',{});message(result.message);}catch(e){message(e.message);}};
  $('#bw71Check').onclick=async()=>{downloadRequested=false;restarting=false;message('正在检查更新…');try{await save();await api('/api/update/check',{});await pollUpdate();}catch(e){message(e.message);}};
  $('#bw71Cancel').onclick=async()=>{try{await api('/api/update/cancel',{});message('正在取消，已下载文件保留');}catch(e){message(e.message);}};
  async function pollUpdate(){
    if(polling)return;polling=true;
    try{
      const result=await api('/api/update/state');const phase=result.phase;
      const active=['checking','downloading','ndm','verifying','installing','restarting'].includes(phase)||result.busy;
      $('#bw71Check').disabled=active;$('#bw71Cancel').disabled=!active||phase==='restarting';$('#bw71Progress').value=result.progress||0;$('#bw71UpdateNotes').textContent=result.notes||'';
      const idle=!window.bwQueueWorking&&!window.bwQueueActivePlaying&&pv.paused&&!state.composing&&!window.bw7.state().templateBusy;
      if(phase==='ready'&&!idle)message('更新已安装，等待当前播放、合成或模板载入结束后切换；旧版保留');else message(result.message||'尚未检查更新');
      if(phase==='available'&&!result.busy&&!downloadRequested){downloadRequested=true;try{await api('/api/update/download',{});}catch(e){downloadRequested=false;message(e.message);}}
      if(phase==='ready'&&!result.busy&&!restarting&&idle){restarting=true;toast('更新已完成，正在切换新版；旧版保留');try{await api('/api/update/restart',{});}catch(e){restarting=false;message(e.message);}}
      if(phase==='error'&&phase!==lastPhase)toast('更新未完成：'+result.message);
      lastPhase=phase;
    }catch(e){if(dialog.open&&!restarting)message(e.message);}finally{polling=false;}
  }
  window.bw71={placeholder,settings:()=>getConfig(true),api,pollUpdate};
  getConfig().then(()=>window.bw71Resize(document.body.classList.contains('bw7-live')?'live':'normal')).catch(()=>window.bw71Resize(document.body.classList.contains('bw7-live')?'live':'normal'));
  setInterval(pollUpdate,1500);
})();
