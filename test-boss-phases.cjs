const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js'),D=require('./survivor-data.js');
for(const h of D.heroes)for(const type of [6,7,8]){const r=new Run(h.id,'normal',()=>.5),e=r.spawn(type);for(let attack=1;attack<=3;attack++){r.bullets=[];r.attack();for(const b of [...r.bullets])r.impact(b,e);assert.equal(e.hp<=0,attack===3,h.id+' attack '+attack);} }
for(let stage=0;stage<4;stage++){
 const r=new Run('gpt','normal',()=>.5);r.stage=stage;r.p.invuln=999;r.spawnBoss();const e=r.enemies[0];assert(e.maxHp>=(1500+stage*1250)*4);
 for(let phase=1;phase<=3;phase++){
  assert.equal(e.combatPhase,phase);r.hit(e,1e9,false);assert(!e.dead);assert.equal(e.combatPhase,phase);
  for(let i=0;i<2000&&(!e.phaseDone||e.phaseAge<4);i++){r.updateEnemies(.025);r.updateZones(.025);}
  assert(e.phaseDone,'skill did not finish '+stage+'/'+phase);assert(e.phaseAge>=4);r.hit(e,1e9,false);
  if(phase<3){assert(!e.dead);assert.equal(e.combatPhase,phase+1);assert(!e.phaseDone);r.hit(e,1e9,false);assert.equal(e.combatPhase,phase+1);}
 }
 assert(e.dead);if(stage===3){const body=r.enemies.find(b=>b.hubForm==='spirit'&&!b.dead);assert(body);assert(!r.pendingStage);assert.equal(body.combatPhase,1);for(let i=0;i<2500&&(!body.phaseDone||body.phaseAge<4||body.shield>0);i++){r.updateEnemies(.025);r.updateZones(.025);}assert(body.phaseDone);r.hit(body,1e9,false);assert(body.dead);}assert.equal(r.bosses,1);assert(r.pendingStage);
}
console.log('PASS all seven initial full noncritical volleys kill ordinary mobs on third attack; all four bosses expose three skills and cannot skip stages even with billion damage');
