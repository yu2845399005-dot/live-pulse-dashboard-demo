const asset = file => `assets/figma-supply-config/${file}.svg`;
const icons = { drag: 'dbecccec-02a8-42a1-8173-7d89b3919fff', on: 'fbf6856e-131d-4a90-93e8-663823f10590', tick: '9f1b9153-3d50-4299-a287-aa3a027a3881', close: '69ddf0bd-21c7-435d-8c19-4cbdfcc07e08' };
const image = key => `<img src="${asset(icons[key])}" alt="">`;
const definitions = [
  { id:'income', label:'收入分层', items:['Top','Pre-top','Mature','G4+'], selector:'.category' },
  { id:'content', label:'内容分类', items:[], selector:null },
  { id:'guild', label:'公会分层', items:['高价值公会','普通公会','非公会'], selector:'.guild-stats .stat-row' },
  { id:'function', label:'功能场景', items:['LIVE Goal','Gallery','Fans Club','Cohost','Multiguest','Solo'], selector:'.function-row' }
];
const defaults = () => ({ mode:'flat', order:definitions.map(d=>d.id), groups:Object.fromEntries(definitions.map(d=>[d.id,{enabled:true,items:d.items.map(()=>true)}])) });
const copy = value => JSON.parse(JSON.stringify(value));
const storageKey = 'tiktok-live-supply-config-v1';

export function initSupplyConfig(dashboard) {
  const panel = dashboard.querySelector('.supply-panel');
  const trigger = panel.querySelector('button.analysis-side-settings');
  const sections = document.createElement('div');
  sections.className='supply-sections';
  const income=document.createElement('section');
  income.className='supply-income-section';
  income.append(panel.querySelector('h2'),panel.querySelector('.income-chart'));
  const nodes={income,content:panel.querySelector('.content-breakdown'),guild:panel.querySelector('.guild-breakdown'),function:panel.querySelector('.function-breakdown')};
  for(const definition of definitions) {
    const node=nodes[definition.id];
    node.classList.add('supply-config-section');
    node.dataset.supplySection=definition.id;
    sections.append(node);
  }
  panel.append(sections);
  const tabs=document.createElement('div');
  tabs.className='supply-display-tabs';tabs.hidden=true;
  tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','供给侧分类');
  sections.before(tabs);
  let saved=defaults(), draft, active='income';
  try {
    const stored=JSON.parse(localStorage.getItem(storageKey));
    if(stored&&['flat','tabs'].includes(stored.mode)&&Array.isArray(stored.order)&&stored.order.length===4&&new Set(stored.order).size===4&&stored.order.every(id=>nodes[id])) {
      const normalized=defaults();normalized.mode=stored.mode;normalized.order=stored.order;
      for(const d of definitions) if(stored.groups?.[d.id]) {
        normalized.groups[d.id].enabled=stored.groups[d.id].enabled!==false;
        normalized.groups[d.id].items=d.items.map((_,i)=>stored.groups[d.id].items?.[i]!==false);
      }
      saved=normalized;
    }
  } catch { /* The demo also works when browser storage is unavailable. */ }
  document.body.insertAdjacentHTML('beforeend',`
    <dialog id="supply-config-dialog" aria-labelledby="supply-config-title" aria-describedby="supply-config-description" data-node-id="674:150026">
      <form id="supply-config-form">
        <div class="supply-dialog-main">
          <header class="supply-dialog-header"><div><h2 id="supply-config-title">供给侧 展示配置</h2><p id="supply-config-description">支持自定义勾选不同分类tab下的展示指标</p></div><button type="button" class="supply-dialog-close" aria-label="关闭供给侧展示配置">${image('close')}</button></header>
          <fieldset class="supply-mode"><legend>展示形式</legend><div class="supply-mode-options"><label><input type="radio" name="display-mode" value="flat" checked><span>平铺展示</span></label><label><input type="radio" name="display-mode" value="tabs"><span>切换展示</span></label></div></fieldset>
          <section class="supply-category-settings" aria-labelledby="supply-categories-title"><h3 id="supply-categories-title">展示类别</h3><div class="supply-category-list"></div><p class="sr-only supply-order-status" aria-live="polite"></p></section>
        </div>
        <footer class="supply-dialog-footer"><button type="button" class="supply-reset">恢复默认</button><div><button type="button" class="supply-cancel">Cancel</button><button type="submit" class="supply-save">Save</button></div></footer>
        <p class="supply-config-error" role="alert"></p>
      </form>
    </dialog>`);
  const dialog=document.querySelector('#supply-config-dialog');
  const form=dialog.querySelector('form');
  const list=dialog.querySelector('.supply-category-list');
  const scaleDialog=()=>dialog.style.setProperty('--supply-dialog-scale',String(Math.min(innerWidth/1440,innerHeight/900)));
  addEventListener('resize',scaleDialog);scaleDialog();
  function renderDraft() {
    dialog.querySelectorAll('[name="display-mode"]').forEach(input=>input.checked=input.value===draft.mode);
    list.innerHTML=draft.order.map(id=>{
      const d=definitions.find(item=>item.id===id), group=draft.groups[id];
      return `<fieldset class="supply-category-option" data-config-group="${id}">
        <div class="supply-category-heading"><div><button type="button" class="supply-drag-handle" aria-label="调整${d.label}顺序" title="拖动排序；按上下方向键调整">${image('drag')}</button><span>${d.label}</span></div>
        <label class="supply-switch"><input type="checkbox" role="switch" aria-label="显示${d.label}" data-enable="${id}" ${group.enabled?'checked':''}><span class="supply-switch-track">${image('on')}</span></label></div>
        ${d.items.length?`<div class="supply-item-options">${d.items.map((label,i)=>`<label><input type="checkbox" data-group="${id}" data-item="${i}" ${group.items[i]?'checked':''} ${group.enabled?'':'disabled'}><span class="supply-checkbox-face">${image('tick')}</span><span>${label}</span></label>`).join('')}</div>`:''}
      </fieldset>`;
    }).join('');
    dialog.querySelector('.supply-config-error').textContent='';
  }
  function apply() {
    const enabled=saved.order.filter(id=>saved.groups[id].enabled);
    if(!enabled.includes(active))active=enabled[0];
    const customized=JSON.stringify(saved)!==JSON.stringify(defaults());
    panel.classList.toggle('supply-customized',customized);
    panel.classList.toggle('supply-tabs-mode',saved.mode==='tabs');
    tabs.hidden=saved.mode!=='tabs';
    tabs.innerHTML=enabled.map(id=>`<button type="button" role="tab" data-supply-tab="${id}" aria-selected="${id===active}" tabindex="${id===active?0:-1}">${definitions.find(d=>d.id===id).label}</button>`).join('');
    for(const id of saved.order) {
      const d=definitions.find(def=>def.id===id), node=nodes[id], group=saved.groups[id];
      sections.append(node);
      // analysis-view owns the default function section's visibility outside this screen.
      node.hidden=!group.enabled||(saved.mode==='tabs'&&id!==active);
      if(d.selector)node.querySelectorAll(d.selector).forEach((item,i)=>item.hidden=!group.items[i]);
    }
  }
  trigger.addEventListener('click',()=>{
    draft=copy(saved);renderDraft();scaleDialog();dialog.showModal();trigger.setAttribute('aria-expanded','true');
  });
  const close=()=>dialog.close();
  dialog.querySelector('.supply-dialog-close').addEventListener('click',close);
  dialog.querySelector('.supply-cancel').addEventListener('click',close);
  dialog.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();
  });
  dialog.querySelector('.supply-reset').addEventListener('click',()=>{draft=defaults();renderDraft();});
  form.addEventListener('change',event=>{
    const input=event.target;
    if(input.name==='display-mode')draft.mode=input.value;
    if(input.dataset.enable) {
      draft.groups[input.dataset.enable].enabled=input.checked;
      input.closest('fieldset').querySelectorAll('[data-item]').forEach(item=>item.disabled=!input.checked);
    }
    if(input.dataset.group)draft.groups[input.dataset.group].items[Number(input.dataset.item)]=input.checked;
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!Object.values(draft.groups).some(g=>g.enabled)) {dialog.querySelector('.supply-config-error').textContent='请至少保留一个展示类别';return;}
    saved=copy(draft);apply();
    try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}
    close();
  });
  let drag=null;
  const announceOrder=id=>{
    const label=definitions.find(d=>d.id===id).label;
    dialog.querySelector('.supply-order-status').textContent=`${label}已移至第${draft.order.indexOf(id)+1}项，保存后同步看板顺序`;
  };
  const endDrag=()=>{
    if(!drag)return;
    drag.row.classList.remove('supply-category-dragging');
    list.classList.remove('supply-is-dragging');
    drag=null;
  };
  list.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('.supply-drag-handle');
    if(!handle||event.button!==0)return;
    const row=handle.closest('[data-config-group]');
    event.preventDefault();handle.focus({preventScroll:true});
    drag={id:row.dataset.configGroup,row,pointerId:event.pointerId,startY:event.clientY,started:false};
  });
  window.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    if(!drag.started&&Math.abs(event.clientY-drag.startY)<4)return;
    event.preventDefault();drag.started=true;
    drag.row.classList.add('supply-category-dragging');list.classList.add('supply-is-dragging');
    const others=[...list.children].filter(row=>row!==drag.row);
    const before=others.find(row=>{const r=row.getBoundingClientRect();return event.clientY<r.top+r.height/2;});
    const next=others.map(row=>row.dataset.configGroup);
    next.splice(before?next.indexOf(before.dataset.configGroup):next.length,0,drag.id);
    if(next.join(',')===draft.order.join(','))return;
    draft.order=next;list.insertBefore(drag.row,before||null);announceOrder(drag.id);
  },{passive:false});
  window.addEventListener('pointerup',endDrag);
  window.addEventListener('pointercancel',endDrag);
  window.addEventListener('blur',endDrag);
  dialog.addEventListener('close',endDrag);
  list.addEventListener('dragstart',event=>event.preventDefault());
  list.addEventListener('keydown',event=>{
    if(!event.target.closest('.supply-drag-handle')||!['ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();
    const id=event.target.closest('[data-config-group]').dataset.configGroup,index=draft.order.indexOf(id),next=index+(event.key==='ArrowUp'?-1:1);
    if(next<0||next>=draft.order.length)return;
    [draft.order[index],draft.order[next]]=[draft.order[next],draft.order[index]];renderDraft();announceOrder(id);list.querySelector(`[data-config-group="${id}"] .supply-drag-handle`).focus();
  });
  tabs.addEventListener('click',event=>{const button=event.target.closest('[data-supply-tab]');if(button){active=button.dataset.supplyTab;apply();}});
  tabs.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const buttons=[...tabs.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    event.preventDefault();buttons[next]?.click();tabs.querySelector('[aria-selected="true"]')?.focus();
  });
  // Keep configured groups in sync when the main view expands or collapses.
  new MutationObserver(apply).observe(dashboard,{attributes:true,attributeFilter:['class']});
  apply();
}
