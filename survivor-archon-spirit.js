/* Archon SPIRIT ONLY: independent full health, one phase and its own skill values. */
(function(root){
'use strict';
const config={
 form:'spirit',name:'永恒中枢圣尊 · 本体',maxHp:2100000,speed:103.95,damage:34,radius:52,sprite:10,phaseCount:1,minPhaseSeconds:4,awakening:.8,cooldownScale:.45,
 phaseNames:['四权全开'],
 phaseSkills:[['aegis','orbital','quantum','rush']],
 skills:{
  aegis:{warning:.55,duration:3,radius:100,cooldown:6,thunder:{count:10,radius:80,spacing:190,jitter:8,warning:.6,duration:.3,damage:1.35}},
  orbital:{count:6,warning:1,interval:.22,radius:100,spread:120,prediction:.15,duration:.35,damage:1.35,cooldown:4.5,annihilation:{duration:5,interval:.5,damage:.45}},
  quantum:{warning:.6,life:8,speed:135,radius:46,auraRadius:160,interval:.5,damage:.5,cooldown:4.5},
  rush:{warning:.55,duration:.2,length:760,radius:38,count:2,damage:1.4,cooldown:4.5,
   slash:{warning:.6,duration:.28,radius:560,spread:Math.PI*4/9,damage:1.6}}
 }
};
function cast(run,e,skill){
 const c=config.skills[skill];if(!c)return;
 if(skill==='aegis'){run.hubWarn(e,'aegis',c.warning,{r:c.radius,duration:c.duration,thunder:{...c.thunder}});e.windup=c.warning;}
 if(skill==='orbital'){
  const v=run.playerVelocity||{x:0,y:0};
  for(let i=0;i<c.count;i++){const offset=i===0?0:c.spread,turn=i*2.4;
   run.hubWarn(e,'orbital',c.warning+i*c.interval,{x:run.hubClamp(run.p.x+v.x*i*c.prediction+Math.cos(turn)*offset,70,run.world.w-70),y:run.hubClamp(run.p.y+v.y*i*c.prediction+Math.sin(turn)*offset,70,run.world.h-70),r:c.radius,duration:c.duration,damage:e.damage*c.damage,last:i===c.count-1,annihilation:{...c.annihilation}});
  }e.windup=c.warning+(c.count-1)*c.interval+c.duration;
 }
 if(skill==='quantum'){run.hubWarn(e,'quantum',c.warning,{r:c.auraRadius,quantum:{...c}});e.windup=c.warning;}
 if(skill==='rush')run.hubRushLock(e,1,c.count);
}
// Jittered, shuffled slots guarantee separated circles, including at world edges.
function thunder(run,e,c){
 const half=c.spacing*1.5+c.jitter,margin=half+c.radius;
 const cx=run.hubClamp(run.p.x+(run.random()-.5)*120,margin,run.world.w-margin),cy=run.hubClamp(run.p.y+(run.random()-.5)*120,margin,run.world.h-margin),slots=[];
 for(let row=0;row<4;row++)for(let col=0;col<4;col++)slots.push({x:cx+(col-1.5)*c.spacing,y:cy+(row-1.5)*c.spacing});
 for(let i=slots.length-1;i>0;i--){const j=Math.min(i,Math.floor(run.random()*(i+1)));[slots[i],slots[j]]=[slots[j],slots[i]];}
 for(const point of slots.slice(0,c.count))run.hubWarn(e,'spiritThunder',c.warning,{x:point.x+(run.random()*2-1)*c.jitter,y:point.y+(run.random()*2-1)*c.jitter,r:c.radius,duration:c.duration,damage:e.damage*c.damage});
}
function orb(run,e,c){
 const angle=Math.atan2(run.p.y-e.y,run.p.x-e.x),offset=e.r+c.radius+12;
 return run.hubField('quantum',e,c.life,{x:run.hubClamp(e.x+Math.cos(angle)*offset,c.radius,run.world.w-c.radius),y:run.hubClamp(e.y+Math.sin(angle)*offset,c.radius,run.world.h-c.radius),r:c.auraRadius,coreRadius:c.radius,speed:c.speed,interval:c.interval,damage:e.damage*c.damage});
}
const API={config,cast,thunder,orb};if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.ArchonSpirit=API;
})(typeof window==='undefined'?globalThis:window);
