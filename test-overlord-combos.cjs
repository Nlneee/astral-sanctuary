const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function make(){const r=new Run('gpt','normal',()=>.5);r.stage=1;r.spawnBoss();r.p.x=1400;r.p.y=800;r.p.invuln=999;const e=r.enemies[0];e.x=1050;e.y=800;e.clock=999;e.speed=0;return [r,e];}
function tick(r,t){for(let i=0;i<Math.round(t/.01);i++)r.updateZones(.01);}
{
 const [r,e]=make();r.p.maxHp=r.p.hp=10000;r.castLabBoss(e,'barrier',0);tick(r,.79);assert(!r.hazards.some(h=>h.type==='fixedLaser'));tick(r,.01);
 assert(r.labFields.some(f=>f.kind==='barrier'));
 for(let shot=1;shot<=5;shot++){
  const h=r.hazards.find(h=>h.type==='fixedLaser');assert(h,'lock begins immediately after previous beam');assert.equal(h.shot,shot);near(h.t,.5);near(h.total,.5);
  const origin={x:h.x,y:h.y,angle:h.angle};r.p.y+=80;e.x-=10;
  tick(r,.49);assert(!r.labFields.some(f=>f.kind==='fixedLaser'));tick(r,.01);
  const f=r.labFields.find(f=>f.kind==='fixedLaser');assert(f);near(f.life,.5);near(f.x,origin.x);near(f.y,origin.y);near(f.angle,origin.angle);
  r.p.invuln=0;r.p.x=f.x+Math.cos(f.angle)*200;r.p.y=f.y+Math.sin(f.angle)*200;const hp=r.p.hp;tick(r,.01);assert(r.p.hp<hp,'beam deals damage');r.p.invuln=999;
  r.p.x=1350;r.p.y=shot%2?940:660;tick(r,.48);assert(r.labFields.includes(f));tick(r,.01);assert(!r.labFields.includes(f));
  if(shot<5)near(r.hazards.find(h=>h.type==='fixedLaser').targetY,r.p.y);
 }
 assert(!r.hazards.some(h=>h.type==='fixedLaser'));assert(!r.labFields.some(f=>f.kind==='barrier'));assert(e.labSeen.has('barrier'));tick(r,1);assert(!r.hazards.some(h=>h.type==='fixedLaser'),'no sixth shot');
}
{
 const [r,e]=make();r.castLabBoss(e,'laser',.2);tick(r,.9);const f=r.labFields.find(f=>f.kind==='laser');assert(f);tick(r,.01);
 const shots=r.hostile.filter(b=>b.kind==='sCurve');assert.equal(shots.length,3);for(let i=0;i<3;i++)near(shots[i].angle-f.angles[i],Math.PI/3);
 const b=shots[0],c=Math.cos(b.angle),s=Math.sin(b.angle),offset=()=>-(b.x-b.originX)*s+(b.y-b.originY)*c;
 r.updateBullets(.2);assert(offset()>0);r.updateBullets(.5);assert(offset()<0,'S bullet must reverse its lateral deviation');near((b.x-b.originX)*c+(b.y-b.originY)*s,b.age*b.speed);
 tick(r,1);assert(r.hostile.filter(b=>b.kind==='sCurve').length>3);assert(r.hostile.length<=260);
 r.labFields=[];r.hostile=[{...b,age:0,x:b.originX,y:b.originY,life:4,angle:0,vx:210,vy:0}];const projectile=r.hostile[0];r.p.x=projectile.originX+42;r.p.y=projectile.originY+46*Math.sin(1.4);r.p.invuln=0;const hp=r.p.hp;r.updateBullets(.2);assert(r.p.hp<hp,'curve position must be used for collision');
}
for(const phase of ['warning','beam']){
 const [r,e]=make();r.castLabBoss(e,'barrier',0);tick(r,.8);if(phase==='beam')tick(r,.5);e.hp=0;r.kill(e);assert(!r.labFields.length);assert(!r.hazards.length);tick(r,6);assert(!r.hazards.length&&!r.labFields.length);
}
{
 const [r,e]=make();r.castLabBoss(e,'laser',0);tick(r,1.2);assert(r.hostile.some(b=>b.kind==='sCurve'));e.hp=0;r.kill(e);assert(!r.hostile.length);
 const [next,boss]=make();next.castLabBoss(boss,'barrier',0);tick(next,.8);next.developerJump(2,1);tick(next,6);assert(!next.labFields.length&&!next.hazards.length&&!next.hostile.length);
}
console.log('PASS wall immediately chains 5 independent .5s locks + .5s fixed beams within 5s; frozen origins/angles, damage, no sixth shot; three rotating gap salvos, actual S trajectories/collision, cadence/cap; source death and jump cleanup');
