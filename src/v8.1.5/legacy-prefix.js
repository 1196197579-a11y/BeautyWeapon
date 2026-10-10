(() => {

  // Ship a pinned, licensed color font locally. Never fetch fonts from a remote
  // service during a broadcast; profile rendering waits for this font to load.
  const emojiFace=new FontFace('BeautyWeaponEmoji','url(http://127.0.0.1:38560/assets/emoji-font.ttf?v=8.1.5)',{unicodeRange:'U+200D,U+20E3,U+203C-2049,U+2190-21FF,U+2300-23FF,U+25A0-27FF,U+2934-2935,U+2B00-2BFF,U+3030-303D,U+3297-3299,U+FE0E-FE0F,U+1F000-1FFFF,U+E0020-E007F'});
  document.fonts.add(emojiFace);
  let emojiFontError='';
  const emojiFontReady=emojiFace.load().then(()=>{renderProfile();return true;}).catch(e=>{emojiFontError='离线 Emoji 字体加载失败，请完整安装新版：'+e.message;return false;});
  window.bwEmojiFont={ready:emojiFontReady,status:()=>emojiFace.status};
  const withEmojiFont=font=>typeof font==='string'&&font.includes('Segoe UI Emoji')?font.replace(/(\d+(?:\.\d+)?px)\s+/,'$1 "BeautyWeaponEmoji", '):font;
  const sceneFont=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,'font');
  Object.defineProperty(sceneCtx,'font',{get(){return sceneFont.get.call(this);},set(value){sceneFont.set.call(this,withEmojiFont(value));},configurable:true});
  const renderProfileWithFont=renderProfile;
  renderProfile=function(...args){const result=renderProfileWithFont(...args);nameText.style.fontFamily='"BeautyWeaponEmoji", '+(state.fontFamily?'"'+state.fontFamily+'"':'"Microsoft YaHei"')+', "Segoe UI Emoji", sans-serif';return result;};

  // Directional reveal: shared one-second, 12% feathered horizontal mask.
  const revealDuration = 1;
  const revealDirection = () => ({revealLeft:'left',revealRight:'right'}[$('#entryEffect').value] || '');
  const effectSelect = $('#entryEffect');
  effectSelect.add(new Option('向左渐显', 'revealLeft'));
  effectSelect.add(new Option('向右渐显', 'revealRight'));
  if (startupState && /^(revealLeft|revealRight)$/.test(startupState.entryEffect)) effectSelect.value = startupState.entryEffect;
  const originalFxState = fxState;
  fxState = function () {
    if (!revealDirection()) return originalFxState();
    return {alpha:shouldShow()?1:0,scale:1,dx:0,glow:0};
  };
  const revealCanvas = document.createElement('canvas');
  revealCanvas.width=1920; revealCanvas.height=1080;
  const revealCtx = revealCanvas.getContext('2d');
  function drawReveal(draw, fx, bounds) {
    const direction = revealDirection();
    if (!direction) return draw(fx);
    const p = Math.max(0,Math.min(1,((pv.currentTime||0)-Number($('#appearTime').value||0))/revealDuration));
    if (!p || !fx.alpha) return;
    revealCtx.clearRect(0,0,1920,1080);
    draw(fx);
    if (p < 1) {
      const edge = p*1.12;
      const a = direction==='right' ? bounds.x+(edge-.12)*bounds.w : bounds.x+(1-edge)*bounds.w;
      const b = a+.12*bounds.w;
      const gradient = revealCtx.createLinearGradient(a,0,b,0);
      gradient.addColorStop(0,direction==='right'?'#000':'transparent');
      gradient.addColorStop(1,direction==='right'?'transparent':'#000');
      revealCtx.save(); revealCtx.globalCompositeOperation='destination-in';
      revealCtx.fillStyle=gradient; revealCtx.fillRect(0,0,1920,1080); revealCtx.restore();
    }
    sceneCtx.drawImage(revealCanvas,0,0);
  }
  const originalDrawDeco = drawDecoToScene, originalDrawProfile = drawProfileToScene;
  function drawRevealDeco(fx){if(!state.decoSrc||!shouldShow()||!decoImg.complete||!decoImg.naturalWidth)return;const r=sceneRect(decoLayer),cx=r.x+r.w/2,cy=r.y+r.h/2;revealCtx.save();revealCtx.globalAlpha=fx.alpha;revealCtx.translate(cx+fx.dx*(1920/Math.max(1,fitStage().w)),cy);revealCtx.scale(fx.scale,fx.scale);if(fx.glow){revealCtx.shadowColor='rgba(76,227,194,.8)';revealCtx.shadowBlur=24*fx.glow}revealCtx.drawImage(decoImg,-r.w/2,-r.h/2,r.w,r.h);revealCtx.restore()}
  function drawRevealProfile(fx){if(!hasProfileVisual()||!shouldShow())return;const r=sceneRect(profileBox),sc=sceneScale(),av=avatarSrc(),avatarCss=parseFloat(avatarWrap.style.width)||70,avatarSize=av?avatarCss*sc.sx:0,gap=av?10*sc.sx:0,effective=Number(nameText.dataset.effectiveSize||$('#fontSize').value||38),fontPx=effective*sc.sx,name=displayName(activeName());revealCtx.save();let fontFamily=state.fontFamily?`"${state.fontFamily}"`:'"Microsoft YaHei"';revealCtx.font=`900 ${fontPx}px "BeautyWeaponEmoji", ${fontFamily}, "Segoe UI Emoji", "Microsoft YaHei", sans-serif`;revealCtx.textBaseline='middle';revealCtx.textAlign='left';const textW=revealCtx.measureText(name).width,totalW=avatarSize+(av?gap:0)+textW,cx=r.x+r.w/2,cy=r.y+r.h/2;revealCtx.globalAlpha=fx.alpha;revealCtx.translate(cx+fx.dx*sc.sx,cy);revealCtx.scale(fx.scale,fx.scale);if(fx.glow){revealCtx.shadowColor='rgba(76,227,194,.75)';revealCtx.shadowBlur=20*fx.glow}let x=-totalW/2;if(av&&avatarImg.complete&&avatarImg.naturalWidth){revealCtx.save();revealCtx.beginPath();revealCtx.arc(x+avatarSize/2,0,avatarSize/2,0,Math.PI*2);revealCtx.clip();revealCtx.drawImage(avatarImg,x,-avatarSize/2,avatarSize,avatarSize);revealCtx.restore();revealCtx.save();revealCtx.strokeStyle='rgba(255,255,255,.95)';revealCtx.lineWidth=Math.max(2,3*sc.sx);revealCtx.beginPath();revealCtx.arc(x+avatarSize/2,0,avatarSize/2-revealCtx.lineWidth/2,0,Math.PI*2);revealCtx.stroke();revealCtx.restore();x+=avatarSize+gap}revealCtx.fillStyle=$('#textColor').value||'#ffffff';revealCtx.shadowColor='transparent';revealCtx.shadowBlur=0;revealCtx.fillText(name,x,0);revealCtx.restore()}
  drawDecoToScene = function(fx) {
    if (!revealDirection()) return originalDrawDeco(fx);
    drawReveal(drawRevealDeco,fx,sceneRect(decoLayer));
  };
  drawProfileToScene = function(fx) {
    if (!revealDirection()) return originalDrawProfile(fx);
    const r=sceneRect(profileBox), sc=sceneScale(), av=avatarSrc();
    const fontPx=Number(nameText.dataset.effectiveSize||$('#fontSize').value||38)*sc.sx;
    revealCtx.font='900 '+fontPx+'px "BeautyWeaponEmoji", '+(state.fontFamily?'"'+state.fontFamily+'"':'"Microsoft YaHei"')+', "Segoe UI Emoji", "Microsoft YaHei", sans-serif';
    const pad=Math.max(8,Math.ceil(5*sc.sx));
    const w=Math.max(2,Math.ceil((av?(parseFloat(avatarWrap.style.width)||70)*sc.sx+10*sc.sx:0)+revealCtx.measureText(displayName(activeName())).width+pad*2));
    drawReveal(drawRevealProfile,fx,{x:r.x+r.w/2-w/2,w});
  };
  async function markReveal(blob) {
    const direction=revealDirection();
    if (!direction) return blob;
    let bytes=new Uint8Array(await blob.arrayBuffer());
    if (bytes[0]!==137 || bytes[1]!==80 || bytes[2]!==78 || bytes[3]!==71) {
      const bitmap=await createImageBitmap(blob), c=document.createElement('canvas');
      c.width=bitmap.width;c.height=bitmap.height;c.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
      bytes=new Uint8Array(await (await canvasBlob(c)).arrayBuffer());
    }
    const data=new TextEncoder().encode('tEXtBeautyWeapon\0BW_REVEAL_V1:'+direction);
    const chunk=new Uint8Array(data.length+8), view=new DataView(chunk.buffer);
    view.setUint32(0,data.length-4);chunk.set(data,4);
    let crc=0xffffffff;
    for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    view.setUint32(chunk.length-4,(crc^0xffffffff)>>>0);
    return new Blob([bytes.subarray(0,bytes.length-12),chunk,bytes.subarray(bytes.length-12)],{type:'image/png'});
  }

  const SERVICE = 'http://127.0.0.1:38557';

  const canvasBlob = (canvas) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG生成失败')), 'image/png');
  });

  async function buildProfilePng() {
    if (!hasProfileVisual()) return null;
    if(!await emojiFontReady)throw new Error(emojiFontError);
    await document.fonts.ready;
    try {
      if (avatarSrc() && avatarImg.decode) await avatarImg.decode();
    } catch (_) {}

    const sc = sceneScale();
    const av = avatarSrc();
    const avatarSize = av ? (parseFloat(avatarWrap.style.width) || 70) * sc.sx : 0;
    const gap = av ? 10 * sc.sx : 0;
    const effective = Number(nameText.dataset.effectiveSize || $('#fontSize').value || 38);
    const fontPx = effective * sc.sx;
    const name = displayName(activeName());
    const fontFamily = state.fontFamily ? `"${state.fontFamily}"` : '"Microsoft YaHei"';

    const c = document.createElement('canvas');
    let ctx = c.getContext('2d');
    ctx.font = `900 ${fontPx}px "BeautyWeaponEmoji", ${fontFamily}, "Segoe UI Emoji", "Microsoft YaHei", sans-serif`;
    const textW = ctx.measureText(name).width;
    const pad = Math.max(8, Math.ceil(5 * sc.sx));
    c.width = Math.max(2, Math.ceil(avatarSize + (av ? gap : 0) + textW + pad * 2));
    c.height = Math.max(2, Math.ceil(Math.max(avatarSize, fontPx * 1.45) + pad * 2));

    ctx = c.getContext('2d');
    ctx.font = `900 ${fontPx}px "BeautyWeaponEmoji", ${fontFamily}, "Segoe UI Emoji", "Microsoft YaHei", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const cy = c.height / 2;
    let x = pad;

    if (av && avatarImg.complete && avatarImg.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + avatarSize / 2, cy, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, x, cy - avatarSize / 2, avatarSize, avatarSize);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.lineWidth = Math.max(2, 3 * sc.sx);
      ctx.beginPath();
      ctx.arc(x + avatarSize / 2, cy, avatarSize / 2 - ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      x += avatarSize + gap;
    }

    ctx.fillStyle = $('#textColor').value || '#ffffff';
    ctx.fillText(name, x, cy);

    const r = sceneRect(profileBox);
    return {
      blob: await canvasBlob(c),
      cx: r.x + r.w / 2,
      cy: r.y + r.h / 2,
      w: c.width,
      h: c.height
    };
  }

  async function ensureFFmpeg(span) {
    let health;
    try {
      health = await fetch(`${SERVICE}/ffmpeg-health`).then(r => r.json());
    } catch (e) {
      throw new Error('离线合成服务未启动');
    }
    if (health.ok) return health;

    span.textContent = '首次安装 FFmpeg…';
    log('首次使用：正在自动安装 FFmpeg。只需安装一次，请保持联网。');
    D('FFMPEG INSTALL START');
    const resp = await fetch(`${SERVICE}/ffmpeg-install`, { method: 'POST' });
    const result = await resp.json();
    if (!resp.ok || !result.ok) throw new Error(result.error || 'FFmpeg安装失败');
    D('FFMPEG INSTALL OK');
    return result;
  }

  async function offlineCompose() {
    if (state.composing) return;
    if (!state.videoSrc) {
      toast('请先导入贤者PV');
      return;
    }

    state.composing = true;
    const btn = $('#composeBtn');
    btn.classList.remove('compose-success');
    const span = btn.querySelector('span');
    const oldTime = pv.currentTime || 0;
    const requestedKey = compKey();
    if(window.bw7)window.bw7.composeStarted(requestedKey);
    btn.disabled = true;
    $('#playBtn').disabled = true;
    span.textContent = '准备离线合成…';
    D('OFFLINE COMPOSE CLICK');

    try {
      await ensureFFmpeg(span);
      await document.fonts.ready;

      span.textContent = '生成叠加素材…';
      const profile = await buildProfilePng();
      const decoRect = state.decoSrc ? sceneRect(decoLayer) : null;
      const meta = {
        appearTime: Number($('#appearTime').value || 0),
        entryEffect: $('#entryEffect').value,
        profile: profile ? {
          cx: profile.cx,
          cy: profile.cy,
          w: profile.w,
          h: profile.h
        } : null,
        deco: decoRect ? {
          cx: decoRect.x + decoRect.w / 2,
          cy: decoRect.y + decoRect.h / 2,
          w: Math.max(1, Math.round(decoRect.w)),
          h: Math.max(1, Math.round(decoRect.h))
        } : null
      };

      const fd = new FormData();
      const videoBlob = state.videoBlob || await fetch(state.videoSrc).then(r => r.blob());
      fd.append('video', videoBlob, state.videoName || 'input.mp4');
      fd.append('meta', JSON.stringify(meta));
      if (profile) fd.append('profile', await markReveal(profile.blob), 'profile.png');
      if (decoRect) {
        const decoBlob = state.decoBlob || await fetch(state.decoSrc).then(r => r.blob());
        fd.append('deco', await markReveal(decoBlob), state.decoName || 'deco.png');
      }

      if(compKey()!==requestedKey)throw new Error('资料已更新，本次结果作废');
      span.textContent = 'FFmpeg 离线合成中…';
      log('V6.8.2 正在离线逐帧合成：不再使用 MediaRecorder 实时录制。');
      const response = await fetch(`${SERVICE}/compose`, { method: 'POST', body: fd });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || '离线合成失败');

      span.textContent = 'FFprobe 质检中…';
      const fileResponse = await fetch(`${SERVICE}/compose-result?id=${encodeURIComponent(result.id)}`);
      if (!fileResponse.ok) throw new Error('读取质检成片失败');
      const blob = await fileResponse.blob();
      if (!blob.size) throw new Error('成片文件为空');
      if(compKey()!==requestedKey)throw new Error('资料已更新，本次结果作废');

      clearComposition();
      state.composedBlob = blob;
      state.composedSrc = URL.createObjectURL(blob);
      state.composedKey = requestedKey;
      if(window.bw7)window.bw7.composeReady(requestedKey);
      span.textContent = '已合成 ✓';
      btn.classList.add('compose-success');
      log(`离线合成通过质检：${result.frames}/${result.expectedFrames} 帧 · 60 FPS · 1920×1080 · ${(blob.size / 1048576).toFixed(1)} MB。`);
      toast('离线合成通过质检，可以播放');
      D(`OFFLINE COMPOSE OK ${result.frames}/${result.expectedFrames}`);
    } catch (e) {
      D('OFFLINE COMPOSE FAIL ' + (e && e.stack || e));
      clearComposition();
      btn.classList.remove('compose-success');
      span.textContent = '视频合成';
      if(window.bw7)window.bw7.composeFailed(requestedKey,e);
      log('离线合成失败：' + (e && e.message || e));
      if(compKey()!==requestedKey)log('已切换用户，正在准备最新资料');else toast('合成失败：' + (e && e.message || e));
    } finally {
      state.composing = false;
      if(window.bw7)window.bw7.composeEnded(requestedKey);
      btn.disabled = false;
      $('#playBtn').disabled = false;
      if (state.videoSrc && !state.playingComposed) {
        pv.pause();
        if (pv.src !== state.videoSrc) {
          pv.src = state.videoSrc;
          pv.load();
          try { await waitMeta(); } catch (_) {}
        }
        pv.currentTime = Math.min(oldTime, pv.duration || 0);
      }
      renderAll();
      sync();
    }
  }



  // V6.8.2 shell lifecycle + button-state polish.
  const shellStyle = document.createElement('style');
  shellStyle.textContent = `
    #composeBtn:disabled:not(.compose-success){opacity:1!important;background:#11303a!important;color:#dffcff!important;border:1px solid #28505d!important;box-shadow:none!important}
    #composeBtn.compose-success{opacity:1!important;background:#19f06f!important;color:#03180b!important;border:1px solid #74ffae!important;box-shadow:0 0 18px rgba(25,240,111,.42)!important}
  `;
  document.head.appendChild(shellStyle);

  window.bwComposeLayers={profile:buildProfilePng,mark:markReveal};if(window.BW_QUEUE_WORKER)return;
  const WATCHDOG = 'http://127.0.0.1:38559';
  let shellExitSent = false;
  const shellPost = (path) => {
    try { fetch(WATCHDOG + path, {method:'POST', mode:'no-cors', cache:'no-store', keepalive:true}).catch(()=>{}); } catch (_) {}
  };
  const shellExit = () => {
    if (shellExitSent) return;
    shellExitSent = true;
    try { navigator.sendBeacon(WATCHDOG + '/ui-exit', 'close'); } catch (_) {}
    shellPost('/ui-exit');
  };
  shellPost('/ui-alive');
  setInterval(() => shellPost('/ui-alive'), 1500);
  // Heartbeat expiry handles an actual close; reload must not kill the task queue.
  

  window.v680Compose = offlineCompose;
  const btn = $('#composeBtn');
  if (btn) btn.onclick = offlineCompose;
  D('V6.8 OFFLINE COMPOSITOR READY');
})();

