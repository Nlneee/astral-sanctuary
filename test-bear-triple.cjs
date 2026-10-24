const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js'),{Session}=require('./boss-showcase.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function setup(phase=3){const r=new Run('gpt','normal',()=>.99);r.p.invuln=999;r.spawnBoss();const e=r.enemies[0];e.x=600;e.y=600;e.speed=0;e.clock=999;e.combatPhase=phase;r.p.x=1000;r.p.y=600;return [r,e];}
function tick(r,t){for(let i=0;i<Math.ceil(t/.005);i++){r.updateEnemies(.005);r.updateZones(.005);}}
// Phase gating: triple rush cannot be cast in the first two phases.
for(const p of [1,2]){const [r,e]=setup(p);assert.equal(r.castBear(e,'tripleRush'),false);assert.equal(r.hazards.length,0);assert(!e.bearRushCombo);}
// Independent targets and directions; all three velocities are exactly400 units/s.
{const [r,e]=setup();e.bearSkillCount=7;e.bearPhaseThreeSeen=new Set(['missile']);r.castBear(e,'tripleRush');const angles=[];
 for(let index=1;index<=3;index++){
  const h=r.hazards.find(h=>h.combo===index);assert(h);assert.equal(h.comboTotal,3);near(h.total,index===1?.45:.25);near(h.speed,400);near(h.angle,Math.atan2(r.p.y-e.y,r.p.x-e.x));angles.push(h.angle);
  assert(!e.phaseDone);assert.equal(e.bearSkillCount,7);assert(!e.bearBarragePending);
  const x=e.x,y=e.y;r.updateZones(h.total-.001);assert(!e.chargeTime);r.updateZones(.001);assert(e.chargeTime>0);near(Math.hypot(e.chargeX,e.chargeY),400);
  r.updateEnemies(.1);near(Math.hypot(e.x-x,e.y-y),40);
  // Move the target while the dash is active. It never steers until the next lock.
  const vx=e.chargeX,vy=e.chargeY;r.p.x=e.x+(index===1?0:-300);r.p.y=e.y+(index===1?300:0);r.updateEnemies(.1);near(e.chargeX,vx);near(e.chargeY,vy);
  r.updateEnemies(e.chargeTime+.0001);assert(!e.chargeTime);
  if(index<3){assert(e.bearRushCombo);assert.equal(e.bearRushCombo.index,index+1);assert.equal(e.bearSkillCount,7);}
 }
 assert(angles.some(a=>Math.abs(a-angles[0])>1));assert(!e.bearRushCombo);assert(e.phaseDone);assert.equal(e.bearSkillCount,8);assert(e.bearBarragePending);
 const cooldown=r.bossCooldown(e,4.8);near(e.clock,cooldown);r.updateEnemies(cooldown-.001);assert(!r.hazards.some(h=>h.type==='barrage'));r.updateEnemies(.002);assert(r.hazards.some(h=>h.type==='barrage'));
}
// Collision retains mitigation; stepping sideways avoids the rush.
for(const off of [0,100]){const [r,e]=setup();r.castBear(e,'tripleRush');r.updateZones(.45);r.p.x=e.x+150;r.p.y=e.y+off;r.p.invuln=0;r.p.hp=1000;r.stats.armor=.5;r.updateEnemies(.7);near(1000-r.p.hp,off===0?e.damage*1.25*.5:0);}
// Third phase requires both the old bombardment and the entire new combo.
{const [r,e]=setup();e.phaseAge=99;r.castBear(e,'missile');e.clock=999;tick(r,2.01);assert(!e.phaseDone);r.hit(e,1e12,false);assert.equal(e.hp,1);assert(!e.dead);
 e.clock=0;r.updateEnemies(.001);assert(e.bearRushCombo);r.hit(e,1e12,false);assert(!e.dead);
 for(let i=0;i<2000&&!e.phaseDone;i++){r.updateEnemies(.005);r.updateZones(.005);}assert(e.phaseDone);assert(!e.bearRushCombo);r.hit(e,1e12,false);assert(e.dead);assert(!r.hazards.some(h=>h.source===e.id));}
// Death and developer jump leave no chain or future collision behind.
{const [r,e]=setup();r.castBear(e,'tripleRush');r.updateZones(.45);r.kill(e);assert(!e.bearRushCombo);assert(!e.bearRushActive);assert.equal(e.chargeTime,0);assert.equal(r.hazards.length,0);const n=e.bearSkillCount;tick(r,5);assert.equal(e.bearSkillCount,n);}
{const [r,e]=setup();r.castBear(e,'tripleRush');r.developerJump(1,1);assert(!r.enemies.includes(e));assert.equal(r.hazards.length,0);tick(r,5);assert.equal(r.hazards.length,0);}
{const s=new Session(0,'tripleRush');let count=0;const original=s.run.warnBeast;s.run.warnBeast=function(...args){if(args[1]==='charge')count++;return original.apply(this,args);};for(let i=0;i<1800&&!s.finished;i++)s.step(1/60,{},true);assert(s.finished);assert.equal(count+1,3);assert.equal(s.boss.bearSkillCount,1);}
console.log('PASS phase3-only triple rush:3 independent locks, fixed400 velocity, short warnings, swept collisions, one skill count, delayed barrage, completion protection, death/jump cleanup and real demonstration completion');
