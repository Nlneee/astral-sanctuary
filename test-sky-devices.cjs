const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js'),{Session}=require('./boss-showcase.js'),D=require('./survivor-data.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function make(phase=2){const r=new Run('gpt','normal',()=>.99);r.stage=2;r.spawnBoss();const e=r.enemies[0];Object.assign(e,{x:800,y:700,speed:0,clock:999,combatPhase:phase,quantumIntroduced:true});r.p.x=1400;r.p.y=700;r.p.invuln=999;return [r,e];}
function fields(r,t,dt=.01){for(let i=0;i<Math.round(t/dt);i++)r.updateSkyFields(dt);}
// Phase gates, exact count, independent steering and normal cooldown measured from throw.
{const [r,e]=make(1);r.castSky(e,'discs',0);r.castSky(e,'oscillator',0);assert.equal(r.skyFields.length,0);}
{const [r,e]=make();r.castSky(e,'discs',0);assert.equal(r.skyFields.length,3);near(e.clock,r.bossCooldown(e,4.5));assert(!e.windup);assert.equal(new Set(r.skyFields.map(f=>f.angle)).size,3);
 const f=r.skyFields[1];r.p.y+=300;const angle=f.angle;fields(r,.1);assert(f.angle>angle);r.castSky(e,'discs',0);assert.equal(r.skyFields.length,3);r.castSky(e,'oscillator',0);assert.equal(r.skyFields.length,3);
 // Keep target beyond reach; all three switch to return at exactly five seconds.
 r.p.x=100000;fields(r,4.89);assert(r.skyFields.every(f=>!f.returning));fields(r,.01);assert(r.skyFields.every(f=>f.returning));
 e.x=1700;e.y=300;fields(r,6);assert.equal(r.skyFields.length,0);
}
// Contact damages once and immediately switches to harmless return, including invulnerable contact.
for(const protectedPlayer of [false,true]){const [r,e]=make();r.castSky(e,'discs',0);const f=r.skyFields[1];r.skyFields=[f];r.p.x=f.x+40;r.p.y=f.y;r.p.invuln=protectedPlayer?999:0;const hp=r.p.hp;r.updateSkyFields(.1);assert(f.returning);near(hp-r.p.hp,protectedPlayer?0:e.damage*.8);r.p.invuln=0;r.p.x=f.x;r.p.y=f.y;const hp2=r.p.hp;fields(r,1);near(r.p.hp,hp2);assert.equal(r.skyFields.length,0);}
// Full AI can start another skill while discs are still chasing; no recovery blocking.
{const [r,e]=make();e.skySeen=new Set(['pulsewave']);r.castSky(e,'discs',0);r.p.x=100000;const cooldown=e.clock;for(let i=0;i<Math.round((cooldown-.01)/.01);i++){r.updateEnemies(.01);r.updateSkyFields(.01);}assert(!r.hazards.length);r.updateEnemies(.02);assert(r.hazards.some(h=>h.type==='rift'));assert.equal(r.skyFields.filter(f=>f.kind==='discs').length,3);}
// Persistent indestructible device is not an enemy/auto-aim target; each boss has at most one.
{const [r,e]=make(3);r.castSky(e,'oscillator',0);const f=r.skyFields[0];near(e.clock,.5);assert(Math.hypot(f.x-e.x,f.y-e.y)<=160.001);assert.equal(r.enemies.length,1);assert(!r.enemies.includes(f));fields(r,20);assert(!f.armed);assert(r.skyFields.includes(f));r.castSky(e,'oscillator',0);assert.equal(r.skyFields.length,1);
 r.p.x=f.x+100;r.p.y=f.y;r.p.invuln=0;const hp=r.p.hp;r.updateSkyFields(.01);assert(f.armed);fields(r,.34);near(r.p.hp,hp);fields(r,.01);near(hp-r.p.hp,e.damage);assert.equal(r.skyFields.length,0);fields(r,1);near(hp-r.p.hp,e.damage);
}
// AI scheduler respects .5s once; subsequent skills restore their own normal cooldown.
{const [r,e]=make(3);e.skySeen=new Set(['shield','transfer']);e.clock=0;r.updateEnemies(.01);assert(r.skyFields.some(f=>f.kind==='oscillator'));near(e.clock,.5);r.updateEnemies(.49);assert.equal(r.hazards.length,0);r.updateEnemies(.011);assert(r.hazards.some(h=>h.type==='rift'));near(e.clock,r.bossCooldown(e,4.5));assert(e.clock>.5);}
// Background deploy counts once for the recurring fifteen-skill transfer and cannot block phase completion.
{const [r,e]=make(3);e.skySeen=new Set(['shield','transfer']);r.castSky(e,'oscillator',0);assert.equal(e.skySkillCount,1);assert(e.phaseDone);r.castSky(e,'oscillator',0);assert.equal(e.skySkillCount,1);r.castSky(e,'discs',0);assert.equal(e.skySkillCount,2);}
for(const action of ['kill','jump','phase']){const [r,e]=make(2);r.castSky(e,'discs',0);if(action==='kill')r.kill(e);else if(action==='jump')r.developerJump(0,1);else{e.phaseDone=true;e.phaseAge=10;e.hp=e.maxHp/3;r.hit(e,1e12,false);}assert(!r.skyFields.some(f=>['discs','oscillator'].includes(f.kind)));}
{const [r,e]=make(3);r.castSky(e,'oscillator',0);r.kill(e);fields(r,1);assert.equal(r.skyFields.length,0);}
for(const id of ['discs','oscillator']){const s=new Session(2,id);for(let i=0;i<1800&&!s.finished;i++)s.step(1/60,{},false);assert(s.finished,id);assert(s.boss.skySeen.has(id));}
console.log('PASS sky devices: phase unlock,3 independent discs,5s timeout,contact return,moving owner,harmless recovery,overlap and exact cooldown; indestructible proximity one-shot oscillator,.5s isolated AI cooldown,phase gate,cast count,cleanup,real showcase');
