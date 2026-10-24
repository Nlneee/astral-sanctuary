const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js'),spirit=require('./survivor-archon-spirit.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function make(){const r=new Run('gpt','normal',()=>.5);r.stage=3;r.spawnBoss();r.spawnClock=r.fireClock=Infinity;r.p.invuln=999;const e=r.enemies[0];e.x=1200;e.y=800;e.speed=0;e.clock=Infinity;r.p.x=1700;r.p.y=800;return [r,e];}
function zones(r,t){for(let i=0;i<Math.round(t/.01);i++){r.time+=.01;r.updateZones(.01);}}
function steps(r,t,input={}){for(let i=0;i<Math.round(t/.01);i++)r.step(.01,input);}
{
 const [r,e]=make(),blasts=[];const resolve=r.resolveHubHazard.bind(r);r.resolveHubHazard=h=>{if(h.type==='orbital')blasts.push({time:r.time,x:h.x,y:h.y,shot:h.shot});resolve(h);};
 r.hubCast(e,'orbital');near(e.windup,0);near(e.clock,.15);assert.equal(r.hazards.length,1);let expected={x:r.p.x,y:r.p.y};
 for(let shot=1;shot<=6;shot++){
  const h=r.hazards.find(h=>h.type==='orbital');assert.equal(h.shot,shot);near(h.total,.5);near(h.x,expected.x);near(h.y,expected.y);
  r.p.x+=31;r.p.y-=17;zones(r,.49);assert.equal(blasts.length,shot-1);near(h.x,expected.x);near(h.y,expected.y);
  zones(r,.01);assert.equal(blasts.length,shot);near(blasts.at(-1).time,shot*.5);near(blasts.at(-1).x,expected.x);expected={x:r.p.x,y:r.p.y};
 }
 assert(!r.hazards.length);assert(!e.hubSeen.has('orbital'));zones(r,.35);assert(e.hubSeen.has('orbital'));assert(!r.hubFields.length);
}
{
 const [r,e]=make();e.combatPhase=3;r.hubPhase(e);e.hubSeen.add('aegis');r.hubCast(e,'orbital');steps(r,.16);
 assert(r.hazards.some(h=>h.type==='sweep'),'AI casts next skill while first orbital shot is still locking');assert(r.hazards.some(h=>h.type==='orbital'));assert(!e.hubSeen.has('orbital'));
}
{
 const [r,e]=make();r.hubCast(e,'aegis');zones(r,.54);near(e.shield,0);zones(r,.01);near(e.shield,5);e.clock=Infinity;
 const hp=e.hp;r.hit(e,1e12,false);near(e.hp,hp);let v=r.hubPullVelocity(.01);near(v.x,-150);near(v.y,0);
 // No input is gently pulled; moving away and strafing still work.
 const x=r.p.x;steps(r,.2);near(r.p.x,x-30);
 const away=r.p.x;steps(r,.2,{x:1});near(r.p.x,away+(r.stats.speed-150)*.2);
 const side=r.p.y;steps(r,.1,{y:1});assert(r.p.y>side+18);
 const f=r.hubFields.find(f=>f.kind==='aegis');zones(r,2.5);near(f.max-f.life,3);near(e.shield,2);near(r.hubPullVelocity(.01).x,0);near(r.hubPullVelocity(.01).y,0);near(f.pulseX,e.x);near(f.pulseY,e.y);
 const center=f.pulseX;e.x+=100;let hits=0,damage=0;r.hurt=n=>{hits++;damage=n;};r.p.x=center+300;r.p.y=f.pulseY;
 zones(r,.85);assert.equal(hits,0);zones(r,.15);assert.equal(hits,1);near(damage,e.damage*1.5);near(f.pulseX,center);
 r.hit(e,1e12,false);near(e.hp,hp);zones(r,.99);assert.equal(hits,1);assert(e.shield>0);assert(!e.hubSeen.has('aegis'));
 zones(r,.01);near(e.shield,0);assert(e.hubSeen.has('aegis'));r.hit(e,1,false);assert(e.hp<hp);
}
{
 const [r,e]=make();r.hubCast(e,'aegis');zones(r,.55);e.clock=Infinity;
 // Pull cannot cross an obstacle or force the player out of the arena.
 r.hubField('wall',e,10,{segments:[{x:1500,y:600,x2:1500,y2:1000}]});r.p.x=1528;steps(r,.5);assert(r.p.x>=1500+r.p.r);
 r.p.x=25;e.x=0;steps(r,.05);assert(r.p.x>=25);
 r.pause();const life=r.hubFields.find(f=>f.kind==='aegis').life,pos=r.p.x;r.step(.05,{x:1});near(r.p.x,pos);near(r.hubFields.find(f=>f.kind==='aegis').life,life);r.resume();
 r.hubCast(e,'orbital');r.developerJump(1,1);assert(!r.hubFields.length&&!r.hazards.length);near(r.hubPullVelocity(.05).x,0);
}
{
 const [r,e]=make();r.hubCast(e,'orbital');r.hubCast(e,'aegis');zones(r,.55);r.hubAscend(e);assert(!r.hazards.length&&!r.hubFields.length);near(r.hubPullVelocity(.05).x,0);
 const body=r.enemies[0];r.hubCast(body,'aegis');zones(r,.55);near(body.shield,3);assert(!r.hubFields[0].pull&&!r.hubFields[0].pulse);r.hubCleanup(body);r.hubCast(body,'orbital');assert.equal(r.hazards.length,6);near(r.hazards[0].total,1);assert(!r.hazards[0].sequence);near(spirit.config.skills.aegis.duration,3);
}
console.log('PASS six distinct live locks, .5s per explosion, next AI skill before first blast, 5s immunity, additive/resistible 3s pull, 2s expanding single-hit pulse, wall/bounds/pause/transition cleanup and unchanged spirit');
