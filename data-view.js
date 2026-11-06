import {CHART_COLORS,OVERVIEW_CHART_COLORS,chartColors,chartDot} from './chart-palette.mjs?v=20261106-home-ui';
const overview=()=>!document.querySelector('.analysis-view');
const viewColors=rows=>chartColors(rows,OVERVIEW_CHART_COLORS);
import {localDate,minuteOfDay} from './dashboard-clock.mjs';
import {getPeriod,axisMarkup} from './period-state.js';
import {getScope,queryFacts,currentMetricGroups,querySeries,querySegments} from './data-context.js';
import {breakdown,formatValue,series,moneyMatrix,matrixPercent} from './data-model.mjs';
import {linePath,syncSeries,revealItems,countValues} from './data-motion.js';
const $$=s=>[...document.querySelectorAll(s)],$=s=>document.querySelector(s);
// Compact labels match Figma's single-decimal amounts; raw facts keep full precision.
const money=value=>{const unit=value>=1e6?1e6:value>=1e3?1e3:1;return '$'+(value/unit).toFixed(1)+(unit===1e6?'M':unit===1e3?'K':'');};
export function renderBreakdowns(){
 const scope=getScope(),total=queryFacts().revenue,key=scope.region+scope.subregion;
 const rows=type=>breakdown(total,type,key);
 const colors=type=>viewColors(rows(type));
 const traffic=rows($('.traffic-tabs [aria-selected=true]')?.dataset.traffic==='0'?'gift':'traffic');
 $$('#traffic-stats .stat-row').forEach((el,i)=>{const row=traffic[i];if(row)el.querySelector('.stat-value').innerHTML=`<strong class="supply-money">${money(row.value)}</strong><small>${row.percent.toFixed(1)}%</small>`;});
 $$('.category').forEach((el,i)=>{const row=rows('income')[i];el.querySelector('i').style.setProperty('background',colors('income')[i],'important');el.querySelector('strong').textContent=money(row.value);el.querySelector('span:last-child').textContent=row.percent.toFixed(1)+'%';});
 $$('.comparison>div').forEach((el,i)=>{const row=rows('content')[i];el.querySelector('p').innerHTML=`<strong>${money(row.value)}</strong><small>${row.percent.toFixed(1)}%</small>`;});
 $$('.guild-stats .stat-row').forEach((el,i)=>{const row=rows('guild')[i];el.querySelector('.stat-value').innerHTML=`<strong class="supply-money">${money(row.value)}</strong><small>${row.percent.toFixed(1)}%</small>`;el.querySelector('img').src=chartDot(colors('guild')[i]);});
 $$('.function-row').forEach((el,i)=>{const row=rows('function')[i];el.querySelector('strong').textContent=money(row.value);el.querySelector('small').textContent=row.percent.toFixed(1)+'%';const bar=el.querySelector('img');bar.src='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="7"><rect width="120" height="7" rx="3.5" fill="rgba(255,255,255,.1)"/><rect width="${row.percent*1.2}" height="7" rx="3.5" fill="${OVERVIEW_CHART_COLORS[0]}"/></svg>`);});
 for(const [selector,type] of [['.content-bar i','content'],['.guild-bar i','guild']])$$(selector).forEach((el,i)=>{el.style.background=colors(type)[i];el.style.boxShadow='none';el.style.width=rows(type)[i].percent+'%';el.style.flexBasis=rows(type)[i].percent+'%';});
 const ring=$('.ring');if(ring){const ringColors=colors('income');let acc=0;ring.style.background=`conic-gradient(${rows('income').map((r,i)=>{const from=acc;acc+=r.percent;return `${ringColors[i]} ${from}% ${acc}%`;}).join(',')})`;ring.style.borderRadius='50%';ring.style.maskImage='radial-gradient(circle, transparent 42%, black 43%)';ring.querySelector('img').style.opacity='0';}
 $('.supply-panel').title='模拟数据 · 主播分层取观测周期内最近版本；标签版本固定 T−2，优质主播口径 V1.2';
}
export function renderConsumerTrends(){
 for(const graph of $$('#graph,.consumer-flat-graph')){
  const id=graph.closest('.consumer-flat-section')?.dataset.consumerGroup||$('.traffic-tabs [aria-selected=true]')?.dataset.traffic||'1';
  const rows=querySegments(id==='0'?'gift':'traffic'),colors=viewColors(rows);
  document.querySelectorAll(`.consumer-config-legend [data-consumer-group="${id}"]`).forEach(el=>{const color=colors[Number(el.dataset.consumerItem)];const img=el.querySelector('img');if(img){img.src=chartDot(color);img.style.width='6px';img.style.height='6px';}else if(el.querySelector('i'))el.querySelector('i').style.background=color;});
  const lines=rows.map(r=>r.points),max=lines.flat().reduce((max,p)=>Math.max(max,p.value),1)*1.1;
  let svg=graph.querySelector('.data-consumer-svg');if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('data-consumer-svg');svg.setAttribute('viewBox','0 0 312 91');svg.setAttribute('preserveAspectRatio','none');graph.append(svg);}
  graph.classList.add('has-data-series');
  const end=lines[0]?.at(-1)?.ratio||1;
  graph.dataset.displayEnd=String(end);
  const visible=lines.flatMap((line,i)=>[...graph.querySelectorAll('.graph-line')].some(el=>el.dataset.consumerGroup===id&&Number(el.dataset.consumerItem)===i&&!el.hidden)?[{id:i,d:linePath(line,312,91,max,{domainEnd:end}),stroke:colors[i],width:1.5}]:[]);
  syncSeries(svg,visible,{key:JSON.stringify([id,getScope(),getPeriod(),overview(),visible.map(r=>r.id)])});
 }
}
export function renderMainTrend(){
 const card=$('.metric-card[aria-pressed=true]')||$('.metric-card');if(!card)return;
 const group=Number($('[data-metric][aria-selected=true]')?.dataset.metric||0),def=currentMetricGroups()[group].find(d=>d.key===card.dataset.metricKey)||currentMetricGroups()[group][0];
 const points=querySeries(def.key),other=querySeries(def.key,true);
 const max=[...points,...other].reduce((max,p)=>Math.max(max,p.value),1)*1.15;
 let plot=$('.trend-plot');if(!plot){plot=document.createElement('div');plot.className='trend-plot';$('.revenue-trend-chart').append(plot);}
 let svg=$('.data-trend-svg');if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('data-trend-svg');svg.setAttribute('viewBox','0 0 620 204');svg.setAttribute('preserveAspectRatio','none');plot.append(svg);}
 const end=points.at(-1)?.ratio||1,path=p=>linePath(p,620,204,max,{domainEnd:end});
 plot.dataset.displayEnd=String(end);
 $('.trend-x-axis').innerHTML=axisMarkup(false,end);
 const p=path(points),last=points.length?620:0;
 if(!svg.querySelector('defs'))svg.innerHTML=`${[0,51,102,153,204].map(y=>`<line x1="0" x2="620" y1="${y}" y2="${y}" stroke="#ffffff15" stroke-dasharray="2 3"/>`).join('')}<defs><linearGradient id="mock-trend-fill" x2="0" y2="1"><stop stop-color="${CHART_COLORS[0]}" stop-opacity=".23"/><stop offset="1" stop-color="${CHART_COLORS[0]}" stop-opacity="0"/></linearGradient></defs>`;
 syncSeries(svg,[{id:'area',d:`${p} L${last.toFixed(2)},204 L0,204 Z`,fill:'url(#mock-trend-fill)'},{id:'current',d:p,stroke:CHART_COLORS[0],width:2},{id:'previous',d:path(other),stroke:CHART_COLORS[1],width:1.5,dash:'5 4'}],{key:JSON.stringify([def.key,getScope(),getPeriod()])});
 document.querySelectorAll('.trend-legend img').forEach((el,i)=>{el.src='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="2"><path d="M0 1H16" stroke="${CHART_COLORS[i%2]}" stroke-width="2" ${i?'stroke-dasharray="3 3"':''}/></svg>`);});
 $$('.trend-lines,.trend-bars,.trend-grid').forEach(el=>el.hidden=true);
 $('.trend-y-axis').innerHTML=[1,.75,.5,.25,0].map(r=>`<span style="top:${(1-r)*100}%">${formatValue(max*r,def.unit)}</span>`).join('');
 plot.dataset.lastMinute=String(points.at(-1)?.minute??'');
 plot.dataset.lastRatio=String(points.at(-1)?.ratio??'');
 $('.trend-live-label')?.remove();
 $('.revenue-trend-chart').setAttribute('aria-label',`${def.label}，${getPeriod().granularity==='day'?'每天':'每分钟'}非累计值，指标卡${getPeriod().start===getPeriod().end?'为累计':'为日均'}，模拟数据`);
}
export function initDataView(){
 for(const event of ['dashboard:region','dashboard:period','dashboard:mock-refresh'])document.addEventListener(event,()=>{renderBreakdowns();renderMainTrend();renderConsumerTrends();});
 $('.traffic-tabs').addEventListener('click',()=>queueMicrotask(renderConsumerTrends));
 new MutationObserver(renderConsumerTrends).observe($('.consumer-flat-charts'),{childList:true});
 const cards=$('#metric-cards');let lastCards='';new MutationObserver(()=>{
  renderMainTrend();
  const key=$('[data-metric][aria-selected=true]')?.dataset.metric+':'+cards.dataset.items;
  if(lastCards&&lastCards!==key){revealItems(cards.children,{stagger:45});countValues(cards.querySelectorAll('.metric-value'));}
  lastCards=key;
 }).observe(cards,{childList:true});
 cards.addEventListener('click',()=>queueMicrotask(renderMainTrend));cards.addEventListener('keydown',()=>queueMicrotask(renderMainTrend));
 new MutationObserver(()=>{renderBreakdowns();renderConsumerTrends();}).observe($('#dashboard'),{attributes:true,attributeFilter:['class']});
 renderBreakdowns();renderMainTrend();renderConsumerTrends();
}
