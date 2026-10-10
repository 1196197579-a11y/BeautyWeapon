(()=>{
 'use strict';if(window.BW_QUEUE_WORKER)return;
 const css=document.createElement('style');css.textContent=`
 .topbar{justify-content:flex-start;gap:12px}.topbar>.brand{margin-right:auto;min-width:0}.bw81-header-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:0 1 auto;min-width:0;margin-left:auto}.bw81-header-actions #topStatus{display:inline-flex;margin:0;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.bw81-header-actions #bw71Settings,.bw81-header-actions #bw7Mode{margin:0;flex-shrink:0}
 .left{overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}.left>.card{flex-shrink:0}.bw81-template-card .template-row{grid-template-columns:minmax(0,1fr) auto}.bw81-template-card .bw7-tools{gap:5px}.bw81-template-card .bw7-tools button{padding:6px 4px;font-size:10px;white-space:nowrap}.bw81-template-card .bw7-materials{word-break:break-word}.right{display:flex;flex-direction:column;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}.right>.card,.right>.bw8-panel{flex-shrink:0}.right>.manual-card{flex:1 0 auto}
 .bw7-live .bw81-header-actions{gap:6px}.bw7-live .bw81-header-actions #topStatus{display:inline-flex;max-width:140px;font-size:10px;padding:5px 7px}.bw7-live .topbar>.brand{flex:1 1 auto;overflow:hidden}.bw7-live .brand span{min-width:0}.bw7-live .bw81-header-actions #bw71Settings{padding:7px 9px}
 @media(max-width:640px){.bw81-header-actions{gap:5px}.bw81-header-actions #topStatus{max-width:110px!important;font-size:9px!important}.bw7-live .brand span{max-width:150px}.bw7-live .bw81-header-actions #bw7Mode{font-size:10px;padding:7px}}
 `;document.head.append(css);
 const bar=document.querySelector('.topbar'),group=document.createElement('div');group.className='bw81-header-actions';group.id='bw81HeaderActions';
 for(const id of ['topStatus','bw71Settings','bw7Mode']){const e=document.getElementById(id);if(e)group.append(e);}bar.append(group);
 const status=document.getElementById('topStatus');const describe=()=>status.title=status.textContent;describe();new MutationObserver(describe).observe(status,{childList:true,subtree:true,characterData:true});
 const select=document.getElementById('templateSelect'),row=select.closest('.template-row'),manual=row.closest('.manual-card'),left=document.querySelector('.left'),panel=document.createElement('section');panel.id='bw81Templates';panel.className='card bw81-template-card';const heading=document.createElement('h3');heading.textContent='模板与素材';panel.append(heading);
 const separator=row.previousElementSibling;if(separator?.classList.contains('hr'))separator.remove();
 const templateStatus=document.getElementById('templateStatus');const controls=[row,row.nextElementSibling,templateStatus,document.querySelector('.bw7-tools'),document.querySelector('.bw7-materials')];
 for(const e of controls)if(e)panel.append(e);left.children[0].after(panel);manual.querySelector('h3').textContent='手动昵称 + 输出';
})();
