const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function make(phase=2){const r=new Run('gpt','normal',()=>.5);r.stage=3;r.p.invuln=999;r.spawnClock=r.fireClock=Infinity;r.spawnBoss();const e=r.enemies[0];if(phase===3)r.hubInitBoss(e,'spirit');else e.combatPhase=phase;r.hubPhase(e);e.x=800;e.y=800;e.speed=0;e.clock=999;r.p.x=1200;r.p.y=800;return [r,e];}
function zones(r,t){for(let i=0;i<Math.round(t/.01);i++)r.updateZones(.01);}
function landing(r,e){r.hubCast(e,'rush');zones(r,1.17);const h=r.hazards.find(h=>h.type==='rushSlash');assert(h);return h;}
{
 const [r,e]=make(),h=landing(r,e);near(e.x,1420);near(h.x,e.x);near(h.y,e.y);near(h.angle,Math.PI);near(h.total,.6);near(h.r,560);near(h.spread*2,Math.PI*8/9);assert(!e.hubSeen.has('rush'));
 const damage=[];r.hurt=x=>damage.push(x);r.p.x=h.x+Math.cos(h.angle)*500;r.p.y=h.y+Math.sin(h.angle)*500;
 zones(r,.59);assert(!damage.length);zones(r,.01);assert.equal(damage.length,1);near(damage[0],e.damage*1.6);assert(r.hubFields.some(f=>f.kind==='rushSlash'));assert(!e.hubSeen.has('rush'));
 zones(r,.27);assert(!e.hubSeen.has('rush'));zones(r,.01);assert(e.hubSeen.has('rush'));assert(!r.hazards.length&&!r.hubFields.length);assert.equal(damage.length,1,'one damage event rather than persistent slash ticks');
}
for(const [angle,radius,hit] of [[0,500,true],[79,500,true],[-79,500,true],[90,500,false],[180,100,false],[0,580,false]]){
 const [r,e]=make(),h=landing(r,e);const locked=h.angle,x=h.x,y=h.y,a=locked+angle*Math.PI/180;r.p.x=x+Math.cos(a)*radius;r.p.y=y+Math.sin(a)*radius;let hits=0;r.hurt=()=>hits++;
 zones(r,.6);assert.equal(hits>0,hit,`angle ${angle}, radius ${radius}`);near(h.angle,locked);near(h.x,x);near(h.y,y);
}
for(const dt of [.01,.02,1/60]){
 const [r,e]=make(3),events=[];const resolve=r.resolveHubHazard.bind(r);r.resolveHubHazard=h=>{if(['rush','rushSlash'].includes(h.type))events.push({type:h.type,shot:h.shot});resolve(h);};r.hubCast(e,'rush');
 for(let i=0;i<Math.ceil(3.5/dt);i++)r.updateZones(dt);
 assert.deepEqual(events,[{type:'rush',shot:1},{type:'rushSlash',shot:1},{type:'rush',shot:2},{type:'rushSlash',shot:2}]);assert(e.hubSeen.has('rush'));assert(!r.hazards.length&&!r.hubFields.length);
}
{
 const [r,e]=make();r.hubCast(e,'rush');let extra=0;const cast=r.hubCast.bind(r);r.hubCast=(...a)=>{extra++;cast(...a);};e.clock=0;
 for(let i=0;i<204;i++){r.updateEnemies(.01);r.updateZones(.01);assert(!e.hubSeen.has('rush'));}assert.equal(extra,0,'no other cast while the rush/slash combo is running');
}
for(const moment of ['warning','active']){
 const [r,e]=make();landing(r,e);if(moment==='active')zones(r,.6);let damage=0;r.hurt=()=>damage++;r.kill(e);zones(r,3);assert.equal(damage,0);assert(!r.hubFields.length&&!r.hazards.length);
 const [r2,b]=make();landing(r2,b);if(moment==='active')zones(r2,.6);r2.developerJump(1,1);zones(r2,3);assert(!r2.hubFields.length&&!r2.hazards.length);
 const [r3,c]=make();landing(r3,c);if(moment==='active')zones(r3,.6);c.combatPhase=3;r3.hubPhase(c);zones(r3,3);assert(!r3.hubFields.length&&!r3.hazards.length);
}
{
 const [r,e]=make();const h=landing(r,e),t=h.t;r.pause();r.step(.05);near(h.t,t);r.resume();r.step(.05);assert(h.t<t);
}
console.log('PASS final-boss landing slash:560 radius/160deg/.6s fixed warning,front hit/back and sides safe,1.6x single damage,.28s animation; two complete rush/slash pairs, no interleaved skills,phase completion after final slash,kill/jump/phase cleanup and pause');
