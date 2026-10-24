const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js'),mech=require('./survivor-archon-mech.js'),spirit=require('./survivor-archon-spirit.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function make(difficulty='normal'){const r=new Run('gpt',difficulty,()=>.5);r.stage=3;r.p.invuln=999;r.fireClock=r.spawnClock=Infinity;r.spawnBoss();return [r,r.enemies[0]];}
function split(r,e){for(let phase=1;phase<=3;phase++){assert.equal(e.combatPhase,phase);assert.equal(e.hubForm,'mech');assert.equal(e.sprite,9);e.shield=0;e.phaseAge=4;e.phaseDone=true;r.hit(e,1e12,false);}return r.enemies.find(e=>e.hubForm==='spirit');}
for(const [difficulty,multiplier] of [['easy',.72],['normal',1],['hard',1.4]]){
 const [r,e]=make(difficulty);near(e.maxHp,mech.config.maxHp*multiplier);const hp=r.p.hp,level=r.level,kills=r.kills;r.hubCast(e,'orbital');r.hubFields.push({kind:'plasma',source:e.id,life:5,max:5,x:e.x,y:e.y,r:50});
 const body=split(r,e);assert(body);assert.notEqual(body.id,e.id);assert(e.dead&&e.hp===0);assert.equal(body.combatPhase,1);assert.equal(r.bossPhaseCount(body),1);assert.equal(body.sprite,10);near(body.hp,body.maxHp);near(body.maxHp,spirit.config.maxHp*multiplier);
 assert.equal(r.mode,'playing');assert.equal(r.phase,'boss');assert.equal(r.pendingStage,false);assert.equal(r.bosses,0);assert.equal(r.kills,kills);assert.equal(r.gems.length,0);assert.equal(r.level,level);near(r.p.hp,hp);assert(!r.hazards.length&&!r.hubFields.length);
 r.hit(body,1e12,false);near(body.hp,body.maxHp);assert.equal(r.aimNearest(),null);assert.equal(r.nearest(body.x,body.y,null,1000),null);assert(!r.routeTargets(body.x,body.y,1000).includes(body));
 r.pause();const intro=body.hubIntro;r.step(.05);near(body.hubIntro,intro);r.resume();
 body.hubIntro=0;body.phaseAge=4;body.phaseDone=true;body.clock=Infinity;
 r.hit(body,body.maxHp*.6,false);near(body.hp,body.maxHp*.4);assert.equal(body.combatPhase,1);
 r.hit(body,body.maxHp*.2,false);near(body.hp,body.maxHp*.2);assert.equal(body.combatPhase,1,'no 1/3 or 2/3 body phase gate');
 r.hit(body,1e12,false);assert(body.dead);assert.equal(r.bosses,1);assert.equal(r.kills,kills+1);assert(r.pendingStage);assert.equal(r.gems.length,1);r.step(.01);assert.equal(r.mode,'won');
}
{
 const [r,e]=make();e.combatPhase=3;r.hubPhase(e);assert.equal(e.sprite,9);assert.equal(e.hubForm,'mech');r.hubCast(e,'orbital');assert.equal(r.hazards.length,1);assert.equal(r.hazards[0].sequence.count,6);assert.equal(r.hazards[0].total,.5);
 r.hubInitBoss(e,'spirit');r.hubPhase(e);r.hubCast(e,'orbital');assert.equal(r.hazards.length,6);assert.deepEqual(r.hubUnlocked(e),['aegis','orbital','quantum','rush']);near(r.bossCooldown(e,4.5),4.5*.45);
}
{
 const before=mech.config.skills.sweep.duration,bodyWarning=spirit.config.skills.quantum.warning,bodyHp=spirit.config.maxHp;
 try{mech.config.skills.sweep.duration=1.25;mech.config.maxHp=12345;const [r,e]=make();near(e.maxHp,12345);r.hubCast(e,'sweep');near(r.hazards[0].duration,1.25);r.hubInitBoss(e,'spirit');r.hubPhase(e);r.hubCast(e,'quantum');near(e.maxHp,bodyHp);near(r.hazards[0].total,bodyWarning);assert.equal(r.hazards[0].quantum.life,8);assert(!spirit.config.skills.sweep);}
 finally{mech.config.skills.sweep.duration=before;mech.config.maxHp=2100000;}
 const mechRadius=mech.config.skills.rush.slash.radius,bodyRadius=spirit.config.skills.rush.slash.radius;
 try{spirit.config.skills.rush.slash.radius=640;near(mech.config.skills.rush.slash.radius,mechRadius);const [r,e]=make();r.hubInitBoss(e,'spirit');r.hubRushSlashLock(e,{shot:1,totalShots:2});near(r.hazards[0].r,640);}
 finally{spirit.config.skills.rush.slash.radius=bodyRadius;}
}
{
 const [r,e]=make();const body=split(r,e);body.hubIntro=0;body.phaseAge=4;r.hit(body,1e12,false);near(body.hp,1);assert(!body.dead,'single-stage body still exposes its complete skill design');
 r.developerJump(1,1);assert(!r.enemies.length&&!r.hazards.length&&!r.hubFields.length);assert.equal(r.pendingStage,false);
}
console.log('PASS independent Mech3-phase/Spirit1-phase full HP across all difficulties,new body id,no overflow/rewards or early victory,awakening immunity and targeting,no body fractional gates,independent skill/stat edits,and final reward exactly once');
