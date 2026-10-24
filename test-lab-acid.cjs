const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function make(type){const r=new Run('gpt','normal',()=>.5);r.stage=1;r.p.invuln=999;const e=r.spawn(type);e.x=900;e.y=800;e.clock=0;return [r,e];}
{
 const [r,e]=make(17);e.speed=0;r.p.x=e.x+275.01;r.p.y=e.y;
 for(let i=0;i<100;i++){r.updateLabEnemy(e,.01);r.updateZones(.01);}assert(!r.hazards.length&&!r.labFields.length);assert(e.clock<=0,'out-of-range waiting must not consume cooldown');
 r.p.x=e.x+275;r.updateLabEnemy(e,.01);const h=r.hazards.find(h=>h.type==='acid');assert(h,'fire as soon as player edge enters actual spray radius');near(h.total,.85);r.updateZones(.85);
 const f=r.labFields.find(f=>f.kind==='acid');assert(f);near(f.life,5);near(e.windup,0);const position={x:f.x,y:f.y,angle:f.angle};
 e.speed=50;r.p.x=e.x+80;const x=e.x;r.updateLabEnemy(e,.1);assert(e.x!==x,'emitter can move on the first update after spraying');near(f.x,position.x);near(f.y,position.y);near(f.angle,position.angle);
 r.p.x=f.x+100;r.p.y=f.y;r.p.invuln=0;const hp=r.p.hp;r.updateLabFields(.01);assert(r.p.hp<hp);r.p.invuln=999;r.updateLabFields(4.98);assert(r.labFields.includes(f));r.updateLabFields(.01);assert(!r.labFields.includes(f));
}
{
 const [r,e]=make(17);r.p.x=e.x+500;r.p.y=e.y;const x=e.x;r.updateLabEnemy(e,.1);assert(e.x>x,'approach until spray reaches player');assert(!r.hazards.length);
}
for(const step of [.01,.02,.05])for(const angle of [0,Math.PI/2]){
 const [r,e]=make(19);e.speed=0;e.clock=999;e.stabs=3;r.p.x=1700;r.p.y=800;const x=e.x,y=e.y;r.resolveLabHazard({source:e.id,type:'stab',angle});let elapsed=0;
 while(elapsed<.28-1e-9){const dt=Math.min(step,.28-elapsed);r.updateLabEnemy(e,dt);elapsed+=dt;}
 near(Math.hypot(e.x-x,e.y-y),560*.28*1.3);near(e.chargeTime,0);assert.equal(e.stabs,2);assert(r.hazards.some(h=>h.type==='stab'),'continuous combo still schedules next thrust');
}
console.log('PASS acid waits outside actual range without consuming cooldown, approaches and fires at range, cloud stationary for exactly5s with damage, emitter moves immediately; thrust distance203.84=old×1.3 at multiple frame rates/directions, combo retained');
