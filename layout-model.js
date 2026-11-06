export const LAYOUT_KEY='tiktok-dashboard-layout:v1';
export const CANVAS_WIDTH=1440;
export const cloneLayout=layout=>layout?JSON.parse(JSON.stringify(layout)):null;
export const snap=value=>Math.round(value/8)*8;
export const intersects=(a,b)=>!a.hidden&&!b.hidden&&a.x<b.x+b.w+8&&a.x+a.w+8>b.x&&a.y<b.y+b.h+8&&a.y+a.h+8>b.y;
export function moveLayout(layout,id,change){
  const next=cloneLayout(layout),moving=next.find(item=>item.id===id);
  Object.assign(moving,change);
  moving.w=Math.max(moving.minW,Math.min(1408,snap(moving.w)));
  moving.h=Math.max(moving.minH,Math.min(1800,snap(moving.h)));
  moving.x=Math.max(16,Math.min(1424-moving.w,snap(moving.x)));
  moving.y=Math.max(88,snap(moving.y));
  // Move collisions down in a stable order, preserving each card's contents.
  const placed=[moving];
  for(const card of next.filter(item=>item!==moving&&!item.hidden).sort((a,b)=>a.y-b.y||a.x-b.x)){
    let collision;
    while((collision=placed.find(other=>intersects(card,other))))card.y=Math.ceil((collision.y+collision.h+8)/8)*8+8;
    placed.push(card);
  }
  return next;
}
export const layoutHeight=layout=>Math.max(900,...(layout||[]).filter(item=>!item.hidden).map(item=>item.y+item.h+16));
export function validLayout(layout,ids){
  return Array.isArray(layout)&&layout.length===ids.length&&new Set(layout.map(item=>item.id)).size===ids.length&&ids.every(id=>layout.some(item=>item.id===id))&&layout.some(item=>!item.hidden)&&layout.every(item=>['x','y','w','h','baseW','baseH','minW','minH'].every(key=>Number.isFinite(item[key]))&&item.x>=0&&item.y>=0&&item.w>=item.minW&&item.h>=item.minH&&item.x+item.w<=1440&&item.y+item.h<=5000&&item.baseW>0&&item.baseH>0);
}
