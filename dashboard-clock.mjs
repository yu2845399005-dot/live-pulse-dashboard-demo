// One browser-local clock for labels, default periods and data cutoffs.
export const localDate=(now=new Date())=>`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
export const minuteOfDay=(now=new Date())=>now.getHours()*60+now.getMinutes();
export const dayProgress=(now=new Date())=>(minuteOfDay(now)*60+now.getSeconds())/86400;
export const clockLabel=(now=new Date())=>{
 const offset=-now.getTimezoneOffset(),sign=offset>=0?'+':'−',abs=Math.abs(offset);
 const zone=`GMT${sign}${Math.floor(abs/60)}${abs%60?':'+String(abs%60).padStart(2,'0'):''}`;
 return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} ${localDate(now).slice(5)} (${zone})`;
};
