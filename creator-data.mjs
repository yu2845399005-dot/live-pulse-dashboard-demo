import {localDate} from './dashboard-clock.mjs?v=20261106-responsive-polish';
import {globalRegions,subregionsFor} from './region-scopes.js?v=20261106-responsive-polish';
import {aggregate,isTodayPeriod,dateOffset,series} from './data-model.mjs?v=20261106-responsive-polish';
export const governanceTypes=['不推荐','礼物功能限制','直播封禁','断播'];
const names=['Kierra','Elizabeth','Melissa','Jason234','Leon_Today','MillJack203','Tommy0872','Ken2039','GOC2304jay','Mill2034','Jaxson','Gretchen'];
// 200 simulated creators per region; tags are versioned, ranks derive from facts.
export function queryCreators({period,region='Global',subregion='Area Total',ranking=0,inactiveDays=7,governance='all',sort='revenue',window='all',now=new Date()}){
 const current=isTodayPeriod(period,now);if(ranking!==0&&!current)return [];
 const history={...period,start:dateOffset(localDate(now),-30),end:dateOffset(localDate(now),-1)};
 const weights=Array.from({length:200},(_,i)=>1/Math.pow(i+8,1.25)),den=weights.reduce((a,b)=>a+b,0);
 let rows=globalRegions.flatMap((area,a)=>{
  const revenue=aggregate(period,{region:area,now}).revenue;
  const recent=aggregate(history,{region:area,now}).revenue*30;
  const windowRatio=window==='last10'&&current?series(period,'revenue',{region:area,now}).slice(-10).reduce((sum,p)=>sum+p.value,0)/(revenue||1):1;
  const teams=subregionsFor(area),teamWeightSum=teams.reduce((sum,_,i)=>sum+i+2,0);
  return weights.map((w,i)=>{
   const teamIndex=i%teams.length,teamDen=weights.reduce((sum,value,k)=>sum+(k%teams.length===teamIndex?value:0),0),share=(teamIndex+2)/teamWeightSum*w/teamDen;
   const live=(i+a)%4!==1,governed=(i+a)%7===0;
   const reasons=governed?[governanceTypes[i%4],...(i%9===0?[governanceTypes[(i+1)%4]]:[])]:[];
   const amount=revenue*share*windowRatio;
   const metrics={revenue:amount,watch:Math.round(amount*(12+(i%7))),show:Math.round(amount*(30+i%13)),acu:Math.round(amount*(.08+i%9*.01)),fans:Math.round((220-i)*10000*(1+a*.1))};
   return {id:area+'-'+i,name:names[i%names.length]+(i>=names.length?'_'+(i+1):''),image:i%12,region:area,subregion:subregionsFor(area)[i%subregionsFor(area).length],grade:['Top','Pre-top','Mature','G3'][(Math.floor(i/3)+a)%4],tagDate:dateOffset(period.end,-2),live,governed,reasons,reason:reasons.join('、'),inactiveDays:live?0:1+(i*7+a)%45,recentRevenue:recent*share,value:Math.round(metrics[sort]??amount),metric:sort,duration:current?`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`:'24:00:00',startDate:current?localDate(now):period.start};
  });
 });
 if(region!=='Global')rows=rows.filter(c=>c.region===region);
 if(subregion!=='Area Total')rows=rows.filter(c=>c.subregion===subregion);
 if(ranking===0&&current)rows=rows.filter(c=>c.live);
 if(ranking!==0)rows=rows.filter(c=>c.grade!=='G3');
 if(ranking===1)rows=rows.filter(c=>!c.live&&c.inactiveDays>=inactiveDays);
 if(ranking===2)rows=rows.filter(c=>c.governed&&(governance==='all'||c.reasons.includes(governance)));
 return rows.sort((a,b)=>ranking===0?b.value-a.value:b.recentRevenue-a.recentRevenue);
}
