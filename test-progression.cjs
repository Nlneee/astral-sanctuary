const assert=require('node:assert/strict');
const {Run}=require('./survivor-core.js');
// Earn each level through the real XP handler, including exact boundaries.
const r=new Run();let previous=0;
for(let level=1;level<=60;level++){
 assert.equal(r.level,level);assert(r.needed>previous);
 const examples={1:15,5:76,10:188,20:532};if(examples[level])assert.equal(r.needed,examples[level]);
 previous=r.needed;r.giveXP(r.needed-1);assert.equal(r.level,level);r.giveXP(1);assert.equal(r.level,level+1);assert.equal(r.xp,0);
}
const burst=new Run();burst.giveXP(15+28+42+7);assert.equal(burst.level,4);assert.equal(burst.xp,7);assert.equal(burst.upgradeQueue,3);
// Exercise actual timed spawns over equal windows. Only remove spawned enemies
// between ticks so the population cap/combat cannot hide the emission schedule.
function measure(stage,wave,difficulty,phase='wave'){
 const run=new Run('gpt',difficulty,()=>.1);run.stage=stage;run.wave=wave;run.phase=phase;run.waveDuration=26;run.fireClock=100;let count=0,firstBatch=0;
 for(let tick=0;tick<240;tick++){run.step(.05);if(run.enemies.length&&!firstBatch)firstBatch=run.enemies.length;count+=run.enemies.length;run.enemies=[];}
 return {count,firstBatch};
}
for(const difficulty of ['easy','normal','hard'])for(let stage=0;stage<4;stage++){
 const waves=[1,2,3].map(w=>measure(stage,w,difficulty));assert(waves[0].count<waves[1].count&&waves[1].count<waves[2].count);
 if(stage>0){assert.equal(waves[1].firstBatch,2*Math.ceil(waves[0].firstBatch/2*1.5));assert.equal(waves[2].firstBatch,waves[0].firstBatch*2);}
 assert.deepEqual(measure(stage,1,difficulty,'boss'),measure(stage,3,difficulty,'boss'));
 console.log(`${difficulty} stage ${stage+1}: batches ${waves.map(w=>w.firstBatch).join(' / ')}, 12s spawns ${waves.map(w=>w.count).join(' / ')}`);
}
const reset=new Run();reset.stage=0;reset.wave=3;reset.mode='stage';reset.level=10;reset.xp=7;reset.needed=188;assert(reset.advance());assert.equal(reset.wave,1);assert.equal(reset.level,10);assert.equal(reset.xp,7);assert.equal(reset.needed,188);
console.log('PASS: increasing XP for 60 levels, exact thresholds, XP overflow, all stage/difficulty spawn ramps, independent boss reinforcements, next-stage wave reset.');

