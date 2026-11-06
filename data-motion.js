// Shared, interruptible motion for dashboard surfaces and data. Live refreshes
// update existing paths; only entering a view draws the chart from left to right.
const preference=matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion=()=>preference.matches;
const motions=new WeakMap(),surfaces=new WeakMap(),paths=new WeakMap();
const ease='cubic-bezier(.22,1,.36,1)';
export function cancelUI(element,channel='surface'){motions.get(element)?.get(channel)?.cancel();}
export function animateUI(element,frames,{duration=360,delay=0,channel='surface',...options}={}){
  if(!element)return;
  let channels=motions.get(element);if(!channels){channels=new Map();motions.set(element,channels);}
  channels.get(channel)?.cancel();
  if(reducedMotion())return;
  const animation=element.animate(frames,{duration,delay,easing:ease,fill:'backwards',...options});
  channels.set(channel,animation);
  animation.finished.then(()=>{if(channels.get(channel)===animation)channels.delete(channel);},()=>{});
  return animation;
}
export function showSurface(element,{restart=false}={}){
  const previous=surfaces.get(element),entering=element.hidden||previous==='closing';
  if(!entering&&!restart)return false;
  surfaces.set(element,'open');element.hidden=false;
  animateUI(element,[{opacity:0,transform:'translateY(6px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:260});
  return true;
}
export function hideSurface(element,{immediate=false}={}){
  if(element.hidden||surfaces.get(element)==='closing')return;
  surfaces.set(element,'closing');
  const finish=()=>{if(surfaces.get(element)==='closing'){element.hidden=true;surfaces.set(element,'closed');}};
  if(immediate||reducedMotion()){motions.get(element)?.get('surface')?.cancel();finish();return;}
  const opacity=getComputedStyle(element).opacity;
  const animation=animateUI(element,[{opacity,transform:'translateY(0)'},{opacity:0,transform:'translateY(3px)'}],{duration:140,easing:'ease-out',fill:'forwards'});
  animation.finished.then(()=>{finish();animation.cancel();},()=>{});
}
export function revealChart(root,{delay=0,duration=850}={}){
  if(!root||reducedMotion())return;
  const groups=[...root.querySelectorAll('[data-chart-series]')];
  const targets=groups.length?groups:[...root.querySelectorAll('path[stroke]')];
  targets.forEach((element,i)=>animateUI(element,[{clipPath:'inset(-8px 100% -8px -8px)',opacity:.25},{clipPath:'inset(-8px -8px -8px -8px)',opacity:1}],{duration,delay:delay+Math.min(i,7)*45,channel:'reveal'}));
}
export function revealItems(elements,{delay=0,stagger=45}={}){
  [...elements].forEach((element,i)=>animateUI(element,[{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:380,delay:delay+Math.min(i,9)*stagger,channel:'content'}));
}
export function countValues(elements,{delay=0,duration=650}={}){
  if(reducedMotion())return;
  [...elements].forEach((element,index)=>{
    const original=element.textContent,match=original.match(/^([^\d-]*)(-?[\d,]+)(\.\d+)?(.*)$/);
    if(!match)return;
    const value=Number((match[2]+(match[3]||'')).replaceAll(',','')),decimals=match[3]?.length-1||0;
    const small=element.querySelector('small'),text=element.firstChild;
    if(!text||text.nodeType!==Node.TEXT_NODE)return;
    const start=performance.now()+delay+Math.min(index,8)*35;
    const render=number=>{
      const [whole,fraction]=number.toFixed(decimals).split('.');
      const leading=match[1]+(match[2].includes(',')?Number(whole).toLocaleString('en-US'):whole);
      text.nodeValue=leading+(small?'':(fraction?'.'+fraction:'')+match[4]);
      if(small)small.textContent=(fraction?'.'+fraction:'')+match[4];
    };
    render(0);
    const tick=now=>{
      if(!element.isConnected)return;
      const progress=Math.max(0,Math.min(1,(now-start)/duration));
      render(value*(1-Math.pow(1-progress,3)));
      if(progress<1)requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  });
}
// Fixed-size sampling makes interpolation stable when new minute buckets arrive.
// domainEnd fills the small axis-free overview with the observed time window.
export function linePath(points,width,height,max,{samples=160,domainEnd=1}={}){
  if(!points.length)return '';
  const end=points.at(-1).ratio,start=points[0].ratio;let cursor=0;
  return Array.from({length:samples},(_,i)=>{
    const ratio=start+(end-start)*i/(samples-1);
    while(cursor<points.length-2&&points[cursor+1].ratio<ratio)cursor++;
    const a=points[cursor],b=points[Math.min(cursor+1,points.length-1)];
    const t=b.ratio===a.ratio?0:(ratio-a.ratio)/(b.ratio-a.ratio);
    const value=a.value+(b.value-a.value)*t;
    return `${i?'L':'M'}${(ratio/Math.max(domainEnd,.0001)*width).toFixed(2)},${(height-value/max*height).toFixed(2)}`;
  }).join(' ');
}
const numberPattern=/-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
export function updatePath(element,d,{duration=460,immediate=false}={}){
  if(!element)return;
  const old=element.getAttribute('d')||'',previous=paths.get(element);
  if(previous?.target===d||old===d)return;
  if(previous)cancelAnimationFrame(previous.frame);
  const from=old.match(numberPattern)?.map(Number),to=d.match(numberPattern)?.map(Number);
  const sameShape=old.replace(numberPattern,'#')===d.replace(numberPattern,'#');
  if(immediate||reducedMotion()||!from||!sameShape||from.length!==to.length){element.setAttribute('d',d);paths.delete(element);return;}
  const state={target:d,frame:0},start=performance.now();paths.set(element,state);
  const tick=now=>{
    if(!element.isConnected){paths.delete(element);return;}
    const progress=Math.min(1,(now-start)/duration),t=1-Math.pow(1-progress,3);let index=0;
    element.setAttribute('d',progress===1?d:d.replace(numberPattern,()=>{const j=index++;return (from[j]+(to[j]-from[j])*t).toFixed(2);}));
    if(progress<1)state.frame=requestAnimationFrame(tick);else paths.delete(element);
  };
  state.frame=requestAnimationFrame(tick);
}
export function syncSeries(svg,series,{key='',reveal=false,delay=0}={}){
  const changed=svg.dataset.motionKey!==key;svg.dataset.motionKey=key;
  const keep=new Set(series.map(row=>String(row.id)));
  for(const group of svg.querySelectorAll(':scope > g[data-chart-series]'))if(!keep.has(group.dataset.chartSeries))group.remove();
  for(const row of series){
    let group=[...svg.children].find(el=>el.dataset.chartSeries===String(row.id));
    if(!group){group=document.createElementNS('http://www.w3.org/2000/svg','g');group.dataset.chartSeries=row.id;group.innerHTML='<path/>';svg.append(group);}
    const path=group.firstElementChild;
    for(const [name,value]of Object.entries({fill:row.fill||'none',stroke:row.stroke||'none','stroke-width':row.width||1.5,'stroke-dasharray':row.dash||'',opacity:row.opacity??1,'stroke-linecap':'round','stroke-linejoin':'round'}))path.setAttribute(name,value);
    updatePath(path,row.d,{immediate:changed});
  }
  if(changed||reveal)revealChart(svg,{delay});
}
