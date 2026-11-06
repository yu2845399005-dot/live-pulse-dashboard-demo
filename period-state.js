import {fitAxisTicks} from './axis-layout.mjs?v=20261106-responsive-polish';
import {localDate} from './dashboard-clock.mjs?v=20261106-responsive-polish';
// Shared calendar state for the header, all trend axes and hover readouts.
export const offsetDate=(value,days)=>{const date=new Date(value+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);};
export const dayDistance=(start,end)=>Math.round((Date.parse(end)-Date.parse(start))/86400000);
export let today=localDate();
let followsToday=true;
let period={granularity:'minute',start:today,end:today,compare:offsetDate(today,-7)};
export const getPeriod=()=>({...period});
export const usesDateAxis=(value=period)=>value.granularity==='day'||value.start!==value.end;
export const dateAt=(ratio,comparison=false,value=period)=>offsetDate(comparison?value.compare:value.start,Math.min(dayDistance(value.start,value.end),Math.floor(Math.max(0,Math.min(1,ratio))*(dayDistance(value.start,value.end)+1))));
export function timeAt(ratio,value=period){if(usesDateAxis(value))return dateAt(ratio,false,value).slice(5).replace('-','.');const minute=Math.min(1439,Math.round(Math.max(0,Math.min(1,ratio))*1440));return String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');}
export function axisTicks(value=period,mini=false){
  if(!usesDateAxis(value))return Array.from({length:mini?7:12},(_,i)=>({ratio:i*(mini?4:2)/24,observation:String(i*(mini?4:2)).padStart(2,'0')+':00'}));
  const days=dayDistance(value.start,value.end),count=Math.min(days+1,7);
  return Array.from({length:count},(_,i)=>{const offset=count===1?0:Math.round(i*days/(count-1));return {ratio:days?offset/days:0,observation:offsetDate(value.start,offset).slice(5).replace('-','.'),comparison:offsetDate(value.compare,offset).slice(5).replace('-','.')};});
}
export const axisMarkup=(mini=false,end=1,width=mini?301.755:620)=>{
  end=Math.max(.0001,end);
  let ticks=axisTicks(period,mini).filter(t=>t.ratio<=end);
  if(end<.999&&!usesDateAxis()){
    ticks.push({ratio:end,observation:timeAt(end)});
  }
  ticks=fitAxisTicks(ticks,{end,width,edgeAnchored:mini});
  return ticks.map(t=>`<span class="period-axis-tick" style="--tick-ratio:${t.ratio/end*100}%"><span class="period-axis-observation">${t.observation}</span>${t.comparison?`<span class="period-axis-comparison">${t.comparison}</span>`:''}</span>`).join('');
};
export function periodError(value){
  if(![value.start,value.end,value.compare].every(date=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date))return '请选择完整有效的日期。';
  if(value.end<value.start)return '结束日期不能早于开始日期。';
  if(value.granularity==='day'&&value.start===value.end)return '天粒度下，观测周期必须大于 1 天。';
  return '';
}
export function setPeriod(change){
  const next={...period,...change},error=periodError(next);
  if(!['minute','day'].includes(next.granularity)||error)throw new Error(error||'Invalid granularity');
  followsToday=next.end===localDate();
  period=next;document.dispatchEvent(new CustomEvent('dashboard:period',{detail:getPeriod()}));
}
export function periodForGranularity(granularity,value=period){
  const next={...value,granularity};
  if(granularity==='day'&&next.start===next.end){
    // Expand backwards from each selected date, keeping both periods aligned.
    next.start=offsetDate(next.end,-6);
    next.compare=offsetDate(next.compare,-6);
  }
  return next;
}
export function syncPeriodClock(now=new Date()){
 const current=localDate(now);if(current===today)return false;
 const shift=dayDistance(today,current);today=current;
 if(followsToday)setPeriod({start:offsetDate(period.start,shift),end:offsetDate(period.end,shift),compare:offsetDate(period.compare,shift)});
 return true;
}
export function initPeriodControls(){
  function render(){
    for(const mode of ['minute','day'])document.getElementById(mode+'-mode').setAttribute('aria-pressed',String(period.granularity===mode));
    const format=date=>date.slice(5).replace('-','.');
    const range=(start,end)=>format(start)+(start===end?'':' – '+format(end));
    document.getElementById('date-label').textContent=range(period.start,period.end);
    document.querySelector('#date-control>span:last-child').textContent=range(period.compare,offsetDate(period.compare,dayDistance(period.start,period.end)));
    document.querySelectorAll('.trend-x-axis,.comparison-x,.traffic-chart>.timeline').forEach(axis=>{axis.innerHTML=axisMarkup(axis.classList.contains('timeline'));axis.classList.toggle('period-date-axis',usesDateAxis());axis.setAttribute('aria-label',usesDateAxis()?'日期：上行为观测周期，下行为对比周期':'小时');});
  }
  for(const mode of ['minute','day'])document.getElementById(mode+'-mode').addEventListener('click',()=>setPeriod(periodForGranularity(mode)));
  document.addEventListener('dashboard:period',render);render();
}
