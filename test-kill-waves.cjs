const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js');
function fixture(stage,wave,difficulty='normal'){const r=new Run('gpt',difficulty,()=>.4);r.stage=stage;r.wave=wave;r.fireClock=99999;r.p.invuln=99999;r.updateEnemies=()=>{};return r;}
for(const difficulty of ['easy','normal','hard'])for(let stage=0;stage<4;stage++){let last=0;for(let wave=1;wave<=20;wave++){
 const r=fixture(stage,wave,difficulty),cap=r.waveCap(),limit=r.waveThreshold(),budget=r.waveBudget();assert(cap>last);last=cap;assert(limit>=1&&limit<cap);let total=0;
 for(let i=0;i<2400&&r.waveSpawned<budget;i++){r.step(.05);assert.equal(r.wave,wave);assert.equal(r.phase,'wave');assert(r.waveAlive()<=cap);total+=r.enemies.length;r.enemies=[];}
 assert.equal(total,budget);assert.equal(r.waveSpawned,budget);
 for(let i=0;i<limit+1;i++)r.spawn(stage===0?6:stage===1?13:0);r.step(.05);assert.equal(r.wave,wave);assert.equal(r.phase,'wave');r.enemies.pop();r.step(.05);if(wave===r.waveCount()){assert.equal(r.phase,'boss');assert.equal(r.enemies.filter(e=>e.boss).length,1);}else{assert.equal(r.wave,wave+1);assert.equal(r.phase,'wave');assert(r.waveAlive()<=r.waveCap());assert(r.waveSpawned>0);}
}}
const idle=fixture(0,1);for(let i=0;i<12000;i++)idle.step(.05);assert.equal(idle.wave,1);assert.equal(idle.waveAlive(),idle.waveCap());assert(idle.waveSpawned<idle.waveBudget());idle.enemies=[];for(let i=0;i<24;i++)idle.step(.05);assert(idle.waveAlive()>0);assert.equal(idle.wave,1);
const summon=fixture(3,3);for(let i=0;i<summon.waveCap();i++)assert(summon.spawn(0));assert.equal(summon.spawn(0),null);
const pause=fixture(0,1);pause.waveSpawned=pause.waveBudget();pause.pause();pause.step(.05);assert.equal(pause.wave,1);pause.resume();pause.step(.05);assert.equal(pause.wave,2);
console.log('PASS all stage/wave/difficulty quotas, increasing caps, strict thresholds, no timed advancement after 600s, refill, leftover overlap, final boss gating, summon cap, pause');
