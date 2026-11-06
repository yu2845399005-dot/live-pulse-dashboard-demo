import {getPeriod} from './period-state.js?v=20261106-responsive-polish';
import {aggregate,metricGroups,metricValue,series,segmentSeries,pointAt,formatValue} from './data-model.mjs?v=20261106-responsive-polish';
let scope={region:'Global',subregion:'Area Total'};
// Every visible board reads the same timestamp, refreshed as one snapshot.
let snapshotNow=new Date();
export const getDataNow=()=>new Date(snapshotNow);
const factsCache=new Map();
export function refreshSnapshot(){
 const previous=Math.floor(snapshotNow.getTime()/60000);snapshotNow=new Date();factsCache.clear();
 if(previous!==Math.floor(snapshotNow.getTime()/60000))seriesCache.clear();
}
for(const type of ['dashboard:period','dashboard:region'])document.addEventListener(type,refreshSnapshot);
document.addEventListener('dashboard:region',event=>{scope={...event.detail};});
export const getScope=()=>({...scope});
export const queryFacts=(comparison=false,override={})=>{
 const period=getPeriod(),queryScope={...scope,now:getDataNow(),...override},key=JSON.stringify([period,queryScope,comparison]);
 if(!factsCache.has(key))factsCache.set(key,aggregate(period,queryScope,comparison));
 return factsCache.get(key);
};
export const currentMetricGroups=()=>metricGroups(getPeriod().granularity==='day');
const seriesCache=new Map();
export function querySeries(key,compare=false,override={}){
 const period=getPeriod(),now=getDataNow();now.setSeconds(0,0);
 const queryScope={...scope,now,...override};
 const cacheKey=JSON.stringify([period,queryScope,key,compare]);
 if(!seriesCache.has(cacheKey)){if(seriesCache.size>96)seriesCache.delete(seriesCache.keys().next().value);seriesCache.set(cacheKey,series(period,key,queryScope,compare));}
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
 const now=getDataNow();now.setSeconds(0,0);
 const queryScope={...scope,now},period=getPeriod(),cacheKey=JSON.stringify(['segments',period,queryScope,group]);
 if(!seriesCache.has(cacheKey)){if(seriesCache.size>96)seriesCache.delete(seriesCache.keys().next().value);seriesCache.set(cacheKey,segmentSeries(period,group,queryScope));}
 return seriesCache.get(cacheKey);
}
