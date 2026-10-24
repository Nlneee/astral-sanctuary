/* Fourth-sector mechanics. This module installs on the shared browser/Node Run. */
(function(root){
'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const node=typeof module!=='undefined'&&module.exports,mech=node?require('./survivor-archon-mech.js'):root.ArchonMech,spirit=node?require('./survivor-archon-spirit.js'):root.ArchonSpirit;
const required=mech.config.phaseSkills;
const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);};
const methods={
 hubClamp:clamp,
 hubFormConfig(e){return (e.hubForm==='spirit'?spirit:mech).config;},
 hubRequired(e){return this.hubFormConfig(e).phaseSkills[e.combatPhase-1]||[];},
 hubUnlocked(e){return [...new Set(this.hubFormConfig(e).phaseSkills.slice(0,e.combatPhase).flat())];},
 hubSkillLabel(e){return this.hubFormConfig(e).phaseNames[e.combatPhase-1];},
 hubInitBoss(e,form='mech'){
  e.hubForm=form;const c=this.hubFormConfig(e);
  Object.assign(e,{name:c.name,maxHp:c.maxHp*this.diff.hp,hp:c.maxHp*this.diff.hp,speed:c.speed,damage:c.damage*this.diff.damage,r:c.radius,sprite:c.sprite,combatPhase:1,phaseAge:0,phaseDone:false,skillCycle:0,hubSeen:new Set(),hubIntro:0,clock:.6,windup:0,shield:0,veil:0,quantumCharge:0,slow:0,burn:0,freeze:0,flash:0,orbitHit:0,chargeTime:0,hubArmor:0,hubBoost:false,exposed:0,color:form==='spirit'?'#c9edff':'#ffe3a5'});
  return e;
 },
 hubAscend(e){
  this.hubCleanup(e);e.hp=0;e.dead=true;
  const body=this.hubInitBoss({...e,id:this.id++,dead:false},'spirit');
  body.hubIntro=spirit.config.awakening;body.clock=body.hubIntro;
  this.enemies=this.enemies.filter(o=>o!==e);this.enemies.push(body);
  this.effect(body.x,body.y,170,'#d4efff');this.cue('phase',body.x,body.y,'#c9edff');
  this.notify('机甲外壳击破 · 本体觉醒，独立生命已充满','boss');return body;
 },
 hubCastMech(e,skill){return mech.cast(this,e,skill);},
 hubCastSpirit(e,skill){return spirit.cast(this,e,skill);},
 hubSpiritThunder(e,c){return spirit.thunder(this,e,c);},
 hubQuantumOrb(e,c){return spirit.orb(this,e,c);},
 recordHubTrail(dt){
  if(this.stage!==3)return;
  this.hubTrail??=[];this.hubTrailClock=(this.hubTrailClock||0)-dt;
  if(this.hubTrailClock<=0){this.hubTrailClock=.1;this.hubTrail.push({x:this.p.x,y:this.p.y,time:this.time});}
  this.hubTrail=this.hubTrail.filter(p=>p.time>=this.time-2.2).slice(-24);
 },
 updateHubLinks(){
  for(const e of this.enemies){e.hubArmor=0;e.hubBoost=false;e.hubSpeedScale=1;}
  for(const owner of this.enemies){
   if(owner.hp<=0||owner.dead||owner.behavior!=='harmonist')continue;
   const c=this.specialConfig(owner),previous=(owner.hubLinks||[]).join(',');
   owner.hubLinks=this.enemies.filter(e=>e!==owner&&!e.boss&&e.hp>0&&!e.dead&&e.behavior!=='harmonist'&&distance(e,owner)<=c.range).sort((a,b)=>distance(a,owner)-distance(b,owner)||a.id-b.id).slice(0,c.targets).map(e=>{e.hubArmor=c.armor;e.hubBoost=true;e.hubSpeedScale=c.speedScale;return e.id;});
   if(owner.hubLinks.length&&owner.hubLinks.join(',')!==previous)this.cue('hub-link',owner.x,owner.y,owner.color);
  }
 },
 hubCleanup(e){
  this.hubFields=this.hubFields.filter(f=>f.source!==e.id);
  this.hazards=this.hazards.filter(h=>h.source!==e.id);
  this.hostile=this.hostile.filter(h=>h.source!==e.id);
  if(e.behavior==='harmonist')this.updateHubLinks();
 },
 hubPhase(e){
  e.hubForm??='mech';e.hubSeen=new Set();e.sprite=this.hubFormConfig(e).sprite;
  this.hubCleanup(e);this.effect(e.x,e.y,150,e.hubForm==='spirit'?'#d9f5ff':'#ffd68f');
 },
 hubComplete(e,skill){
  if(!e?.boss||e.hp<=0||e.dead)return;
  e.hubSeen??=new Set();e.hubSeen.add(skill);e.phaseDone=this.hubRequired(e).every(s=>e.hubSeen.has(s));
 },
 hubWarn(e,type,t,extra={}){
  if(this.hazards.filter(h=>h.hub).length>=100)return;
  const h={hub:true,type,source:e.id,x:e.x,y:e.y,r:70,t,total:t,damage:e.damage,...extra};
  this.hazards.push(h);this.cue('warn-hub-'+type,h.x,h.y,e.color);return h;
 },
 hubField(kind,source,life,extra={}){
  if(this.hubFields.length>=64){const expendable=this.hubFields.find(f=>f.kind==='plasma');if(expendable)expendable.life=0;this.hubFields=this.hubFields.filter(f=>f.life>0);}
  if(this.hubFields.length>=64)return;
  const f={kind,source:source.id,x:source.x,y:source.y,life,max:life,tick:0,damage:source.damage,...extra};this.hubFields.push(f);return f;
 },
 hubCast(e,skill){
  if(e.boss)return e.hubForm==='spirit'?this.hubCastSpirit(e,skill):this.hubCastMech(e,skill);
  const a=Math.atan2(this.p.y-e.y,this.p.x-e.x);
  return this.castSpecial(e);
 },
 // Each shot snapshots the player's current position only when its own lock begins.
 hubOrbitalLock(e,shot,sequence){
  return this.hubWarn(e,'orbital',sequence.warning,{x:this.p.x,y:this.p.y,r:sequence.radius,duration:sequence.duration,damage:e.damage*sequence.damage,shot,totalShots:sequence.count,last:shot===sequence.count,sequence});
 },
 // Additive velocity preserves steering and passes through the same wall/bounds checks as WASD.
 hubPullVelocity(dt){
  const velocity={x:0,y:0};if(dt<=0)return velocity;
  for(const f of this.hubFields){
   if(f.kind!=='aegis'||!f.pull||f.life<=0)continue;
   const remaining=f.pull.duration-(f.max-f.life);if(remaining<=1e-8)continue;
   const e=this.enemies.find(e=>e.id===f.source&&e.hp>0&&!e.dead);if(!e)continue;
   const dx=e.x-this.p.x,dy=e.y-this.p.y,d=Math.hypot(dx,dy),stop=e.r+this.p.r+f.pull.stopPadding;
   if(d<=stop)continue;
   const speed=Math.min(f.pull.speed*Math.min(dt,remaining),d-stop)/dt;
   velocity.x+=dx/d*speed;velocity.y+=dy/d*speed;
  }return velocity;
 },
 hubMortarLock(e,shot){
  const a=shot*2.4,offset=shot===1?0:55;
  const c=this.specialConfig(e);return this.hubWarn(e,'plasma',c.warning,{x:clamp(this.p.x+Math.cos(a)*offset,c.radius,this.world.w-c.radius),y:clamp(this.p.y+Math.sin(a)*offset,c.radius,this.world.h-c.radius),r:c.radius,duration:c.duration,interval:c.tickInterval,damage:e.damage*c.damageScale});
 },
 hubRushLock(e,shot,total){
  const c=this.hubFormConfig(e).skills.rush,angle=Math.atan2(this.p.y-e.y,this.p.x-e.x);
  const h=this.hubWarn(e,'rush',c.warning,{angle,length:c.length,r:c.radius,duration:c.duration,damage:e.damage*c.damage,slash:{...c.slash},shot,totalShots:total});e.windup=c.warning+c.duration;return h;
 },
 hubRushSlashLock(e,f){
  const c=f.slash||this.hubFormConfig(e).skills.rush.slash,angle=Math.atan2(this.p.y-e.y,this.p.x-e.x);
  const h=this.hubWarn(e,'rushSlash',c.warning,{angle,r:c.radius,spread:c.spread,duration:c.duration,shot:f.shot,totalShots:f.totalShots,damage:e.damage*c.damage});
  e.windup=Math.max(e.windup||0,c.warning+c.duration);return h;
 },
 updateHubEnemy(e,dt){
  if(e.hubIntro>0){e.hubIntro=Math.max(0,e.hubIntro-dt);e.clock=Math.max(0,e.clock-dt);return;}
  e.clock-=dt;e.windup=Math.max(0,(e.windup||0)-dt);e.shield=Math.max(0,(e.shield||0)-dt);
  const a=Math.atan2(this.p.y-e.y,this.p.x-e.x),d=distance(e,this.p);
  let speed=e.speed*(e.hubBoost?(e.hubSpeedScale??1.25):1)*(e.slow>0?(e.boss?.78:e.hubBoost?.72:.48):1)*(e.freeze>0?0:1),angle=this.mobHeading(e,a);
  if(e.behavior==='disc'&&d<240)angle+=(e.id%2?1:-1)*.45;
  if(e.behavior==='fox'){
   if(d>190)angle+=(e.id%2?1:-1)*.48;
   e.foxClock=(e.foxClock??2.2)-dt;e.foxStep=Math.max(0,(e.foxStep||0)-dt);
   if(e.foxClock<=0&&d>160&&d<440&&e.freeze<=0){e.foxClock=4;e.foxStep=.22;this.effect(e.x,e.y,32,'#b2f5ff');this.cue('hub-fox',e.x,e.y,e.color);}
   if(e.foxStep>0){speed*=1.65;angle=this.mobHeading(e,a);}
  }
  if(['prism','chronist','harmonist','mortar'].includes(e.behavior)&&d<330)speed=d<185?-speed*.4:0;
  if(e.behavior==='wallBuilder'&&d<260)speed=0;
  const rushing=e.boss&&(this.hazards.some(h=>h.source===e.id&&['rush','rushSlash'].includes(h.type))||this.hubFields.some(f=>f.source===e.id&&['rush','rushSlash'].includes(f.kind)));
  if(e.windup>0||rushing||(e.boss&&d<150))speed=0;
  e.x=clamp(e.x+Math.cos(angle)*speed*dt,e.r,this.world.w-e.r);e.y=clamp(e.y+Math.sin(angle)*speed*dt,e.r,this.world.h-e.r);
  if(!rushing&&e.clock<=0&&e.windup<=0&&e.freeze<=0){
   if(e.boss){
    const active=skill=>this.hazards.some(h=>h.source===e.id&&h.type===skill)||this.hubFields.some(f=>f.source===e.id&&f.kind===skill);
    const unlocked=this.hubUnlocked(e).filter(s=>!active(s)),skill=this.hubRequired(e).find(s=>!e.hubSeen?.has(s)&&!active(s))||unlocked[e.skillCycle++%unlocked.length];
    if(skill){this.hubCast(e,skill);e.clock=this.hubFormConfig(e).skills[skill].chainDelay??this.bossCooldown(e,this.hubFormConfig(e).skills[skill].cooldown);}else e.clock=.1;
   }else if(e.elite)this.castSpecial(e);else e.clock=2;
  }
  if(d<e.r+this.p.r)this.hurt(e.damage);
 },
 resolveHubHazard(h){
  const e=this.enemies.find(e=>e.id===h.source&&e.hp>0&&!e.dead);if(!e)return;
  this.cue('hub-'+h.type,h.x,h.y,e.color);
  const field=(kind,life,extra={})=>this.hubField(kind,e,life,{x:h.x,y:h.y,r:h.r,angle:h.angle,length:h.length,damage:h.damage,...extra});
  if(h.type==='prism')field('prism',h.duration??.6,{angles:h.angles});
  if(h.type==='wall'){
   const walls=this.hubFields.filter(f=>f.kind==='wall'&&f.life>0);if(walls.length>=3)walls[0].life=0;
   field('wall',h.duration??3.5,{segments:h.segments});
  }
  if(h.type==='trace'){field('trace',h.duration??.3);if(distance(this.p,h)<h.r+this.p.r)this.hurt(h.damage);}
  if(h.type==='plasma')field('plasma',h.duration??4.5,{interval:h.interval??.5});
  if(h.type==='aegis'){
   e.shield=h.duration;field('aegis',h.duration,{r:h.r,pull:h.pull,pulse:h.pulse});e.windup=0;e.clock=0;
   if(h.thunder){this.hubSpiritThunder(e,h.thunder);e.clock=h.thunder.warning+h.thunder.duration;}
  }
  if(h.type==='spiritThunder'){field('spiritThunder',h.duration);if(distance(this.p,h)<h.r+this.p.r)this.hurt(h.damage);}
  if(h.type==='quantum')this.hubQuantumOrb(e,h.quantum);
  if(h.type==='orbital'){
   field('orbital',h.duration,{last:h.last});if(distance(this.p,h)<h.r+this.p.r)this.hurt(h.damage);
   if(h.annihilation)field('annihilation',h.annihilation.duration,{interval:h.annihilation.interval,tick:h.annihilation.interval,damage:e.damage*h.annihilation.damage});
   if(h.sequence&&!h.last)this.hubOrbitalLock(e,h.shot+1,h.sequence);
  }
  if(h.type==='sweep')field('sweep',h.duration,{spirit:h.spirit,arc:h.arc,beams:h.beams});
  if(h.type==='rushSlash'){
   field('rushSlash',h.duration,{spread:h.spread,shot:h.shot,totalShots:h.totalShots});
   if(this.inSector(h,this.p))this.hurt(h.damage);
  }
  if(h.type==='rush'){
   const x2=clamp(e.x+Math.cos(h.angle)*h.length,e.r,this.world.w-e.r),y2=clamp(e.y+Math.sin(h.angle)*h.length,e.r,this.world.h-e.r);
   field('rush',h.duration,{x:e.x,y:e.y,x2,y2,slash:h.slash,shot:h.shot,totalShots:h.totalShots});
  }
 },
 hubRayHits(f,angle,radius){
  const dx=this.p.x-f.x,dy=this.p.y-f.y,along=dx*Math.cos(angle)+dy*Math.sin(angle),across=Math.abs(-dx*Math.sin(angle)+dy*Math.cos(angle));
  return along>=0&&along<=f.length&&across<=radius+this.p.r;
 },
 updateHubFields(dt){
  for(const f of [...this.hubFields]){
   const e=this.enemies.find(e=>e.id===f.source&&e.hp>0&&!e.dead);if(!e){f.life=0;continue;}
   const oldAge=f.max-f.life;f.life=Math.max(0,f.life-dt);f.tick-=dt;const age=f.max-f.life;
   if(f.kind==='mortarQueue'){
    f.next-=dt;while(f.shot<f.total&&f.next<=1e-8){const h=this.hubMortarLock(e,++f.shot);if(h)h.deferTick=true;f.next+=f.interval??.35;}
   }
   if(f.kind==='quantum'&&f.life>1e-8){
    const dx=this.p.x-f.x,dy=this.p.y-f.y,d=Math.hypot(dx,dy),step=Math.min(d,f.speed*dt);
    if(d>0){f.x=clamp(f.x+dx/d*step,f.coreRadius,this.world.w-f.coreRadius);f.y=clamp(f.y+dy/d*step,f.coreRadius,this.world.h-f.coreRadius);}
   }
   if(['quantum','annihilation'].includes(f.kind)&&f.life>1e-8&&f.tick<=1e-8){
    if(distance(this.p,f)<=f.r+this.p.r)this.hurt(f.damage);
    f.tick=f.interval;
   }
   if(f.kind==='prism'&&f.angles.some(a=>this.hubRayHits(f,a,f.r)))this.hurt(f.damage);
   if(f.kind==='plasma'&&f.tick<=0&&distance(this.p,f)<=f.r+this.p.r){this.hurt(f.damage);f.tick=f.interval??.5;}
   if(f.kind==='aegis'){
    f.x=e.x;f.y=e.y;e.shield=f.life;
    if(f.pulse&&age>=f.pull.duration-1e-8){
     if(f.pulseX===undefined){f.pulseX=e.x;f.pulseY=e.y;this.cue('hub-trace',e.x,e.y,'#baf5ff');}
     const from=f.pulse.radius*clamp((oldAge-f.pull.duration)/f.pulse.duration,0,1),to=f.pulse.radius*clamp((age-f.pull.duration)/f.pulse.duration,0,1);
     const d=Math.hypot(this.p.x-f.pulseX,this.p.y-f.pulseY),prev=f.pulseDistance??d,pad=f.pulse.width/2+this.p.r;
     if(!f.pulseHit&&Math.min(prev-from,d-to)<=pad&&Math.max(prev-from,d-to)>=-pad){this.hurt(f.damage*f.pulse.damage);f.pulseHit=true;}
     f.pulseDistance=d;f.pulseRadius=to;
    }
   }
   if(f.kind==='sweep'){
    const arc=f.arc,from=f.angle+arc*oldAge/f.max,to=f.angle+arc*age/f.max,dx=this.p.x-f.x,dy=this.p.y-f.y,d=Math.hypot(dx,dy);
    for(let i=0;i<f.beams;i++){
     const mid=(from+to)/2+i*TAU/f.beams,relative=Math.atan2(dy,dx)-mid,delta=Math.abs(Math.atan2(Math.sin(relative),Math.cos(relative))),pad=Math.asin(Math.min(1,(f.r+this.p.r)/Math.max(1,d)));
     if(d<=f.length+this.p.r&&delta<=Math.abs(to-from)/2+pad)this.hurt(f.damage);
    }f.currentAngle=to;
   }
   if(f.kind==='rush'){
    const old={x:e.x,y:e.y},t=age/f.max;e.x=f.x+(f.x2-f.x)*t;e.y=f.y+(f.y2-f.y)*t;
    if(segmentDistance(this.p,old,e)<=f.r+this.p.r)this.hurt(f.damage);
   }
   if(f.life<=1e-8){
    f.life=0;
    if(f.kind==='aegis')e.shield=0;
    if(f.kind==='rush'){const h=this.hubRushSlashLock(e,f);if(h)h.deferTick=true;}
    else if(f.kind==='rushSlash'){
     if(f.shot<f.totalShots){const h=this.hubRushLock(e,f.shot+1,f.totalShots);if(h)h.deferTick=true;}
     else this.hubComplete(e,'rush');
    }
    else if(e.boss&&(f.kind!=='orbital'||f.last)&&['aegis','orbital','sweep','quantum'].includes(f.kind))this.hubComplete(e,f.kind);
   }
  }
  this.hubFields=this.hubFields.filter(f=>f.life>0);
 },
 hubWallBlock(oldX,oldY){
  const pad=this.p.r+6;
  for(const f of this.hubFields){if(f.kind!=='wall'||f.life<=0)continue;
   for(const s of f.segments){
    if(s.x===s.x2&&this.p.y>=Math.min(s.y,s.y2)-pad&&this.p.y<=Math.max(s.y,s.y2)+pad&&Math.min(oldX,this.p.x)<=s.x+pad&&Math.max(oldX,this.p.x)>=s.x-pad)this.p.x=oldX<s.x?s.x-pad:oldX>s.x?s.x+pad:oldX;
    if(s.y===s.y2&&this.p.x>=Math.min(s.x,s.x2)-pad&&this.p.x<=Math.max(s.x,s.x2)+pad&&Math.min(oldY,this.p.y)<=s.y+pad&&Math.max(oldY,this.p.y)>=s.y-pad)this.p.y=oldY<s.y?s.y-pad:oldY>s.y?s.y+pad:oldY;
   }
  }
 }
};
const API={install:Run=>Object.assign(Run.prototype,methods),required};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.SurvivorHub=API;
})(typeof window==='undefined'?globalThis:window);
