const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js'),D=require('./survivor-data.js');
const make=(type)=>{const r=new Run('gpt','normal',()=>.5);r.p.invuln=0;r.wave=10;const e=r.spawn(type);e.x=900;e.y=800;e.clock=0;return [r,e];};
const tick=(r,t)=>{for(let i=0;i<Math.ceil(t/.02);i++){r.updateEnemies(.02);r.updateZones(.02);}};
{const [r,e]=make(6);r.updateEnemies(.1);assert(e.x>900);}
{const [r,e]=make(7);r.updateEnemies(.1);assert(e.dive>0);assert(e.x>900);}
{const [r,e]=make(8);r.updateEnemies(.01);assert(e.burrow>0);const hp=e.hp;r.hit(e,999,false);assert.equal(e.hp,hp);const h=r.hazards[0];r.p.x=1500;tick(r,1);assert.equal(e.burrow,0);assert(e.x>1200);assert.equal(r.p.hp,r.p.maxHp);}
{const [r,e]=make(9);r.updateEnemies(.01);assert.equal(r.hostile.length,0);tick(r,1.5);assert.equal(r.hostile.length,15);}
{const [r,e]=make(10);e.x=1100;r.updateEnemies(.01);assert.equal(r.hazards[0].type,'pulse');r.p.x=2200;tick(r,3.1);assert(r.p.hp<r.p.maxHp);assert(e.dead);}
{const [r,e]=make(10);e.x=1100;r.updateEnemies(.01);r.hit(e,999,false);assert.equal(r.hazards.length,0);tick(r,3.2);assert.equal(r.p.hp,r.p.maxHp);}
{const [r,e]=make(11);r.updateEnemies(.01);const x=e.x;tick(r,.8);assert.equal(e.x,x);r.p.y=1000;tick(r,.4);assert(e.chargeTime>0);assert(e.chargeX>500);assert(Math.abs(e.chargeY)<1);}
{const [r,e]=make(12);const ally=r.spawn(6);ally.x=e.x+50;ally.y=e.y;ally.hp=10;r.updateEnemies(.01);assert(ally.hp>10);assert(ally.hp<=ally.maxHp);}
// Three-stage boss behavior is exercised by test-boss-phases.cjs.

assert.deepEqual(D.stages[1].pool,[13,14,15,16]);assert.deepEqual(D.stages[0].wavePools.map(p=>p.length),[3,3,3,3,4,4,6,6,6,...Array(11).fill(7)]);
console.log('PASS all 8 beast behaviors, warnings, kill interruptions, capped healing, fixed charge direction, warp/claw, stage isolation');
