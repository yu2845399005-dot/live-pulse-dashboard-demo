// Shared by on-page charts and hover previews; region-comparison dialog is independent.
export const CHART_COLORS=Object.freeze(['#168BFF','#0870DB','#1656B6','#284391','#413677','#4B2D63','#48284F','#40263F','#342532','#29252A']);
export function chartColors(rows){
 const order=rows.map((r,i)=>({i,value:r.value??r.percent??0})).sort((a,b)=>b.value-a.value||a.i-b.i);
 const result=[];order.forEach(({i},rank)=>{result[i]=CHART_COLORS[Math.min(rank,CHART_COLORS.length-1)];});return result;
}
export const chartDot=color=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="6" height="6"><circle cx="3" cy="3" r="3" fill="${color}"/></svg>`);
