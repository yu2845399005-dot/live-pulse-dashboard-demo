import {chartColors} from './chart-palette.mjs';
import {metricReadout,getScope,queryFacts,currentMetricGroups,querySegments,querySeries} from './data-context.js';
import {breakdown,formatValue,moneyMatrix,matrixPercent,series,pointAt} from './data-model.mjs';
import { getPeriod, usesDateAxis, axisMarkup, timeAt, dateAt } from './period-state.js';
// Figma 744:134677. DOM values are the source of the demo's hover readouts.
import hoverAssets from './hover-assets.js';
const miniatureAssetsReady = true;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
const miniatureNodes = {income:'744:113772',content:'744:116101',guild:'744:118378',function:'744:125775'};
const fieldRows = {
  income:()=>$$('.categories .category').filter(el=>!el.hidden).map(el=>[el.querySelector('span').textContent,el.querySelector('strong').textContent,el.querySelector('span:last-child').textContent]),
  content:()=>$$('.comparison>div').map(el=>[el.querySelector('span').textContent,el.querySelector('p').textContent.match(/\$[\d.]+M/)?.[0]||'—',el.querySelector('small').textContent]),
  guild:()=>$$('.guild-stats .stat-row').filter(el=>!el.hidden).map(el=>[el.firstElementChild.textContent,el.querySelector('.stat-value').childNodes[0].textContent,el.querySelector('small').textContent]),
  function:()=>$$('.function-row').filter(el=>!el.hidden).map(el=>[el.querySelector('span').textContent,el.querySelector('strong').textContent,el.querySelector('small').textContent])
};
const groupNames={income:'收入分层',content:'内容分类',guild:'公会分层',function:'功能场景'};
const curveLabels={
  income:[['Top',-14,27],['Pre-top',-21,15],['Mature',-20,38],['G4+',-13.5,50]],
  content:[['非优质主播',-23,26],['优质主播',-18,45]],
  guild:[['高价值公会',-27,26],['普通公会',-22,42],['非公会',-17,59]],
  function:[['LIVE Goal',-27,6],['Gallery',-22,22],['Fans Club',-28,39],['Cohost',-22,55],['Multiguest',-29,69],['Solo',-15.5,87]]
};

function miniatureMarkup(key){
  const rows=querySegments(key),max=rows.flatMap(r=>r.points).reduce((max,p)=>Math.max(max,p.value),1)*1.1;
  const colors=chartColors(rows);
  return `<div class="hover-mini-chart" tabindex="0" aria-label="${groupNames[key]}非累计趋势，使用左右方向键查看数据"><svg viewBox="0 0 278 100" width="278" height="100">${rows.map((r,i)=>`<path d="${r.points.filter((_,k)=>k%Math.max(1,Math.floor(r.points.length/200))===0).map((p,k)=>`${k?'L':'M'}${p.ratio*278},${100-p.value/max*94}`).join(' ')}" fill="none" stroke="${colors[i]}" stroke-width="1.5"/>`).join('')}</svg></div><div class="hover-mini-timeline">${axisMarkup(true)}</div>`;
}

export function initDashboardHover(){
  const dashboard=$('#dashboard');
  const layer=document.createElement('div');layer.className='dashboard-hover-layer';
  layer.innerHTML='<div class="hover-preview" id="dashboard-hover-preview" role="tooltip" hidden></div><div class="hover-readout" id="dashboard-hover-readout" role="tooltip" hidden></div>';
  document.body.append(layer);
  const preview=layer.querySelector('.hover-preview'),readout=layer.querySelector('.hover-readout');
  let activeTrigger=null,activeKey=null,hideTimer=null,focusIndex=6,interactionMode='pointer';
  let period=getPeriod();
  function scale(){const r=dashboard.getBoundingClientRect();return r.width/1440;}
  function placeLayer(){const r=dashboard.getBoundingClientRect();layer.style.left=r.left+'px';layer.style.top=r.top+'px';layer.style.transform=`scale(${scale()})`;}
  function box(el){const r=el.getBoundingClientRect(),base=dashboard.getBoundingClientRect(),s=scale();return{x:(r.left-base.left)/s,y:(r.top-base.top)/s,width:r.width/s,height:r.height/s};}
  function dismiss(){clearTimeout(hideTimer);preview.hidden=readout.hidden=true;activeTrigger?.removeAttribute('aria-describedby');activeTrigger?.classList.remove('hover-source-active');activeTrigger=null;activeKey=null;$$('.chart-hover-guide').forEach(el=>el.remove());}
  function later(){clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!layer.matches(':hover')&&!activeTrigger?.matches(':hover')&&!(interactionMode==='keyboard'&&activeTrigger?.contains(document.activeElement))&&!layer.contains(document.activeElement))dismiss();},180);}
  function available(){return !$('dialog[open]');}
  function coordinates(event,el){const r=box(el),base=dashboard.getBoundingClientRect(),s=scale();return {x:(event.clientX-base.left)/s,y:(event.clientY-base.top)/s,ratio:clamp(((event.clientX-base.left)/s-r.x)/r.width,0,1)};}

  function renderReadout(title,rows,position,{width=165,compact=false,node=''}={}){
    placeLayer();readout.classList.toggle('hover-readout-compact',compact);readout.style.width=width+'px';readout.dataset.nodeId=node;
    const rowColors=new Map();for(const group of ['income','content','guild','function','gift','traffic']){const segments=breakdown(queryFacts().revenue,group,getScope().region+getScope().subregion),colors=chartColors(segments);segments.forEach((row,i)=>rowColors.set(row.label,colors[i]));}
    readout.innerHTML=`<div class="hover-readout-title">${escape(title)}</div><div class="hover-readout-rows">${rows.map(([label,value,percent])=>`<div><span>${rowColors.has(label)?`<i class="hover-series-dot" style="background:${rowColors.get(label)}"></i>`:''}${escape(label)}</span><strong>${escape(value)}</strong>${percent!==undefined?`<small>${escape(percent)}</small>`:''}</div>`).join('')}</div>`;
    readout.hidden=false;
    const height=readout.offsetHeight;
    let x=position.x+12,y=position.y-height-12;
    if(x+width>1432)x=position.x-width-12;
    if(y<8)y=position.y+16;
    readout.style.left=clamp(x,8,1432-width)+'px';readout.style.top=clamp(y,8,892-height)+'px';
  }
  function mark(el,ratio){let guide=el.querySelector('.chart-hover-guide');if(!guide){guide=document.createElement('span');guide.className='chart-hover-guide';guide.innerHTML='<i></i>';el.append(guide);}guide.style.left=(ratio*100)+'%';}
  function sectionRows(key,ratio=null){
    const rows=fieldRows[key]().filter(row=>row[0]);if(ratio===null)return rows;
    const segments=querySegments(key);
    return rows.map(r=>{const line=segments.find(s=>s.label===r[0]);return [r[0],line?formatValue(pointAt(line.points,ratio).value,'money'):'—',r[2]];});
  }
  function showPreview(trigger,key){
    if(!available())return;
    clearTimeout(hideTimer);if(activeTrigger!==trigger)dismiss();activeTrigger=trigger;activeKey=key;
    trigger.classList.add('hover-source-active');placeLayer();
    if(!miniatureAssetsReady){const r=box(trigger);trigger.setAttribute('aria-describedby',readout.id);renderReadout('观测周期 '+timeAt(.585),sectionRows(key),{x:r.x+r.width*.6,y:r.y},{width:key==='function'?184:160,compact:true,node:'744:113820'});return;}
    trigger.setAttribute('aria-describedby',preview.id);preview.dataset.nodeId=miniatureNodes[key];preview.className='hover-preview '+(key==='guild'||key==='function'?'hover-preview-wide':'');preview.classList.toggle('period-date-axis',usesDateAxis());preview.innerHTML=miniatureMarkup(key);preview.hidden=false;readout.hidden=true;
    const r=box(key==='income'?trigger.closest('.income-chart'):trigger),width=preview.offsetWidth,height=preview.offsetHeight;let left=clamp(r.x+r.width/2-width/2,8,1432-width),top=r.y+(key==='income'?r.height*.55:0)-height-12;if(top<8)top=r.y+r.height+10;
    preview.style.left=left+'px';preview.style.top=clamp(top,8,892-height)+'px';
  }
  function activate(trigger,label,key){
    trigger.tabIndex=0;trigger.dataset.hoverCategory=key;trigger.setAttribute('aria-label',label+'，悬浮或聚焦查看趋势');
    trigger.addEventListener('pointerenter',()=>{interactionMode='pointer';showPreview(trigger,key);});trigger.addEventListener('pointerleave',later);trigger.addEventListener('focus',()=>{if(interactionMode==='keyboard')showPreview(trigger,key);});trigger.addEventListener('blur',later);
  }
  // Attach to a specific metric or chart, never to a section's layout container.
  for(const [selector,key]of [['.income-chart .ring','income'],['.category','income'],['.content-bar>i','content'],['.comparison>div','content'],['.guild-bar>i','guild'],['.guild-stats .stat-row','guild'],['.function-row','function']]){
    for(const trigger of $$(selector))activate(trigger,groupNames[key],key);
  }
  layer.addEventListener('pointerenter',()=>clearTimeout(hideTimer));layer.addEventListener('pointerleave',later);
  preview.addEventListener('pointermove',event=>{const chart=preview.querySelector('.hover-mini-chart');if(!chart||!activeKey)return;const p=coordinates(event,chart);if(event.target.closest('.hover-mini-chart')){mark(chart,p.ratio);renderReadout('观测周期 '+timeAt(p.ratio),sectionRows(activeKey,p.ratio),p,{width:160,compact:true,node:'744:113820'});}});
  preview.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();focusIndex=clamp(focusIndex+(event.key==='ArrowRight'?1:-1),0,24);const chart=preview.querySelector('.hover-mini-chart'),r=box(chart),ratio=focusIndex/24;mark(chart,ratio);renderReadout('观测周期 '+timeAt(ratio),sectionRows(activeKey,ratio),{x:r.x+r.width*ratio,y:r.y+60},{width:160,compact:true});});

  function wireChart(el,label,readRows,options={}){
    if(!el)return;el.tabIndex=0;el.setAttribute('aria-label',label+'，悬浮或用左右方向键查看演示数据');
    function show(event){if(!available())return;clearTimeout(hideTimer);if(activeTrigger!==el)dismiss();activeTrigger=el;preview.hidden=true;el.setAttribute('aria-describedby',readout.id);const r=box(el),p=event?coordinates(event,el):{x:r.x+r.width*focusIndex/24,y:r.y+r.height*.6,ratio:focusIndex/24};mark(el,p.ratio);const data=readRows(p.ratio,event);renderReadout((options.prefix||'观测周期 ')+timeAt(p.ratio),data,p,options);}
    el.addEventListener('pointermove',show);el.addEventListener('pointerleave',later);el.addEventListener('focus',()=>show());el.addEventListener('blur',later);el.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();focusIndex=clamp(focusIndex+(e.key==='ArrowRight'?1:-1),0,24);show();});
  }
  const trafficRows=(id,container=$('#graph'),ratio=null)=>{
    const values=querySegments(id==='0'?'gift':'traffic').map(r=>[r.label,formatValue(ratio===null?r.value:pointAt(r.points,ratio).value,'money'),r.percent.toFixed(1)+'%']);
    const lines=[...container.querySelectorAll('.graph-line')].filter(l=>l.dataset.consumerGroup===id&&!l.hidden);
    return values.filter((_,i)=>lines.some(l=>Number(l.dataset.consumerItem)===i));
  };
  let hoveredTrafficGroup=null;
  $('.consumer-config-legend')?.addEventListener('pointerover',event=>{hoveredTrafficGroup=event.target.closest('[data-consumer-group]')?.dataset.consumerGroup||null;});
  $('.traffic-panel')?.addEventListener('pointerleave',()=>hoveredTrafficGroup=null);
  wireChart($('#graph'),'消费侧趋势',ratio=>trafficRows(hoveredTrafficGroup||$('.traffic-tabs [aria-selected=true]')?.dataset.traffic||'1',$('#graph'),ratio),{node:'744:122917'});
  function wireFlatCharts(){for(const graph of $$('.consumer-flat-graph')){if(graph.dataset.hoverReady)continue;graph.dataset.hoverReady='true';const id=graph.closest('.consumer-flat-section').dataset.consumerGroup;wireChart(graph,id==='0'?'打赏分层':'流量入口',ratio=>trafficRows(id,graph,ratio),{node:id==='0'?'744:120663':'744:122917'});}}
  wireFlatCharts();new MutationObserver(wireFlatCharts).observe($('.consumer-flat-charts'),{childList:true});

  wireChart($('.trend-plot'),'主趋势图',ratio=>{
    const card=$('.metric-card[aria-pressed=true]')||$('.metric-card'),group=Number($('[data-metric][aria-selected=true]').dataset.metric);
    const def=currentMetricGroups()[group].find(d=>d.key===card.dataset.metricKey)||currentMetricGroups()[group][0];
    const [value,previous]=metricReadout(def.key,def.unit,ratio);
    return [['观测周期 '+dateAt(ratio).replaceAll('-','.'),value],['对比周期 '+dateAt(ratio,true).replaceAll('-','.'),previous]];
  },{prefix:'时间 ',width:186,node:'744:130239'});

  function matrixReadout(row,ratio){
    const scope=getScope(),data=moneyMatrix(getPeriod(),scope.region),label=row.querySelector('th').textContent.trim(),i=data.labels.indexOf(label);
    const consumer=$('[data-perspective="consumer"]').getAttribute('aria-pressed')==='true';
    const override={region:scope.region==='Global'?label:scope.region,subregion:scope.region==='Global'?'Area Total':label};
    const point=pointAt(querySeries('revenue',false,override),ratio);
    const amount=i<0?data.amounts.reduce((v,r,j)=>v+r[j],0):data.amounts[i][i],den=i<0?data.total:data.recipientTotals[i];
    return [label,formatValue(den?point.value*amount/den:0,'money'),i<0?'—':matrixPercent(data,i,i,consumer).toFixed(1)+'%'];
  }
  const matrix=$('.contribution-table');
  matrix?.addEventListener('pointermove',event=>{
    const image=event.target.closest('.sparkline-cell>svg,.sparkline-cell>svg *,.sparkline-cell>img:not(.region-crown)'),cell=image?.closest('.sparkline-cell');
    if(!cell||!available()){if(activeTrigger?.classList.contains('sparkline-cell'))dismiss();return;}
    clearTimeout(hideTimer);if(activeTrigger!==cell)dismiss();activeTrigger=cell;preview.hidden=true;
    const p=coordinates(event,cell),row=cell.closest('tr'),label=row.querySelector('th').textContent.trim(),percent=row.querySelector('.local-contribution')?.textContent||'—';
    cell.setAttribute('aria-describedby',readout.id);mark(cell,p.ratio);renderReadout('观测时间 '+timeAt(p.ratio),[matrixReadout(row,p.ratio)],p,{width:172,compact:true,node:'744:134660'});
  });
  matrix?.addEventListener('pointerleave',later);
  function decorateSparklines(){for(const cell of $$('.sparkline-cell')){cell.tabIndex=0;cell.setAttribute('aria-label',cell.closest('tr').querySelector('th').textContent.trim()+'营收贡献趋势');}}
  decorateSparklines();new MutationObserver(decorateSparklines).observe(matrix.querySelector('tbody'),{childList:true});
  matrix?.addEventListener('focusin',event=>{const cell=event.target.closest('.sparkline-cell');if(!cell)return;const r=box(cell),row=cell.closest('tr');activeTrigger=cell;cell.setAttribute('aria-describedby',readout.id);renderReadout('观测时间 '+timeAt(.5),[matrixReadout(row,.5)],{x:r.x+r.width/2,y:r.y},{width:172,compact:true});});matrix?.addEventListener('focusout',later);
  document.addEventListener('dashboard:period',event=>{period=event.detail;dismiss();});
  document.addEventListener('keydown',event=>{if(['Tab','ArrowLeft','ArrowRight'].includes(event.key))interactionMode='keyboard';if(event.key==='Escape'&&(!preview.hidden||!readout.hidden)){event.preventDefault();event.stopImmediatePropagation();dismiss();}},true);
  document.addEventListener('pointerdown',event=>{interactionMode='pointer';if(!layer.contains(event.target)&&!activeTrigger?.contains(event.target))dismiss();},true);
  new MutationObserver(dismiss).observe(dashboard,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>{if($('dialog[open]'))dismiss();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  addEventListener('resize',dismiss);addEventListener('blur',dismiss);
}
