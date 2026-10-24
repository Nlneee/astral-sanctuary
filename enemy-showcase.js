/* Special-enemy demonstrations run the production AI and damage simulation. */
(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports,D=node?require('./survivor-data.js'):root.SurvivorData,S=node?require('./survivor-specials.js'):root.SurvivorSpecials,{Run}=node?require('./survivor-core.js'):root.SurvivorCore;
const groups=[[9,10,11,12],[17,18,19,20,21],[26,27,28,29,30],[35,36,37,38,39]];
const catalog=groups.map((types,stage)=>({stage,name:D.stages[stage].name,skills:types.map(type=>{const e=D.enemies[type],c=S.definitions[e.behavior];return {id:e.behavior,type,name:e.name,desc:c.title+'：'+c.desc};})}));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class Session{
 constructor(stage=0,id=catalog[stage]?.skills[0]?.id,hero='gpt',edits={}){
  const item=catalog[stage]?.skills.find(s=>s.id===id);if(!item)throw Error('Unknown special-enemy demo');
  this.kind='special';this.stage=stage;this.skill=item;this.run=new Run(hero,'normal',()=>.5);const r=this.run;
  r.stage=stage;r.wave=10;r.phase='wave';r.p.x=1400;r.p.y=800;r.p.maxHp=r.p.hp=1000000;r.spawnClock=r.fireClock=Infinity;r.specialOverrides={[id]:{...edits.skill}};
  const e=r.spawn(item.type,{x:1000,y:800});this.enemy=e;this.defaults={hp:e.maxHp,speed:e.speed,damage:e.damage};
  for(const [key,lo,hi]of [['hp',1,1e7],['speed',0,500],['damage',0,1000]])if(Number.isFinite(Number(edits.stats?.[key])))e[key]=clamp(Number(edits.stats[key]),lo,hi);
  if(Number.isFinite(Number(edits.stats?.hp)))e.maxHp=e.hp;
  Object.assign(e,{x:1000,y:800,basic:false,clock:0,xp:0});
  if(id==='toad')e.x=1300;if(id==='acid'||id==='dragon')e.x=1160;if(id==='lancer'||id==='tiger')e.x=1050;
  if(['deer','repair','harmonist'].includes(id)){
   e.x=1170;
   for(let i=0;i<3;i++){const ally=r.spawn(D.stages[stage].pool[i%D.stages[stage].pool.length],{x:900,y:600});Object.assign(ally,{x:1090+i*90,y:i%2?660:920,speed:0,clock:Infinity,basic:true,xp:0,demoAlly:true,hp:ally.maxHp*.4});}
  }
  if(id==='chronist')r.hubTrail=Array.from({length:20},(_,i)=>({x:1100+i*15,y:730+Math.sin(i*.17)*100,time:-2+i*.1}));
  r.phase='boss';this.started=false;this.finished=false;this.finishedFor=0;this.manualGrace=0;this.applied={stats:{hp:e.maxHp,speed:e.speed,damage:e.damage},skill:{...r.specialConfig(e)}};delete this.applied.skill.title;delete this.applied.skill.desc;
 }
 step(dt,input={},autoMove=true){
  const r=this.run,e=this.enemy;if(r.mode!=='playing')return;
  if(input.x||input.y)this.manualGrace=2;else this.manualGrace=Math.max(0,this.manualGrace-dt);
  if(autoMove&&!this.manualGrace){const a=r.time*.55,dx=1400+Math.cos(a)*75-r.p.x,dy=800+Math.sin(a)*120-r.p.y,d=Math.hypot(dx,dy);input=d>5?{x:dx/d*.5,y:dy/d*.5}:{};}
  r.spawnClock=r.fireClock=Infinity;if(this.started)e.clock=Infinity;
  r.step(dt,input);if(e.specialCycle>0)this.started=true;
  const busy=r.hazards.some(h=>h.source===e.id)||[...r.labFields,...r.skyFields,...r.hubFields].some(f=>f.source===e.id)||r.hostile.some(b=>b.source===e.id)||(e.chargeTime||0)>0||(e.burstLeft||0)>0||(e.veil||0)>0||(e.stabs||0)>0||(e.skyDashes||0)>0;
  const minimum=['deer','repair','harmonist'].includes(e.behavior)?3:1;
  this.finishedFor=this.started&&!busy&&r.time>=minimum?this.finishedFor+dt:0;this.finished=this.finishedFor>=.9;
 }
 snapshot(){const r=this.run,e=this.enemy;return {kind:'special',stage:this.stage,skill:this.skill.id,time:r.time,finished:this.finished,damageTaken:r.p.maxHp-r.p.hp,alive:e.hp>0&&!e.dead,stats:{hp:e.maxHp,speed:e.speed,damage:e.damage},hostile:r.hostile.length,hazards:r.hazards.map(h=>h.type),fields:[...r.labFields,...r.skyFields,...r.hubFields].map(f=>f.kind),castCount:e.specialCycle||0};}
}
const API={catalog,Session};if(node)module.exports=API;else root.EnemyShowcase=API;
})(typeof window==='undefined'?globalThis:window);
