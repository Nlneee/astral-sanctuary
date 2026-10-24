const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js'),D=require('./survivor-data.js');
for(const difficulty of ['easy','normal','hard']){let last=0;for(let wave=1;wave<=20;wave++){
 const r=new Run('gpt',difficulty,()=>.99);r.wave=wave;r.fireClock=999;r.p.invuln=999;let count=0;
 for(let i=0;i<519;i++){r.step(.05);for(const e of r.enemies){assert(D.stages[0].wavePools[wave-1].includes(e.type));if(wave<5)assert(e.basic);}count+=r.enemies.length;r.enemies=[];}
 assert.equal(count,r.waveBudget(),`${difficulty} wave ${wave}`);assert(count>last);last=count;
}console.log('PASS exact 20 wave quotas and species gates:',difficulty);}
for(let wave=1;wave<5;wave++)for(const type of [6,7,8]){const r=new Run();r.wave=wave;const e=r.spawn(type);e.clock=0;for(let i=0;i<300;i++)r.updateEnemies(.02);assert(!e.dive&&!e.burrow);assert.equal(r.hazards.length,0);}
for(const [wave,types] of [[5,[9]],[7,[11,10]],[10,[12]]]){const r=new Run('gpt','normal',()=>0);r.wave=wave-1;r.waveTime=25.99;r.fireClock=999;r.p.invuln=999;r.step(.02);for(let i=0;i<80;i++)r.step(.05);for(const type of types)assert(r.enemies.some(e=>e.type===type),'missing introduction '+type);assert(!r.events.some(e=>e.text.includes('undefined')));}
const r=new Run();r.spawnClock=999;r.fireClock=999;r.p.invuln=999;for(let wave=1;wave<=20;wave++){assert.equal(r.wave,wave);r.waveTime=25.99;r.step(.02);r.enemies=r.enemies.filter(e=>e.boss);assert.equal(r.phase,wave===20?'boss':'wave');}assert(r.enemies.some(e=>e.boss));assert.equal(r.stage,0);
const capped=new Run();capped.wave=20;capped.fireClock=999;capped.p.invuln=999;for(let i=0;i<330;i++)capped.spawn(6);for(let i=0;i<50;i++)capped.step(.05);assert(capped.enemies.length<=330);
console.log('PASS basic opening, guaranteed milestone introductions, 20-wave boss gate, enemy cap');
