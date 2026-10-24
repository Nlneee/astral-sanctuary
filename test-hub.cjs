const assert=require('node:assert/strict'),D=require('./survivor-data.js'),{Run}=require('./survivor-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function mob(type){const r=new Run('gpt','normal',()=>.5);r.stage=3;r.wave=20;r.p.invuln=999;r.spawnClock=r.fireClock=Infinity;const e=r.spawn(type,{x:700,y:800});e.clock=999;e.speed=0;return [r,e];}
function zones(r,t){for(let i=0;i<Math.round(t/.01);i++)r.updateZones(.01);}
function tick(r,t){for(let i=0;i<Math.round(t/.01);i++){r.time+=.01;r.updateEnemies(.01);r.updateZones(.01);}}
assert.equal(D.enemies.length,40);assert.equal(D.stages[3].atlas,'hub');assert.equal(D.stages[3].wavePools.length,20);
for(let wave=1;wave<=20;wave++){const p=D.stages[3].wavePools[wave-1];assert.equal(p.length,wave<5?4:wave<7?5:wave<10?7:9);assert(p.every(type=>D.enemies[type].atlas==='hub'));}
for(let type=31;type<40;type++){const [r,e]=mob(type);assert.equal(e.elite,type>=35);assert.equal(e.sprite,type-31);assert(e.maxHp>0);}
{
 const [r,e]=mob(35);r.hubCast(e,'prism');const h=r.hazards[0];near(h.total,1);near(h.angles[1]-h.angles[0],.42);zones(r,.99);assert(!r.hubFields.length);zones(r,.01);const f=r.hubFields[0];assert.equal(f.angles.length,3);
 let hits=0;r.hurt=()=>hits++;r.p.x=f.x+Math.cos(f.angle+.21)*500;r.p.y=f.y+Math.sin(f.angle+.21)*500;r.updateHubFields(.01);assert.equal(hits,0,'safe fork gap');r.p.x=f.x+Math.cos(f.angle)*500;r.p.y=f.y+Math.sin(f.angle)*500;r.updateHubFields(.01);assert(hits>0);r.hit(e,1e12,false);assert(!r.hubFields.length&&!r.hazards.length);
}
{
 const [r,e]=mob(36);r.playerVelocity={x:210,y:0};r.hubCast(e,'wall');const warning=r.hazards[0];zones(r,.85);const f=r.hubFields[0];near(f.life,3.5);assert.deepEqual(f.segments,warning.segments);const line=f.segments[0];r.p.x=line.x+60;r.p.y=f.y;r.hubWallBlock(line.x-60,f.y);assert(r.p.x<line.x,'wall blocks crossing');r.p.x=line.x+60;r.p.y=line.y2+80;r.hubWallBlock(line.x-60,r.p.y);assert(r.p.x>line.x,'wall can be bypassed at its endpoint');
 for(let i=0;i<5;i++){r.hubCast(e,'wall');zones(r,.85);}assert(r.hubFields.filter(f=>f.kind==='wall'&&f.life>0).length<=3);r.kill(e);assert(!r.hubFields.length&&!r.hazards.length);
}
{
 const [r,e]=mob(37);r.time=10;r.hubTrail=Array.from({length:20},(_,i)=>({x:950+i*20,y:700,time:8+i*.1}));r.p.x=1800;r.p.y=1100;r.hubCast(e,'trace');assert.equal(r.hazards.length,4);assert(r.hazards.every(h=>h.x<1400&&h.y===700));const marks=r.hazards.map(h=>({x:h.x,y:h.y}));r.p.x=2000;zones(r,1.6);assert(!r.hazards.length);assert(marks.every(p=>p.x!==2000));
}
{
 const [r,e]=mob(38),allies=[];for(let i=0;i<5;i++){const a=r.spawn(31,{x:800+i*40,y:800});a.x=800+i*40;a.y=800;allies.push(a);}r.updateHubLinks();assert.equal(e.hubLinks.length,3);assert.equal(allies.filter(a=>a.hubBoost).length,3);
 const a=allies[0],hp=a.hp;r.hit(a,100,false);near(hp-a.hp,65);const hp2=a.hp;r.hit(a,100,false,false,true);near(hp2-a.hp,100);
 const unbuffed=allies[4];assert(!unbuffed.hubBoost);r.hit(e,1e12,false);assert(allies.every(a=>!a.hubBoost&&a.hubArmor===0));
}
{
 const [r,e]=mob(39);let locks=0;const warn=r.hubWarn.bind(r);r.hubWarn=(...a)=>{if(a[1]==='plasma')locks++;return warn(...a);};r.hubCast(e,'mortar');zones(r,2.1);assert.equal(locks,4);assert.equal(r.hubFields.filter(f=>f.kind==='plasma').length,4);const f=r.hubFields.find(f=>f.kind==='plasma'),x=f.x,y=f.y;e.x+=200;r.updateHubFields(.01);near(f.x,x);near(f.y,y);zones(r,5);assert(!r.hubFields.length);r.hubCast(e,'mortar');r.developerJump(1,1);zones(r,8);assert(!r.hubFields.length&&!r.hazards.length);assert.deepEqual(r.hubTrail,[]);
}
{
 const [r,e]=mob(34);e.speed=250;e.x=900;r.p.x=1200;e.foxClock=0;r.playerVelocity={x:0,y:100};r.updateHubEnemy(e,.01);assert(e.foxStep>0);assert(e.x>900);assert(!r.hazards.length,'fox step is movement rather than ranged ability');
}
{
 const r=new Run();r.stage=3;r.p.invuln=999;r.spawnBoss();const e=r.enemies[0];near(e.maxHp,2100000);assert.equal(e.sprite,9);
 r.hubCast(e,'aegis');zones(r,.55);near(e.shield,5);const hp=e.hp;r.hit(e,1e12,false);near(e.hp,hp);e.clock=0;r.updateHubEnemy(e,.01);assert(r.hazards.some(h=>h.type==='orbital'),'shield immediately chains another skill');zones(r,5);near(e.shield,0);
}
{
 const r=new Run();r.stage=3;r.p.invuln=999;r.spawnBoss();const e=r.enemies[0];e.x=800;e.y=800;r.p.x=1200;r.p.y=800;r.hubInitBoss(e,'spirit');r.hubPhase(e);assert.equal(e.sprite,10);assert.equal(e.hubForm,'spirit');
 r.hubCast(e,'rush');let rushes=0;const resolve=r.resolveHubHazard.bind(r);r.resolveHubHazard=h=>{if(h.type==='rush')rushes++;resolve(h);};zones(r,3.26);assert.equal(rushes,2);assert(e.hubSeen.has('rush'));assert(!r.hubFields.length&&!r.hazards.length);
 r.hubCast(e,'quantum');zones(r,.6);assert.equal(r.hubFields.filter(f=>f.kind==='quantum').length,1);assert.equal(r.hostile.length,0);zones(r,8);assert(e.hubSeen.has('quantum'));
}
{
 const r=new Run();r.stage=3;r.p.invuln=999;r.spawnBoss();const e=r.enemies[0];
 for(let phase=1;phase<=3;phase++){r.hit(e,1e12,false);assert(!e.dead);for(let i=0;i<7000&&(!e.phaseDone||e.phaseAge<4);i++){r.time+=.01;r.updateEnemies(.01);r.updateZones(.01);}assert(e.phaseDone,'phase '+phase);r.hit(e,1e12,false);}
 assert(e.dead);assert(!r.hazards.length&&!r.hubFields.length);const body=r.enemies.find(e=>e.hubForm==='spirit'&&!e.dead);assert(body);near(body.hp,body.maxHp);assert.equal(body.combatPhase,1);assert.equal(r.bosses,0);assert(!r.pendingStage);
 for(let i=0;i<7000&&(!body.phaseDone||body.phaseAge<4||body.shield>0);i++){r.updateEnemies(.01);r.updateZones(.01);}assert(body.phaseDone);assert.equal(body.shield,0);r.hit(body,1e12,false);assert(body.dead);r.step(.01);assert.equal(r.mode,'won');
}
{
 const r=new Run();r.stage=3;r.spawnBoss();r.spawnClock=0;r.fireClock=Infinity;r.p.invuln=999;for(let i=0;i<100;i++)r.step(.05);assert.equal(r.enemies.filter(e=>!e.boss).length,0);
}
console.log('PASS nine Hub units,20-wave unlocks, fork gaps, finite blocking walls, old-path delayed blasts,3-ally nonstacking buff and cleanup,4 persistent plasma pools, fox flank-step,2100000HP,3 protected phases/2 forms, shield combo, orbital/sweep/double-rush and victory');
