import {CHART_COLORS} from './chart-palette.mjs?v=20261106-responsive-polish';
import {getDataNow,querySeries} from './data-context.js?v=20261106-responsive-polish';
import {moneyMatrix,matrixPercent} from './data-model.mjs?v=20261106-responsive-polish';
import {getPeriod} from './period-state.js?v=20261106-responsive-polish';
import { subregionsFor, globalRegions as regions } from './region-scopes.js?v=20261106-responsive-polish';
// Figma 725:23088. Expand the existing dashboard without resetting its state.
import { initSupplyConfig } from './supply-config.js?v=20261106-responsive-polish';
import {animateUI,cancelUI,reducedMotion} from './data-motion.js?v=20261106-responsive-polish';
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
  let expanded;
  let transitionSequence = 0;
  const toggleIcon = toggle.querySelector('img');
  const cardStrip = panel.querySelector('.metric-card-strip');
  const incomeRing=dashboard.querySelector('.income-chart .ring img');
  const originalIncomeRing=incomeRing.getAttribute('src');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'metric-trend regional-contributions');
  toggle.setAttribute('aria-label', '展开指标分析');
  panel.id = 'metrics-panel';
  panel.insertAdjacentHTML('afterbegin','<img class="analysis-panel-notch" src="assets/figma-analysis-nov06/c2c01.svg" alt="">');
  panel.insertAdjacentHTML('beforeend', `
    <section class="analysis-trend" id="metric-trend" aria-label="主播营收趋势" hidden>
      <div class="trend-toolbar">
        <div class="trend-legend"><span>${image('573e3a67-2ebd-4b17-a795-c84f3b4e59dd')}观测周期</span><span>${image('82516037-1c2c-4fe0-a3ab-6d50ddc02cb9')}对比周期</span></div>
        <button class="compare-regions">横向对比各大区趋势 <img src="assets/figma-analysis-nov06/c8d71.svg" alt=""></button>
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

  let contributionSignature='';
  function renderContributions() {
    const signature=JSON.stringify([perspective,currentRegion,currentSubregion,getPeriod(),Math.floor(getDataNow().getTime()/60000)]);
    if(signature===contributionSignature)return;
    contributionSignature=signature;
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
    matrix.querySelector('tbody').innerHTML=rows.map((name,i)=>{const path=sparkPath(name);return `<tr><th scope="row"><button data-analysis-region="${name}"${regional&&name===currentSubregion?' aria-current="true"':''}>${name}</button></th><td class="sparkline-cell"><svg viewBox="0 0 120 25" width="120" height="24" aria-hidden="true"><defs><linearGradient id="spark-fill-${i}" x2="0" y2="1"><stop stop-color="#2388ff" stop-opacity=".65"/><stop offset="1" stop-color="#2388ff" stop-opacity="0"/></linearGradient></defs><path d="${path} L120,25 L0,25 Z" fill="url(#spark-fill-${i})"/><path d="${path}" fill="none" stroke="#2388ff" stroke-width="1.5"/></svg>${i===0?'<img class="region-crown" src="assets/figma-analysis-nov06/77428.svg" alt="">':''}</td>${columns.map((_,j)=>{
      const row=regional?i-1:i;
      const value=row<0?data.amounts.reduce((sum,_,r)=>sum+(consumer?data.amounts[j][r]:data.amounts[r][j]),0)/(consumer?data.payerTotals.reduce((a,b)=>a+b,0):data.total)*100:matrixPercent(data,row,j,consumer);
      const local=regional?children.length&&i===j+1:i===j;
      return `<td><span class="${local?'local-contribution':''}">${value===null?'—':value.toFixed(1)+'%'}</span></td>`;
    }).join('')}</tr>`;}).join('');
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
      if (!label.querySelector('img')) label.insertAdjacentHTML('beforeend', '<img src="assets/figma-analysis-nov06/d3f01.svg" alt="">');
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
  function setExpanded(value, { updateUrl = false, animate = true } = {}) {
    if (expanded === value) return;
    const hadView = expanded !== undefined;
    const motion = hadView && animate && !reducedMotion() && !dashboard.classList.contains('has-custom-layout');
    const sequence = ++transitionSequence;
    const before = motion && panel.getBoundingClientRect();
    const beforeToggle = motion && toggle.getBoundingClientRect();
    const beforePadding = motion && getComputedStyle(panel).paddingTop;
    const beforeIcon = motion && getComputedStyle(toggleIcon).transform;
    const beforeStrip = motion && stripSize();
    const trendStart = motion && contentFrame(trend);
    const matrixStart = motion && contentFrame(matrix);
    const wasReversing = panel.classList.contains('is-view-transitioning');
    for (const element of [panel, toggle, toggleIcon, cardStrip, trend, matrix]) cancelUI(element, 'layout');

    expanded = value;
    const leaving = motion && !value;
    incomeRing.src = value ? 'assets/figma-left/imgRing.svg' : originalIncomeRing;
    dashboard.classList.toggle('analysis-view', value);
    dashboard.querySelector('.earth-frame').contentWindow.postMessage({type:'earth:layout',height:(value?503:620)-126},location.origin);
    panel.classList.toggle('expanded', value);
    toggle.setAttribute('aria-expanded', String(value));
    toggle.setAttribute('aria-label', value ? '收起指标分析，返回地球视图' : '展开指标分析');
    trend.hidden = matrix.hidden = !value && !leaving;
    trend.inert = matrix.inert = !value;
    matrix.classList.toggle('is-leaving', leaving);
    dashboard.querySelector('.region-panels').inert = value;
    dashboard.querySelector('.region-summary').inert = value;
    decorateCards();

    if (motion) {
      const after = panel.getBoundingClientRect();
      const afterToggle = toggle.getBoundingClientRect();
      const scale = dashboard.getBoundingClientRect().width / 1440;
      const style = getComputedStyle(panel);
      const distance = Math.abs(before.top - after.top) / scale;
      const duration = (value ? 520 : 420) * (wasReversing ? Math.max(.55, Math.min(1, Math.sqrt(distance / 496))) : 1);
      const timing = { duration, easing: 'cubic-bezier(.24,.78,.26,1)', channel: 'layout' };
      const geometry = animateUI(panel, [{
        top: `${parseFloat(style.top) + (before.top - after.top) / scale}px`,
        left: `${parseFloat(style.left) + (before.left - after.left) / scale}px`,
        width: `${before.width / scale}px`,
        height: `${before.height / scale}px`,
        paddingTop: beforePadding
      }, { top: style.top, left: style.left, width: style.width, height: style.height, paddingTop: style.paddingTop }], timing);
      const toggleX = (beforeToggle.x + beforeToggle.width / 2 - afterToggle.x - afterToggle.width / 2) / scale;
      const toggleY = (beforeToggle.y + beforeToggle.height / 2 - afterToggle.y - afterToggle.height / 2) / scale;
      animateUI(toggle, [{transform:`translate(${toggleX}px,${toggleY}px)`},{transform:'none'}], timing);
      animateUI(toggleIcon, [{transform:beforeIcon},{transform:getComputedStyle(toggleIcon).transform}], timing);
      animateUI(cardStrip, [beforeStrip, stripSize()], timing);
      panel.classList.add('is-view-transitioning');

      if (value) {
        animateUI(trend, [trendStart, {opacity:1,transform:'none'}], {...timing, delay:wasReversing?0:75, duration:duration*.7});
        animateUI(matrix, [matrixStart, {opacity:1,transform:'none'}], {...timing, delay:wasReversing?0:105, duration:duration*.75});
      } else {
        fadeOut(trend, trendStart, timing, 5);
        fadeOut(matrix, matrixStart, timing, 10);
      }
      const finish = () => {
        if (sequence !== transitionSequence) return;
        panel.classList.remove('is-view-transitioning');
        matrix.classList.remove('is-leaving');
        if (!expanded) trend.hidden = matrix.hidden = true;
      };
      geometry.finished.then(finish, finish);
    } else {
      panel.classList.remove('is-view-transitioning');
    }
    if (hadView || value) document.dispatchEvent(new CustomEvent('dashboard:analysis',{detail:{expanded:value}}));
    if (updateUrl) {
      const url = new URL(location.href);
      url.hash = value ? 'analysis' : '';
      history.pushState(null,'',url);
    }
  }

  function stripSize() {
    const { height, marginTop } = getComputedStyle(cardStrip);
    return { height, marginTop };
  }

  function contentFrame(element) {
    if (element.hidden) return { opacity: 0, transform: 'translateY(10px)' };
    const { opacity, transform } = getComputedStyle(element);
    return { opacity, transform };
  }

  function fadeOut(element, from, timing, offset) {
    const animation = animateUI(element, [from, {opacity:0,transform:`translateY(${offset}px)`}], {
      ...timing, duration: timing.duration * .48, fill: 'forwards'
    });
    // Keep the content in place until the fade has finished. A reversed transition
    // cancels this animation and starts the entrance at its current opacity.
    animation.finished.then(() => {
      if (element.inert) element.hidden = true;
      animation.cancel();
    }, () => {});
  }

  toggle.addEventListener('click',()=>setExpanded(!expanded,{updateUrl:true}));
  document.addEventListener('dashboard:open-analysis',()=>setExpanded(true,{updateUrl:true,animate:false}));
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
