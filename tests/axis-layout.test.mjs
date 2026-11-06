import test from 'node:test';
import assert from 'node:assert/strict';
import {fitAxisTicks} from '../axis-layout.mjs';

const hourTick=hour=>({ratio:hour/24,observation:String(hour).padStart(2,'0')+':00'});
test('17:41 does not collide with the preceding 16:00 on a mini chart',()=>{
 const last={ratio:1061/1440,observation:'17:41'};
 const actual=fitAxisTicks([0,4,8,12,16].map(hourTick).concat(last),{end:last.ratio,width:302,edgeAnchored:true});
 assert.equal(actual.at(-1),last);
 assert.ok(!actual.some(tick=>tick.observation==='16:00'));
 assert.ok(actual.some(tick=>tick.observation==='12:00'));
});
test('a wider comparison chart retains the nearby 16:00 tick',()=>{
 const last={ratio:1061/1440,observation:'17:41'};
 const actual=fitAxisTicks([0,4,8,12,16].map(hourTick).concat(last),{end:last.ratio,width:1192});
 assert.ok(actual.some(tick=>tick.observation==='16:00'));
 assert.equal(actual.at(-1),last);
});
test('observation and comparison date labels retain a readable gap',()=>{
 const ticks=Array.from({length:7},(_,i)=>({ratio:i/6,observation:`11.${10+i}`,comparison:`10.${10+i}`}));
 const actual=fitAxisTicks(ticks,{width:200,edgeAnchored:true});
 assert.ok(actual.length<ticks.length);
 assert.equal(actual.at(-1),ticks.at(-1));
 assert.equal(actual[0],ticks[0]);
});
test('empty and single-point series remain valid',()=>{
 assert.deepEqual(fitAxisTicks([]),[]);
 const first=[hourTick(0)];assert.deepEqual(fitAxisTicks(first),first);
});
