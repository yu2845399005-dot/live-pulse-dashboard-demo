import {CHART_COLORS} from './chart-palette.mjs';
import {getDataNow,querySeries} from './data-context.js';
import {moneyMatrix,matrixPercent} from './data-model.mjs';
import {getPeriod} from './period-state.js';
import { subregionsFor, globalRegions as regions } from './region-scopes.js';
// Figma 725:23088. Expand the existing dashboard without resetting its state.
import { initSupplyConfig } from './supply-config.js';
import {animateUI,cancelUI,revealChart,revealItems,countValues} from './data-motion.js';
const asset = name => `assets/figma-metrics/${name}.svg`;
const image = (name, className = '') => `<img src="${asset(name)}" alt="" class="${className}">`;
const sparklines = ['e6f85aa4-548c-4129-9e20-a2d3a7131655', '55164af7-735f-4a3b-9d0c-fcf6c9a15e81',
  '2082e506-e54e-43e9-a986-dc27ac182c2a', '84e60ffc-619c-493d-936f-f218f69c07a5', '59076069-512c-4ad4-b803-9bf281b058df'];
const sceneBars = ['68e6dcd7-6109-48cd-8686-737d2df0c47f', '313a78c4-c92a-469b-a012-8ebfbe50cad2',
  'a5ddcae2-40e1-43b5-93a8-4ff545b0d734', '49f4f981-8e37-4db1-81c8-4dc8f9f63c4d',
  '8161a54a-aff2-4b85-81da-68820cca7f88', 'a95cc6fa-2a94-42b1-9134-9734ca042563'];

export function initAnalysisView({ setRegion, setSubregion }) {
  const dashboard = document.querySelector('#dashboard');
  const center = dashboard.querySelector('.center-column');
  const panel = dashboard.querySelector('.metrics-panel');
  const toggle = dashboard.querySelector('#expand-metrics');
  let perspective = 'supply',currentRegion='Global',currentSubregion='Area Total';
  const scopeImage=name=>`<img src="assets/figma-area/${name}.svg" alt="">`;
  const regionPicker=dashboard.querySelector('.region-select');
  regionPicker.insertAdjacentHTML('afterend',`<label class="region-select subregion-select" hidden data-node-id="744:148671"><select id="subregion-select" aria-label="选择二级区域"></select>${scopeImage('imgIconTreeTriangleDown')}</label>`);
  const secondary=dashboard.querySelector('.subregion-select');
  secondary.querySelector('select').addEventListener('change',event=>setSubregion(event.target.value));
  let activeCard = 0;
  let expanded = false;
  const incomeRing=dashboard.querySelector('.income-chart .ring img');
  const originalIncomeRing=incomeRing.getAttribute('src');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'metric-trend regional-contributions');
  toggle.setAttribute('aria-label', '展开指标分析');
  panel.id = 'metrics-panel';
  panel.insertAdjacentHTML('beforeend', `
    <section class="analysis-trend" id="metric-trend" aria-label="主播营收趋势" hidden>
      <div class="trend-toolbar">
        <div class="trend-legend"><span>${image('573e3a67-2ebd-4b17-a795-c84f3b4e59dd')}观测周期</span><span>${image('82516037-1c2c-4fe0-a3ab-6d50ddc02cb9')}对比周期</span></div>
        <button class="compare-regions">横向对比各大区趋势 ${image('84bd2bed-45de-4ea9-98fe-e9dc899b310b')}</button>
      </div>
      <div class="revenue-trend-chart" role="img" aria-label="观测周期营收总体上升至3.2万，对比周期约2万；当前展示演示数据">
        <div class="trend-y-axis"><span>4万</span><span>3万</span><span>2万</span><span>1万</span><span>0</span></div>
        ${image('3b815d66-c693-4858-b68e-1d27ed83eb03', 'trend-grid')}
        ${image('2275778d-c5ae-4d65-9378-295319e166bf', 'trend-bars')}
        ${image('adbdfde1-d963-48bc-acee-338b60386bbf', 'trend-lines')}
        <div class="trend-x-axis">${['00:00','02:00','04:00','06:00','08:00','12:00','14:00','16:00','18:00','20:00','22:00',''].map(t=>`<span>${t}</span>`).join('')}</div>
      </div>
    </section>`);
  center.insertAdjacentHTML('beforeend', `
    <section class="panel contribution-panel" id="regional-contributions" aria-label="区域营收贡献" hidden data-node-id="725:23388">
      <div class="perspective-toggle" role="group" aria-label="贡献视角"><button data-perspective="supply" aria-pressed="true">供给视角</button><button data-perspective="consumer" aria-pressed="false">消费视角</button></div>
      <div class="contribution-table-scroll"><table class="contribution-table"><caption class="sr-only">各运营大区的本地用户营收贡献百分比（演示数据）</caption>
        <colgroup><col class="region-name-col"><col class="sparkline-col">${regions.map(()=>'<col>').join('')}</colgroup>
        <thead><tr><th scope="col">运营大区</th><th scope="col" class="contribution-trend-heading">本地用户营收贡献趋势</th>${regions.map(r=>`<th scope="col">${r}</th>`).join('')}</tr></thead><tbody></tbody>
      </table></div>
    </section>`);
  dashboard.querySelector('.supply-panel').insertAdjacentHTML('beforeend', `
    <section class="function-breakdown" hidden data-node-id="739:107267"><h2>功能场景</h2>
      <div class="function-rows">${['LIVE Goal','Gallery','Fans Club','Cohost','Multiguest','Solo'].map((name,i)=>`<div class="function-row"><span>${name}</span>${image(sceneBars[i])}<strong>${i===0?'$27.8M':i===1?'$18.3M':'$10.8M'}</strong><small>${i===0?'48.8%':i===1?'32.2%':'19.0%'}</small></div>`).join('')}</div>
    </section>`);
  const trend = document.querySelector('#metric-trend');
  const matrix = document.querySelector('#regional-contributions');
  const functions = dashboard.querySelector('.function-breakdown');
  const cards = dashboard.querySelector('#metric-cards');
  const metricPicker = dashboard.querySelector('#metric-picker');
  for (const sideNote of dashboard.querySelectorAll('.left-column .side-note')) {
    const group = document.createElement('div');
    group.className = 'analysis-side-controls';
    sideNote.before(group);
    group.append(sideNote);
    const supply = group.closest('.supply-panel');
    group.insertAdjacentHTML('beforeend', supply
      ? `<button type="button" class="analysis-side-settings" aria-label="供给侧展示配置" aria-haspopup="dialog" aria-controls="supply-config-dialog"><img src="assets/figma-income/aa5a4e65-dfb7-45c2-9fd4-040a06b7de8d.svg" alt=""></button>`
      : `<span class="analysis-side-settings" aria-hidden="true">${image('b71fe694-97d6-4ab0-b236-577d0fda4fd1')}</span>`);
  }
  const contentGroups=dashboard.querySelectorAll('.comparison>div');
  contentGroups[0].querySelector('span').textContent='优质主播';
  contentGroups[1].querySelector('span').textContent='非优质主播';
  contentGroups[0].querySelector('p').innerHTML='<strong>$24.5M</strong><small>33.7%</small>';
  contentGroups[1].querySelector('p').innerHTML='<strong>$29.2M</strong><small>66.3%</small>';
  dashboard.querySelector('.comparison>img').src='assets/figma-home-nov06/2-3029-54193.svg';
  dashboard.querySelectorAll('.function-row>img').forEach((img,i)=>img.src=`assets/figma-left/imgFrame214724${1789+i}.svg`);
  dashboard.querySelectorAll('.guild-stats .stat-row>span:first-child>img').forEach((img,i)=>img.src=`assets/figma-left/imgIndicator${i||''}.svg`);
  dashboard.querySelectorAll('.analysis-side-settings img').forEach(img=>img.src='assets/figma-home-nov06/2-3029-8e9bb.svg');
  initSupplyConfig(dashboard);
  // Preserve the existing metric selector and give the expanded view its compact control.
  const pickerLabel = document.createElement('label');
  pickerLabel.className = 'analysis-metric-settings';
  pickerLabel.innerHTML = image('b71fe694-97d6-4ab0-b236-577d0fda4fd1');
  metricPicker.before(pickerLabel);
  pickerLabel.append(metricPicker);

  function renderContributions() {
    const consumer=perspective==='consumer',regional=currentRegion!=='Global';
    const children=subregionsFor(currentRegion),columns=regional?(children.length?children:['Area Total']):regions;
    const rows=regional?['Area Total',...children]:regions;
    const data=moneyMatrix(getPeriod(),currentRegion,{now:getDataNow()});
    const sparkPath=name=>{
      const points=querySeries('revenue',false,{region:regional?currentRegion:name,subregion:regional?name:'Area Total'});
      const max=points.reduce((value,p)=>Math.max(value,p.value),1)*1.1;
      const end=points.at(-1)?.ratio||1;
      return points.filter((_,i)=>i%Math.max(1,Math.floor(points.length/80))===0||i===points.length-1).map((p,i)=>`${i?'L':'M'}${p.ratio/end*120},${25-p.value/max*23}`).join(' ');
    };
    matrix.classList.toggle('regional-scope',regional);matrix.dataset.region=currentRegion;
    matrix.querySelector('caption').textContent=`${currentRegion} ${consumer?'消费':'供给'}视角营收贡献百分比（模拟数据；大区内 Ops 子矩阵不含外大区流向）`;
    const rowHeading=consumer?'消费大区':'运营大区';
    const trendHeading=consumer?'打赏给本地主播营收趋势':'本地用户营收贡献趋势';
    const columnWidth=Math.max(76,462/columns.length),tableWidth=226+columnWidth*columns.length;
    matrix.querySelector('table').style.width=tableWidth+'px';
    matrix.querySelector('colgroup').innerHTML='<col class="region-name-col"><col class="sparkline-col">'+columns.map(()=>`<col class="matrix-data-col" style="width:${columnWidth}px">`).join('');
    matrix.querySelector('thead tr').innerHTML=`<th scope="col">${rowHeading}</th><th scope="col" class="contribution-trend-heading">${trendHeading}</th>${columns.map(name=>`<th scope="col"><span>${name}</span></th>`).join('')}`;
    matrix.querySelector('tbody').innerHTML=rows.map((name,i)=>`<tr><th scope="row"><button data-analysis-region="${name}"${regional&&name===currentSubregion?' aria-current="true"':''}>${name}</button></th><td class="sparkline-cell"><svg viewBox="0 0 120 25" width="120" height="25" aria-hidden="true"><path d="${sparkPath(name)}" fill="none" stroke="${CHART_COLORS[0]}" stroke-width="1.5"/></svg>${i===0?(regional?'<span class="region-crown">'+scopeImage('imgCrown')+'</span>':image('0434a56e-b989-46fe-b67a-a04042c7086d','region-crown')):''}</td>${columns.map((_,j)=>{
      const row=regional?i-1:i;
      const value=row<0?data.amounts.reduce((sum,_,r)=>sum+(consumer?data.amounts[j][r]:data.amounts[r][j]),0)/(consumer?data.payerTotals.reduce((a,b)=>a+b,0):data.total)*100:matrixPercent(data,row,j,consumer);
      const local=regional?children.length&&i===j+1:i===j;
      return `<td><span class="${local?'local-contribution':''}">${value===null?'—':value.toFixed(1)+'%'}</span></td>`;
    }).join('')}</tr>`).join('');
  }
  document.addEventListener('dashboard:period',renderContributions);
  document.addEventListener('dashboard:mock-refresh',renderContributions);
  document.addEventListener('dashboard:region',event=>{
    currentRegion=event.detail.region;currentSubregion=event.detail.subregion;
    const regional=currentRegion!=='Global';secondary.hidden=!regional;
    dashboard.classList.toggle('has-subregion',regional);
    secondary.querySelector('select').innerHTML=['Area Total',...subregionsFor(currentRegion)].map(name=>`<option>${name}</option>`).join('');
    secondary.querySelector('select').value=currentSubregion;
    renderContributions();
  });
  function decorateCards() {
    if (!cards.children.length) return;
    const metric = Number(dashboard.querySelector('[data-metric][aria-selected=true]').dataset.metric);
    activeCard = Math.min(activeCard, cards.children.length-1);
    [...cards.children].forEach((card,i)=>{
      card.classList.toggle('is-active', i===activeCard);
      card.setAttribute('role', 'button'); card.tabIndex = 0;
      card.setAttribute('aria-pressed', String(i===activeCard));
      const label = card.querySelector('.metric-label');
      if (!label.querySelector('img')) label.insertAdjacentHTML('beforeend', image('3b4cfa8e-4d22-44cc-a2ab-5acb05754c84'));
      if (!card.querySelector('.metric-change')) {
        const changes = metric===0 ? ['23.5%','15.2%','–','23.5%'] : ['12.8%','8.2%','–','6.5%'];
        card.insertAdjacentHTML('beforeend', `<span class="metric-change ${i===1?'negative':i===2?'flat':''}">${i===2?'':image(i===1?'88dea404-2155-4285-8548-677facbc057c':i===3?'2ef66a63-8e1b-4736-b609-66fe83705c69':'466050db-c3df-4881-bef5-0caf3244c168')}${changes[i]}</span>`);
      }
    });
    const selectedLabel = cards.children[activeCard].querySelector('.metric-label').textContent;
    trend.setAttribute('aria-label', selectedLabel+'趋势');
    // Only the Revenue series is supplied by the design; label other demo series explicitly.
    trend.querySelector('.revenue-trend-chart').setAttribute('aria-label', selectedLabel+'观测周期和对比周期趋势（演示数据）');
  }
  // renderMetrics replaces the cards when switching metrics. Decorate each new card once.
  new MutationObserver(records=>{
    if(records.some(r=>r.target===cards)) decorateCards();
  }).observe(cards,{childList:true});
  function setExpanded(value, { updateUrl = false } = {}) {
    const changed=expanded!==value,before=panel.getBoundingClientRect();
    cancelUI(panel,'layout');
    expanded = value;
    incomeRing.src=value?'assets/figma-left/imgRing.svg':originalIncomeRing;
    dashboard.classList.toggle('analysis-view',value);
    dashboard.querySelector('.earth-frame').contentWindow.postMessage({type:'earth:layout',height:(value?503:620)-126},location.origin);
    panel.classList.toggle('expanded',value);
    toggle.setAttribute('aria-expanded',String(value));
    toggle.setAttribute('aria-label',value?'收起指标分析，返回地球视图':'展开指标分析');
    trend.hidden = matrix.hidden = !value;
    dashboard.querySelector('.region-panels').inert = value;
    dashboard.querySelector('.region-summary').inert = value;
    decorateCards();
    if(changed){
      const after=panel.getBoundingClientRect(),scale=dashboard.getBoundingClientRect().width/1440;
      panel.style.transformOrigin='top left';
      animateUI(panel,[{transform:`translate(${(before.left-after.left)/scale}px,${(before.top-after.top)/scale}px) scale(${before.width/after.width},${before.height/after.height})`},{transform:'translate(0,0) scale(1,1)'}],{duration:460,channel:'layout'});
      revealItems(panel.querySelectorAll('.metric-tabs,.metric-card-strip,.analysis-trend'),{delay:120,stagger:65});
      if(value){
        revealItems([matrix],{delay:240});
        revealItems(matrix.querySelectorAll('tbody tr'),{delay:290,stagger:45});
        revealChart(panel,{delay:230,duration:900});
        revealChart(matrix,{delay:330,duration:650});
        countValues(panel.querySelectorAll('.metric-value'),{delay:150,duration:600});
      }
      document.dispatchEvent(new CustomEvent('dashboard:analysis',{detail:{expanded:value}}));
    }
    if(updateUrl) {
      const url = new URL(location.href);
      url.hash = value ? 'analysis' : '';
      history.pushState(null,'',url);
    }
  }
  toggle.addEventListener('click',()=>setExpanded(!expanded,{updateUrl:true}));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&expanded&&!document.querySelector('dialog[open]')) {
      setExpanded(false,{updateUrl:true});toggle.focus();
    }
  });
  addEventListener('popstate',()=>setExpanded(location.hash==='#analysis'));
  matrix.addEventListener('click',event=>{
    const perspectiveButton=event.target.closest('[data-perspective]');
    if(perspectiveButton) {
      perspective=perspectiveButton.dataset.perspective;
      matrix.querySelectorAll('[data-perspective]').forEach(b=>b.setAttribute('aria-pressed',String(b===perspectiveButton)));
      renderContributions();
    }
    const regionButton=event.target.closest('[data-analysis-region]');
    if(regionButton){const name=regionButton.dataset.analysisRegion;if(currentRegion==='Global')setRegion(name);else setSubregion(name);}
  });
  const selectCard = event => {
    const card=event.target.closest('.metric-card');
    if(!card)return;
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    if(event.type==='keydown')event.preventDefault();
    activeCard=[...cards.children].indexOf(card);decorateCards();
  };
  cards.addEventListener('click',selectCard);cards.addEventListener('keydown',selectCard);
  renderContributions();
  setExpanded(location.hash==='#analysis');
}
