const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function make(phase=3){const r=new Run('gpt','normal',()=>.5);r.stage=1;r.spawnBoss();r.p.x=1400;r.p.y=800;r.p.invuln=999;const e=r.enemies[0];Object.assign(e,{x:1050,y:800,speed:0,combatPhase:phase,clock:999});return [r,e];}
function zones(r,t){for(let i=0;i<Math.round(t/.01);i++)r.updateZones(.01);}
function shots(r,t,dt=.01){for(let i=0;i<Math.round(t/dt);i++)r.updateBullets(dt);}
function ai(r,t,dt=.001){for(let i=0;i<Math.round(t/dt);i++){r.updateEnemies(dt);r.updateZones(dt);}}
for(const dt of [.01,.025,1/60]){
 const [r,e]=make();r.castLabBoss(e,'saws',0);zones(r,2);assert.equal(r.hostile.length,4);const positions=r.hostile.map(b=>({x:b.x,y:b.y,vx:b.vx,vy:b.vy}));
 // All four survive contact, reach the exact two-second endpoint, then remain stationary.
 const first=r.hostile[0];r.p.x=first.x;r.p.y=first.y;r.p.invuln=0;const hp=r.p.hp;r.updateBullets(0);assert(r.p.hp<hp);assert.equal(r.hostile.length,4);r.p.invuln=999;
 shots(r,2,dt);assert(r.hostile.every(b=>b.grounded));for(let i=0;i<4;i++){const b=r.hostile[i],p=positions[i];near(b.x,p.x+p.vx*2);near(b.y,p.y+p.vy*2);near(b.vx,0);near(b.vy,0);near(b.life,2);}
 r.p.x=first.x;r.p.y=first.y;r.p.invuln=0;const hp2=r.p.hp;shots(r,1,dt);assert(r.p.hp<hp2);assert.equal(r.hostile.length,4);near(first.x,positions[0].x+positions[0].vx*2);r.p.invuln=0;const hp3=r.p.hp;shots(r,.5,dt);assert(r.p.hp<hp3);shots(r,.5,dt);assert.equal(r.hostile.length,0);
}
// A single step across flight/ground boundary cannot overshoot the 2s endpoint.
{const [r,e]=make();r.castLabBoss(e,'saws',0);zones(r,2);const b=r.hostile[0],x=b.x,vx=b.vx;shots(r,1.9);r.updateBullets(.2);assert(b.grounded);near(b.x,x+vx*2);near(b.life,1.9);}
// Bombard cooldown starts at dispatch: next skill begins before fifth explosion.
{const [r,e]=make(2);const exploded=[],resolve=r.resolveLabHazard.bind(r);r.resolveLabHazard=h=>{if(h.type==='bombard')exploded.push(h.bombIndex);resolve(h);};r.castLabBoss(e,'bombard',0);const cooldown=e.clock;near(cooldown,r.bossCooldown(e,4.2));assert(!(e.windup>0));ai(r,cooldown-.01);assert(!r.hazards.some(h=>h.type==='laser'));ai(r,.011);assert(r.hazards.some(h=>h.type==='laser'));assert.deepEqual(exploded,[1,2,3,4]);const clock=e.clock;zones(r,.5);assert.deepEqual(exploded,[1,2,3,4,5]);near(e.clock,clock);}
// Summon cooldown starts before the warning and doesn't wait for minions' ten-second lifetime.
{const [r,e]=make(1);r.p.x=2200;r.castLabBoss(e,'control',0);const cooldown=e.clock;near(cooldown,r.bossCooldown(e,5.5));assert(!(e.windup>0));ai(r,cooldown-.01);assert(r.enemies.some(u=>u.controlled&&u.hp>0));assert(!r.hazards.some(h=>h.type==='barrier'));ai(r,.011);assert(r.hazards.some(h=>h.type==='barrier'));assert(r.labFields.some(f=>f.kind==='control'));}
for(const mode of ['kill','phase','jump']){const [r,e]=make(2);r.castLabBoss(e,'saws',0);zones(r,2);shots(r,2);assert(r.hostile.some(b=>b.grounded));if(mode==='kill')r.kill(e);else if(mode==='jump')r.developerJump(2,1);else{e.phaseAge=10;e.phaseDone=true;e.hp=e.maxHp/3;r.hit(e,1e12,false);}assert(!r.hostile.some(b=>b.kind==='saw'));}
console.log('PASS four blades persist through hits,fly2s/ground2s,stationary repeated contact damage,frame rates,boundary timestep and cleanup; bombard/summon next skill cooldown starts at dispatch and overlaps active effects');
