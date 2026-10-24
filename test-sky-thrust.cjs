const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js'),{Session}=require('./boss-showcase.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function make(){const r=new Run('gpt','normal',()=>.99);r.stage=2;r.p.invuln=999;r.spawnBoss();const e=r.enemies[0];e.x=800;e.y=700;e.speed=99;e.clock=999;r.p.x=1200;r.p.y=700;return [r,e];}
function tick(r,t,dt=.001){for(let i=0;i<Math.round(t/dt);i++){r.updateEnemies(dt);r.updateZones(dt);}}
{const [r,e]=make();r.castSky(e,'thrust',0);const h=r.hazards[0],x=e.x,y=e.y;r.p.y+=150;tick(r,.4);near(e.x,x);near(e.y,y);near(h.angle,Math.atan2(r.p.y-e.y,r.p.x-e.x));assert(h.targetY>r.p.y);
 r.p.x+=100;tick(r,.399);assert.equal(e.skyThrust.stage,'lock');near(e.x,x);tick(r,.001);assert.equal(e.skyThrust.stage,'travel');near(e.x,x);
 tick(r,.15);assert(e.x>x);r.p.x+=120;r.p.y+=90;tick(r,.149);assert.equal(e.skyThrust.stage,'travel');tick(r,.001);assert.equal(e.skyThrust.stage,'slash');near(Math.hypot(e.x-r.p.x,e.y-r.p.y),80);
 const slash=r.hazards.find(h=>h.type==='thrustSlash');near(slash.total,.8);near(slash.r,240);assert(r.inSector(slash,r.p),'landing guarantees cone covers current player');const sx=e.x,sy=e.y;
 r.p.x+=25;r.p.invuln=0;const hp=r.p.hp;tick(r,.799);near(e.x,sx);near(e.y,sy);near(r.p.hp,hp);assert(!e.skySeen?.has('thrust'));tick(r,.001);near(hp-r.p.hp,e.damage*1.35);assert(!e.skyThrust);assert(e.skySeen.has('thrust'));assert(!e.phaseDone,'phase1 still needs rift');assert(r.effects.some(f=>f.type==='clawSweep'));
}
// The initial cast follows freely moving targets; the same timings hold at normal frame rates.
for(const dt of [.01,.025,1/60]){const [r,e]=make();r.castSky(e,'thrust',0);for(let i=0;i<Math.round(.8/dt);i++){r.p.x+=20*dt;r.p.y+=60*dt;r.updateEnemies(dt);r.updateZones(dt);}assert.equal(e.skyThrust.stage,'travel');const s=e.skyThrust;for(let i=0;i<Math.round(.3/dt);i++){r.p.x+=100*dt;r.p.y-=50*dt;r.updateEnemies(dt);r.updateZones(dt);}assert.equal(s.stage,'slash');assert(Math.hypot(e.x-r.p.x,e.y-r.p.y)<=80.0001);for(let i=0;i<Math.round(.8/dt);i++){r.updateEnemies(dt);r.updateZones(dt);}assert(!e.skyThrust);assert(e.skySeen.has('thrust'));}
// World edges and corners still keep the player inside the initial slash footprint.
for(const [x,y] of [[25,25],[2375,25],[2375,1575],[25,1575],[25,800]]){const [r,e]=make();r.p.x=x;r.p.y=y;r.castSky(e,'thrust',0);tick(r,1.1);const h=r.hazards.find(h=>h.type==='thrustSlash');assert(h);assert(r.inSector(h,r.p));assert(e.x>=e.r&&e.y>=e.r&&e.x<=r.world.w-e.r&&e.y<=r.world.h-e.r);}
// Moving outside the small cone can avoid it; slash orientation tracks within it.
{const [r,e]=make();r.castSky(e,'thrust',0);tick(r,1.1);r.p.x=e.x+350;r.p.y=e.y;r.p.invuln=0;const hp=r.p.hp;tick(r,.8);near(r.p.hp,hp);}
// Shield only grants protection, has no intrinsic damage/attack, and allows an independent next skill.
{const [r,e]=make();e.combatPhase=3;e.quantumIntroduced=true;e.skySeen=new Set(['transfer','oscillator']);r.castSky(e,'shield',0);tick(r,.75);near(e.shield,5);assert.equal(r.hazards.length,0);assert.deepEqual(r.skyFields.map(f=>f.kind),['shield']);assert(!e.skyThrust);
 const hp=e.hp;r.hit(e,1e12,false);near(e.hp,hp);r.updateEnemies(.001);assert(r.hazards.some(h=>h.type==='rift'));assert(e.shield>4.99);r.updateZones(.001);tick(r,4.999);near(e.shield,0);assert(e.skySeen.has('shield'));
}
{const s=new Session(2,'shield');const seen=new Set();for(let i=0;i<1200&&!s.finished;i++){s.step(1/60,{},false);for(const h of s.run.hazards)seen.add(h.type);}assert(s.finished);assert(!s.followup);assert.deepEqual([...seen],['shield']);}
// Completion gates and cancellation cannot leave a delayed slash behind.
{const [r,e]=make();e.phaseAge=99;e.skySeen=new Set(['rift']);e.phaseDone=false;r.castSky(e,'thrust',0);r.hit(e,1e12,false);assert.equal(e.combatPhase,1);tick(r,1.9);assert(e.phaseDone);r.hit(e,1e12,false);assert.equal(e.combatPhase,2);assert(!e.skyThrust);assert(!r.hazards.length);}
for(const t of [.4,.95,1.4]){const [r,e]=make();r.castSky(e,'thrust',0);tick(r,t);r.kill(e);assert(!e.skyThrust);assert(!r.hazards.length);tick(r,4);assert(!r.hazards.length);}
{const [r,e]=make();r.castSky(e,'thrust',0);tick(r,.95);r.developerJump(0,1);assert(!r.enemies.includes(e));tick(r,4);assert(!r.hazards.length);}
{const [r,e]=make();e.combatPhase=3;e.quantumIntroduced=true;r.castSky(e,'thrust',0);tick(r,1.9);assert.equal(e.skySkillCount,1);}
console.log('PASS .8s stationary live lock/.3s live-target behind thrust/.8s stationary aimed slash; range at edges, safe escape, frame rates,5s pure shield plus independent followup, phase gate, cast count and cleanup');
