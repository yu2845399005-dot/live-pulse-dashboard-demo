import {creatorAvatar} from './creator-avatars.mjs';
import {series,formatValue,pointAt} from './data-model.mjs?v=20261106-smooth-data';
import {currentMetricGroups,metricReadout,getScope,querySeries} from './data-context.js?v=20261106-smooth-data';
import {regionRevenueRatio} from './region-scopes.js';
import { creatorStatus, gradeClass, rankingExplanation } from './ranking-view.js';
import { getPeriod, setPeriod, today, offsetDate as offset, timeAt, dayDistance, periodError,axisMarkup } from './period-state.js?v=20261106-smooth-data';
import designAssets from './dialog-assets.js';
import {animateUI,revealChart,revealItems,linePath,syncSeries,showSurface,hideSurface,reducedMotion,framePointer} from './data-motion.js?v=20261106-analysis-figma';
const $ = s => document.querySelector(s);
const img = (node,key,cls='') => `<img class="${cls}" src="${designAssets[node][key]}" alt="">`;
const clone = v => JSON.parse(JSON.stringify(v));
const groups = ['Revenue','流量效率','供给规模'];
export const metricDefinitions = [
  [['主播营收','$56','.77M'],['主动付费金额','$43','.56M'],['主动付费UV','11','.56M'],['现金付费UV','11','.56M']],
  [['Load','28','.6%'],['看播UV','86','.42M'],['看播总时长','328','.5M h']],
  [['开播UV','128','.6K'],['G4+开播UV','24','.6K'],['PGC开播UV','18','.2K'],['10M+粉丝开播UV','6','.8K']]
];

function createDialog(id,title,subtitle,node,{width=653,height,body='',footer=true}={}) {
  const dialog=document.createElement('dialog');
  dialog.id=id;dialog.className='dashboard-modal';dialog.dataset.nodeId=node;
  dialog.style.setProperty('--modal-width',width+'px');
  if(height)dialog.style.setProperty('--modal-height',height+'px');
  dialog.setAttribute('aria-labelledby',id+'-title');
  dialog.innerHTML=`<form><header class="modal-header"><div><h2 id="${id}-title">${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div><button type="button" class="modal-close" aria-label="关闭${title}">${img(node,'imgIcon')}</button></header><div class="modal-body">${body}</div>${footer?'<footer class="modal-footer"><button type="button" class="modal-reset">恢复默认</button><div><button type="button" class="modal-cancel">Cancel</button><button class="modal-save" type="submit">Save</button></div></footer>':''}<p class="modal-error" role="alert"></p></form>`;
  document.body.append(dialog);
  const resize=()=>dialog.style.setProperty('--modal-scale',String(Math.min(innerWidth/1440,innerHeight/900)));
  addEventListener('resize',resize);resize();
  let returnFocus,closing=false,entrance;
  const nativeClose=dialog.close.bind(dialog);
  dialog.openModal=()=>{
    if(dialog.open)return;
    returnFocus=document.activeElement;resize();dialog.showModal();
    const base=getComputedStyle(dialog).transform;
    entrance=animateUI(dialog,[{opacity:0,transform:base+' translateY(12px) scale(.985)'},{opacity:1,transform:base}],{duration:340});
    revealItems(dialog.querySelectorAll('.modal-header,.comparison-toolbar,.modal-config-group,.modal-footer'),{delay:70});
    revealChart(dialog,{delay:160});
  };
  dialog.close=(returnValue='')=>{
    if(!dialog.open||closing)return;
    if(reducedMotion()){nativeClose(returnValue);return;}
    closing=true;dialog.classList.add('is-closing');
    const style=getComputedStyle(dialog),base=style.transform;
    entrance?.cancel();
    const exit=animateUI(dialog,[{opacity:style.opacity,transform:base},{opacity:0,transform:base+' translateY(7px) scale(.99)'}],{duration:170,fill:'forwards',easing:'ease-out'});
    exit.finished.then(()=>{nativeClose(returnValue);exit.cancel();dialog.classList.remove('is-closing');closing=false;},()=>{closing=false;dialog.classList.remove('is-closing');});
  };
  dialog.addEventListener('cancel',event=>{if(event.defaultPrevented)return;event.preventDefault();dialog.close();});
  dialog.querySelector('.modal-close').onclick=()=>dialog.close();
  dialog.querySelector('.modal-cancel')?.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>returnFocus?.focus({preventScroll:true}));
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  return dialog;
}

function configuration({id,title,subtitle='支持自定义勾选不同分类tab下的展示指标',node,definitions,mode=false,height,trigger,apply,defaultMode='flat',version='v1'}) {
  const defaults=()=>({mode:defaultMode,order:definitions.map(d=>d.id),groups:Object.fromEntries(definitions.map(d=>[d.id,{enabled:true,items:(d.items||[]).map(()=>true)}]))});
  const key='tiktok-live-'+id+'-'+version;
  let saved=defaults(),draft;
  try{const s=JSON.parse(localStorage.getItem(key));if(id==='core-metric-config'&&s?.groups?.['0']?.items?.length===4)s.groups['0'].items.push(true);if(s&&s.order?.length===definitions.length&&new Set(s.order).size===definitions.length&&s.order.every(id=>saved.groups[id])&&['flat','tabs'].includes(s.mode)&&s.order.some(id=>s.groups?.[id]?.enabled)){
    for(const d of definitions){if(!s.groups[d.id]||s.groups[d.id].items?.length!==d.items.length)throw Error('invalid config');}saved=s;
  }}catch{}
  const dialog=createDialog(id,title,subtitle,node,{height,body:`${mode?'<fieldset class="modal-mode"><legend>展示形式</legend><div><label><input type="radio" name="mode" value="flat"> 平铺展示</label><label><input type="radio" name="mode" value="tabs"> 切换展示</label></div></fieldset><h3 class="modal-category-title">展示类别</h3>':''}<div class="modal-config-list"></div>`});
  const list=dialog.querySelector('.modal-config-list');
  function render(){
    dialog.querySelectorAll('[name=mode]').forEach(i=>i.checked=i.value===draft.mode);
    dialog.querySelector('.modal-error').textContent='';
    list.innerHTML=draft.order.map(id=>{const def=definitions.find(d=>d.id===id),g=draft.groups[id];return `<fieldset class="modal-config-group" data-group="${id}" draggable="true"><div class="modal-group-heading"><div><button type="button" class="modal-drag" aria-label="调整${def.label}顺序" title="拖动或按上下方向键排序">${img(node,'imgDragDotVertical')}</button><span>${def.label}</span></div><label class="supply-switch"><input type="checkbox" role="switch" data-enable="${id}" aria-label="显示${def.label}" ${g.enabled?'checked':''}><span class="supply-switch-track">${img(node,'imgSwitchOn')}</span></label></div>${def.items.length?`<div class="supply-item-options">${def.items.map((name,i)=>`<label><input type="checkbox" data-item="${i}" aria-label="${name}" ${g.items[i]?'checked':''} ${g.enabled?'':'disabled'}><span class="supply-checkbox-face">${img(node,'imgSemiIconsCheckboxTick')}</span><span>${name}</span></label>`).join('')}</div>`:''}</fieldset>`;}).join('');
  }
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',id);
  trigger.addEventListener('click',()=>{draft=clone(saved);render();dialog.openModal();});
  dialog.querySelector('.modal-reset').onclick=()=>{draft=defaults();render();};
  dialog.addEventListener('change',e=>{const t=e.target;if(t.name==='mode')draft.mode=t.value;const id=t.closest('[data-group]')?.dataset.group;if(t.dataset.enable){draft.groups[id].enabled=t.checked;list.querySelectorAll(`[data-group="${id}"] [data-item]`).forEach(i=>i.disabled=!t.checked);}if(t.dataset.item!==undefined)draft.groups[id].items[Number(t.dataset.item)]=t.checked;});
  dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const enabled=draft.order.filter(id=>draft.groups[id].enabled);if(!enabled.length||enabled.some(id=>draft.groups[id].items.length&&!draft.groups[id].items.some(Boolean))){dialog.querySelector('.modal-error').textContent='请至少保留一个类别，并为启用的类别选择一个指标';return;}saved=clone(draft);try{localStorage.setItem(key,JSON.stringify(saved));}catch{}apply(saved);dialog.close();};
  function move(id,target){const from=draft.order.indexOf(id),to=draft.order.indexOf(target);draft.order.splice(from,1);draft.order.splice(to,0,id);render();}
  let dragged;
  list.addEventListener('dragstart',e=>{dragged=e.target.closest('[data-group]')?.dataset.group;if(dragged)e.dataTransfer.setData('text/plain',dragged);});
  list.addEventListener('dragover',e=>{if(dragged)e.preventDefault();});
  list.addEventListener('drop',e=>{const target=e.target.closest('[data-group]')?.dataset.group;if(dragged&&target){e.preventDefault();move(dragged,target);}dragged=null;});
  list.addEventListener('dragend',()=>dragged=null);
  list.addEventListener('keydown',e=>{if(!e.target.closest('.modal-drag')||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const id=e.target.closest('[data-group]').dataset.group,idx=draft.order.indexOf(id),next=idx+(e.key==='ArrowUp'?-1:1);if(draft.order[next]){move(id,draft.order[next]);list.querySelector(`[data-group="${id}"] button`).focus();}});
  apply(saved);return dialog;
}

export function initDashboardDialogs(api) {
  const {state,renderMetrics,renderRanking,getCreators,assets}=api;
  const metricTrigger=document.createElement('button');metricTrigger.className='modal-settings-trigger';metricTrigger.type='button';metricTrigger.setAttribute('aria-label','核心指标展示配置');
  metricTrigger.innerHTML='<img src="assets/figma-metrics/b71fe694-97d6-4ab0-b236-577d0fda4fd1.svg" alt="">';
  metricTrigger.insertAdjacentHTML('beforeend','<span class="overview-metric-picker">指标选择<img src="assets/figma-home-nov06/2-2777-7ecf8.svg" alt=""></span>');
  $('.analysis-metric-settings').replaceWith(metricTrigger);
  $('.metrics-panel').append(metricTrigger);
  configuration({id:'core-metric-config',title:'核心指标 展示配置',node:'674:184814',height:533,trigger:metricTrigger,definitions:groups.map((label,i)=>({id:String(i),label,items:[...metricDefinitions[i].map(m=>m[0]),...(i===0?['主动付费ARPU']:[])]})),apply:s=>{
    state.metricConfig=s;const tabs=$('.metric-tabs');s.order.forEach(id=>{const b=tabs.querySelector(`[data-metric="${id}"]`);b.hidden=!s.groups[id].enabled;tabs.append(b);});if(!s.groups[state.metric].enabled)tabs.querySelector(`[data-metric="${s.order.find(id=>s.groups[id].enabled)}"]`).click();else renderMetrics();
  }});

  metricTrigger.addEventListener('click',()=>{
    const dialog=$('#core-metric-config');
    dialog.querySelectorAll('[data-group]').forEach(group=>{
      const defs=currentMetricGroups()[Number(group.dataset.group)];
      group.querySelectorAll('.supply-item-options label').forEach((label,i)=>{
        label.hidden=!defs[i];if(defs[i]){label.querySelector('span:last-child').textContent=defs[i].label;label.querySelector('input').setAttribute('aria-label',defs[i].label);}
      });
    });
  });
  const consumerSpan=$('.traffic-panel .analysis-side-settings');
  const consumerTrigger=document.createElement('button');consumerTrigger.className=consumerSpan.className;consumerTrigger.type='button';consumerTrigger.innerHTML=consumerSpan.innerHTML;consumerTrigger.setAttribute('aria-label','消费侧展示配置');consumerSpan.replaceWith(consumerTrigger);
  let consumerConfig,consumerActive='1';
  const trafficData=[['G9+金主','G9−非金主'],['推荐页','消息','关注','其他']];
  const graph=$('#graph');graph.insertAdjacentHTML('beforeend','<img class="consumer-design-line" src="assets/figma-left/imgLine.svg" alt="">');const originalLines=[...graph.querySelectorAll('.graph-line')];
  const flatCharts=document.createElement('div');flatCharts.className='consumer-flat-charts';$('.traffic-panel').append(flatCharts);
  originalLines.forEach((line,i)=>{line.dataset.consumerGroup='1';line.dataset.consumerItem=String(i);});
  originalLines.slice(0,2).forEach((line,i)=>{const copy=line.cloneNode(true);copy.dataset.consumerGroup='0';copy.dataset.consumerItem=String(i);copy.classList.add('consumer-gift-line');graph.append(copy);});
  function applyConsumer(s){
    consumerConfig=s;const enabled=s.order.filter(id=>s.groups[id].enabled);if(!enabled.includes(consumerActive))consumerActive=enabled[0];
    const panel=$('.traffic-panel');panel.classList.toggle('consumer-flat',s.mode==='flat');
    const tabs=panel.querySelector('.traffic-tabs');
    s.order.forEach(id=>{const b=tabs.querySelector(`[data-traffic="${id}"]`);b.hidden=!s.groups[id].enabled;tabs.append(b);b.setAttribute('aria-selected',String(id===consumerActive));});
    tabs.querySelector('[data-traffic="2"]').hidden=true;
    const shown=[consumerActive];
    let legend=panel.querySelector('.consumer-config-legend');if(!legend){legend=document.createElement('div');legend.className='consumer-config-legend';panel.append(legend);}
    const legendFor=id=>trafficData[id].map((name,i)=>s.groups[id].items[i]?`<span data-consumer-group="${id}" data-consumer-item="${i}">${id==='1'?`<img src="assets/figma-left/${['imgFrame2147241376','imgCell','imgCell1','imgCell2'][i]}.svg" alt="">`:`<i style="background:${['#258eff','#61b6ff'][i]}"></i>`}${name}</span>`:'').join('');
    legend.innerHTML=legendFor(consumerActive);
    graph.classList.toggle('is-design-traffic',consumerActive==='1'&&s.groups['1'].items.every(Boolean));
    panel.querySelectorAll('.graph-line').forEach(line=>{const id=line.dataset.consumerGroup;line.hidden=!shown.includes(id)||!s.groups[id].items[Number(line.dataset.consumerItem)];});
    flatCharts.innerHTML='';
    if(s.mode==='flat')for(const id of enabled){
      const section=document.createElement('section');section.className='consumer-flat-section';section.dataset.consumerGroup=id;
      section.innerHTML=`<h3>${id==='0'?'打赏分层':'流量入口'}</h3><div class="consumer-config-legend">${legendFor(id)}</div>`;
      const chart=graph.cloneNode(true);chart.removeAttribute('id');chart.classList.add('consumer-flat-graph');chart.removeAttribute('tabindex');chart.removeAttribute('aria-describedby');chart.querySelector('.chart-hover-guide')?.remove();
      chart.querySelectorAll('.graph-line').forEach(line=>line.hidden=line.dataset.consumerGroup!==id||!s.groups[id].items[Number(line.dataset.consumerItem)]);section.append(chart);flatCharts.append(section);
    }
    graph.style.transform='';
    state.traffic=Number(consumerActive);
  }
  configuration({id:'consumer-config',title:'消费侧 展示配置',node:'674:150698',height:573,mode:true,defaultMode:'tabs',version:'v2',trigger:consumerTrigger,definitions:[{id:'0',label:'打赏分层',items:trafficData[0]},{id:'1',label:'流量入口',items:trafficData[1]}],apply:applyConsumer});
  $('.traffic-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-traffic]');if(b&&b.dataset.traffic!=='2'){consumerActive=b.dataset.traffic;applyConsumer(consumerConfig);}});

  const rankingTrigger=document.createElement('button');rankingTrigger.type='button';rankingTrigger.className='ranking-config-trigger';rankingTrigger.setAttribute('aria-label','榜单配置');rankingTrigger.innerHTML='<img src="assets/figma-home-nov06/2-3029-8e9bb.svg" alt="">';$('.ranking-panel').append(rankingTrigger);
  configuration({id:'ranking-config',title:'榜单配置',subtitle:'支持自定义配置榜单展示',node:'683:94289',height:437,trigger:rankingTrigger,definitions:['Top LIVE','未开播大主播','被治理大主播'].map((label,i)=>({id:String(i),label,items:[]})),apply:s=>{
    const tabs=$('.ranking-tabs');s.order.forEach(id=>{const b=tabs.querySelector(`[data-ranking="${id}"]`);b.hidden=!s.groups[id].enabled;tabs.append(b);});if(!s.groups[state.ranking].enabled)tabs.querySelector(`[data-ranking="${s.order.find(id=>s.groups[id].enabled)}"]`).click();
  }});
  initDates();initComparison();

  const more=createDialog('more-creators','更多主播榜单','当前榜单按照实时营收进行排序','699:123028',{width:760,height:783,footer:false,body:'<div class="more-creators-list" aria-label="更多主播榜单"></div>'});
  const moreButton=document.createElement('button');moreButton.type='button';moreButton.className='more-creators-trigger';moreButton.setAttribute('aria-label','查看更多主播榜单');moreButton.innerHTML='<span class="overview-more"><span class="overview-more-divider"><img src="assets/figma-home-nov06/2-1990-95a70.svg" alt=""></span><span>More</span><span class="overview-more-divider"><img src="assets/figma-home-nov06/2-1990-7ce38.svg" alt=""></span></span><span class="analysis-more">查看更多<img src="assets/figma-analysis-nov06/e80b1.svg" alt=""></span>';$('.ranking-panel').append(moreButton);
  moreButton.onclick=()=>{
    const labels=['当前榜单按照实时营收进行排序',rankingExplanation(1),rankingExplanation(2)];
    more.querySelector('.modal-header p').textContent=labels[state.ranking];
    more.querySelector('.more-creators-list').innerHTML=getCreators().slice(0,100).map((c,i)=>`<article class="more-creator">${state.ranking===0?`<span class="more-rank ${i<3?'top':''}">${i+1}</span>`:''}<span class="more-avatar"><img src="${creatorAvatar(c)}" alt="">${state.ranking===0?'<img class="more-ring" src="assets/figma-nov02/new-39-2189-a6ffd.svg" alt="">':''}</span><div class="more-info"><div><strong>${c.name}</strong><span class="more-grade ${gradeClass(c.grade)}">${c.grade}</span>${state.ranking===0?`<b>${c.metric==='revenue'?'$':''}${c.value.toLocaleString('en-US')}</b>`:''}</div><p>${img('674:92777','imgIconGlobe01')} ${c.region}<span>${state.ranking===2?'<img src="assets/figma-ranking/clear.svg" alt="">':img('674:92777','imgIconTtLiveNowOutline')} ${creatorStatus(c,state.ranking)}</span></p></div></article>`).join('');
    more.querySelector('.more-creators-list').scrollTop=0;more.openModal();
  };
}

function initDates(){
  $('#date-dialog').remove();
  const node='710:137408',asset=name=>`<img src="assets/figma-period/${name}.svg" alt="">`;
  const field=(id,label,readonly=false)=>`<label><span>${label}</span><input id="${id}" type="date" ${readonly?'readonly':'required'} aria-label="${label}"></label>`;
  const range=(kind,label)=>`<div class="period-range-picker"><button type="button" class="period-range-trigger" aria-label="${label}日期范围" aria-expanded="false" aria-controls="${kind}-editor"><span class="period-range-value" data-range-value="${kind}"></span>${asset('calendar')}</button><div class="period-range-editor" id="${kind}-editor" hidden>${kind==='observation'?field('observation-start','观测开始日期')+field('observation-end','观测结束日期'):field('comparison-start','对比开始日期')+field('comparison-end','对比结束日期（自动匹配）',true)}<button type="button" class="period-editor-done">完成</button></div></div>`;
  const dialog=createDialog('custom-period','时间展示自定义','通过日期选择器可以选择具体某一天或者某个周期进行对比',node,{width:730,body:`<fieldset class="period-group"><legend>观测周期</legend><div>${range('observation','观测周期')}<div class="period-shortcuts"></div></div></fieldset><fieldset class="period-group"><legend>对比周期</legend><div>${range('comparison','对比周期')}${['上周同期','上月同期','上季度同期','去年同期'].map((name,i)=>`<button type="button" data-compare="${i}">${name}</button>`).join('')}</div></fieldset>`});
  dialog.dataset.nodeId='744:152741';dialog.querySelector('.modal-reset').remove();dialog.querySelector('.modal-close').innerHTML=asset('close');
  dialog.insertAdjacentHTML('afterbegin','<div class="period-modal-glow" aria-hidden="true">'+asset('glow')+'</div>');
  const error=dialog.querySelector('.modal-error');error.classList.add('period-validation');error.innerHTML=asset('warning')+'<span></span>';dialog.querySelector('.modal-footer').before(error);
  const save=dialog.querySelector('.modal-save');
  let draft,dayPreset=null,comparePreset=0,savedComparePreset=0;
  const a=$('#observation-start'),b=$('#observation-end'),c=$('#comparison-start'),d=$('#comparison-end');
  function shortcut(){const date=new Date(draft.start+'T12:00:00Z');if(comparePreset===0)date.setUTCDate(date.getUTCDate()-7);else{const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()-[0,1,3,12][comparePreset]);const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,last));}draft.compare=date.toISOString().slice(0,10);}
  function validate(){const message=periodError(draft);error.querySelector('span').textContent=message;error.classList.toggle('has-error',!!message);save.disabled=!!message;for(const input of [a,b,c])input.setAttribute('aria-invalid',String(!!message));return !message;}
  function sync(){
    a.value=draft.start;b.value=draft.end;c.value=draft.compare;
    const days=dayDistance(draft.start,draft.end);d.value=draft.compare&&Number.isFinite(days)&&days>=0?offset(draft.compare,days):'';
    const text=(start,end)=>`${start||'选择日期'}　至　${end||'选择日期'}`;
    dialog.querySelector('[data-range-value="observation"]').textContent=text(draft.start,draft.end);
    dialog.querySelector('[data-range-value="comparison"]').textContent=text(draft.compare,d.value);
    dialog.querySelectorAll('[data-day]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.day)===dayPreset)));
    dialog.querySelectorAll('[data-compare]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.compare)===comparePreset)));
    validate();
  }
  function closeEditors(){dialog.querySelectorAll('.period-range-editor').forEach(editor=>editor.hidden=true);dialog.querySelectorAll('.period-range-trigger').forEach(trigger=>trigger.setAttribute('aria-expanded','false'));}
  function open(granularity=getPeriod().granularity){
    draft={...getPeriod(),granularity};comparePreset=savedComparePreset;dayPreset=null;
    const options=granularity==='day'?[[7,'过去7天'],[30,'过去30天']]:[[0,'今日'],[1,'昨天']];
    dayPreset=options.find(([n])=>n<2?draft.start===offset(today,-n)&&draft.end===draft.start:draft.end===offset(today,-1)&&draft.start===offset(today,-n))?.[0]??null;
    dialog.querySelector('.period-shortcuts').innerHTML=options.map(([n,label])=>`<button type="button" data-day="${n}">${label}</button>`).join('');
    closeEditors();sync();dialog.openModal();
  }
  $('#date-control').onclick=()=>open();
  document.addEventListener('dashboard:configure-period',event=>open(event.detail.granularity));
  dialog.addEventListener('click',event=>{
    const trigger=event.target.closest('.period-range-trigger');if(trigger){const editor=trigger.nextElementSibling,show=editor.hidden;closeEditors();editor.hidden=!show;trigger.setAttribute('aria-expanded',String(show));if(show)editor.querySelector('input').focus();return;}
    if(event.target.closest('.period-editor-done')){closeEditors();return;}
    const button=event.target.closest('[data-day],[data-compare]');if(!button)return;
    if(button.dataset.day!==undefined){dayPreset=Number(button.dataset.day);draft.start=offset(today,-dayPreset);draft.end=dayPreset<2?draft.start:offset(today,-1);if(comparePreset!==null)shortcut();}
    else{comparePreset=Number(button.dataset.compare);if(draft.start)shortcut();}closeEditors();sync();
  });
  dialog.addEventListener('input',event=>{if(![a,b,c].includes(event.target))return;draft={...draft,start:a.value,end:b.value,compare:c.value};if(event.target===a||event.target===b)dayPreset=null;if(event.target===a&&draft.start&&comparePreset!==null)shortcut();if(event.target===c)comparePreset=null;sync();});
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&dialog.querySelector('.period-range-editor:not([hidden])')){event.preventDefault();event.stopPropagation();closeEditors();}});
  dialog.querySelector('form').onsubmit=event=>{event.preventDefault();if(!validate())return;savedComparePreset=comparePreset;setPeriod(draft);dialog.close();};
}

function initComparison(){
  const node='674:105680',regions=['Global','AMS&ANZ','EU+','METAP','NEA','SEA&CCA'];
  const dots=['imgFrame2147241376','imgCell','imgCell1','imgCell2','imgCell3','imgCell4'];
  const layers=[['img1',58.52,394.289,'-3.42% -1.53% -0.38% -1.53%'],['img2',145.52,139.289,'-.72% -.11%'],['img4',221.52,231.289,'-.43% -.11%'],['img5',52.52,232.289,'-.43% -.11%'],['img6',135.52,317.289,'-.32% -.11%'],['img3',58.52,394.289,'-.25% -.11%']];
  const dialog=createDialog('region-comparison','多区域趋势对比','',node,{width:1346,height:677,footer:false,body:`<div class="comparison-toolbar"><div class="comparison-regions">${regions.map((r,i)=>`<button type="button" aria-pressed="true" data-series="${i}">${img(node,dots[i])}${r}</button>`).join('')}</div><div class="comparison-legend"><span>${img(node,'imgLine364')}观测周期</span><span>${img(node,'imgLine365')}对比周期</span></div></div><div class="comparison-chart" role="img" aria-label="多区域观测与对比趋势，演示数据"><div class="comparison-grid">${img(node,'imgX')}</div><div class="comparison-y">${['4万','3万','2万','1万','0'].map(n=>`<span>${n}</span>`).join('')}</div><div class="comparison-x">${['00:00','02:00','04:00','06:00','08:00','12:00','14:00','16:00','18:00','20:00','22:00'].map(t=>`<span>${t}</span>`).join('')}</div>${layers.map(([key,bottom,h,inset],i)=>`<div class="comparison-series" data-line="${i}" style="bottom:${bottom}px;height:${h}px"><div style="inset:${inset}">${img(node,key)}</div></div>`).join('')}</div>`});
  dialog.querySelector('.modal-header h2').insertAdjacentHTML('afterend',`<div class="comparison-selects"><label><select aria-label="对比指标类别">${groups.map((g,i)=>`<option value="${i}">${g}</option>`).join('')}</select>${img(node,'imgIconChevronRight')}</label><i></i><label><select aria-label="对比指标"></select>${img(node,'imgIconChevronRight')}</label></div>`);
  const category=dialog.querySelector('[aria-label="对比指标类别"]'),metric=dialog.querySelector('[aria-label="对比指标"]');
  function metrics(){metric.innerHTML=currentMetricGroups()[category.value].map(m=>`<option>${m.label}</option>`).join('');}
  function axes(){
    const def=currentMetricGroups()[category.value][metric.selectedIndex];
    const curves=regions.map(region=>[false,true].map(compare=>querySeries(def.key,compare,{region,subregion:'Area Total'})));
    const max=curves.flat(2).reduce((max,p)=>Math.max(max,p.value),1)*1.1;
    const end=curves[0][0].at(-1)?.ratio||1;
    dialog.querySelector('.comparison-hit-area').dataset.displayEnd=String(end);
    dialog.querySelector('.comparison-x').innerHTML=axisMarkup(false,end);
    dialog.querySelector('.comparison-y').innerHTML=[1,.75,.5,.25,0].map(n=>`<span>${formatValue(max*n,def.unit)}</span>`).join('');
    const colors=['#248aff','#32c5ff','#5e8bff','#68dcca','#ba89ff','#efb94f'];
    curves.forEach((pair,i)=>{
      const layer=dialog.querySelector(`[data-line="${i}"]`);layer.style.cssText='left:61px;top:18px;bottom:auto;width:1192px;height:449px;pointer-events:none';
      if(!layer.querySelector('svg'))layer.innerHTML='<svg viewBox="0 0 1192 449" width="1192" height="449"></svg>';
      syncSeries(layer.querySelector('svg'),pair.map((points,c)=>({id:c,d:linePath(points,1192,449,max,{samples:240,domainEnd:end}),stroke:colors[i],width:1.7,dash:c?'5 4':'',opacity:c ? .55 : 1})),{key:JSON.stringify([def.key,getPeriod()]),delay:160+i*35});
    });
    dialog.querySelector('.comparison-chart').setAttribute('aria-label',def.label+'多区域非累计趋势（模拟数据）');
  }
  category.onchange=()=>{metrics();axes();};metric.onchange=axes;metrics();
  dialog.addEventListener('click',e=>{const button=e.target.closest('[data-series]');if(!button)return;const selected=button.getAttribute('aria-pressed')==='true';if(selected&&dialog.querySelectorAll('[data-series][aria-pressed=true]').length===1)return;button.setAttribute('aria-pressed',String(!selected));const layer=dialog.querySelector(`[data-line="${button.dataset.series}"]`);layer.hidden=selected;if(!selected)revealChart(layer,{duration:550});});
  $('.compare-regions').onclick=()=>{category.value=$('[data-metric][aria-selected=true]').dataset.metric;metrics();const selected=$('.metric-card[aria-pressed=true] .metric-label')?.textContent.trim();const option=[...metric.options].find(o=>o.textContent.replaceAll(' ','')===selected?.replaceAll(' ',''));if(option)metric.value=option.value;axes();dialog.openModal();};

  const chart=dialog.querySelector('.comparison-chart');
  chart.insertAdjacentHTML('beforeend','<div class="comparison-hit-area" tabindex="0" role="group" aria-label="多区域趋势，悬浮或用左右方向键查看观测与对比数据"></div><div class="comparison-hover-guide" hidden><img src="assets/figma-ranking/guide.svg" alt=""></div><div class="comparison-hover-pop" id="comparison-hover-pop" role="tooltip" data-node-id="674:107069" hidden></div>');
  const hit=chart.querySelector('.comparison-hit-area'),guide=chart.querySelector('.comparison-hover-guide'),pop=chart.querySelector('.comparison-hover-pop');
  let hoverRatio=.42;
  const hide=()=>{guide.hidden=true;hideSurface(pop);hit.removeAttribute('aria-describedby');};
  function show(ratio){
    hoverRatio=Math.max(0,Math.min(1,ratio));const left=61+1192*hoverRatio,dataRatio=hoverRatio*Number(hit.dataset.displayEnd||1);
    const selected=[...dialog.querySelectorAll('[data-series][aria-pressed=true]')].map(button=>Number(button.dataset.series));
    const def=currentMetricGroups()[category.value][metric.selectedIndex];
    pop.innerHTML=`<div class="comparison-hover-time">时间 ${timeAt(dataRatio)}</div><div class="comparison-hover-table"><div><span>区域</span><span>观测周期</span><span>对比周期</span></div>${selected.map(i=>{
      const values=metricReadout(def.key,def.unit,dataRatio,{region:regions[i],subregion:'Area Total'});
      const shares=[false,true].map(compare=>{
        if(['percent','minutes'].includes(def.unit)||def.key==='arpu')return '—';
        const total=pointAt(querySeries(def.key,compare,{region:'Global',subregion:'Area Total'}),dataRatio).value;
        const value=pointAt(querySeries(def.key,compare,{region:regions[i],subregion:'Area Total'}),dataRatio).value;
        return total?(value/total*100).toFixed(1)+'%':'—';
      });
      return `<div><span>${regions[i]}</span>${values.map((value,j)=>`<span class="comparison-hover-value"><strong>${value}</strong><span>${value==='—'?'—':shares[j]}</span></span>`).join('')}</div>`;
    }).join('')}</div>`;
    guide.style.left=left+'px';pop.style.left=Math.min(1280-252,Math.max(0,left+4))+'px';guide.hidden=false;showSurface(pop);hit.setAttribute('aria-describedby',pop.id);
  }
  const move=framePointer(event=>{const bounds=hit.getBoundingClientRect();show((event.clientX-bounds.left)/bounds.width);});
  hit.addEventListener('pointermove',move);
  hit.addEventListener('pointerleave',()=>{move.cancel();hide();});hit.addEventListener('focus',()=>show(hoverRatio));hit.addEventListener('blur',hide);
  hit.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();show(hoverRatio+(event.key==='ArrowRight'?1:-1)/24);}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();hide();}});
  document.addEventListener('dashboard:mock-refresh',()=>{if(dialog.open){axes();if(!pop.hidden)show(hoverRatio);}});
  dialog.addEventListener('change',hide);dialog.addEventListener('close',hide);document.addEventListener('dashboard:period',hide);
  dialog.querySelector('.comparison-regions').addEventListener('click',()=>{if(!pop.hidden)show(hoverRatio);});

}
