const assert=require('node:assert/strict');
const {Run}=require('./survivor-core.js');
const D=require('./survivor-data.js');
function rng(seed=1){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function settle(r){let guard=0;while(r.mode==='upgrade'&&guard++<50)assert(r.choose(r.choices[0].id));}
// Real engine: movement, time stop, and mouse-angle attack direction.
{
 const r=new Run('gpt','normal',rng());r.step(.05,{x:1,y:1,angle:Math.PI/2});assert(Math.abs(Math.hypot(r.p.x-1200,r.p.y-800)-r.stats.speed*.05)<1e-6);const target=r.spawn(0);target.x=r.p.x;target.y=r.p.y+200;r.attack();assert(r.bullets.every(b=>Math.abs(b.angle-Math.PI/2)<1e-6));r.pause();const before=JSON.stringify(r);r.step(.05,{x:1});assert.equal(JSON.stringify(r),before);assert(r.resume());r.p.hp=1;r.p.invuln=0;r.hurt(50);assert.equal(r.mode,'dead');
}
// All 21 specialist routes grant rank-three evolution; all seven real weapons hit.
for(const h of D.heroes){
 const r=new Run(h.id,'normal',rng(25));const enemy=r.spawn(3,{x:1310,y:800});enemy.x=1310;enemy.y=800;enemy.speed=0;enemy.hp=enemy.maxHp=1e5;
 for(let i=0;i<240;i++)r.step(1/60,{angle:0});assert(r.damageDone>0,h.id+' weapon caused no damage');
 for(const route of h.routes){r.ranks[route.id]=2;r.choices=[route];r.offerKind='level';r.upgradeQueue=1;r.mode='upgrade';assert(r.choose(route.id));assert.equal(r.rank(route.id),3);assert(r.events.some(e=>e.type==='evolution'&&e.text===route.evolution));}
 r.takeStats();for(let i=0;i<120;i++){if(r.mode==='upgrade')settle(r);r.step(1/60,{angle:0});}
 assert(Number.isFinite(r.p.hp)&&Number.isFinite(r.damageDone));assert(r.bullets.length<=400);console.log('PASS weapons + routes:',h.id);
}
// Boss gate: a timed wave cannot raise difficulty; actual death triggers rewards,
// then explicit stage confirmation unlocks new enemies. Test all four gates.
{
 const r=new Run('gpt','normal',rng(7));
 for(let stage=0;stage<4;stage++){
  assert.equal(r.stage,stage);r.phase='wave';r.wave=r.waveCount();r.waveSpawned=r.waveBudget();r.enemies=[];r.mode='playing';r.p.invuln=100;r.step(.02);
  assert.equal(r.phase,'boss');const boss=r.enemies.find(e=>e.boss);assert(boss);
  r.waveTime=999;r.step(.02);assert.equal(r.stage,stage,'tier rose before boss death');assert.equal(r.phase,'boss');
  for(let phase=0;phase<3;phase++){for(let i=0;i<2000&&(!boss.phaseDone||boss.phaseAge<4);i++){r.updateEnemies(.025);r.updateZones(.025);}r.hit(boss,boss.maxHp+100,false);}r.step(.02);assert.equal(r.bosses,stage+1);
  if(stage<3){assert.equal(r.mode,'upgrade');assert.equal(r.offerKind,'boss');assert(r.choose(r.choices[0].id));assert.equal(r.mode,'stage');assert.equal(r.stage,stage);assert(r.advance());settle(r);assert.equal(r.stage,stage+1);assert.equal(r.phase,'wave');assert(D.stages[r.stage].pool.length>D.stages[stage].pool.length);}
  else assert.equal(r.mode,'won');
 }
}
// Difficulty modifiers actually change enemy stats and density.
{
 const easy=new Run('glm','easy',rng()),hard=new Run('glm','hard',rng());const a=easy.spawn(0),b=hard.spawn(0);assert(a.hp<b.hp);assert(a.damage<b.damage);assert(easy.diff.count<hard.diff.count);
 const r=new Run();r.giveXP(200);r.offer();const t=r.time;r.step(.05);assert.equal(r.time,t);assert(!r.choose('not-an-option'));settle(r);assert.equal(r.upgradeQueue,0);assert.equal(r.mode,'playing');
}
// Boss warning attacks and later machine behaviors execute without NaNs.
for(let stage=0;stage<4;stage++){
 const r=new Run('deepseek','hard',rng(7));r.stage=stage;r.p.invuln=100;r.spawnBoss();for(let i=0;i<6;i++)r.spawn(i);
 for(let i=0;i<700;i++){settle(r);r.step(1/60,{x:Math.cos(i/120),y:Math.sin(i/120),angle:i/90});}
 assert(r.hostile.length>0||r.hazards.length>0);assert(r.enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.hp)));
}
console.log('PASS: movement, aim, pause, death, all difficulties, XP queue, all 4 boss gates, victory, machine AI, bounded projectiles.');
// Unmodified combat smoke: bot aims at nearby enemies, moves around the arena,
// and takes available upgrades. Report performance, without claiming human balance.
for(const h of D.heroes){
 const r=new Run(h.id,'normal',rng(42));
 for(let i=0;i<60*130;i++){
  if(r.mode==='upgrade'){const preferred=r.choices.find(c=>c.effect)||r.choices[0];r.choose(preferred.id);continue;}
  if(r.mode==='stage'){r.advance();continue;}if(r.mode!=='playing')break;
  let target=r.nearest(r.p.x,r.p.y,null,1000);const a=r.time*.24,tx=1200+Math.cos(a)*290,ty=800+Math.sin(a)*270;
  const dx=tx-r.p.x,dy=ty-r.p.y,n=Math.hypot(dx,dy)||1;r.step(1/60,{x:dx/n,y:dy/n,angle:target?Math.atan2(target.y-r.p.y,target.x-r.p.x):0});
 }
 console.log(`COMBAT ${h.id}: ${r.mode}, ${r.time.toFixed(0)}s, Lv.${r.level}, ${r.kills} kills, ${r.bosses} bosses, HP ${r.p.hp.toFixed(0)}`);
}
