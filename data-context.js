import {getPeriod} from './period-state.js';
import {aggregate,metricGroups,metricValue,series,segmentSeries,pointAt,formatValue} from './data-model.mjs';
let scope={region:'Global',subregion:'Area Total'};
// Every visible board reads the same timestamp, refreshed as one snapshot.
let snapshotNow=new Date();
export const getDataNow=()=>new Date(snapshotNow);
export function refreshSnapshot(){snapshotNow=new Date();seriesCache.clear();}
for(const type of ['dashboard:period','dashboard:region'])document.addEventListener(type,refreshSnapshot);
document.addEventListener('dashboard:region',event=>{scope={...event.detail};});
export const getScope=()=>({...scope});
export const queryFacts=(comparison=false,override={})=>aggregate(getPeriod(),{...scope,now:getDataNow(),...override},comparison);
export const currentMetricGroups=()=>metricGroups(getPeriod().granularity==='day');
const seriesCache=new Map();
export function querySeries(key,compare=false,override={}){
 const period=getPeriod(),queryScope={...scope,now:getDataNow(),...override};
 const cacheKey=JSON.stringify([period,queryScope,key,compare,Math.floor(Date.now()/60000)]);
 if(!seriesCache.has(cacheKey)){if(seriesCache.size>40)seriesCache.delete(seriesCache.keys().next().value);seriesCache.set(cacheKey,series(period,key,queryScope,compare));}
 return seriesCache.get(cacheKey);
}
export function metricReadout(key,unit,ratio,override={}){
 return [false,true].map(compare=>{const points=querySeries(key,compare,override);return !points.length||ratio>(points.at(-1).ratio+.002)?'—':formatValue(pointAt(points,ratio).value,unit);});
}
export function metricCards(group){
 return currentMetricGroups()[group].map(def=>{
  const value=metricValue(queryFacts(),def.key),previous=metricValue(queryFacts(true),def.key);
  return {...def,value,previous,change:previous?(Math.abs(value/previous-1)<.0005?0:(value/previous-1)*100):null,formatted:formatValue(value,def.unit)};
 });
}

export function querySegments(group){
 const period=getPeriod(),cacheKey=JSON.stringify(['segments',period,scope,group,Math.floor(Date.now()/60000)]);
 if(!seriesCache.has(cacheKey)){if(seriesCache.size>40)seriesCache.delete(seriesCache.keys().next().value);seriesCache.set(cacheKey,segmentSeries(period,group,scope));}
 return seriesCache.get(cacheKey);
}
