const assert=require('node:assert/strict'),{Run}=require('./survivor-core.js'),D=require('./survivor-data.js');
function make(hero,ranks){const r=new Run(hero,'normal',()=>.99);Object.assign(r.ranks,ranks);r.takeStats();return r;}
function mob(r,x=1500,y=800){const e=r.spawn(6,{x,y});e.hp=e.maxHp=1e8;return e;}
function shot(r,e,kind=r.hero.kind){r.impact({kind,damage:r.stats.damage,x:e.x,y:e.y,angle:0,hit:new Set()},e);}
{
 const r=make('gpt',{focus:1,chain:1}),e=mob(r),other=mob(r,1540);shot(r,e);assert.equal(e.judgmentStacks,1);assert.equal(other.judgmentStacks,1);shot(r,e);const hp=e.hp;shot(r,e);assert.equal(e.judgmentStacks,0);assert(hp-e.hp>r.stats.damage*2);assert(r.popups.some(p=>JSON.stringify(p).includes('因果裁决')));
 e.shield=3;const protectedHp=e.hp;shot(r,e);assert.equal(e.hp,protectedHp);assert.equal(e.judgmentStacks,0);
}
{
 const r=make('glm',{frost:3,shatter:1}),e=mob(r),other=mob(r,1550);shot(r,e);assert.equal(e.chillStacks,1);shot(r,other);assert.equal(other.chillStacks,1);assert.equal(e.freeze,0);shot(r,e);assert(e.freeze>=1.4);const hp=other.hp;shot(r,e);assert(other.hp<hp-r.stats.damage*.5);assert(e.shatterSpent);const count=r.popups.length;shot(r,e);assert.equal(r.popups.length,count,'one resonance per freeze');
 r.spawnBoss();const boss=r.enemies.find(e=>e.boss);shot(r,boss);shot(r,boss);assert(!boss.freeze);assert(boss.exposed>0);
}
{
 const r=make('deepseek',{pressure:2,tide:1,undertow:1}),e=mob(r);for(let i=0;i<3;i++)r.hydroMark(e);const hp=e.hp;r.hydroMark(e);assert.equal(e.hydroStacks,0);assert(hp-e.hp>r.stats.damage*2);
 for(let i=0;i<10;i++)r.zone(e.x,e.y,100,3,0,'water');r.updateZones(.01);assert.equal(e.hydroStacks,1,'overlapping water only adds one pressure stack');r.time+=.5;for(const z of r.zones)z.tick=0;r.updateZones(.01);assert.equal(e.hydroStacks,2);
}
for(const hero of D.heroes)for(const route of hero.routes){const base=make(hero.id,{}),r=make(hero.id,{[route.id]:1});if(hero.id!=='gemini'){assert(r.stats.damage>base.stats.damage,hero.id+'/'+route.id);const hp=r.stats.damage;r.quantizations[route.id]=1;r.takeStats();assert(r.stats.damage>hp);}}
console.log('PASS per-target judgment/chill/pressure, protected targets, boss CC resistance, nonrecursive shatter, water overlap limit and all18 non-Gemini route/quantization damage gains');
