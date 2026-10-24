const assert=require('node:assert/strict'),D=require('./survivor-data.js'),{Run}=require('./survivor-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function stageFor(type){return type>=31?3:type<6?3:type<13?0:type<22?1:2;}
function unit(type,wave=1){const r=new Run('gpt','normal',()=>.5);r.stage=stageFor(type);r.wave=wave;r.p.invuln=999;r.p.x=2000;r.p.y=800;const e=r.spawn(type,{x:600,y:800});e.clock=999;return [r,e];}
assert.equal(new Set(D.enemies.map(e=>e.speed)).size,D.enemies.length,'each chassis has a distinct baseline');
assert(D.enemies[7].speed>D.enemies[6].speed&&D.enemies[6].speed>D.enemies[8].speed);
assert(D.enemies[19].speed>D.enemies[13].speed&&D.enemies[13].speed>D.enemies[15].speed);
assert(D.enemies[23].speed>D.enemies[22].speed&&D.enemies[22].speed>D.enemies[24].speed);
for(let type=0;type<D.enemies.length;type++){
 const [r,e]=unit(type),[late,l]=unit(type,20),base=D.enemies[type];
 assert(e.stride>=.94&&e.stride<=1.06);near(e.speed,base.speed*(1+r.stage*.1)*e.stride);near(l.speed/e.speed,1+19*.008);
 const x=e.x,y=e.y;r.updateEnemies(.01);near(Math.hypot(e.x-x,e.y-y),e.speed*.01);
 // Even ranged monsters must remain frozen when already within retreat distance.
 e.x=1000;e.y=800;r.p.x=1100;e.freeze=1;const frozen={x:e.x,y:e.y};r.updateEnemies(.01);near(e.x,frozen.x);near(e.y,frozen.y);
 if(base.atlas){e.freeze=0;e.windup=1;r.updateEnemies(.01);near(e.x,frozen.x);near(e.y,frozen.y);}
}
{
 let calls=0;const r=new Run('gpt','normal',()=>{calls++;return .5;});r.stage=0;const a=r.spawn(6),b=r.spawn(6);
 assert.notEqual(a.speed,b.speed);assert.equal(calls,6,'individual gait does not change spawn/loot random streams');
}
{
 const [r,e]=unit(6);r.p.x=1000;r.p.y=800;e.x=600;e.y=600;const direct=Math.atan2(200,400);
 r.playerVelocity={x:0,y:210};const intercept=r.mobHeading(e,direct);assert(intercept>direct);assert(intercept-direct<=.55);
 r.playerVelocity={x:0,y:0};near(r.mobHeading(e,direct),direct);e.pursuitLead=0;r.playerVelocity={x:0,y:500};near(r.mobHeading(e,direct),direct);
 const run=new Run();run.spawnClock=run.fireClock=Infinity;run.p.x=run.world.w-25;run.step(.01,{x:1});near(run.playerVelocity.x,0);
}
{
 const r=new Run();r.stage=3;r.wave=20;r.phase='boss';r.p.invuln=999;
 for(let i=0;i<40;i++){const e=r.spawn(i%2);e.x=1000;e.y=800;e.clock=999;}
 const e=r.enemies[0],x=e.x,y=e.y;r.separateMobs(.01);assert(Math.hypot(e.x-x,e.y-y)<=Math.min(70,e.speed*.32)*.01+1e-9);
 for(let i=0;i<239;i++)r.separateMobs(1/60);
 let closest=Infinity,spread=0;for(let i=0;i<r.enemies.length;i++)for(let j=0;j<i;j++){const d=Math.hypot(r.enemies[i].x-r.enemies[j].x,r.enemies[i].y-r.enemies[j].y);closest=Math.min(closest,d);spread+=d;}
 assert(closest>1,'coincident enemies separate');assert(spread/(40*39/2)>30,'pack spreads instead of stacking');
 for(const e of r.enemies){e.x=1000;e.y=800;e.freeze=1;}r.separateMobs(.05);assert(r.enemies.every(e=>e.x===1000&&e.y===800));
 for(const e of r.enemies){e.freeze=0;e.windup=1;}r.separateMobs(.05);assert(r.enemies.every(e=>e.x===1000&&e.y===800));
 for(const e of r.enemies){e.windup=0;e.chargeTime=1;}r.separateMobs(.05);assert(r.enemies.every(e=>e.x===1000&&e.y===800));
}
for(let stage=0;stage<4;stage++){
 const r=new Run();r.stage=stage;r.spawnBoss();const boss=r.enemies.find(e=>e.boss),expected=(stage===1?30:45+stage*6)*1.65*(stage===0?1.1:1);near(boss.speed,expected);
 const x=boss.x,y=boss.y;const m=r.spawn(D.stages[stage].pool[0]);m.x=x;m.y=y;r.separateMobs(.05);near(boss.x,x);near(boss.y,y);
}
{
 const r=new Run();r.stage=1;r.wave=20;r.spawnBoss();const boss=r.enemies[0];const e=r.spawn(14,{x:600,y:800});e.controlled=true;e.controller=boss.id;e.controlLife=10;r.p.x=1400;r.p.y=800;
 const x=e.x;r.updateLabEnemy(e,.01);near(e.x-x,Math.min(e.speed*1.35,310)*.01);assert(e.x-x<=3.1);
}
// Early ordinary pursuit stays escapable with the slowest unupgraded hero.
const slowest=D.heroes.reduce((a,b)=>a.speed<b.speed?a:b);
for(let stage=0;stage<4;stage++)for(let wave=1;wave<=4;wave++)for(const type of D.stages[stage].wavePools[wave-1]){
 const r=new Run(slowest.id,'normal',()=>.5);r.stage=stage;r.wave=wave;r.spawnClock=r.fireClock=Infinity;r.p.invuln=999;r.p.x=800;r.p.y=800;
 const e=r.spawn(type,{x:550,y:800});e.clock=999;
 // Exercise the fastest gait allowed by the actual spawn formula.
 e.speed=e.speed/e.stride*1.06;e.stride=1.06;
 assert(e.speed<r.stats.speed,`${stage}/${wave}/${e.name}: initial pursuit must be slower than the slowest hero`);
 const initial=Math.hypot(e.x-r.p.x,e.y-r.p.y);
 for(let i=0;i<300;i++){r.step(.01,{x:1});assert(Math.hypot(e.x-r.p.x,e.y-r.p.y)>e.r+r.p.r);}
 assert(Math.hypot(e.x-r.p.x,e.y-r.p.y)>initial,`${e.name}: walking away opens a gap`);
}
{
 const r=new Run();r.stage=3;r.phase='boss';r.spawnClock=r.fireClock=Infinity;r.p.invuln=999;
 for(let i=0;i<330;i++){const e=r.spawn(i%2);e.x=100+i%22*100;e.y=80+Math.floor(i/22)*90;e.clock=999;}
 const start=performance.now();for(let i=0;i<120;i++)r.step(1/60,{x:Math.cos(i/20),y:Math.sin(i/20)});assert(r.enemies.every(e=>Number.isFinite(e.x+e.y)&&e.x>=e.r&&e.x<=r.world.w-e.r&&e.y>=e.r&&e.y<=r.world.h-e.r));
 console.log('330-mob /120-frame movement smoke:',Math.round(performance.now()-start)+'ms');
}
console.log('PASS40 chassis speeds, stage/wave scaling, fixed +/-6% strides, predictive hunters, ranged freeze/retreat, coincident-pack separation and stationary cast/dash/freeze guards, boss speeds, controlled cap, four-sector opening escape margin,330-mob smoke');
