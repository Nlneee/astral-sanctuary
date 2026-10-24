const assert=require('node:assert/strict'),D=require('./survivor-data.js'),{Run}=require('./survivor-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
for(const hero of D.heroes){
 const r=new Run(hero.id,'normal');r.spawnClock=r.fireClock=Infinity;r.stats.regen=0;
 assert.equal(r.useUniversalSkill(),false);near(r.universalCooldowns.reset,0);r.p.hp=r.p.maxHp-70;const hp=r.p.hp;assert(r.useUniversalSkill('reset'));near(r.p.hp,hp+50);near(r.universalCooldowns.reset,120);assert(!r.useUniversalSkill('reset'));near(r.p.hp,hp+50);
 for(let i=0;i<2399;i++)r.step(.05);near(r.universalCooldowns.reset,.05);assert(!r.useUniversalSkill());r.step(.05);assert(r.useUniversalSkill());near(r.p.hp,r.p.maxHp);near(r.universalCooldowns.reset,120);
 assert(r.avEvents.some(e=>e.name==='reset'));assert(r.effects.some(e=>e.type==='reset'));
}
for(const mode of ['paused','upgrade','stage','dead','won']){const r=new Run();r.p.hp=r.p.maxHp-40;r.universalCooldowns.reset=80;r.mode=mode;r.step(10);near(r.universalCooldowns.reset,80);r.universalCooldowns.reset=0;const hp=r.p.hp;assert(!r.useUniversalSkill());near(r.p.hp,hp);}
{const r=new Run();r.p.hp=r.p.maxHp-10;assert(r.useUniversalSkill());near(r.p.hp,r.p.maxHp);r.universalCooldowns.reset=37;r.developerJump(1,10);near(r.universalCooldowns.reset,37);r.mode='stage';r.advance();near(r.universalCooldowns.reset,37);near(new Run().universalCooldowns.reset,0);}
{const r=new Run();r.p.hp=0;assert(!r.useUniversalSkill());assert(!r.useUniversalSkill('unknown'));near(r.universalCooldowns.reset,0);}
console.log('PASS all7 heroes: fixed50 heal/cap,120 combat-second cooldown,one-shot activation,pause/upgrade/stage/end freeze,cross-stage persistence,new-run reset,heal AV and dead/full-health guards');
