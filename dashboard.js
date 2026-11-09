import {attachDialogMotion} from './data-motion.js?v=20261106-responsive-polish';
import {creatorAvatar} from './creator-avatars.mjs?v=20261106-responsive-polish';
import {clockLabel,localDate} from './dashboard-clock.mjs?v=20261106-responsive-polish';
import {syncPeriodClock} from './period-state.js?v=20261106-responsive-polish';
import {queryCreators} from './creator-data.mjs?v=20261106-responsive-polish';
import {metricCards,queryFacts,getScope,getDataNow,refreshSnapshot} from './data-context.js?v=20261106-responsive-polish';
import {dailyFacts,isTodayPeriod,aggregate,metricValue,breakdown,formatValue} from './data-model.mjs?v=20261106-responsive-polish';
import {getPeriod} from './period-state.js?v=20261106-responsive-polish';
import {initDataView} from './data-view.js?v=20261106-responsive-polish';
import { initLayoutEditor } from './layout-editor.js?v=20261106-responsive-polish';
import { subregionsFor, defaultSubregion, regionRevenueRatio, scopedRevenue } from './region-scopes.js?v=20261106-responsive-polish';
import { initRankingControls, creatorStatus, gradeClass, governanceReasons } from './ranking-view.js?v=20261106-responsive-polish';
import { initPeriodControls } from './period-state.js?v=20261106-responsive-polish';
import {entryFrame,counterProgress,smoothProgress} from './entry-motion.mjs?v=20261106-responsive-polish';
import { initDashboardDialogs, metricDefinitions } from './dashboard-dialogs.js?v=20261106-responsive-polish';
import { initDashboardHover } from './dashboard-hover.js?v=20261106-responsive-polish';
import { initAnalysisView } from './analysis-view.js?v=20261109-panel-fill';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const state = { region: 'Global', subregion: 'Area Total', ranking: 0, page: 1, traffic: 1, metric: 0, inactiveDays: 7, governance: 'all' };
const assets = {
  portraits: ['assets/figma-nov02/new-39-2189-4af96.png','assets/figma-nov02/new-39-2189-37604.png','assets/figma/1-664-9cb7a.png',
    ...Array.from({length:8},(_,i)=>`assets/avatars/creator-${String(i+4).padStart(2,'0')}.jpg`),'assets/figma-nov02/new-39-2189-0fc8f.png'],
  globe: 'assets/figma-home-nov06/2-1990-64385.svg', live: 'assets/figma-home-nov06/2-1990-ef41d.svg',
  dots: ['assets/figma-nov03/e75fb.svg','assets/figma-nov03/e396d.svg','assets/figma-nov03/11b53.svg']
};
// The design is a fixed 1440 × 900 presentation canvas. Scale it as one unit.
function fitDashboard() {
  if($('#dashboard').classList.contains('layout-dragging'))return;
  const height=Number($('#dashboard').dataset.canvasHeight)||900;
  const scale = Math.min(innerWidth / 1440, innerHeight / height);
  const scene = $('#dashboard');
  scene.style.transform = `scale(${scale})`;
  scene.style.left = `${(innerWidth - 1440 * scale) / 2}px`;
  scene.style.top = `${(innerHeight - height * scale) / 2}px`;
}
addEventListener('resize', fitDashboard);
document.addEventListener('dashboard:layout-size',fitDashboard);
fitDashboard();
let toastTimer;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2400);
}
function selectTab(group, active) {
  group.forEach(button => { button.setAttribute('aria-selected', String(button === active)); button.tabIndex = button === active ? 0 : -1; });
}
// Arrow keys follow the standard tabs pattern, in addition to pointer controls.
$$('[role=tablist]').forEach(list => list.addEventListener('keydown', event => {
  if(event.target.getAttribute('role')!=='tab')return;
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...list.querySelectorAll('[role=tab]')].filter(tab=>!tab.hidden);
  let index = tabs.indexOf(document.activeElement);
  index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[index].focus(); tabs[index].click();
}));
const metricSets = metricDefinitions;
// Keep the integer prominent, with decimals and magnitude in the smaller type tier.
function metricValueMarkup(metric) {
  if(metric.unit==='minutes') {
    const seconds=Math.max(0,Math.round(metric.value*60));
    const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds/60)%60;
    const hourText=hours.toLocaleString('en-US');
    return `<span class="metric-duration${hours>=100000?' is-long':''}"><span>${hourText}<small class="metric-unit">h</small></span><span>${minutes}<small class="metric-unit">m</small></span><span>${seconds%60}<small class="metric-unit">s</small></span></span>`;
  }
  const text=metric.unit==='percent'?metric.value.toFixed(2):metric.formatted;
  const parts=text.match(/^([^.]*)((?:\..*)?)$/);
  return `${parts[1]}${parts[2]?`<small>${parts[2]}</small>`:''}${metric.unit==='percent'?'<small class="metric-unit">%</small>':''}`;
}
const metricStrip=$('.metric-card-strip'),metricTrack=$('#metric-cards');
function updateMetricNavigation() {
  const overflow=metricTrack.children.length>4;
  metricStrip.classList.toggle('has-overflow',overflow);
  $('.metric-scroll-prev').hidden=!overflow||metricTrack.scrollLeft<1;
  $('.metric-scroll-next').hidden=!overflow||metricTrack.scrollLeft>=metricTrack.scrollWidth-metricTrack.clientWidth-1;
}
metricTrack.addEventListener('scroll',updateMetricNavigation,{passive:true});
new ResizeObserver(updateMetricNavigation).observe(metricTrack);
$$('.metric-scroll').forEach(button=>button.addEventListener('click',()=>{
  const step=(metricTrack.firstElementChild?.offsetWidth||160)+12;
  metricTrack.scrollBy({left:step*(button.classList.contains('metric-scroll-prev')?-1:1),behavior:'smooth'});
}));
metricTrack.addEventListener('focusin',event=>{
  const card=event.target.closest('.metric-card');if(!card)return;
  const left=card.offsetLeft-metricTrack.offsetLeft,right=left+card.offsetWidth;
  if(left<metricTrack.scrollLeft)metricTrack.scrollTo({left,behavior:'smooth'});
  else if(right>metricTrack.scrollLeft+metricTrack.clientWidth)metricTrack.scrollTo({left:right-metricTrack.clientWidth,behavior:'smooth'});
});
function renderMetrics() {
  const changeMarkup=m=>m.change===null||m.change===0?'<i class="metric-flat-mark" aria-label="暂无对比值"></i>':`<img src="assets/figma-analysis-nov06/${m.change<0?'b73d8':'49a40'}.svg" alt="${m.change<0?'下降':'上升'}">${Math.abs(m.change).toFixed(1)}%`;
  const selectedKey=$('.metric-card[aria-pressed=true]')?.dataset.metricKey;
  const visible=metricCards(state.metric).filter((_,i)=>state.metricConfig?.groups[state.metric]?.items[i]!==false);
  const signature=visible.map(m=>m.key).join(',');
  if(metricTrack.dataset.items===signature&&metricTrack.children.length===visible.length){
    visible.forEach((m,i)=>{
      const card=metricTrack.children[i],value=card.querySelector('.metric-value');
      if(value.dataset.numberMotion!=='running'&&value.getAttribute('aria-label')!==m.formatted){value.setAttribute('aria-label',m.formatted);value.innerHTML=metricValueMarkup(m);}
      const change=card.querySelector('.metric-change'),markup=changeMarkup(m);
      change.className='metric-change '+(m.change===null||m.change===0?'flat':m.change<0?'negative':'');
      if(change.innerHTML!==markup)change.innerHTML=markup;
    });
    return;
  }
  if(metricTrack.dataset.items!==signature)metricTrack.scrollLeft=0;
  metricTrack.dataset.items=signature;
  metricTrack.style.setProperty('--metric-count',Math.min(4,visible.length)||1);
  metricTrack.innerHTML=visible.map(m=>`<article class="metric-card" data-metric-key="${m.key}"${m.key===selectedKey?' aria-pressed="true"':''} title="${m.label} · ${getPeriod().start===getPeriod().end?'当日累计':'周期日均'} · 对比同时间窗 · 模拟数据"><span class="metric-label">${m.label}</span><strong class="metric-value" aria-label="${m.formatted}">${metricValueMarkup(m)}</strong><span class="metric-change ${m.change===null||m.change===0?'flat':m.change<0?'negative':''}">${m.change===null||m.change===0?'<i class="metric-flat-mark" aria-label="暂无对比值"></i>':`<img src="assets/figma-analysis-nov06/${m.change<0?'b73d8':'49a40'}.svg" alt="${m.change<0?'下降':'上升'}">${Math.abs(m.change).toFixed(1)}%`}</span></article>`).join('');
  updateMetricNavigation();
}
$$('[data-metric]').forEach(button => button.addEventListener('click', () => { state.metric = Number(button.dataset.metric); selectTab($$('[data-metric]'), button); renderMetrics(); }));
$('#metric-picker').addEventListener('change',event=>{
  $('[data-metric="'+event.target.value+'"]').click();
  event.target.value='';
});
const trafficSets=()=>breakdown(queryFacts().revenue,state.traffic===0?'gift':state.traffic===1?'traffic':'function',getScope().region+getScope().subregion).map(r=>[r.label,formatValue(r.value,'money'),r.percent.toFixed(1)+'%']);
$$('[data-traffic]').forEach(button => button.addEventListener('click', () => {
  state.traffic = Number(button.dataset.traffic); selectTab($$('[data-traffic]'), button);
  $('#traffic-stats').innerHTML = trafficSets().map(([label,value,percent],i) => `<div class="stat-row"><span><img src="${assets.dots[i === 0 ? 0 : i === 3 ? 2 : 1]}" alt="">${label}</span><span class="stat-value">${value}<small>${percent}</small></span></div>`).join('');
  // Each data series already has its own profile; keep time running left to right.
  $('#graph').style.transform = '';
}));
function getCreators() {
  return queryCreators({...state,period:getPeriod(),now:getDataNow(),sort:$('#sort-select').value,window:$('#live-select').value});
}
function renderRanking() {
  const creators=getCreators(),region=state.region;
  $('#ranking-list').innerHTML = creators.slice((state.page-1)*12,state.page*12).map((c,i) => `<button class="creator-row" aria-label="查看 ${c.name} 详情">${state.ranking===0?`<span class="rank">${(state.page-1)*12+i+1}</span>`:''}<span class="avatar-frame"><img class="avatar" src="${creatorAvatar(c)}" alt="${c.name}">${state.ranking===0&&c.grade==='Top'?'<img class="avatar-ring" src="assets/figma-nov02/new-39-2189-a6ffd.svg" alt="">':''}</span><span class="creator-info"><span class="creator-top"><span class="creator-name"><span class="creator-display-name">${c.name}</span><span class="grade ${gradeClass(c.grade)}">${c.grade}</span></span>${state.ranking===0?`<span class="creator-revenue">${c.metric==='revenue'?'$':''}${c.value.toLocaleString('en-US')}</span>`:''}</span><span class="creator-meta"><img src="${assets.globe}" alt="">${c.region}<img class="live-icon" src="${state.ranking===2?'assets/figma-ranking/clear.svg':assets.live}" alt="">${creatorStatus(c,state.ranking)}</span></span></button>`).join('');
  if(!creators.length)$('#ranking-list').innerHTML=`<p class="ranking-empty">${state.ranking!==0&&!isTodayPeriod(getPeriod())?'此榜单仅在观测周期为今日时生效':'暂无符合条件的主播'}</p>`;
  document.dispatchEvent(new CustomEvent('dashboard:ranking'));
  const pageButtons = $$('[data-page]');
  const middlePage = state.page > 1 && state.page < 10 ? state.page : 2;
  pageButtons[1].dataset.page = String(middlePage);
  pageButtons[1].textContent = String(middlePage);
  pageButtons.forEach(button => { if (Number(button.dataset.page) === state.page) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current'); });
  $('#previous-page').disabled = state.page === 1; $('#next-page').disabled = state.page === 10;
  $$('.creator-row').forEach((row,i) => row.addEventListener('click', () => {const creator=creators[(state.page-1)*12+i];toast(`${creator.name} · ${creator.region} · ${state.ranking===0?'$'+creator.value.toLocaleString('en-US'):creatorStatus(creator,state.ranking)}`);}));
}
$$('[data-ranking]').forEach(button => button.addEventListener('click', () => { state.ranking = Number(button.dataset.ranking); state.page = 1; selectTab($$('[data-ranking]'),button); renderRanking(); }));
$('#sort-select').addEventListener('change', () => { state.page=1; renderRanking(); });
$('#live-select').addEventListener('change', () => { state.page=1; renderRanking(); });
$$('[data-page]').forEach(button => button.addEventListener('click', () => { state.page=Number(button.dataset.page); renderRanking(); }));
$('#previous-page').addEventListener('click', () => { state.page=Math.max(1,state.page-1);renderRanking(); });
$('#next-page').addEventListener('click', () => { state.page=Math.min(10,state.page+1);renderRanking(); });
function setRegion(region) {
  state.region=region;state.subregion=defaultSubregion(region);$('#region-select').value=region;
  regionReturn.classList.toggle('is-visible',region!=='Global');
  if(region==='Global'&&document.activeElement===regionReturn)$('#region-select').focus();
  regionReturn.inert=region==='Global';
  if(region==='Global'){
    regionClose.classList.remove('is-visible');
    if(document.activeElement===regionClose)$('#region-select').focus();
    regionClose.inert=true;$('#spin-toggle').checked=true;
  }
  for(const [name,card] of regionLabels) {
    const pressed=String(name===region);
    card.setAttribute('aria-pressed',pressed);
    regionSummaryRows.get(name).button.setAttribute('aria-pressed',pressed);
  }
  $('.earth-frame').contentWindow.postMessage({type:'earth:focus-region',region},location.origin);
  $('#live-select').value='all'; state.page=1; renderRanking();
  document.dispatchEvent(new CustomEvent('dashboard:region',{detail:{region,subregion:state.subregion}}));
  toast(region === 'Global' ? '已切换至全球概览' : `已切换至 ${region} 区域`);
}
function setSubregion(subregion){
  if(subregion!=='Area Total'&&!subregionsFor(state.region).includes(subregion))return;
  state.subregion=subregion;state.page=1;renderRanking();
  document.dispatchEvent(new CustomEvent('dashboard:region',{detail:{region:state.region,subregion}}));
}
$('#region-select').addEventListener('change',event=>setRegion(event.target.value));
// Each label is projected from its own geographic anchor in the WebGL scene.
const regionLabelOffsets = {
  'AMS&ANZ':[14,20], 'EU+':[-144,-96], METAP:[14,20],
  NEA:[14,-94], 'SEA&CCA':[14,20],
};
const regionLabels = new Map($$('.region-card').map(card=>[card.dataset.region,card]));
const regionSummary=$('.region-summary');
const regionSummaryCount=$('.region-summary-count');
const regionSummaryList=$('.region-summary-list');
const metricsPanel=$('.metrics-panel');
const regionReturn=$('#region-return');
const regionLabelContainers=new Map();
for(const [region,card] of regionLabels){
  const container=document.createElement('div');
  container.className='region-label';
  card.before(container);
  container.append(card);
  regionLabelContainers.set(region,container);
}
const regionClose=document.createElement('button');
regionClose.id='region-close';
regionClose.className='region-close';
regionClose.type='button';
regionClose.title='返回全球';
regionClose.setAttribute('aria-label','关闭地区详情，返回全球');
regionClose.innerHTML='<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
regionClose.inert=true;
regionClose.addEventListener('click',()=>setRegion('Global'));
let regionView='Global';
let regionTransitioning=false;
regionReturn.addEventListener('click',()=>setRegion('Global'));
const regionSummaryRows=new Map();
const regionGuides = new Map();
for(const region of regionLabels.keys()){
  const guide=document.createElementNS('http://www.w3.org/2000/svg','g');
  const line=document.createElementNS(guide.namespaceURI,'line');
  const pin=document.createElementNS(guide.namespaceURI,'circle');
  pin.setAttribute('r','2.5');guide.append(line,pin);
  $('.region-guides').append(guide);
  regionGuides.set(region,{guide,line,pin});
}
const reducedEntryMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const regionCounters=new Map();
for (const [index,[region,card]] of [...regionLabels].entries()) {
  const strong=card.querySelector('strong');
  const value=dailyFacts(localDate(),{region}).revenue/1e6;
  strong.innerHTML='<small>$</small><span class="region-number">0.0</span>M';
  const row=document.createElement('div');
  row.className='region-summary-row';
  row.inert=true;
  row.innerHTML='<div><button type="button" class="region-summary-button" aria-pressed="false"><span></span><strong>$<span>0.0</span>M</strong></button></div>';
  const button=row.querySelector('button');
  button.firstElementChild.textContent=region;
  const select=()=>setRegion(state.region===region?'Global':region);
  card.addEventListener('click',select);
  button.addEventListener('click',select);
  regionSummaryList.append(row);
  regionSummaryRows.set(region,{row,button});
  regionCounters.set(region,{index,target:value,nodes:[strong.querySelector('.region-number'),row.querySelector('strong span')],startedAt:null,done:false,onCap:false});
}
const dashboard=$('#dashboard');
const totalDisplay=$('.total');
const totalDigits=totalDisplay.querySelector('strong');
const startingRevenue=Math.round(dailyFacts(localDate()).revenue);
const revenueFormat=new Intl.NumberFormat('en-US');
let displayedRevenue=-1;
let globalRevenue=startingRevenue;
let revenueTimer=null;
let lastEntryElapsed=-1;

function renderScopedRevenue(roll=false){
  const period=getPeriod(),facts=queryFacts(),base=queryFacts(false,{region:'Global',subregion:'Area Total'}).revenue;
  const ratio=base?facts.revenue/base:regionRevenueRatio(state.region,state.subregion);
  const caption=period.start!==period.end?'观测周期日均营收':period.start===localDate(getDataNow())?'今日实时累计':'观测日累计营收';
  totalDisplay.dataset.globalRevenue=String(Math.round(base));
  totalDisplay.dataset.regionRatio=String(ratio);
  totalDisplay.dataset.revenueRegion=state.region;
  totalDisplay.dataset.snapshot=String(getDataNow().getTime());
  totalDisplay.title=`${state.region} / ${state.subregion} · ${caption} · 模拟数据`;
  $('.realtime-caption span').textContent=caption;
  const entryRatio=revenueTimer===null?globalRevenue/startingRevenue:1;
  renderRevenue(Math.round(facts.revenue*entryRatio),roll);
}
document.addEventListener('dashboard:region',()=>renderScopedRevenue(true));
function renderRevenue(value,roll=false) {
  if(value===displayedRevenue)return;
  displayedRevenue=value;
  const formatted=revenueFormat.format(value);
  if(totalDigits.childElementCount!==formatted.length) {
    totalDigits.replaceChildren(...Array.from(formatted,character=>{
      const digit=document.createElement('span');
      digit.textContent=character;
      return digit;
    }));
  } else {
    for(const [index,character] of Array.from(formatted).entries()) {
      const digit=totalDigits.children[index];
      if((digit.firstElementChild?.textContent??digit.textContent)===character)continue;
      if(!roll||reducedEntryMotion) {
        digit.textContent=character;
        continue;
      }
      const outgoing=document.createElement('span');
      outgoing.className='revenue-outgoing';
      outgoing.textContent=digit.firstElementChild?.textContent??digit.textContent;
      outgoing.setAttribute('aria-hidden','true');
      const incoming=document.createElement('span');
      incoming.textContent=character;
      digit.replaceChildren(incoming,outgoing);
      const exit=outgoing.animate(
        [{transform:'translateY(0)',opacity:1},{transform:'translateY(20%)',opacity:0}],
        {duration:150,easing:'ease-in',fill:'forwards'}
      );
      incoming.animate(
        [{transform:'translateY(-24%)',opacity:0},{transform:'translateY(0)',opacity:1}],
        {delay:150,duration:330,easing:'cubic-bezier(.2,.65,.3,1)',fill:'backwards'}
      );
      exit.onfinish=()=>outgoing.remove();
    }
  }
  totalDisplay.setAttribute('aria-label',`${state.region==='Global'?'总营收':state.region+' 营收'} ${formatted} 美元`);
}

function updateDashboardEntry(elapsed) {
  if(elapsed<lastEntryElapsed-500) {
    for(const counter of regionCounters.values()){
      counter.startedAt=null;counter.done=false;counter.onCap=false;
      for(const node of counter.nodes)node.textContent='0.0';
    }
  }
  lastEntryElapsed=elapsed;
  const entry=entryFrame(elapsed,reducedEntryMotion&&elapsed>=0);
  const reveal=entry.globe;
  $('.earth-stage').style.setProperty('--placeholder-opacity',entry.placeholder);
  $('.earth-stage').style.setProperty('--globe-opacity',reveal);
  totalDisplay.style.setProperty('--entry-opacity',reveal);
  totalDisplay.style.setProperty('--entry-shift',`${((1-reveal)*10).toFixed(2)}px`);
  totalDisplay.style.setProperty('--entry-blur',`${((1-reveal)*5).toFixed(2)}px`);
  dashboard.style.setProperty('--arrow-opacity',entry.arrow);
  dashboard.style.setProperty('--panel-opacity',reveal);
  dashboard.style.setProperty('--panel-shift',`${((1-reveal)*10).toFixed(2)}px`);
  const expandButton=$('#expand-metrics');
  expandButton.disabled=entry.arrow<.98;
  expandButton.setAttribute('aria-hidden',String(entry.arrow<.98));
  dashboard.dataset.entry=entry.complete?'complete':'revealing';
  if(revenueTimer===null) {
    globalRevenue=Math.round(startingRevenue*(.985+.015*entry.total));
    renderScopedRevenue();
    if(entry.complete) {
      // Simulate incoming revenue in the demo, independently of rendering speed.
      revenueTimer=setInterval(()=>{
        syncPeriodClock();renderUpdateTime();
        refreshSnapshot();globalRevenue=Math.round(queryFacts(false,{region:'Global',subregion:'Area Total'}).revenue);renderScopedRevenue(true);
        for(const [region,counter] of regionCounters){counter.target=dailyFacts(localDate(),{region}).revenue/1e6;if(counter.done)for(const node of counter.nodes)node.textContent=counter.target.toFixed(1);}
        renderMetrics();renderRanking();document.dispatchEvent(new Event('dashboard:mock-refresh'));
      },1150);
    }
  }
}

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const cardWidth=127.5, cardHeight=90, labelGap=8;

function placeRegionCards(points,capBottom,reserved=[]) {
  const placements=new Map();
  for(const {region,ax,ay,onCap,detail} of points) {
    if(!onCap)continue;
    const candidates=detail?[[16,-45],[16,-104],[16,16],[-144,-104],[-144,-45]]:
      [regionLabelOffsets[region],[-144,-45],[16,-45],[-64,-104],[-64,16],[-144,16],[16,-104]];
    for(const [dx,dy] of candidates) {
      const x=clamp(ax+dx,8,584), y=clamp(ay+dy,146,capBottom-cardHeight-labelGap);
      if(ax>x&&ax<x+cardWidth&&ay>y&&ay<y+cardHeight)continue;
      if(reserved.some(rect=>x<rect.x+rect.width+labelGap&&x+cardWidth+labelGap>rect.x&&
        y<rect.y+rect.height+labelGap&&y+cardHeight+labelGap>rect.y))continue;
      placements.set(region,{x,y});
      reserved.push({x,y,width:cardWidth,height:cardHeight});
      break;
    }
  }
  return placements;
}

function updateRegionLabels(points,elapsed=-1,shapeAnchor=null) {
  updateDashboardEntry(elapsed);
  if(!Array.isArray(points))return;
  const frame=$('.earth-frame');
  const frameX=frame.offsetLeft, frameY=frame.offsetTop;
  const capBottom=metricsPanel.classList.contains('expanded')?503:620;
  const positions=[];
  for(const {region,x,y,visibility} of points) {
    const counter=regionCounters.get(region);
    if(!counter||!Number.isFinite(x)||!Number.isFinite(y))continue;
    if(counter.startedAt===null&&elapsed>=(reducedEntryMotion?0:500+counter.index*80))counter.startedAt=elapsed;
    const reveal=counter.startedAt===null?0:reducedEntryMotion?1:smoothProgress(elapsed,counter.startedAt,800);
    if(reveal<=.015)continue;
    if(!counter.done) {
      const progress=counterProgress(elapsed,counter.startedAt+100,1300,reducedEntryMotion);
      const value=(counter.target*progress).toFixed(1);
      for(const node of counter.nodes)node.textContent=value;
      counter.done=progress===1;
    }
    const ax=frameX+x, ay=frameY+y;
    // Leave a margin before reattaching a label near the cap edge.
    const inset=counter.onCap?0:10;
    counter.onCap=ax>=inset&&ax<=720-inset&&ay>=126+inset&&ay<=capBottom-14-inset&&
      visibility>(counter.onCap?.18:.38);
    const detail=regionView!=='Global';
    positions.push({region,ax:detail&&shapeAnchor?frameX+shapeAnchor.x:ax,
      ay:detail&&shapeAnchor?frameY+shapeAnchor.y:ay,reveal,onCap:detail?region===regionView:counter.onCap,detail});
  }
  positions.sort((a,b)=>Number(b.region===state.region)-Number(a.region===state.region));
  let placements=placeRegionCards(positions,capBottom);
  let reservedRows=0;
  while(positions.length-placements.size>reservedRows) {
    reservedRows=positions.length-placements.size;
    // Match the dock's padding, heading and 26px rows in dashboard.css.
    const height=40+26*reservedRows;
    placements=placeRegionCards(positions,capBottom,[{x:532,y:capBottom-16-height,width:172,height}]);
  }
  const byRegion=new Map(positions.map(point=>[point.region,point]));
  const selectedPlacement=regionView===state.region&&regionView!=='Global'?placements.get(regionView):null;
  const closeVisible=Boolean(selectedPlacement&&!regionTransitioning);
  regionClose.classList.toggle('is-visible',closeVisible);
  regionClose.inert=!closeVisible;
  if(selectedPlacement){
    const container=regionLabelContainers.get(regionView);
    if(regionClose.parentElement!==container)container.append(regionClose);
  }
  const dockedCount=positions.length-placements.size;
  const count=String(dockedCount);
  if(regionSummaryCount.textContent!==count)regionSummaryCount.textContent=count;
  regionSummary.classList.toggle('is-visible',dockedCount>0);
  const focused=document.activeElement;
  regionSummary.inert=dockedCount===0;

  for(const [region,card] of regionLabels) {
    const container=regionLabelContainers.get(region);
    const point=byRegion.get(region), placement=placements.get(region);
    const {row,button}=regionSummaryRows.get(region);
    const {guide,line,pin}=regionGuides.get(region);
    const docked=Boolean(point&&!placement);
    container.classList.toggle('is-visible',Boolean(placement));
    card.classList.toggle('is-detail',Boolean(placement&&point?.detail));
    card.inert=!placement;
    guide.classList.toggle('is-visible',Boolean(placement));
    row.classList.toggle('is-visible',docked);
    row.inert=!docked;
    if(placement) {
      const {x,y}=placement, {ax,ay,reveal}=point;
      container.style.left=x.toFixed(1)+'px';container.style.top=y.toFixed(1)+'px';
      container.style.setProperty('--region-reveal',reveal);
      container.style.setProperty('--region-lift',`${((1-reveal)*10).toFixed(2)}px`);
      guide.style.setProperty('--region-reveal',reveal);
      pin.setAttribute('cx',ax);pin.setAttribute('cy',ay);
      line.setAttribute('x1',ax);line.setAttribute('y1',ay);
      line.setAttribute('x2',clamp(ax,x,x+cardWidth));line.setAttribute('y2',clamp(ay,y,y+cardHeight));
    }
    if(placement&&focused===button)card.focus({preventScroll:true});
    if(docked&&focused===card)button.focus({preventScroll:true});
  }
}
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==$('.earth-frame').contentWindow)return;
  if(event.data?.type==='earth:failed'){updateDashboardEntry(2600);toast('地球加载失败，其他看板内容可正常使用');}
  if(event.data?.type==='earth:region-view'){
    regionView=event.data.region;regionTransitioning=Boolean(event.data.transitioning);
  }
  if(event.data?.type==='earth:morph-failed')toast('地区轮廓加载失败，请重新选择地区');
  if(event.data?.type==='earth:regions')updateRegionLabels(event.data.points,event.data.entryElapsed,event.data.shapeAnchor);
  if(event.data?.type==='earth:ready')$('.earth-frame').contentWindow.postMessage({type:'earth:layout',height:(dashboard.classList.contains('analysis-view')?503:620)-126},location.origin);
  if(event.data?.type==='earth:ready'&&state.region!=='Global')$('.earth-frame').contentWindow.postMessage({type:'earth:focus-region',region:state.region},location.origin);
  if(event.data?.type==='earth:reset'&&state.region!=='Global')setRegion('Global');
});
initAnalysisView({ setRegion, setSubregion });
function renderUpdateTime(){ $('#update-time').textContent=`当前数据更新于: ${clockLabel()}`; }
function refreshData() {
  syncPeriodClock();renderUpdateTime();
  refreshSnapshot();globalRevenue=Math.round(queryFacts(false,{region:'Global',subregion:'Area Total'}).revenue);renderScopedRevenue(true);renderMetrics();renderRanking();document.dispatchEvent(new Event('dashboard:mock-refresh'));
  toast('演示数据已刷新');
}
$('#refresh-data').addEventListener('click',refreshData);
$$('dialog').forEach(attachDialogMotion);
$('#help').addEventListener('click',()=>$('#help-dialog').showModal());
$('#share').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('看板链接已复制');}catch{toast('当前浏览器不支持复制，请复制地址栏链接');}});
$$('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));
renderMetrics();renderRanking();
$$('[role=tablist]').forEach(list=>selectTab([...list.querySelectorAll('[role=tab]')],list.querySelector('[aria-selected=true]')));

for(const id of ['cloud-toggle','spin-toggle']) $('#'+id).addEventListener('change',event=>$('.earth-frame').contentWindow.postMessage({type:'earth:appearance',clouds:$('#cloud-toggle').checked,spin:$('#spin-toggle').checked},location.origin));
$('#language').addEventListener('click',()=>toast('当前展示中英文双语数据'));


initDashboardDialogs({state,renderMetrics,renderRanking,getCreators,assets});
initDataView();
initDashboardHover();

initPeriodControls();

initRankingControls({state,renderRanking});
document.addEventListener('dashboard:period',()=>{$('#live-select').disabled=!isTodayPeriod(getPeriod());});

initLayoutEditor();
document.addEventListener('dashboard:period',()=>{state.page=1;renderScopedRevenue(true);renderMetrics();renderRanking();});
document.addEventListener('dashboard:region',()=>{renderMetrics();renderRanking();});
refreshData();

setInterval(()=>{syncPeriodClock();renderUpdateTime();},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshData();});
