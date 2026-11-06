import {localDate,minuteOfDay,dayProgress} from './dashboard-clock.mjs';
import {globalRegions,subregionsFor,regionRevenueRatio} from './region-scopes.js';
// Deterministic, local-only mock facts. No business data or backend API is used.
export const REFERENCE_REVENUE=56930640;
const dayMs=86400000,sum=a=>a.reduce((x,y)=>x+y,0);
export const dateOffset=(s,n)=>new Date(Date.parse(s+'T00:00:00Z')+n*dayMs).toISOString().slice(0,10);
const seed=s=>[...s].reduce((v,c)=>(v*31+c.charCodeAt(0))>>>0,7);
const noise=s=>{let n=seed(s);n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296;};
const dailyFactor=date=>.9+.2*noise(date);
export const isTodayPeriod=(period,now=new Date())=>period.start===localDate(now)&&period.end===period.start;
export function dailyFacts(date,{region='Global',subregion='Area Total',now=new Date()}={}){
 if(region==='Global'){const all=globalRegions.map(region=>dailyFacts(date,{region,now}));return Object.fromEntries(Object.keys(all[0]).map(key=>[key,sum(all.map(f=>f[key]))]));}
 if(subregion==='Area Total'){const all=subregionsFor(region).map(subregion=>dailyFacts(date,{region,subregion,now}));return Object.fromEntries(Object.keys(all[0]).map(key=>[key,sum(all.map(f=>f[key]))]));}
 const today=localDate(now),fraction=date===today?dayProgress(now):date>today?0:1;
 const scale=regionRevenueRatio(region,subregion),factor=dailyFactor(date)*(.8+.4*noise(date+'|'+region+'|'+subregion+'|daily'));
 // Reference snapshot is calibrated to noon; today's facts grow with elapsed local day.
 const revenue=REFERENCE_REVENUE*2*factor*fraction*scale;
 const dau=102e6*factor*scale,paidUV=dau*(.046+.004*noise(date+region))*fraction;
 const cashUV=paidUV*.79;
 // Mock finance coefficient is maintained by day; adjusted amount uses that day's coefficient.
 const financeRatio=.96+.02*noise(date+'finance'),paidRaw=paidUV*16.7/financeRatio,paidAmount=paidRaw*financeRatio;
 const watchUV=dau*.68*fraction,watchMinutes=watchUV*42;
 return {revenue,paidAmount,paidRaw,paidUV,cashUV,dau,watchUV,watchMinutes,
 cardShows:420e6*factor*scale*fraction,shortVV:1080e6*factor*scale*fraction,
 liveUV:128600*factor*scale*fraction,g4UV:24600*factor*scale*fraction,
 pgcUV:18200*factor*scale*fraction,fansUV:6800*factor*scale*fraction};
}
export function metricValue(f,key){
 const divide=(a,b)=>b?a/b:0;
 return ({paidRate:()=>divide(f.paidUV,f.dau)*100,cashRate:()=>divide(f.cashUV,f.dau)*100,
 arpu:()=>divide(f.paidAmount,f.paidUV),load:()=>divide(f.cardShows,f.cardShows+f.shortVV)*100,
 watchRate:()=>divide(f.watchUV,f.dau)*100,watchAverage:()=>divide(f.watchMinutes,f.watchUV)})[key]?.()??f[key]??0;
}
export function aggregate(period,scope={},comparison=false){
 const days=Math.round((Date.parse(period.end)-Date.parse(period.start))/dayMs)+1;
 const start=comparison?period.compare:period.start,result={};
 for(let i=0;i<days;i++){
  const date=dateOffset(start,i);let now=scope.now||new Date();
  // Compare today's elapsed window with the same elapsed window on the aligned day.
  const f=dailyFacts(date,{...scope,now});
  if(comparison&&dateOffset(period.start,i)===localDate(now)){
   const frac=dayProgress(now);
   for(const key of Object.keys(f))if(key!=='dau')f[key]*=frac;
  }
  for(const [key,value] of Object.entries(f))result[key]=(result[key]||0)+value/days;
 }
 return result;
}
export const metricGroups=day=>[
 [{key:'revenue',label:'主播营收',unit:'money'},{key:'paidAmount',label:'主动付费金额',unit:'money'},
 {key:day?'paidRate':'paidUV',label:day?'主动付费渗透':'主动付费UV',unit:day?'percent':'count'},
 {key:day?'cashRate':'cashUV',label:day?'现金付费渗透':'现金付费UV',unit:day?'percent':'count'},
 ...(day?[{key:'arpu',label:'主动付费ARPU',unit:'money'}]:[])],
 [{key:'load',label:'Load',unit:'percent'},{key:'watchRate',label:'看播渗透率',unit:'percent'},
 {key:'watchAverage',label:'人均看播时长',unit:'minutes'}],
 [{key:'liveUV',label:'开播UV',unit:'count'},{key:'g4UV',label:'G4+开播UV',unit:'count'},
 {key:'pgcUV',label:'PGC开播UV',unit:'count'},{key:'fansUV',label:'10M+粉丝开播UV',unit:'count'}]];
export function formatValue(value,unit='count'){
 if(unit==='percent')return value.toFixed(1)+'%';
 const scale=value>=1e6?1e6:value>=1e3?1e3:1,suffix=scale===1e6?'M':scale===1e3?'K':'';
 return (unit==='money'?'$':'')+(value/scale).toFixed(scale===1?2:2)+suffix+(unit==='minutes'?' min':'');
}
export function breakdown(total,key,scopeKey='Global'){
 const definitions={income:[['Top','Pre-top','Mature','G4+'],[43,27.2,19.1,10.7]],content:[['优质主播','非优质主播'],[48.7,51.3]],guild:[['高价值公会','普通公会','非公会'],[48.8,32.2,19]],function:[['LIVE Goal','Gallery','Fans Club','Cohost','Multiguest','Solo'],[31,23,18,12,9,7]],gift:[['G9+金主','G9−非金主'],[62.2,37.8]],traffic:[['推荐页','消息','关注','其他'],[62.2,17.8,12,8]]};
 const [labels,weights]=definitions[key],w=weights.map((v,i)=>v*(.94+.12*noise(scopeKey+key+i))),den=sum(w);
 return labels.map((label,i)=>({label,value:total*w[i]/den,percent:w[i]/den*100}));
}
// Row = recipient/creator region; column = payer region. One money matrix, two denominators.
export function moneyMatrix(period,region='Global',scope={}){
 const labels=region==='Global'?globalRegions:subregionsFor(region);
 const total=aggregate(period,{...scope,region,subregion:'Area Total'}).revenue;
 const weights=labels.map(name=>{const amount=aggregate(period,{...scope,region:region==='Global'?name:region,subregion:region==='Global'?'Area Total':name}).revenue;return total?amount/total:1/labels.length;});
 let within=total,payerTotal=total;
 if(region!=='Global'){
  const global=moneyMatrix(period,'Global',scope),index=globalRegions.indexOf(region);
  within=global.amounts[index][index];payerTotal=global.payerTotals[index];
 }
 const amounts=labels.map((name,i)=>{
  const w=labels.map((other,j)=>(i===j?8:1+noise(name+other))*weights[j]),den=sum(w);
  return w.map(v=>within*weights[i]*v/den);
 });
 if(region!=='Global'&&within>0){
  // Iterative proportional fitting preserves BOTH Ops recipient and payer margins.
  for(let iteration=0;iteration<80;iteration++){
   for(let j=0;j<labels.length;j++){const scale=within*weights[j]/sum(amounts.map(r=>r[j]));for(let i=0;i<labels.length;i++)amounts[i][j]*=scale;}
   for(let i=0;i<labels.length;i++){const scale=within*weights[i]/sum(amounts[i]);for(let j=0;j<labels.length;j++)amounts[i][j]*=scale;}
  }
 }
 const recipientTotals=weights.map(w=>total*w);
 const payerTotals=region==='Global'?labels.map((_,j)=>sum(amounts.map(row=>row[j]))):weights.map(w=>payerTotal*w);
 return {labels,amounts,total,recipientTotals,payerTotals};
}
export function matrixPercent(matrix,row,col,consumer=false){
 const a=matrix.amounts,den=consumer?matrix.payerTotals[row]:matrix.recipientTotals[row];
 return den?(consumer?a[col][row]:a[row][col])/den*100:0;
}
// Each scope/metric has a stable, smooth activity profile. Scaling a common path is forbidden.
export function activityWeight(minute,identity){
 const t=minute/1440,phase=noise(identity+'phase')*Math.PI*2;
 const cycles=1+noise(identity+'cycles')*2,center=noise(identity+'peak'),width=.06+.1*noise(identity+'width');
 const bump=Math.exp(-Math.pow((t-center)/width,2));
 return .22+.65*Math.pow(1+Math.sin(t*Math.PI*2-phase),2)+.65*bump+.3*(1+Math.cos(t*Math.PI*2*cycles+phase));
}
const dependencies={paidRate:['paidUV','dau'],cashRate:['cashUV','dau'],arpu:['paidAmount','paidUV'],load:['cardShows','shortVV'],watchRate:['watchUV','dau'],watchAverage:['watchMinutes','watchUV']};
const profileKey=key=>['paidUV','cashUV','paidAmount','paidRaw'].includes(key)?'payment':key;
function atoms(scope){
 const regions=scope.region&&scope.region!=='Global'?[scope.region]:globalRegions;
 return regions.flatMap(region=>(scope.subregion&&scope.subregion!=='Area Total'?[scope.subregion]:subregionsFor(region)).map(subregion=>({...scope,region,subregion})));
}
// Monetary minute buckets sum to the card; global = regions = Ops team sums at every minute.
export function series(period,key,scope={},comparison=false){
 const days=Math.round((Date.parse(period.end)-Date.parse(period.start))/dayMs)+1,start=comparison?period.compare:period.start;
 const points=[],now=scope.now||new Date(),keys=dependencies[key]||[key];
 for(let d=0;d<days;d++){
  const date=dateOffset(start,d),alignedToday=dateOffset(period.start,d)===localDate(now);
  if(date>localDate(now))continue;
  if(period.granularity==='day'){
   const facts=dailyFacts(date,{...scope,now});
   if(comparison&&alignedToday)for(const k of Object.keys(facts))if(k!=='dau')facts[k]*=dayProgress(now);
   points.push({ratio:days===1?0:d/(days-1),date,value:metricValue(facts,key)});continue;
  }
  const count=alignedToday?minuteOfDay(now)+1:1440;
  const values=Array.from({length:count},()=>Object.fromEntries(keys.map(k=>[k,0])));
  for(const atom of atoms(scope)){
   const facts=dailyFacts(date,atom);
   if(comparison&&alignedToday)for(const k of Object.keys(facts))if(k!=='dau')facts[k]*=dayProgress(now);
   const weights=new Map();
   for(const field of keys){
    if(field==='dau'){for(const v of values)v[field]+=facts[field];continue;}
    const family=profileKey(field);
    if(!weights.has(family)){
     const w=Array.from({length:count},(_,m)=>activityWeight(m,[date,atom.region,atom.subregion,family].join('|')));
     weights.set(family,{w,den:sum(w)});
    }
    const {w,den}=weights.get(family);
    for(let m=0;m<count;m++)values[m][field]+=facts[field]*w[m]/den;
   }
  }
  for(let m=0;m<count;m++)points.push({ratio:(d*1440+m)/(days*1440),date,minute:m,value:metricValue(values[m],key)});
 }
 return points;
}
// Different category profiles, fitted to both daily category totals and each minute's total.
export function segmentSeries(period,group,scope={}){
 const base=series(period,'revenue',scope),rows=breakdown(aggregate(period,scope).revenue,group,(scope.region||'Global')+(scope.subregion||'Area Total'));
 if(!base.length)return rows.map(r=>({...r,points:[]}));
 const total=sum(base.map(p=>p.value));
 const amounts=rows.map(r=>base.map(p=>p.value*r.percent/100*activityWeight(p.minute??(p.ratio*1440),`${r.label}|${p.date}|${scope.region}|${scope.subregion}`)));
 for(let n=0;n<30;n++){
  for(let i=0;i<rows.length;i++){const ratio=total*rows[i].percent/100/(sum(amounts[i])||1);for(let j=0;j<base.length;j++)amounts[i][j]*=ratio;}
  for(let j=0;j<base.length;j++){const ratio=base[j].value/(sum(amounts.map(a=>a[j]))||1);for(let i=0;i<rows.length;i++)amounts[i][j]*=ratio;}
 }
 return rows.map((r,i)=>({...r,points:base.map((p,j)=>({...p,value:amounts[i][j]}))}));
}
export const pointAt=(points,ratio)=>points.reduce((best,p)=>Math.abs(p.ratio-ratio)<Math.abs(best.ratio-ratio)?p:best,points[0]||{value:0});
