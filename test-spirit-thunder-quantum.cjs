const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js'),mech=require('./survivor-archon-mech.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function make(random=()=>.5){const r=new Run('gpt','normal',random);r.stage=3;r.spawnBoss();const e=r.enemies[0];r.hubInitBoss(e,'spirit');e.x=1000;e.y=800;e.speed=0;e.clock=Infinity;r.p.x=1400;r.p.y=800;r.p.invuln=999;r.fireClock=r.spawnClock=Infinity;return [r,e];}
function zones(r,t){for(let i=0;i<Math.round(t/.01);i++){r.time+=.01;r.updateZones(.01);}}
for(const random of [()=>0,()=>.5,()=>.999999,Math.random])for(const point of [[25,25],[2775,25],[25,1775],[2775,1775],[1400,900]]){
 const [r,e]=make(random);r.p.x=Math.min(point[0],r.world.w-25);r.p.y=Math.min(point[1],r.world.h-25);r.hubCast(e,'aegis');zones(r,.55);near(e.shield,3);
 const marks=r.hazards.filter(h=>h.type==='spiritThunder');assert.equal(marks.length,10);
 for(let i=0;i<marks.length;i++){const a=marks[i];near(a.r,80);near(a.t,.6);assert(a.x-a.r>=0&&a.x+a.r<=r.world.w&&a.y-a.r>=0&&a.y+a.r<=r.world.h);for(const b of marks.slice(i+1))assert(Math.hypot(a.x-b.x,a.y-b.y)>a.r+b.r,'no overlapping circles even at corners');}
 const first=marks[0];r.p.x=first.x;r.p.y=first.y;let hits=0;r.hurt=()=>hits++;zones(r,.59);assert.equal(hits,0);zones(r,.01);assert.equal(hits,1);assert.equal(r.hubFields.filter(f=>f.kind==='spiritThunder').length,10);zones(r,.3);assert.equal(hits,1);assert(!r.hubFields.some(f=>f.kind==='spiritThunder'));
}
{
 const [r,e]=make();r.hubCast(e,'quantum');zones(r,.59);assert(!r.hubFields.length);zones(r,.01);
 const orb=r.hubFields.find(f=>f.kind==='quantum');assert(orb);near(orb.max,8);near(orb.r,160);near(orb.coreRadius,46);assert.equal(r.hostile.length,0);
 const x=orb.x;let hits=0,damage=0;r.hurt=n=>{hits++;damage=n;};zones(r,.5);near(orb.x,x+135*.5);assert.equal(hits,0,'outside moving aura is safe');
 r.p.x=orb.x;r.p.y=orb.y+100;const y=orb.y;zones(r,.5);assert(orb.y>y,'tracks changed player position');assert.equal(hits,1);near(damage,e.damage*.5);
 zones(r,1);assert.equal(hits,3);assert(r.hubFields.includes(orb),'contact never consumes the orb');
 r.p.x=orb.x+1000;zones(r,.5);assert.equal(hits,3,'leaving aura stops damage');
 r.pause();const life=orb.life;r.step(.05);near(orb.life,life);r.resume();zones(r,5.49);assert(orb.life>0);assert(!e.hubSeen.has('quantum'));zones(r,.01);assert(!r.hubFields.includes(orb));assert(e.hubSeen.has('quantum'));
}
{
 const [r,e]=make(),created=[];const field=r.hubField.bind(r);r.hubField=(kind,owner,life,extra)=>{const f=field(kind,owner,life,extra);if(kind==='annihilation')created.push({f,birth:r.time});return f;};
 r.hubCast(e,'orbital');const targets=r.hazards.map(h=>({x:h.x,y:h.y,r:h.r}));zones(r,2.1);assert.equal(created.length,6);
 for(let i=0;i<6;i++){const {f,birth}=created[i];near(birth,1+i*.22);near(f.max,5);near(f.x,targets[i].x);near(f.y,targets[i].y);near(f.r,targets[i].r);}
 r.p.x=25;r.p.y=25;e.x+=300;e.y+=100;zones(r,3.89);assert.equal(r.hubFields.filter(f=>f.kind==='annihilation').length,6);zones(r,.01);assert.equal(r.hubFields.filter(f=>f.kind==='annihilation').length,5);
 for(let i=0;i<6;i++){near(created[i].f.x,targets[i].x);near(created[i].f.y,targets[i].y);}zones(r,1.1);assert(!r.hubFields.some(f=>f.kind==='annihilation'));
}
{
 const [r,e]=make();r.hubCast(e,'orbital');const h=r.hazards[0];r.hazards=[];r.p.x=h.x;r.p.y=h.y;let hits=0,last=0;r.hurt=n=>{hits++;last=n;};r.resolveHubHazard(h);assert.equal(hits,1);near(last,e.damage*1.35);zones(r,.49);assert.equal(hits,1);zones(r,.01);assert.equal(hits,2);near(last,e.damage*.45);zones(r,1);assert.equal(hits,4);
 r.p.x=h.x+h.r+r.p.r+100;zones(r,.5);assert.equal(hits,4);r.hubCast(e,'quantum');zones(r,.6);r.developerJump(1,1);assert(!r.hubFields.length&&!r.hazards.length&&!r.hostile.length);
}
{
 const [r,e]=make();r.hubCast(e,'quantum');zones(r,.6);r.p.x=e.x;r.p.y=e.y;r.p.invuln=0;r.p.hp=r.p.maxHp=10000;r.stats.armor=.5;zones(r,.01);near(r.p.hp,10000-e.damage*.5*.5);r.developerCombat.invulnerable=true;
 const hp=r.p.hp;zones(r,1);near(r.p.hp,hp);
}
assert.equal(mech.config.skills.sweep.beams,4);near(mech.config.skills.sweep.duration,5);assert(!mech.config.skills.aegis.thunder);
console.log('PASS10 separated shield lightning marks, one8s tracking orb with persistent periodic aura, six fixed5s impact pools, independent expiry, armor/invulnerability, pause/cleanup and mech isolation');
