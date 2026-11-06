import {globalRegions} from './region-scopes.js';
// Stable fictional identities: no rotating URL or rank-based photo assignment.
const photoIds=['SEA&CCA-6','SEA&CCA-4','SEA&CCA-3','METAP-2','SEA&CCA-2','EU+-10','EU+-9','AMS&ANZ-3','SEA&CCA-12','NEA-1','METAP-1','EU+-7'];
const photos=['assets/figma-nov02/new-39-2189-4af96.png','assets/figma-nov02/new-39-2189-37604.png','assets/figma/1-664-9cb7a.png',...Array.from({length:8},(_,i)=>`assets/avatars/creator-${String(i+4).padStart(2,'0')}.jpg`),'assets/figma-nov02/new-39-2189-0fc8f.png'];
const photoMap=new Map(photoIds.map((id,i)=>[id,photos[i]]));
// Other mock creators receive individual vector portraits. They require no network.
export function creatorAvatar({id}){
 if(photoMap.has(id))return photoMap.get(id);
 let seed=2166136261;for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 const split=id.lastIndexOf('-'),ordinal=globalRegions.indexOf(id.slice(0,split))*200+Number(id.slice(split+1));
 const hue=(ordinal*137.508)%360,skin=['#F6C9AB','#E5AE88','#C98D69','#A16A4E','#744A36'][(seed>>>3)%5],hair=['#24212A','#392B27','#76513C','#C58B48','#534141'][(seed>>>6)%5];
 const faceWidth=13+(seed>>>12)%5+(ordinal%5)*.25,eyeY=28+(seed>>>15)%3,shirt=`hsl(${(hue+80)%360} 40% 44%)`,longHair=(seed>>>20)%2;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 64 64"><title>Mock creator ${id.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</title><rect width="64" height="64" fill="hsl(${hue} 32% 29%)"/><circle cx="${10+(seed%12)}" cy="10" r="28" fill="hsl(${hue} 36% 38%)"/><path d="M7 64Q9 43 32 43T57 64" fill="${shirt}"/>${longHair?`<rect x="${31-faceWidth-3}" y="14" width="${faceWidth*2+8}" height="37" rx="13" fill="${hair}"/>`:''}<path d="M26 39h12v11q-6 6-12 0" fill="${skin}"/><ellipse cx="32" cy="29" rx="${faceWidth}" ry="18" fill="${skin}"/><path d="M${31-faceWidth} 28Q11 5 33 8Q55 9 ${33+faceWidth} 28L43 18Q28 26 20 18Z" fill="${hair}"/><path d="M23 ${eyeY-3}h5M37 ${eyeY-3}h5" stroke="${hair}" stroke-width="1.4" stroke-linecap="round"/><circle cx="26" cy="${eyeY}" r="1.35" fill="#24212A"/><circle cx="39" cy="${eyeY}" r="1.35" fill="#24212A"/><path d="M32 30l-1 5h3" fill="none" stroke="#895A48" stroke-width=".8"/><path d="M27 39q5 4 10 0" fill="none" stroke="#8C4B4E" stroke-width="1.5" stroke-linecap="round"/></svg>`;
 return 'data:image/svg+xml,'+encodeURIComponent(svg);
}
