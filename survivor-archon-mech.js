/* Archon MECH ONLY: change these stats/skill values without changing the spirit. */
(function(root){
'use strict';
const config={
 form:'mech',name:'永恒中枢圣尊 · 机甲',maxHp:2100000,speed:103.95,damage:34,radius:52,sprite:9,phaseCount:3,minPhaseSeconds:4,phaseCooldownScales:[.55,.5,.45],
 phaseNames:['晶体护盾 · 轨道天光','横扫死光 · 矢量突进','机甲极限超频 · 四权全开'],
 phaseSkills:[['aegis','orbital'],['sweep','rush'],['aegis','orbital','sweep','rush']],
 skills:{
  aegis:{warning:.55,duration:5,radius:100,cooldown:6,pull:{duration:3,speed:150,stopPadding:8},pulse:{duration:2,radius:600,width:36,damage:1.5}},
  orbital:{count:6,warning:.5,radius:85,duration:.35,damage:1.35,cooldown:4.5,chainDelay:.15},
  sweep:{warning:1,duration:5,startOffset:-Math.PI/2,arc:Math.PI*2,beams:4,length:3200,radius:24,damage:1.15,cooldown:4.5},
  rush:{warning:.75,duration:.42,length:620,radius:38,count:1,damage:1.4,cooldown:4.5,
   slash:{warning:.6,duration:.28,radius:560,spread:Math.PI*4/9,damage:1.6}}
 }
};
function cast(run,e,skill){
 const c=config.skills[skill];if(!c)return;
 const a=Math.atan2(run.p.y-e.y,run.p.x-e.x);
 if(skill==='aegis'){run.hubWarn(e,'aegis',c.warning,{r:c.radius,duration:c.duration,pull:{...c.pull},pulse:{...c.pulse}});e.windup=c.warning;}
 if(skill==='orbital'){
  run.hubOrbitalLock(e,1,{...c});e.windup=0;e.clock=c.chainDelay;
 }
 if(skill==='sweep'){run.hubWarn(e,'sweep',c.warning,{angle:a+c.startOffset,length:c.length,r:c.radius,duration:c.duration,arc:c.arc,beams:c.beams,damage:e.damage*c.damage,spirit:false});e.windup=c.warning+c.duration;}
 if(skill==='rush')run.hubRushLock(e,1,c.count);
}
const API={config,cast};if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.ArchonMech=API;
})(typeof window==='undefined'?globalThis:window);
