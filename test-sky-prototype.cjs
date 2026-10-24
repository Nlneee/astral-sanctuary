const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function make(difficulty='normal'){const r=new Run('gpt',difficulty,()=>.5);r.stage=2;r.p.invuln=999;r.spawnBoss();const e=r.enemies[0];e.x=900;e.y=800;e.clock=999;e.speed=0;return [r,e];}
function zones(r,t){for(let i=0;i<Math.round(t/.01);i++)r.updateZones(.01);}
function tick(r,t){for(let i=0;i<Math.round(t/.01);i++){r.updateEnemies(.01);r.updateZones(.01);}}
{
 for(const dt of [.01,.025,1/60]){
  const [r,e]=make();let time=0;const locks=[],fires=[],lock=r.skyLockRift.bind(r),resolve=r.resolveSkyHazard.bind(r);
  r.skyLockRift=(b,shot=1,defer=false)=>{lock(b,shot,defer);const h=r.hazards.at(-1);locks.push({shot,t:time,angle:h.angle,x:h.x,y:h.y,px:r.p.x,py:r.p.y});near(h.total,.8);near(h.halfAngle,Math.PI/24);};
  r.resolveSkyHazard=h=>{if(h.type==='rift')fires.push({shot:h.shot,t:time,angle:h.angle,x:h.x,y:h.y});resolve(h);};
  r.castSky(e,'rift',0);assert.equal(locks.length,1);
  for(let i=1;i<=Math.round(3.9/dt);i++){
   time=i*dt;r.p.y=600+time*80;e.x=900+time*10;r.updateZones(dt);
   assert(r.hazards.length+r.skyFields.length<=1,'only one warning or sector at a time');
   const f=r.skyFields.find(f=>f.kind==='rift');if(f){const h=locks[f.shot-1];near(f.angle,h.angle);near(f.x,h.x);near(f.y,h.y);near(f.halfAngle,Math.PI/24);}
   if(time<3.9-1e-6)assert(!e.skySeen?.has('rift'),'completion waits for third sector');
  }
  assert.equal(locks.length,3);assert.equal(fires.length,3);
  for(let i=0;i<3;i++){near(locks[i].t,i*1.3);near(fires[i].t,i*1.3+.8);near(fires[i].angle,locks[i].angle);near(locks[i].angle,Math.atan2(locks[i].py-locks[i].y,locks[i].px-locks[i].x));if(i)assert.notEqual(locks[i].angle,locks[i-1].angle);}
  assert(e.skySeen.has('rift'));assert(!r.skyFields.length&&!r.hazards.length);zones(r,12);assert.equal(fires.length,3,'no fourth shot');
 }
 const intersects=(degrees,distance)=>{
  const [r,e]=make();r.p.x=e.x+500;r.p.y=e.y;r.castSky(e,'rift',0);zones(r,.8);const f=r.skyFields[0];let hits=0;r.hurt=()=>hits++;
  const a=degrees*Math.PI/180;r.p.x=f.x+Math.cos(a)*distance;r.p.y=f.y+Math.sin(a)*distance;r.updateSkyFields(.01);return hits>0;
 };
 for(const [degrees,distance,hit] of [[0,1000,true],[7,1000,true],[8,200,true],[8,2000,false],[9,1000,false],[180,100,false],[0,3210,true],[0,3220,false],[-7,1000,true],[-9,1000,false],[7.5,2000,true]])assert.equal(intersects(degrees,distance),hit,`sector ${degrees}deg / ${distance}`);
 const [r,c]=make();c.combatPhase=3;c.quantumIntroduced=true;c.skySeen=new Set(['shield']);r.castSky(c,'rift',0);c.windup=0;c.clock=0;r.updateSkyEnemy(c,.01);assert.equal(c.skySkillCount,1);assert.equal(r.hazards.length,1);assert.equal(c.skySkillCount,1);zones(r,1.3);assert.equal(c.skySkillCount,1);assert.equal(r.hazards[0].shot,2);r.developerJump(1,1);zones(r,5);assert(!r.hazards.length&&!r.skyFields.length);
}
{
 const [r,e]=make();e.combatPhase=2;const oldX=e.x;r.castSky(e,'pulsewave',0);assert.notEqual(e.x,oldX);assert(Math.hypot(e.x-r.p.x,e.y-r.p.y)<=100.0001);const h=r.hazards[0];near(h.total,.5);zones(r,.49);assert(!r.skyFields.length);zones(r,.01);const f=r.skyFields.find(f=>f.kind==='pulsewave');assert(f);near(f.x,h.x);near(f.y,h.y);
}
{
 const [r,e]=make();e.combatPhase=3;e.quantumIntroduced=true;r.castSky(e,'shield',0);zones(r,.75);near(e.shield,5);const shield=r.skyFields.find(f=>f.kind==='shield');near(shield.life,5);r.updateSkyEnemy(e,.01);assert(e.skySkillCount>=2);assert(r.skyFields.some(f=>f.kind==='oscillator'),'next skill deploys with shield still active');const hp=e.hp;r.hit(e,1e9,false);near(e.hp,hp);r.updateSkyFields(4.99);assert(r.skyFields.includes(shield));r.updateSkyFields(.01);assert(!r.skyFields.includes(shield));near(e.shield,0);
}
for(const difficulty of ['easy','normal','hard']){
 const [r,e]=make(difficulty);e.combatPhase=3;r.p.maxHp=r.p.hp=1000;r.p.invuln=0;r.stats.armor=.999;r.castSky(e,'transfer',0);
 const f=r.skyFields.find(f=>f.kind==='transfer');assert.equal(f.towers.length,4);near(f.life,12);assert.deepEqual(f.towers,[{x:100,y:100},{x:2300,y:100},{x:2300,y:1500},{x:100,y:1500}]);
 const hp=e.hp;r.hit(e,1e12,false);near(e.hp,hp);assert.equal(r.aimNearest(),null);assert.equal(r.nearest(e.x,e.y,null,5000),null);assert(!r.routeTargets(e.x,e.y,5000).includes(e));
 const shot=r.bullet(1,{homing:true,x:e.x-100,y:e.y,life:3});const angle=shot.angle;r.updateBullets(.01);near(shot.angle,angle);assert.equal(r.attack(),false);
 zones(r,11.99);near(r.p.hp,1000);assert(e.quantumCharge>0);zones(r,.01);near(r.p.hp,800);near(e.quantumCharge,0);assert(e.skySeen.has('transfer'));zones(r,1);near(r.p.hp,800);assert.equal(r.aimNearest(),e);
}
{
 const [r,e]=make();e.combatPhase=2;e.hp=e.maxHp/3;e.phaseDone=true;e.phaseAge=5;r.hit(e,1e9,false);assert.equal(e.combatPhase,3);near(e.quantumCharge,12);assert(r.skyFields.some(f=>f.kind==='transfer'));
 zones(r,12);e.skySeen.add('shield');e.skySkillCount=14;e.windup=0;e.clock=0;e.skillCycle=0;r.updateSkyEnemy(e,.01);assert.equal(e.skySkillCount,15);assert(!e.quantumCharge,'no transfer before the fifteenth ordinary skill');zones(r,3.9);e.windup=0;e.clock=0;r.updateSkyEnemy(e,.01);near(e.quantumCharge,12);assert.equal(e.skySkillCount,0);
 r.developerJump(1,1);zones(r,15);assert(!r.skyFields.length&&!r.hazards.length);
}
{
 const [r,e]=make();e.combatPhase=3;r.developerSetCombat('invulnerable',true);r.p.invuln=0;const hp=r.p.hp;r.castSky(e,'transfer',0);zones(r,12);near(r.p.hp,hp);
}
{
 const [r,e]=make(),completed=new Set(),finish=r.skyComplete.bind(r);e.clock=0;r.skyComplete=(b,k)=>{completed.add(k);finish(b,k);};
 for(let phase=1;phase<=3;phase++){r.hit(e,1e12,false);assert(!e.dead);for(let i=0;i<6000&&(!e.phaseDone||e.phaseAge<4);i++){r.updateEnemies(.01);r.updateZones(.01);}assert(e.phaseDone,'phase '+phase);r.hit(e,1e12,false);}
 assert(e.dead);assert.deepEqual([...completed].sort(),['discs','oscillator','pulsewave','rift','shield','thrust','transfer']);assert(!r.skyFields.length&&!r.hazards.length);
}
console.log('PASS three15deg sectors, independent .8s lock/.5s active,3.9s total across three tick rates, frozen aim and exact sector-circle collision; teleport then .5s pulse;5s shield allows next independent attack; four corners/12s immunity and no auto/homing targeting;200 fixed across difficulties/armor; immediate phase3 transfer and15-cast recurrence; cleanup and all phases');
