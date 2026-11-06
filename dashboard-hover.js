import {CHART_COLORS,OVERVIEW_CHART_COLORS,chartColors} from './chart-palette.mjs?v=20261106-home-ui';
const viewColors=rows=>chartColors(rows,OVERVIEW_CHART_COLORS);
import {metricReadout,getScope,getDataNow,currentMetricGroups,querySegments,querySeries} from './data-context.js?v=20261106-smooth-data';
import {breakdown,formatValue,moneyMatrix,matrixPercent,series,pointAt} from './data-model.mjs?v=20261106-smooth-data';
import { getPeriod, usesDateAxis, axisMarkup, timeAt, dateAt } from './period-state.js?v=20261106-smooth-data';
// Figma 744:134677. DOM values are the source of the demo's hover readouts.
import hoverAssets from './hover-assets.js';
import {showSurface,hideSurface,revealChart,linePath,framePointer} from './data-motion.js?v=20261106-analysis-figma';
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
  const colors=viewColors(rows),end=rows[0]?.points.at(-1)?.ratio||1;
  return `<div class="hover-mini-chart" data-display-end="${end}" tabindex="0" aria-label="${groupNames[key]}非累计趋势，使用左右方向键查看数据"><svg viewBox="0 0 278 100" width="278" height="100">${rows.map((r,i)=>`<path d="${linePath(r.points,278,100,max,{domainEnd:end})}" fill="none" stroke="${colors[i]}" stroke-width="1.5"/>`).join('')}</svg></div><div class="hover-mini-timeline">${axisMarkup(true,end)}</div>`;
}

export function initDashboardHover(){
  const dashboard=$('#dashboard');
  const layer=document.createElement('div');layer.className='dashboard-hover-layer';
  layer.innerHTML='<div class="hover-preview" id="dashboard-hover-preview" role="tooltip" hidden></div><div class="hover-readout" id="dashboard-hover-readout" role="tooltip" hidden></div>';
  document.body.append(layer);
  const preview=layer.querySelector('.hover-preview'),readout=layer.querySelector('.hover-readout');
  let activeTrigger=null,activeKey=null,hideTimer=null,focusIndex=6,interactionMode='pointer';
  let readoutSignature='',readoutHeight=0,rowColors,viewport;
  let period=getPeriod();
  function scale(){return (viewport||(viewport=dashboard.getBoundingClientRect())).width/1440;}
  function placeLayer(){if(viewport)return;const r=viewport=dashboard.getBoundingClientRect();layer.style.left=r.left+'px';layer.style.top=r.top+'px';layer.style.transform=`scale(${r.width/1440})`;}
  function box(el){const r=el.getBoundingClientRect(),base=dashboard.getBoundingClientRect(),s=scale();return{x:(r.left-base.left)/s,y:(r.top-base.top)/s,width:r.width/s,height:r.height/s};}
  function dismiss(){clearTimeout(hideTimer);hideSurface(preview);hideSurface(readout);activeTrigger?.removeAttribute('aria-describedby');activeTrigger?.classList.remove('hover-source-active');activeTrigger=null;activeKey=null;$$('.chart-hover-guide').forEach(el=>el.remove());}
  function later(){clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!layer.matches(':hover')&&!activeTrigger?.matches(':hover')&&!(interactionMode==='keyboard'&&activeTrigger?.contains(document.activeElement))&&!layer.contains(document.activeElement))dismiss();},180);}
  function available(){return !$('dialog[open]');}
  function coordinates(event,el){const r=box(el),base=dashboard.getBoundingClientRect(),s=scale();return {x:(event.clientX-base.left)/s,y:(event.clientY-base.top)/s,ratio:clamp(((event.clientX-base.left)/s-r.x)/r.width,0,1)};}

  function renderReadout(title,rows,position,{width=165,compact=false,node=''}={}){
    placeLayer();readout.classList.toggle('hover-readout-compact',compact);readout.style.width=width+'px';readout.dataset.nodeId=node;
    if(!rowColors){rowColors=new Map();for(const group of ['income','content','guild','function','gift','traffic']){const segments=breakdown(1,group,getScope().region+getScope().subregion),colors=viewColors(segments);segments.forEach((row,i)=>rowColors.set(row.label,colors[i]));}}
    const signature=JSON.stringify([width,compact,rows.map(r=>[r[0],r[2]!==undefined])]);
    if(signature!==readoutSignature){
      readout.innerHTML=`<div class="hover-readout-title"></div><div class="hover-readout-rows">${rows.map(([label,value,percent])=>`<div><span>${rowColors.has(label)?`<i class="hover-series-dot" style="background:${rowColors.get(label)}"></i>`:''}${escape(label)}</span><strong></strong>${percent!==undefined?'<small></small>':''}</div>`).join('')}</div>`;
      readoutSignature=signature;readoutHeight=0;
    }
    readout.firstElementChild.textContent=title;
    [...readout.lastElementChild.children].forEach((row,i)=>{row.querySelector('strong').textContent=rows[i][1];const percent=row.querySelector('small');if(percent)percent.textContent=rows[i][2];});
    showSurface(readout);
    const height=readoutHeight||(readoutHeight=readout.offsetHeight);
    let x=position.x+12,y=position.y-height-12;
    if(!preview.hidden){const r=box(preview);x=r.x+r.width+12;y=r.y+12;if(x+width>1432)x=r.x-width-12;}
    if(x+width>1432)x=1432-width;
    if(y<8)y=position.y+16;
    readout.style.transform=`translate3d(${clamp(x,8,1432-width)}px,${clamp(y,8,892-height)}px,0)`;
  }
  function mark(el,ratio){let guide=el.querySelector('.chart-hover-guide');if(!guide){guide=document.createElement('span');guide.className='chart-hover-guide';guide.innerHTML='<i></i>';el.append(guide);}guide.style.left=(ratio*100)+'%';}
  function sectionRows(key,ratio=null){
    const rows=fieldRows[key]().filter(row=>row[0]);if(ratio===null)return rows;
    const segments=querySegments(key);
    return rows.map(r=>{const line=segments.find(s=>s.label===r[0]);return [r[0],line?formatValue(pointAt(line.points,ratio).value,'money'):'—',r[2]];});
  }
  function showPreview(trigger,key){
    if(!available())return;
    clearTimeout(hideTimer);const changed=activeKey!==key||preview.hidden;if(activeTrigger!==trigger){activeTrigger?.removeAttribute('aria-describedby');activeTrigger?.classList.remove('hover-source-active');}activeTrigger=trigger;activeKey=key;
    trigger.classList.add('hover-source-active');placeLayer();
    if(!miniatureAssetsReady){const r=box(trigger);trigger.setAttribute('aria-describedby',readout.id);renderReadout('观测周期 '+timeAt(.585),sectionRows(key),{x:r.x+r.width*.6,y:r.y},{width:key==='function'?184:160,compact:true,node:'744:113820'});return;}
    trigger.setAttribute('aria-describedby',preview.id);preview.dataset.nodeId=miniatureNodes[key];preview.className='hover-preview '+(key==='guild'||key==='function'?'hover-preview-wide':'');preview.classList.toggle('period-date-axis',usesDateAxis());if(changed)preview.innerHTML=miniatureMarkup(key);showSurface(preview);if(changed)revealChart(preview,{duration:520,delay:30});hideSurface(readout);
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
  const previewMove=framePointer(event=>{const chart=preview.querySelector('.hover-mini-chart');if(!chart||!activeKey)return;const p=coordinates(event,chart),ratio=p.ratio*Number(chart.dataset.displayEnd||1);if(event.target.closest('.hover-mini-chart')){mark(chart,p.ratio);renderReadout('观测周期 '+timeAt(ratio),sectionRows(activeKey,ratio),p,{width:160,compact:true,node:'744:113820'});}});
  preview.addEventListener('pointermove',previewMove);preview.addEventListener('pointerleave',()=>previewMove.cancel());
  preview.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();focusIndex=clamp(focusIndex+(event.key==='ArrowRight'?1:-1),0,24);const chart=preview.querySelector('.hover-mini-chart'),r=box(chart),ratio=focusIndex/24,dataRatio=ratio*Number(chart.dataset.displayEnd||1);mark(chart,ratio);renderReadout('观测周期 '+timeAt(dataRatio),sectionRows(activeKey,dataRatio),{x:r.x+r.width*ratio,y:r.y+60},{width:160,compact:true});});

  function wireChart(el,label,readRows,options={}){
    if(!el)return;el.tabIndex=0;el.setAttribute('aria-label',label+'，悬浮或用左右方向键查看演示数据');
    function show(event){if(!available())return;clearTimeout(hideTimer);if(activeTrigger!==el)dismiss();activeTrigger=el;hideSurface(preview);el.setAttribute('aria-describedby',readout.id);const r=box(el),p=event?coordinates(event,el):{x:r.x+r.width*focusIndex/24,y:r.y+r.height*.6,ratio:focusIndex/24};mark(el,p.ratio);const ratio=p.ratio*Number(el.dataset.displayEnd||1),data=readRows(ratio,event);renderReadout((options.prefix||'观测周期 ')+timeAt(ratio),data,{...p,y:r.y},options);}
    const move=framePointer(show);el.addEventListener('pointermove',move);el.addEventListener('pointerleave',()=>{move.cancel();later();});el.addEventListener('focus',()=>show());el.addEventListener('blur',later);el.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();focusIndex=clamp(focusIndex+(e.key==='ArrowRight'?1:-1),0,24);show();});
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

  let matrixCache,matrixCacheKey;
  function matrixReadout(row,ratio){
    const scope=getScope(),now=getDataNow(),key=JSON.stringify([getPeriod(),scope.region,Math.floor(now.getTime()/60000)]);
    if(key!==matrixCacheKey){matrixCacheKey=key;matrixCache=moneyMatrix(getPeriod(),scope.region,{now});}
    const data=matrixCache,label=row.querySelector('th').textContent.trim(),i=data.labels.indexOf(label);
    const consumer=$('[data-perspective="consumer"]').getAttribute('aria-pressed')==='true';
    const override={region:scope.region==='Global'?label:scope.region,subregion:scope.region==='Global'?'Area Total':label};
    const point=pointAt(querySeries('revenue',false,override),ratio);
    const amount=i<0?data.amounts.reduce((v,r,j)=>v+r[j],0):data.amounts[i][i],den=i<0?data.total:data.recipientTotals[i];
    return [label,formatValue(den?point.value*amount/den:0,'money'),i<0?'—':matrixPercent(data,i,i,consumer).toFixed(1)+'%'];
  }
  const matrix=$('.contribution-table');
  const matrixMove=framePointer(event=>{
    const image=event.target.closest('.sparkline-cell>svg,.sparkline-cell>svg *,.sparkline-cell>img:not(.region-crown)'),cell=image?.closest('.sparkline-cell');
    if(!cell||!available()){if(activeTrigger?.classList.contains('sparkline-cell'))dismiss();return;}
    clearTimeout(hideTimer);if(activeTrigger!==cell)dismiss();activeTrigger=cell;hideSurface(preview);
    const p=coordinates(event,cell),row=cell.closest('tr'),ratio=p.ratio*(querySeries('revenue').at(-1)?.ratio||1);
    cell.setAttribute('aria-describedby',readout.id);mark(cell,p.ratio);renderReadout('观测时间 '+timeAt(ratio),[matrixReadout(row,ratio)],p,{width:172,compact:true,node:'744:134660'});
  });
  matrix?.addEventListener('pointermove',matrixMove);
  matrix?.addEventListener('pointerleave',()=>{matrixMove.cancel();later();});
  function decorateSparklines(){for(const cell of $$('.sparkline-cell')){cell.tabIndex=0;cell.setAttribute('aria-label',cell.closest('tr').querySelector('th').textContent.trim()+'营收贡献趋势');}}
  decorateSparklines();new MutationObserver(decorateSparklines).observe(matrix.querySelector('tbody'),{childList:true});
  matrix?.addEventListener('focusin',event=>{const cell=event.target.closest('.sparkline-cell');if(!cell)return;const r=box(cell),row=cell.closest('tr'),ratio=.5*(querySeries('revenue').at(-1)?.ratio||1);activeTrigger=cell;cell.setAttribute('aria-describedby',readout.id);renderReadout('观测时间 '+timeAt(ratio),[matrixReadout(row,ratio)],{x:r.x+r.width/2,y:r.y},{width:172,compact:true});});matrix?.addEventListener('focusout',later);
  document.addEventListener('dashboard:period',event=>{period=event.detail;rowColors=null;readoutSignature='';dismiss();});
  document.addEventListener('dashboard:region',()=>{rowColors=null;readoutSignature='';dismiss();});
  document.addEventListener('keydown',event=>{if(['Tab','ArrowLeft','ArrowRight'].includes(event.key))interactionMode='keyboard';if(event.key==='Escape'&&(!preview.hidden||!readout.hidden)){event.preventDefault();event.stopImmediatePropagation();dismiss();}},true);
  document.addEventListener('pointerdown',event=>{interactionMode='pointer';if(!layer.contains(event.target)&&!activeTrigger?.contains(event.target))dismiss();},true);
  new MutationObserver(dismiss).observe(dashboard,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>{if($('dialog[open]'))dismiss();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  addEventListener('resize',()=>{viewport=null;placeLayer();dismiss();});addEventListener('blur',dismiss);
  placeLayer();
}
