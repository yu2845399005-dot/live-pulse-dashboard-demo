// LIVE Pulse 使用手册 §6.1：Ops team 优先，Others 为低优先项。
export const regionScopes={
 'AMS&ANZ':['US+','BR','LATAM','AU+'],
 'EU+':['DACH','ESSP','FRFR','GBEN','ITIT','NDEU','NLDU','RORO','BKSS','PLPO','EU Others'],
 METAP:['MENA','TR','METAP Others'],NEA:['JP','KR','TW'],
 'SEA&CCA':['ID','MY','PH','CCA','SG','TH','VN']
};
export const subregionsFor=region=>regionScopes[region]||[];
export const defaultSubregion=()=> 'Area Total';
export const globalRegions=Object.keys(regionScopes);
// Mock revenue shares are a partition of global revenue, NOT matrix diagonal shares.
export const revenueShares=[.145,.205,.165,.185,.30];
export function regionRevenueRatio(region,team='Area Total'){
 const i=globalRegions.indexOf(region);if(i<0)return 1;
 const children=subregionsFor(region),j=children.indexOf(team);
 const weights=children.map((_,k)=>k+2),sum=weights.reduce((a,b)=>a+b,0);
 return revenueShares[i]*(j<0?1:weights[j]/sum);
}
export const scopedRevenue=(total,region,team)=>Math.round(total*regionRevenueRatio(region,team));
