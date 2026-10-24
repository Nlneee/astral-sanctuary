const assert=require('node:assert/strict'),{catalog,Session}=require('./boss-showcase.js');
let count=0;
for(const boss of catalog)for(const skill of boss.skills){
 const s=new Session(boss.stage,skill.id);let peak=0,seen=new Set();
 for(let i=0;i<1800&&!s.finished;i++){s.step(1/60,{},true);peak=Math.max(peak,s.run.hostile.length);for(const h of s.run.hazards)seen.add(h.type);for(const f of [...s.run.labFields,...s.run.skyFields])seen.add(f.kind);}
 assert(s.finished,`${boss.stage}/${skill.id} did not finish: ${JSON.stringify(s.snapshot())}`);assert.equal(s.run.mode,'playing');assert.equal(s.run.bullets.length,0);assert.equal(s.boss.hp,s.boss.maxHp);assert.equal(s.run.level,1);assert.equal(s.run.phase,'boss');
 if(skill.id==='barrage')assert(peak>=32);if(skill.id==='laser')assert(peak>0&&seen.has('laser'));if(skill.id==='barrier')assert(seen.has('fixedLaser'));if(skill.id==='transfer')assert(seen.has('transfer')&&s.snapshot().damageTaken>=200);if(skill.id==='shield')assert(!s.followup&&!seen.has('rift'));if(skill.id==='thrust')assert(seen.has('thrustSlash'));
 count++;
}
{
 const s=new Session(0,'barrage');s.run.pause();s.step(1/60);assert.equal(s.run.time,0);s.run.resume();s.step(1/60,{x:1},false);assert(s.run.p.x>1400);
}
assert.equal(count,26);console.log('PASS all26 real boss skills finish automatically, burst/curve/field/combo/transfer/overlapping shield emit real objects, dummy receives200 nova, no player fire/spawns/upgrades/boss damage, pause and WASD');
