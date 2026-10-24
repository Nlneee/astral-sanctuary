const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js'),D=require('./survivor-data.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function setup(distance=170,phase=1){const r=new Run('gpt','normal',()=>.99);r.p.invuln=999;r.spawnBoss();const e=r.enemies[0];e.x=700;e.y=800;e.speed=0;e.clock=0;e.combatPhase=phase;r.p.x=e.x+distance;r.p.y=e.y;return [r,e];}
function tick(r,t){for(let i=0;i<Math.round(t*1000);i++){r.updateEnemies(.001);r.updateZones(.001);}}
// Close claw has a real warning, fixed direction, narrow range, and normal mitigation.
{const [r,e]=setup();r.updateEnemies(.001);const h=r.hazards[0];assert.equal(h.type,'claw');assert.equal(h.skill,1);near(h.r,230);near(h.spread*2,Math.PI*.6);r.p.invuln=0;r.stats.armor=.5;const hp=r.p.hp;r.updateZones(.599);assert.equal(r.p.hp,hp);assert(!e.phaseDone);r.updateZones(.001);near(hp-r.p.hp,e.damage*1.15*.5);assert(e.phaseDone);assert.equal(e.bearSkillCount,1);}
for(const offset of [{x:-100,y:0},{x:0,y:190},{x:270,y:0}]){const [r,e]=setup();r.updateEnemies(.001);r.p.x=e.x+offset.x;r.p.y=e.y+offset.y;r.p.invuln=0;const hp=r.p.hp;r.updateZones(.6);assert.equal(r.p.hp,hp,'claw back/side/outside safe');}
// Midrange pursues rather than charging or clawing outside their trigger distances.
{const [r,e]=setup(350);e.speed=89.1;r.updateEnemies(.1);assert(e.x>700);assert.equal(r.hazards.length,0);}
// Far rush snapshots direction, travels its telegraphed length, and does not steer.
{const [r,e]=setup(650);r.updateEnemies(.001);const h=r.hazards[0];assert.equal(h.type,'charge');near(h.length,750);r.p.y+=200;r.updateZones(.699);assert(!e.chargeTime);r.updateZones(.001);assert(e.chargeTime>0);near(e.chargeY,0);e.clock=999;const x=e.x;tick(r,h.duration+.001);near(e.y,800);near(e.x-x,750);assert(e.phaseDone);assert.equal(e.bearSkillCount,1);assert.equal(e.chargeTime,0);}
// Swept collision catches a player crossed between movement steps; side stepping is safe.
for(const y of [800,900]){const [r,e]=setup(600);r.updateEnemies(.001);r.updateZones(.7);r.p.x=e.x+200;r.p.y=y;r.p.invuln=0;r.p.hp=1000;const hp=r.p.hp;e.clock=999;r.updateEnemies(.6);assert.equal(r.p.hp<hp,y===800);if(y===800)near(hp-r.p.hp,e.damage*1.25);}
// Complete eight actual skills across all three phases. Teleport+claw count once;
// barrage's four volleys do not count toward the next eight.
{const [r,e]=setup();
 for(let i=0;i<8;i++){
  if(i===2||i===5){e.phaseAge=99;e.phaseDone=true;r.hit(e,1e12,false);assert.equal(e.combatPhase,i===2?2:3);assert.equal(e.bearSkillCount,i);}
  const skill=i<2?'swipe':i<5?'warp':'missile';r.castBear(e,skill);e.clock=999;tick(r,skill==='swipe'?.61:skill==='warp'?1.72:2.01);assert.equal(e.bearSkillCount,i+1);assert.equal(e.bearBarragePending,i===7);
 }
 e.clock=0;r.updateEnemies(.001);assert(r.hazards.some(h=>h.type==='barrage'));assert(!e.bearBarragePending);e.clock=999;tick(r,1.2);assert.equal(r.hostile.length,128);assert.equal(e.bearSkillCount,8);
 r.hostile=[];for(let i=0;i<8;i++){r.castBear(e,'swipe');e.clock=999;tick(r,.61);}assert.equal(e.bearSkillCount,16);assert(e.bearBarragePending);
}
// Interrupted old-phase skills are cleaned up, preserve the existing count, and
// cannot leave a stale charge active; pending barrage survives phase transition.
{const [r,e]=setup();e.bearSkillCount=7;e.phaseDone=true;e.phaseAge=99;r.castBear(e,'rush');r.hit(e,1e12,false);assert.equal(e.combatPhase,2);assert.equal(e.bearSkillCount,7);assert(!r.hazards.length);r.updateEnemies(.351);assert(r.hazards.some(h=>h.type==='warp'));e.clock=999;tick(r,1.71);assert.equal(e.bearSkillCount,8);assert(e.bearBarragePending);e.phaseAge=99;r.hit(e,1e12,false);assert.equal(e.combatPhase,3);assert(e.bearBarragePending);r.updateEnemies(.351);assert(r.hazards.some(h=>h.type==='barrage'));}
{const r=new Run();r.spawnBoss();near(r.enemies[0].speed,89.1);for(let p=1;p<=3;p++){const e=r.enemies[0];e.combatPhase=p;near(r.bossCooldown(e,4.8),4.8*(.55-.05*(p-1))+.5);}const r2=new Run();r2.stage=1;r2.spawnBoss();near(r2.enemies[0].speed,49.5);near(r2.bossCooldown(r2.enemies[0],4.8),4.8*.55);}
// Existing phase-two and phase-three mechanics still repeat with the basics.
for(const phase of [2,3]){const [r,e]=setup(170,phase);e.phaseDone=true;const skills=[];const original=r.castBear;r.castBear=function(e,s,...args){skills.push(s);return original.call(this,e,s,...args);};tick(r,20);assert(skills.includes('swipe'));assert(skills.includes('warp'));if(phase===3)assert(skills.includes('missile'));}
assert.equal(D.bearBoss.barrageEvery,8);
console.log('PASS close-cone timing/mitigation/safe zones; fixed-direction telegraphed rush and swept collision; speed/interval; eight complete skills across three phases, interruption and repeated barrage; old skills remain active');
