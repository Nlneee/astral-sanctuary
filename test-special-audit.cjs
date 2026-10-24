const assert=require('node:assert/strict'),D=require('./survivor-data.js'),S=require('./survivor-specials.js'),{Run}=require('./survivor-core.js'),{catalog,Session}=require('./enemy-showcase.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`),advance=(r,t)=>{for(let i=0;i<Math.round(t/.01);i++)r.updateZones(.01);};
let count=0;
for(const group of catalog)for(const item of group.skills){
 for(const auto of [true,false]){const s=new Session(group.stage,item.id);for(let i=0;i<2400&&!s.finished;i++)s.step(1/60,{},auto);assert(s.finished,item.id);assert.equal(s.enemy.specialCycle,1);assert.equal(s.run.mode,'playing');assert.equal(s.run.bullets.length,0);assert(!s.run.enemies.some(e=>e.boss));for(const e of s.run.enemies)for(const key of ['x','y','hp','maxHp','speed','damage'])assert(Number.isFinite(e[key]),item.id+'/'+key);}
 const s=new Session(group.stage,item.id),r=s.run,e=s.enemy,c=r.specialConfig(e);assert(c);for(const [key,v]of Object.entries(c))if(typeof v==='number'){assert(Number.isFinite(v));assert(v>=S.bounds[key][0]&&v<=S.bounds[key][1],item.id+'/'+key);}
 // Demonstration stats come from the actual standard-difficulty wave10 spawn formula.
 const actual=new Run('gpt','normal',()=>.5);actual.stage=group.stage;actual.wave=10;const target=actual.spawn(item.type,{x:1000,y:800});near(e.maxHp,target.maxHp);near(s.defaults.speed,target.speed);near(s.defaults.damage,target.damage);
 if(!['deer','repair','harmonist'].includes(item.id)){e.clock=0;r.p.x=-5000;assert.equal(r.castSpecial(e),false);near(e.clock,0);}
 // Cancelling an owner must remove its queued warnings, fields and owned projectiles.
 const k=new Session(group.stage,item.id);for(let i=0;i<100;i++)k.step(.01,{},false);k.run.kill(k.enemy);assert(k.enemy.dead&&k.enemy.hp===0);assert(!k.run.hazards.some(h=>h.source===k.enemy.id));assert(!k.run.hostile.some(b=>b.source===k.enemy.id));assert(![...k.run.labFields,...k.run.skyFields,...k.run.hubFields].some(f=>f.source===k.enemy.id));
 count++;
}
assert.equal(count,19);
// Swept collision catches a charge that crosses the player and ends beyond them.
for(const [stage,id]of [[0,'boar'],[1,'lancer'],[2,'tiger']]){const s=new Session(stage,id),r=s.run,e=s.enemy;Object.assign(e,{x:800,y:700,speed:0,chargeX:1000,chargeY:0,chargeTime:.2,clock:Infinity});r.p.x=900;r.p.y=700;r.p.invuln=0;const hp=r.p.hp;r.updateEnemies(.2);assert(r.p.hp<hp,id);}
{const s=new Session(2,'tiger'),r=s.run,e=s.enemy;Object.assign(e,{x:800,y:700,speed:0,chargeX:520,chargeY:0,chargeTime:.01,clock:Infinity});r.updateEnemies(.05);near(e.x,805.2);near(e.chargeTime,0);}
for(const [stage,id]of [[0,'boar'],[1,'lancer'],[2,'tiger']]){const s=new Session(stage,id),r=s.run,e=s.enemy;Object.assign(e,{x:800,y:700,speed:0,chargeX:520,chargeY:0,chargeTime:.2,clock:Infinity,freeze:1});r.updateEnemies(.05);near(e.x,800);near(e.chargeTime,.2);e.freeze=0;r.updateEnemies(.05);near(e.x,826);near(e.chargeTime,.15);}
for(const [stage,id]of [[1,'lancer'],[2,'tiger']]){const s=new Session(stage,id),r=s.run,e=s.enemy;Object.assign(e,{speed:0,clock:0,chargeX:520,chargeY:0,chargeTime:.2,stabs:id==='lancer'?2:0,skyDashes:id==='tiger'?2:0});r.updateEnemies(.01);assert(!e.specialCycle);assert(!r.hazards.length,'cooldown expiry cannot overwrite an unfinished combo');}
// Needle, missile and sonic wave collision tests use their actual movement segment.
for(const kind of ['needle','rocket','sonic']){const s=new Session(1,'sonic'),r=s.run;r.p.x=900;r.p.y=700;r.p.invuln=0;r.hostile=[{kind,x:800,y:700,vx:1000,vy:0,life:1,r:6,damage:10}];const hp=r.p.hp;r.updateBullets(.2);near(hp-r.p.hp,10);}
{const r=new Run('gpt','normal');r.p.x=900;r.p.y=700;r.p.invuln=0;const hp=r.p.hp;r.hostile=[{kind:'needle',x:800,y:700,vx:1000,vy:0,life:0,r:6,damage:10}];r.updateBullets(.2);near(r.p.hp,hp);r.hostile=[{kind:'needle',x:800,y:700,vx:1000,vy:0,life:.01,r:6,damage:10}];r.updateBullets(.2);near(r.p.hp,hp);}
// Buff/healing semantics remain capped, and death ends the link immediately.
for(const id of ['deer','repair']){const s=new Session(id==='deer'?0:1,id),r=s.run,e=s.enemy,ally=r.enemies.find(a=>a.demoAlly),c=r.specialConfig(e);ally.hp=ally.maxHp-1;r.castSpecial(e);near(ally.hp,ally.maxHp);r.kill(ally);r.castSpecial(e);near(ally.hp,0);}
{const s=new Session(3,'harmonist'),r=s.run,e=s.enemy;r.updateHubLinks();assert.equal(e.hubLinks.length,3);for(const ally of r.enemies.filter(a=>a.demoAlly)){near(ally.hubArmor,.35);near(ally.hubSpeedScale,1.25);}r.kill(e);for(const ally of r.enemies.filter(a=>a.demoAlly)){near(ally.hubArmor,0);near(ally.hubSpeedScale,1);}}
// Live tuning drives production mechanics without mutating global defaults.
{const s=new Session(1,'radar','gpt',{stats:{damage:40},skill:{shots:5,speed:330,damageScale:1.2}}),r=s.run,e=s.enemy;r.castSpecial(e);advance(r,1.1);assert.equal(r.hostile.length,5);for(const b of r.hostile){near(Math.hypot(b.vx,b.vy),330);near(b.damage,48);assert.equal(b.source,e.id);}near(S.definitions.radar.speed,266);near(S.definitions.radar.shots,3);}
{const s=new Session(2,'stealth'),r=s.run,e=s.enemy;r.castSpecial(e);advance(r,.8);assert(e.veil>0);assert(!r.nearest(e.x,e.y,null,100));const hp=e.hp;r.hit(e,99999,false);near(e.hp,hp);advance(r,2.5);assert(!e.veil);}
// Dense combat across all four sectors stays finite and respects collection caps.
for(let stage=0;stage<4;stage++){const r=new Run('gpt','normal',()=>.5);r.stage=stage;r.wave=20;r.phase='boss';r.spawnClock=r.fireClock=Infinity;r.p.invuln=999;r.p.hp=r.p.maxHp=1e6;const types=catalog[stage].skills.map(s=>s.type);for(let i=0;i<30;i++){const e=r.spawn(types[i%types.length]);e.basic=false;e.clock=i*.03;}for(let i=0;i<1200;i++)r.step(.025,{});for(const e of r.enemies)assert(Number.isFinite(e.x+e.y+e.hp));assert(r.hostile.length<=260);assert(r.hubFields.length<=64);assert(r.skyFields.length<=32);assert(r.effects.length<=180);}
console.log('PASS all19 real skills under stationary/moving targets; wave10 numerical agreement,range gates,dead-owner cleanup,swept charge/projectile collision,exact dash travel,expired bullets,no over-heal,nonstacking buffs,live tuning,veil immunity,and dense30-enemy battles in all sectors');
