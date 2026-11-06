// Reserve room for the final observation time instead of painting two labels together.
export function fitAxisTicks(ticks,{end=1,width=302,edgeAnchored=false,gap=12}={}){
  if(ticks.length<2)return ticks;
  const bounds=(tick,index)=>{
    const labelWidth=Math.max(tick.observation.length,tick.comparison?.length||0)*7.2;
    const x=tick.ratio/end*width;
    const left=edgeAnchored&&index===0?x:edgeAnchored&&index===ticks.length-1?x-labelWidth:x-labelWidth/2;
    return {left,right:left+labelWidth};
  };
  const last=ticks.length-1,lastBounds=bounds(ticks[last],last),selected=[];
  let right=-Infinity;
  ticks.forEach((tick,index)=>{
    if(index===last)return;
    const box=bounds(tick,index);
    if(box.left>=right+gap&&box.right+gap<=lastBounds.left){selected.push(tick);right=box.right;}
  });
  return [...selected,ticks[last]];
}
