const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function make(difficulty='normal'){const r=new Run('gpt',difficulty,()=>.5);r.stage=1;r.spawnBoss();const e=r.enemies.find(e=>e.boss);e.clock=999;e.speed=0;r.p.invuln=999;return [r,e];}
function tick(r,time,{enemies=false,bullets=false}={}){for(let i=0;i<Math.round(time/.01);i++){if(enemies)r.updateEnemies(.01);if(bullets)r.updateBullets(.01);r.updateZones(.01);}}
{
 const [r,e]=make();r.p.x=1200;r.p.y=800;r.castLabBoss(e,'barrier',0);r.p.x=1230;r.p.y=810;tick(r,.8);
 const f=r.labFields.find(f=>f.kind==='barrier');assert(f);assert.equal(f.segments.length,4);close(f.x,1230);close(f.y,810);close(f.life,5);
 for(const [dx,dy] of [[900,0],[-900,0],[0,900],[0,-900],[900,900]]){r.p.x=f.x+dx;r.p.y=f.y+dy;r.labWallBlock(f.x,f.y);assert(Math.abs(r.p.x-f.x)<=187);assert(Math.abs(r.p.y-f.y)<=187);}
 tick(r,4.99);assert(r.labFields.includes(f));tick(r,.01);assert(!r.labFields.includes(f));assert(e.labSeen.has('barrier'));
 // Near arena corners, both the trap and original map boundary remain valid.
 r.p.x=25;r.p.y=25;r.castLabBoss(e,'barrier',0);tick(r,.8);r.p.x=-500;r.p.y=-500;r.labWallBlock(25,25);assert.equal(r.p.x,25);assert.equal(r.p.y,25);
}
{
 const [r,e]=make();r.castLabBoss(e,'laser',.4);const h=r.hazards[0];close(h.angles[1]-h.angles[0],Math.PI*2/3);close(h.angles[2]-h.angles[1],Math.PI*2/3);tick(r,.9);
 const f=r.labFields.find(f=>f.kind==='laser');assert(f);tick(r,1.25);close(f.rotation,Math.PI/2);e.x+=10;e.y+=30;tick(r,1.25);close(f.x,e.x);close(f.y,e.y);close(f.rotation,Math.PI);assert(!e.labSeen?.has('laser'));tick(r,2.49);assert(r.labFields.includes(f));assert(!e.labSeen?.has('laser'));tick(r,.01);close(f.rotation,Math.PI*2);assert(!r.labFields.includes(f));assert(e.labSeen.has('laser'));
 // A beam must hit when its swept arc crosses the player between the two sampled angles.
 r.labFields=[{kind:'laser',source:e.id,x:e.x,y:e.y,life:5,max:5,tick:0,baseAngle:0,rotation:0,angles:[0,Math.PI*2/3,Math.PI*4/3],damage:10}];r.p.x=e.x+Math.cos(Math.PI/100)*3000;r.p.y=e.y+Math.sin(Math.PI/100)*3000;r.p.invuln=0;const hp=r.p.hp;r.updateLabFields(.05);assert(r.p.hp<hp);
}
{
 const [r,e]=make();r.p.x=1000;r.p.y=700;r.castLabBoss(e,'bombard',0);const shots=[],resolve=r.resolveLabHazard.bind(r);let time=0;r.resolveLabHazard=h=>{if(h.type==='bombard')shots.push({x:h.x,y:h.y,i:h.bombIndex,time});resolve(h);};
 for(let i=0;i<251;i++){time=i*.01;r.p.x=1000+i;r.p.y=700+i*.1;r.updateZones(.01);if(i===199)assert(!e.labSeen?.has('bombard'));}
 assert.equal(shots.length,5);assert.deepEqual(shots.map(s=>s.i),[1,2,3,4,5]);assert(shots.every((s,i)=>!i||s.x>shots[i-1].x));for(let i=1;i<5;i++)close(shots[i].time-shots[i-1].time,.5);assert(e.labSeen.has('bombard'));
 for(const diff of ['easy','normal','hard']){const [r,e]=make(diff);r.stats.armor=.95;r.p.invuln=0;e.damage=99999;const hp=r.p.hp;r.resolveLabHazard({type:'bombard',source:e.id,x:r.p.x,y:r.p.y,r:85,bombIndex:1});close(hp-r.p.hp,20);}
}
{
 const [r,e]=make();r.castLabBoss(e,'control',0);tick(r,.7);const units=r.enemies.filter(e=>e.controlled);assert.equal(units.length,3);for(const u of units){const baseline=new Run('gpt','normal',()=>.5);baseline.stage=1;baseline.phase='boss';const ordinary=baseline.spawn(u.type);close(u.hp,ordinary.hp*5);close(u.maxHp,ordinary.maxHp*5);}
 const u=units[0];r.p.x=u.x+180;r.p.y=u.y;const old=u.x;r.updateLabEnemy(u,.1);assert(u.x>old);u.x=r.p.x-60;u.y=r.p.y;r.updateLabEnemy(u,.01);assert(u.suicideArmed);const h=r.hazards.find(h=>h.type==='suicide'&&h.source===u.id);assert(h);r.p.invuln=0;r.stats.armor=.99;const hp=r.p.hp;tick(r,.59);close(r.p.hp,hp);tick(r,.01);close(hp-r.p.hp,30);assert(u.dead);
 const killed=units[1];killed.x=r.p.x;killed.y=r.p.y;r.updateLabEnemy(killed,.01);assert(r.hazards.some(h=>h.source===killed.id));r.hit(killed,1e9,false);assert(!r.hazards.some(h=>h.source===killed.id));r.p.invuln=0;const before=r.p.hp;tick(r,.7);close(before,r.p.hp);
 const last=units[2];r.hit(last,1e9,false);tick(r,.01);assert(e.labSeen.has('control'));
}
{
 const [r,e]=make();r.castLabBoss(e,'saws',0);tick(r,.4);const f=r.labFields.find(f=>f.kind==='saws');tick(r,1.21);assert.equal(f.collected,4);assert.equal(r.hostile.length,0);assert(!e.labSeen?.has('saws'));tick(r,.39);const blades=r.hostile.filter(b=>b.kind==='saw');assert.equal(blades.length,4);assert(e.labSeen.has('saws'));for(const b of blades){close(Math.hypot(b.vx,b.vy),440);const dx=r.p.x-b.x,dy=r.p.y-b.y;assert(Math.abs(dx*b.vy-dy*b.vx)<1e-5);}
 const old=blades.map(b=>[b.x,b.y]);r.updateBullets(.01);assert(blades.some((b,i)=>b.x!==old[i][0]||b.y!==old[i][1]));e.hp=0;r.kill(e);assert.equal(r.hostile.length,0);
}
{
 const [r,e]=make();r.developerSetCombat('invulnerable',true);r.p.invuln=0;const hp=r.p.hp;r.resolveLabHazard({type:'bombard',source:e.id,x:r.p.x,y:r.p.y,r:85,bombIndex:1});close(r.p.hp,hp);
}
{
 const [r,e]=make(),complete=new Set(),finish=r.labComplete.bind(r);r.labComplete=(e,s)=>{complete.add(s);finish(e,s);};e.clock=0;
 for(let phase=1;phase<=3;phase++){r.hit(e,1e9,false);assert(!e.dead);for(let i=0;i<4000&&(!e.phaseDone||e.phaseAge<4);i++){r.updateEnemies(.01);r.updateZones(.01);}assert(e.phaseDone,'phase '+phase);r.hit(e,1e9,false);}
 assert(e.dead);assert.deepEqual([...complete].sort(),['barrier','bombard','control','laser','saws']);assert.equal(r.hazards.length,0);assert.equal(r.labFields.length,0);assert.equal(r.hostile.length,0);
}
console.log('PASS square collision/5s/edges, 120-degree beams/360-degree 5s sweep, summoned units 5x HP/maxHP, five independently locked .5s bombardments, exact20/exact30, suicide interruption, four charging/launched blades, invulnerability, all three protected phases and cleanup');
