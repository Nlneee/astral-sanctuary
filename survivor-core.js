(function(root){
'use strict';
const D=typeof module!=='undefined'&&module.exports?require('./survivor-data.js'):root.SurvivorData;
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const experienceForLevel=level=>Math.round(15+12*(level-1)+.8*(level-1)**2);
class Run {
 constructor(heroId='gpt',difficulty='normal',random=Math.random){
  this.hero=D.heroes.find(h=>h.id===heroId)||D.heroes[0];this.difficulty=D.difficulties[difficulty]?difficulty:'normal';this.diff=D.difficulties[this.difficulty];this.random=random;
  this.universalCooldowns={reset:0};this.mode='playing';this.time=0;this.stage=0;this.wave=1;this.waveTime=0;this.waveSpawned=0;this.waveOrdinary=0;this.waveRanged=0;this.introductions=[];this.waveDuration=26;this.phase='wave';this.kills=0;this.shots=0;this.level=1;this.xp=0;this.needed=experienceForLevel(this.level);this.ranks={};this.commonPoints={};this.quantizations={};this.transmutations={};this.ascClocks={};this.frenzyTime=0;this.developerCombat={invulnerable:false,highDamage:false};this.choices=[];this.upgradeQueue=0;this.pendingStage=false;this.bosses=0;
  this.world={w:2400,h:1600};this.p={x:1200,y:800,hp:this.hero.hp,maxHp:this.hero.hp,r:15,angle:0,invuln:1.5};this.crystalHits=0;
  this.enemies=[];this.bullets=[];this.hostile=[];this.gems=[];this.zones=[];this.effects=[];this.popups=[];this.hazards=[];this.labFields=[];this.skyFields=[];this.hubFields=[];this.spawnClock=.5;this.fireClock=.15;this.orbitClock=0;this.id=1;this.events=[];this.avEvents=[];this.offerKind='level';this.damageDone=0;this.bestCombo=0;this.takeStats();
 }
 useUniversalSkill(id='reset'){
  const skill=D.universalSkills[id];if(!skill||this.mode!=='playing'||this.p.hp<=0||(this.universalCooldowns[id]||0)>1e-8||this.p.hp>=this.p.maxHp)return false;
  const healed=Math.min(skill.heal,this.p.maxHp-this.p.hp);this.p.hp+=healed;this.universalCooldowns[id]=skill.cooldown;
  this.cue('reset',this.p.x,this.p.y,'#80f5cf');this.effect(this.p.x,this.p.y,95,'#80f5cf','reset');this.popup(this.p.x,this.p.y-35,'+'+Math.round(healed),'#a7ffda');this.notify('重置 · 恢复 '+Math.round(healed)+' 点生命','success');return true;
 }
 waveCount(){return D.stages[this.stage].wavePools.length;}
 isRanged(type){return D.stages[this.stage].ranged.includes(type);}
 waveAlive(){return this.enemies.filter(e=>!e.boss&&e.hp>0&&!e.dead).length;}
 waveCap(){return Math.min(330,Math.max(8,Math.round((18+5*(this.wave-1))*this.diff.count)));}
 waveThreshold(){return Math.max(1,Math.floor(this.waveCap()*.2));}
 baseWaveBudget(){return 36+6*(this.wave-1)+Math.floor(Math.max(0,this.wave-10)*1.4);}
 waveBudget(){const n=Math.max(0,this.wave-7),base=this.baseWaveBudget();return 2*Math.round((base+(n?Math.ceil(n*1.5)+Math.ceil(base*.25)+n*2:0))*this.diff.count);}
 specialBudget(){if(this.wave<8)return 0;return this.waveBudget()-2*Math.round((this.baseWaveBudget()+Math.ceil((this.wave-7)*1.5))*this.diff.count);}
 eliteLimits(type){
  if(this.phase!=='wave'||this.wave<8)return {total:10,perType:2};
  const n=this.wave-8;
  return {total:2*(6+Math.floor(n*.75)),perType:2*(this.isRanged(type)?2+Math.floor(n/3):D.stages[this.stage].healers.includes(type)?Math.min(2,1+Math.floor(n/6)):1+Math.floor(n/5))};
 }
 pickEnemy(pool){
  if(this.phase!=='wave'||this.wave<8)return pool[Math.floor(this.random()*pool.length)];
  const desired=Math.floor((this.waveSpawned+1)*this.specialBudget()/this.waveBudget());
  if(this.waveSpawned-this.waveOrdinary>=desired){const ordinary=pool.filter(type=>!D.enemies[type].elite);return ordinary[Math.floor(this.random()*ordinary.length)];}
  const rangedTarget=Math.floor((this.waveSpawned-this.waveOrdinary+1)*(.4+(this.wave-8)*.01));
  if(this.waveRanged<rangedTarget){const ranged=pool.filter(type=>this.isRanged(type));if(ranged.length)return ranged[Math.floor(this.random()*ranged.length)];}
  const nonRanged=pool.filter(type=>D.enemies[type].elite&&!this.isRanged(type));pool=nonRanged.length?nonRanged:pool.filter(type=>D.enemies[type].elite);
  return pool[Math.floor(this.random()*pool.length)];
 }
 initialVolley(){return this.hero.damage*({twin:1.8,fan:3,shot:5}[this.hero.kind]||1);}
 bossSkill(e){return (e.behavior==='archon'?this.hubFormConfig(e).phaseNames:e.behavior==='taoTitan'?['扇形量子激光 · 追踪突刺斩','瞬移震荡 · 追踪回收飞盘','五秒护盾 · 量子震荡机 · 四角传输']:e.behavior==='overlord'?['自爆机兵 · 方形束缚','追踪轰炸 · 回旋激光','四刃齐射']:e.behavior==='bear'?['近身爪击 · 直线冲撞 · 每8技能弹幕','相移扇面爪击','广域轰炸 · 高速三连冲撞']:['环形弹幕','区域轰炸',this.stage===3?'重装冲锋':'机械增援'])[e.combatPhase-1];}
 bossPhaseCount(e){return e.atlas==='hub'?this.hubFormConfig(e).phaseCount:3;}
 bossPhaseReady(e){return e.phaseDone&&e.phaseAge>=(e.atlas==='hub'?this.hubFormConfig(e).minPhaseSeconds:4);}
 bossCooldown(e,base){if(e.atlas==='hub'){const c=this.hubFormConfig(e);return base*(c.phaseCooldownScales?.[e.combatPhase-1]??c.cooldownScale);}return base*(.55-.05*((e.combatPhase||1)-1))+(e.behavior==='bear'?D.bearBoss.cooldownExtra:0);}
 inSector(h,p){const dx=p.x-h.x,dy=p.y-h.y,d=Math.hypot(dx,dy);if(d>h.r+(p.r||0))return false;if(d<=(p.r||0))return true;const delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-h.angle),Math.cos(Math.atan2(dy,dx)-h.angle));return Math.abs(delta)<=(h.spread||Math.PI*.45)+Math.asin(Math.min(1,(p.r||0)/d));}
 finishBossSkill(e,skill){if(e&&e.combatPhase===skill)e.phaseDone=true;}
 rank(id){return this.ranks[id]||0;}
 quantum(id){return this.quantizations[id]||0;}
 trans(id){return !!this.transmutations[id];}
 routeChoice(item){
  if(this.rank(item.id)<item.max)return item;
  if(this.quantum(item.id)<2)return {...item,routeStep:'quantize',name:item.name+' · 量化',desc:item.quantDesc,progress:`量化 ${this.quantum(item.id)} → ${this.quantum(item.id)+1} / 2`,evolution:'两次量化后，可在下次专属升级中选择质变：'+item.transName};
  return {...item,routeStep:'transmute',name:item.transName+' · 质变',desc:item.transDesc,progress:'量化 2 / 2 → 解锁独特质变',evolution:'终极形态 · '+item.name};
 }
 orbitCount(){return this.rank('orbit')*2+this.quantum('orbit')+(this.hero.id==='gpt'&&this.trans('orbit')?4:0);}
 routeTargets(x,y,r){return this.enemies.filter(e=>e.hp>0&&!e.dead&&!(e.veil>0)&&!(e.burrow>0)&&!((e.quantumCharge>0||e.hubIntro>0))&&Math.hypot(e.x-x,e.y-y)<=r+e.r);}
 routeAOE(x,y,r,damage){this.effect(x,y,r,this.hero.color);for(const e of this.routeTargets(x,y,r))this.hit(e,damage,false);}
 routeFreeze(radius,time){for(const e of this.routeTargets(this.p.x,this.p.y,radius)){if(!e.boss)e.freeze=Math.max(e.freeze,time);e.slow=Math.max(e.slow,time+1);}this.effect(this.p.x,this.p.y,radius,'#b8ecff');this.cue('freeze');}
 routeAttack(firstBullet){
  const originals=this.bullets.slice(firstBullet);for(const b of originals){
   if(this.trans('focus')&&this.hero.id==='gpt'){b.damage*=4;b.pierce=99;b.r=Math.max(b.r,14);b.life=3;b.judgment=true;}
   if(this.trans('seeker')&&this.hero.id==='gemini')b.bounces=Math.max(4,b.bounces);
  }
  if(this.hero.id==='gemini'&&this.trans('echo'))for(const b of originals)for(const side of [-1,1]){const clone=this.bullet(b.angle,{...b,id:this.id++,x:b.x+side*75,y:b.y-15,damage:b.damage*.75,hit:new Set(),mirror:true});if(clone)this.effect(clone.x,clone.y,18,this.hero.color);}
  if(this.hero.id==='qwen'&&this.trans('fan')){for(let i=0;i<32;i++)this.bullet(i*TAU/32,{damage:this.stats.damage,pierce:4});if(this.shots%4===0)for(let i=0;i<12;i++)this.bullet(i*TAU/12,{damage:this.stats.damage*1.4,homing:true,returning:false,kind:'page',life:2.5});}
  if(this.hero.id==='grok'&&this.trans('frenzy')){if(this.shots%6===0){this.frenzyTime=4;this.takeStats();}if(this.frenzyTime>0)this.bullet(this.p.angle,{damage:this.stats.damage*3,pierce:8,r:8,life:2,kind:'redbolt'});}
 }
 routeImpact(b,e){
  if(!this.developerCombat.highDamage){if(this.hero.id==='gpt'&&!b.judgmentEcho)this.judgmentMark(e);if(this.hero.id==='deepseek'&&b.kind==='bubble')this.hydroMark(e);}
  if(this.hero.id==='gemini'&&this.trans('split')&&!b.splitChild)for(const off of [-.5,0,.5]){const child=this.bullet(b.angle+off,{x:e.x,y:e.y,damage:b.damage*.8,homing:true,splitChild:true,pierce:1,life:1.4,hit:new Set([e.id])});}
  if(this.hero.id==='deepseek'&&this.trans('pressure')&&b.kind==='bubble'){this.whaleHits=(this.whaleHits||0)+1;if(this.whaleHits%3===0){this.routeAOE(e.x,e.y,220,this.stats.damage*5);this.cue('pulse',e.x,e.y,this.hero.color);}}
  if(this.hero.id==='grok'&&this.trans('blast')&&b.kind==='bomb')this.zone(e.x,e.y,160,3,this.stats.damage*2,'mine');
  if(this.hero.id==='claude'&&this.trans('bloom')&&e.hp>0){e.burn=4;e.burnStacks=Math.min(5,(e.burnStacks||0)+1);}
  if(this.hero.id==='qwen'&&this.trans('insight')&&b.superCritical)e.exposed=3;
 }
 routeKill(e){
  if(this.hero.id==='claude'&&this.trans('bloom')&&e.burn>0){this.sunburstQueue??=[];this.sunburstQueue.push({x:e.x,y:e.y});if(!this.inSunburst){this.inSunburst=true;let count=0;while(this.sunburstQueue.length&&count++<64){const point=this.sunburstQueue.shift();this.effect(point.x,point.y,160,'#ffbd6e');for(const other of this.routeTargets(point.x,point.y,160)){other.burn=4;other.burnStacks=Math.min(5,(other.burnStacks||0)+2);this.hit(other,this.stats.damage*2,false);}}this.sunburstQueue=[];this.inSunburst=false;}}
  if(this.hero.id==='gpt'&&this.trans('chain')&&e.chainStruck)this.zone(e.x,e.y,90,2,this.stats.damage*.8,'thunder');
 }
 judgmentMark(e){
  if(this.developerCombat.highDamage||e.hp<=0||e.dead||e.shield>0||!(this.rank('focus')||this.rank('chain')))return;
  e.judgmentStacks=(e.judgmentStacks||0)+1;if(e.judgmentStacks<3)return;e.judgmentStacks=0;
  this.routeAOE(e.x,e.y,90+20*this.rank('chain'),this.stats.damage*(1.5+.5*this.rank('focus')));this.popup(e.x,e.y-45,'因果裁决',this.hero.color);this.cue('chain',e.x,e.y,this.hero.color);
 }
 glmChill(e){
  if(e.hp<=0||e.dead||e.shield>0)return;
  e.slow=Math.max(e.slow,1+this.rank('frost')*.85+.3*this.quantum('frost'));
  if(this.developerCombat.highDamage)return;
  if(e.freeze>0&&this.rank('shatter')&&!e.shatterSpent){e.shatterSpent=true;this.routeAOE(e.x,e.y,95+18*this.rank('shatter'),this.stats.damage*(1+.4*this.rank('shatter')));this.popup(e.x,e.y-45,'碎冰共振','#ccefff');}
  if(!this.rank('frost')||e.freeze>0)return;
  e.chillStacks=(e.chillStacks||0)+1;if(e.chillStacks<(this.rank('frost')>=3?2:3))return;e.chillStacks=0;e.shatterSpent=false;
  if(e.boss){e.exposed=Math.max(e.exposed||0,2.5);this.popup(e.x,e.y-45,'霜蚀破甲','#ccefff');}
  else{e.freeze=1+.15*this.rank('frost')+.2*this.quantum('frost');this.cue('freeze',e.x,e.y,'#b8ecff');}
 }
 hydroMark(e){
  if(this.developerCombat.highDamage||e.hp<=0||e.dead||e.shield>0||!(this.rank('pressure')||this.rank('tide')||this.rank('undertow')))return;
  e.hydroStacks=(e.hydroStacks||0)+1;if(e.hydroStacks<4)return;e.hydroStacks=0;
  this.routeAOE(e.x,e.y,130+20*this.rank('undertow'),this.stats.damage*(1.8+.45*this.rank('pressure')));this.popup(e.x,e.y-45,'深海坍缩','#8feaff');this.cue('pulse',e.x,e.y,this.hero.color);
 }
 updateAscensions(dt){
  for(const key of Object.keys(this.ascClocks))this.ascClocks[key]=Math.max(0,this.ascClocks[key]-dt);
  if(this.frenzyTime>0){this.frenzyTime=Math.max(0,this.frenzyTime-dt);if(this.frenzyTime===0)this.takeStats();}
  for(const e of this.enemies)if(e.exposed>0)e.exposed=Math.max(0,e.exposed-dt);
  if(this.hero.id==='gpt'&&this.trans('orbit')&&!this.ascClocks.reflect){const b=this.hostile.find(b=>b.life>0&&Math.hypot(b.x-this.p.x,b.y-this.p.y)<135);if(b){b.life=0;const target=this.nearest(this.p.x,this.p.y,null,1800);if(target)this.bullet(Math.atan2(target.y-this.p.y,target.x-this.p.x),{damage:this.stats.damage*3,pierce:5,life:3});this.ascClocks.reflect=.25;this.effect(this.p.x,this.p.y,135,this.hero.color);}}
  if(this.hero.id==='gemini'&&this.trans('seeker')&&!this.ascClocks.hunters){const target=this.nearest(this.p.x,this.p.y,null,1400);if(target){for(let i=0;i<2;i++){const a=this.time*1.8+i*Math.PI,x=this.p.x+Math.cos(a)*80,y=this.p.y+Math.sin(a)*80;this.bullet(Math.atan2(target.y-y,target.x-x),{x,y,damage:this.stats.damage*1.8,homing:true,bounces:4,pierce:2,life:2.8,kind:'hunter'});}this.ascClocks.hunters=.6;}}
  if(this.hero.id==='glm'&&this.trans('frost')&&!this.ascClocks.zero){this.routeFreeze(350,1.8);this.ascClocks.zero=4;}
  if(this.hero.id==='deepseek'&&this.trans('undertow')){
   const target=this.nearest(this.p.x,this.p.y,null,1800);if(target){this.singularity??={x:target.x,y:target.y};const f=this.singularity;f.x+=(target.x-f.x)*Math.min(1,dt*2);f.y+=(target.y-f.y)*Math.min(1,dt*2);for(const e of this.routeTargets(f.x,f.y,230)){if(!e.boss){const d=dist(f,e)||1;e.x+=(f.x-e.x)/d*Math.min(d,180*dt);e.y+=(f.y-e.y)/d*Math.min(d,180*dt);}e.slow=.5;}if(!this.ascClocks.gravity){this.routeAOE(f.x,f.y,230,this.stats.damage*1.2);this.ascClocks.gravity=.5;}}
  }
  if(this.hero.id==='claude'&&this.trans('renew'))this.dawnShield=Math.min(this.p.maxHp*.6,(this.dawnShield||0)+3*dt);
  if(this.hero.id==='claude'&&this.trans('orbit')&&!this.ascClocks.garden){const target=this.nearest(this.p.x,this.p.y,null,1200);if(target){for(let i=0;i<6;i++){const a=this.time*.8+i*TAU/6,x=this.p.x+Math.cos(a)*140,y=this.p.y+Math.sin(a)*140;this.bullet(Math.atan2(target.y-y,target.x-x),{x,y,damage:this.stats.damage*.8,kind:'seed',garden:true,life:2.5});}this.ascClocks.garden=1;}}
  if(this.hero.id==='grok'&&this.trans('leech')&&!this.ascClocks.blood&&(this.bloodShield||0)>0){const spent=this.bloodShield*.5;this.bloodShield-=spent;this.routeAOE(this.p.x,this.p.y,260,this.stats.damage*2+spent*6);this.ascClocks.blood=3;}
 }

 commonRank(id){return this.commonPoints[id]??this.rank(id);}
 rollRarity(){let roll=this.random()*100;for(const rarity of D.rarities){roll-=rarity.weight;if(roll<0)return rarity;}return D.rarities[D.rarities.length-1];}
 commonChoice(item){const rarity=this.rollRarity(),m=rarity.multiplier,n=v=>Math.round(v*100)/100;const desc={power:`所有伤害 +${n(15*m)}%`,haste:`攻击频率 +${n(12*m)}%`,vital:`最大生命 +${n(25*m)}，并恢复 ${n(35*m)} 生命`,boots:`移动速度 +${n(8*m)}%`,magnet:`经验拾取半径 +${n(35*m)}`,armor:`护甲强度 +${n(8*m)}%（持续降低承伤，收益递减）`,area:`攻击范围与弹体尺寸 +${n(15*m)}%`,luck:`暴击率 +${n(8*m)}%（超过 100% 的部分转为暴击伤害）`}[item.id];return {...item,rarity:rarity.id,rarityName:rarity.name,multiplier:m,desc};}
 takeStats(){
  const r=id=>D.common.some(o=>o.id===id)?this.commonRank(id):this.rank(id),h=this.hero;
  this.stats={damage:h.damage*(1+r('power')*.15+r('focus')*.32+r('seeker')*.15+r('frost')*.26+r('pressure')*.4+r('bloom')*.32+r('leech')*.18+r('return')*.22),speed:h.speed*(1+r('boots')*.08+r('frenzy')*.07),interval:h.interval/(1+r('haste')*.12+r('echo')*.16+r('frenzy')*.25),area:1+r('area')*.15,magnet:190+r('magnet')*35+r('undertow')*30,armor:1-1/(1+r('armor')*.08+(h.id==='glm'?r('orbit')*.08:0)),crit:Math.min(1,.07+r('luck')*.08+r('insight')*.16+(r('leech')>=3?.12:0)),critMult:1.8+r('insight')*.35+Math.max(0,.07+r('luck')*.08+r('insight')*.16+(r('leech')>=3?.12:0)-1),regen:r('renew')*1.1};
  if(h.id!=='gemini')this.stats.damage*=1+this.hero.routes.reduce((sum,item)=>sum+.06*this.rank(item.id)+.1*this.quantum(item.id),0);
  this.stats.damage*=1+.15*(this.quantum('focus')+this.quantum('seeker')+this.quantum('pressure')+this.quantum('leech'));
  this.stats.interval/=1+.1*this.quantum('echo')+.15*this.quantum('frenzy');this.stats.speed*=1+.05*this.quantum('frenzy');
  this.stats.magnet+=25*this.quantum('undertow');this.stats.regen+=.8*this.quantum('renew');
  const chance=this.stats.crit+.05*this.quantum('insight');this.stats.crit=Math.min(1,chance);this.stats.critMult+=.25*this.quantum('insight')+Math.max(0,chance-1);
  if(this.frenzyTime>0){this.stats.interval/=2.5;this.stats.speed*=1.3;}
  this.p.maxHp=h.hp+r('vital')*25+r('renew')*18+20*this.quantum('renew');
 }
 cue(name,x=this.p.x,y=this.p.y,color=this.hero.color,angle=0){if(this.avEvents.length>=180)this.avEvents.shift();this.avEvents.push({name,x,y,color,angle});}
 notify(text,type='info'){this.events.push({text,type});if(this.events.length>12)this.events.shift();}
 effect(x,y,r,color,type='ring'){if(this.effects.length>=180)this.effects.shift();const life=type==='spark'?.48:.45;this.effects.push({x,y,r,color,type,t:life,max:life});}
 popup(x,y,text,color='#f5e4bb'){if(this.popups.length<60)this.popups.push({x,y,text,color,t:.65});}
 spawn(type,at){
  if(this.enemies.filter(e=>e.hp>0&&!e.dead).length>=(this.phase==='wave'?this.waveCap():330))return null;
  const base=D.enemies[type];const a=this.random()*TAU;const radius=580+this.random()*100;
  let x=at?.x??clamp(this.p.x+Math.cos(a)*radius,25,this.world.w-25),y=at?.y??clamp(this.p.y+Math.sin(a)*radius,25,this.world.h-25);
  if(Math.hypot(x-this.p.x,y-this.p.y)<190){x=clamp(this.p.x-Math.cos(a)*450,25,this.world.w-25);y=clamp(this.p.y-Math.sin(a)*450,25,this.world.h-25);}
  const ramp=this.phase==='wave'?this.wave-1:0,stride=.94+((this.id*.618033988749895)%1)*.12;
  const vitality=base.atlas==='beasts'?(base.elite?Math.max(base.hp*2.4,this.initialVolley()*(base.behavior==='toad'?7:9)):this.initialVolley()*3):Math.max(base.elite?540:180,base.hp*(type>=2?1.8:1));
  const hp=vitality*(base.elite||(type>=2&&type<=5)?1.5:1)*this.diff.hp*(this.stage+1)*(1+ramp*.045);
  const e={...base,basic:base.atlas==='beasts'&&this.stage===0&&((!base.elite&&this.wave<10)||this.phase==='boss'),x,y,hp,maxHp:hp,id:this.id++,type,boss:false,speed:base.speed*(1+this.stage*.1)*(1+ramp*.008)*stride,stride,damage:base.damage*this.diff.damage*(1+this.stage*.25)*(1+ramp*.025),clock:1+this.random()*1.5,slow:0,burn:0,freeze:0,flash:0,orbitHit:0};this.enemies.push(e);return e;
 }
 spawnBoss(){
  this.phase='boss';this.waveTime=0;this.hostile=[];this.hazards=[];this.labFields=[];this.skyFields=[];this.hubFields=[];if([1,2,3].includes(this.stage))this.enemies=[];
  for(const e of this.enemies)if(e.atlas==='beasts'){e.armed=false;e.windup=0;e.burrow=0;e.clock=Math.min(e.clock,2);}
  const s=D.stages[this.stage],hp=(9000+this.stage*4000)*100*this.diff.hp;
  const a=Math.atan2(this.world.h/2-this.p.y,this.world.w/2-this.p.x);
  const e={id:this.id++,type:6+this.stage,boss:true,combatPhase:1,phaseAge:0,phaseDone:false,skillCycle:0,atlas:s.atlas,behavior:s.behavior,name:s.boss,sprite:s.sprite,color:'#ffbe7b',x:clamp(this.p.x+Math.cos(a)*430,65,this.world.w-65),y:clamp(this.p.y+Math.sin(a)*430,65,this.world.h-65),hp,maxHp:hp,r:43+this.stage*3,speed:45+this.stage*6,damage:(22+this.stage*4)*this.diff.damage,xp:65,clock:.6,pattern:0,slow:0,burn:0,freeze:0,flash:0,orbitHit:0};
  if(e.atlas==='hub'){e.hubSeen=new Set();e.hubForm='mech';e.color='#ffe3a5';}if(this.stage===1){e.x=this.world.w/2;e.y=this.world.h/2;e.speed=30;e.r=52;}e.speed*=1.65;if(e.behavior==='bear'){e.speed*=D.bearBoss.moveMultiplier;e.bearSkillCount=0;e.bearBarragePending=false;}if(e.atlas==='hub')this.hubInitBoss(e,'mech');this.enemies.push(e);this.cue('boss',e.x,e.y,'#ff8d79');this.cue('boss-'+(e.behavior==='taoTitan'?'taotitan':e.behavior),e.x,e.y,'#ff8d79');this.notify(`警报 · ${s.boss}降临！击败后才能突破阶段`,'boss');this.effect(e.x,e.y,150,'#ff8d79');
 }
 bullet(angle,extra={}){
  if(this.bullets.length>=400)return;
  const r=id=>this.rank(id),kind=this.hero.kind;
  let speed=kind==='bubble'?290:kind==='shot'?510:390;
  let pierce=kind==='bolt'?1:kind==='crystal'?1:kind==='fan'?2:0;
  pierce+=r('focus')+(r('undertow')>=3?2:0)+(this.hero.id==='claude'&&r('orbit')>=3?1:0);
  const b={id:this.id++,x:this.p.x,y:this.p.y,angle,speed,damage:this.stats.damage,r:(kind==='crystal'?10:kind==='bubble'?12:kind==='seed'?8:5)*this.stats.area,life:(kind==='shot'?.72:1.8)+.25*this.quantum('return'),age:0,pierce,hit:new Set(),kind,color:this.hero.color,homing:r('seeker')>0,returning:r('return')>0,returned:false,bounces:(r('seeker')>=3?1:0)+this.quantum('seeker'),...extra};
  this.bullets.push(b);return b;
 }
 aimNearest(){
  let target=null,best=Infinity;
  for(const e of this.enemies){if(e.hp<=0||e.dead||e.burrow>0||e.veil>0||(e.quantumCharge>0||e.hubIntro>0))continue;const d=(e.x-this.p.x)**2+(e.y-this.p.y)**2;if(d<best){best=d;target=e;}}
  this.targetId=target?.id??null;
  if(target)this.p.angle=Math.atan2(target.y-this.p.y,target.x-this.p.x);
  return target;
 }
 attack(){
  if(!this.aimNearest())return false;
  this.cue('shot-'+this.hero.kind,this.p.x,this.p.y,this.hero.color,this.p.angle);this.shots++;const firstBullet=this.bullets.length;const r=id=>this.rank(id),a=this.p.angle,kind=this.hero.kind;
  if(kind==='twin'){
   const count=2+(r('split')+this.quantum('split'))*2+(r('split')>=3?2:0);
   for(let i=0;i<count;i++)this.bullet(a+(i-(count-1)/2)*.11,{damage:this.stats.damage*.9});
   for(let i=0;i<r('echo')+this.quantum('echo');i++)this.bullet(a+Math.PI+(i-(r('echo')-1)/2)*.15,{damage:this.stats.damage*.7});
   if(r('echo')>=3&&this.shots%4===0)for(let i=0;i<12;i++)this.bullet(i*TAU/12,{damage:this.stats.damage*.7});
  }else if(kind==='fan'){
   const count=3+(r('fan')+this.quantum('fan'))*3;for(let i=0;i<count;i++)this.bullet(a+(i-(count-1)/2)*.16);
   if(r('fan')>=3&&this.shots%4===0)for(let i=0;i<16;i++)this.bullet(i*TAU/16);
  }else if(kind==='shot'){
   for(let i=0;i<5;i++)this.bullet(a+(i-2)*.13,{speed:480+this.random()*80});
   if(r('blast')>=3&&this.shots%4===0)this.bullet(a,{kind:'bomb',damage:this.stats.damage*4,r:15,life:2,speed:270});
  }else{
   let damage=this.stats.damage,rad=kind==='crystal'?10:kind==='bubble'?12:5;
   if(r('focus')>=3&&this.shots%3===0){damage*=3;rad=12;}
   this.bullet(a,{damage,r:rad*this.stats.area,whale:r('pressure')>=3&&this.shots%3===0});
  }
  this.routeAttack(firstBullet);return true;
 }
 nearest(x,y,exclude,range=420){let best=null,bestD=range;for(const e of this.enemies){if(e.hp<=0||e.veil>0||(e.quantumCharge>0||e.hubIntro>0)||exclude?.has(e.id))continue;const d=Math.hypot(x-e.x,y-e.y);if(d<bestD){best=e;bestD=d;}}return best;}
 hit(e,damage,crit=true,forceCritical=false,fixedDamage=false){
  if(e.hp<=0||e.burrow>0||e.veil>0||e.shield>0||(e.quantumCharge>0||e.hubIntro>0))return false;let amount=fixedDamage?damage:damage*(e.exposed>0?1.4:1)*(this.hero.id==='glm'&&this.trans('frost')&&e.freeze>0?1.5:1);
  if(!fixedDamage&&e.hubArmor>0)amount*=1-e.hubArmor;
  const critical=!fixedDamage&&crit&&(forceCritical||this.random()<this.stats.crit);if(critical)amount*=this.stats.critMult;
  if(e.boss){
   const phases=this.bossPhaseCount(e),floor=e.combatPhase<phases?e.maxHp*(phases-e.combatPhase)/phases:0;
   const ready=this.bossPhaseReady(e);
   const limit=e.combatPhase===phases&&!ready?1:floor;
   amount=Math.min(amount,Math.max(0,e.hp-limit));
   e.hp-=amount;
   if(e.combatPhase<phases&&e.hp<=floor+.0001&&ready){
    e.combatPhase++;e.quantumCharge=0;e.quantumIntroduced=false;e.skySkillCount=0;e.skySeen=new Set();e.skyThrust=null;e.shield=0;e.veil=0;e.labSeen=new Set();e.phaseAge=0;e.phaseDone=false;e.skillCycle=0;e.clock=.35;e.burstLeft=0;e.chargeTime=0;e.bearRushActive=false;e.bearRushCombo=null;e.bearPhaseThreeSeen=null;e.windup=0;
    this.hazards=this.hazards.filter(h=>h.source!==e.id);this.labFields=this.labFields.filter(f=>f.source!==e.id);this.skyFields=this.skyFields.filter(f=>f.source!==e.id);this.hubFields=this.hubFields.filter(f=>f.source!==e.id);for(const unit of this.enemies)if(unit.controller===e.id){unit.hp=0;unit.dead=true;}this.hostile=[];
    this.cue('phase',e.x,e.y,'#c394ff');this.cue('boss-'+(e.behavior==='taoTitan'?'taotitan':e.behavior),e.x,e.y,'#c394ff');this.notify(`Boss 阶段 ${e.combatPhase}/${phases} · 解锁${this.bossSkill(e)}`,'boss');this.effect(e.x,e.y,140,'#c394ff');
    if(e.atlas==='hub')this.hubPhase(e);
    if(e.behavior==='taoTitan'&&e.combatPhase===3)this.castSky(e,'transfer',0);
   }
  }else e.hp-=amount;
  if(amount>0)this.cue(critical?'crit':'hit',e.x,e.y,e.color);e.flash=.1;this.damageDone+=amount;
  if(critical||e.boss)this.popup(e.x,e.y-e.r,Math.ceil(amount)+(critical?'!':''),critical?'#ffe2a0':'#dfd6ef');
  if(this.rank('leech')){let healing=.2*this.rank('leech')*(1+.5*this.quantum('leech'));if(this.trans('leech'))healing+=Math.min(5,amount*.04);const overflow=Math.max(0,this.p.hp+healing-this.p.maxHp);this.p.hp=Math.min(this.p.maxHp,this.p.hp+healing);if(this.trans('leech'))this.bloodShield=Math.min(this.p.maxHp*.5,(this.bloodShield||0)+overflow);}
  if(e.hp<=0)this.kill(e);
  return critical;
 }
 kill(e){
  if(e.dead)return;if(e.behavior==='taoTitan')e.skyThrust=null;if(e.behavior==='bear'){e.bearRushCombo=null;e.bearRushActive=false;e.chargeTime=0;}if(e.boss&&e.behavior==='archon'&&e.hubForm!=='spirit'){this.hubAscend(e);return;}if(e.atlas==='hub')this.hubCleanup(e);this.cue(e.boss?'win':'kill',e.x,e.y,e.color);e.dead=true;e.hp=0;this.kills++;this.effect(e.x,e.y,e.r*1.8,e.color,'spark');
  if(e.atlas==='lab'||e.atlas==='sky'||e.atlas==='beasts'){this.hostile=this.hostile.filter(b=>b.source!==e.id);this.labFields=this.labFields.filter(f=>f.source!==e.id);this.skyFields=this.skyFields.filter(f=>f.source!==e.id);this.hubFields=this.hubFields.filter(f=>f.source!==e.id);for(const unit of this.enemies)if(unit.controller===e.id){unit.hp=0;unit.dead=true;}}
  if(e.type===4||e.atlas==='beasts'||e.atlas==='lab'||e.atlas==='sky')this.hazards=this.hazards.filter(h=>h.source!==e.id);
  if(e.behavior==='harmonist')this.updateHubLinks();
  this.gems.push({x:e.x,y:e.y,value:e.xp*(e.boss?1:1+this.stage*.15)});
  if(this.gems.length>240){const first=this.gems.shift();const target=this.gems[0];target.value+=first.value;}
  if(this.rank('leech')>=3)this.p.hp=Math.min(this.p.maxHp,this.p.hp+1.2);
  if(e.burn>0&&this.rank('bloom')>=3)this.zone(e.x,e.y,60,1.6,this.stats.damage*.35,'fire');
  this.routeKill(e);if(e.boss){this.bosses++;this.pendingStage=true;this.notify(`${e.name} 已击破`,'success');}
 }
 zone(x,y,r,life,damage,kind){
  this.cue(kind,x,y,this.hero.color);if(this.zones.length>=45)this.zones.shift();this.zones.push({x,y,r:r*this.stats.area,life,max:life,damage,kind,tick:0,echo:1});
 }
 impact(b,e){
  if(this.hero.id!=='gemini'&&(e.hp<=0||e.dead||e.burrow>0||e.veil>0||e.shield>0||e.quantumCharge>0||e.hubIntro>0))return;
  const high=this.developerCombat.highDamage,projectileHit=(target,damage,crit=true,force=false)=>this.hit(target,high?10000:damage,crit,force,high);
  const r=id=>this.rank(id);if(this.hero.id==='qwen'&&this.trans('insight')){this.insightHits=(this.insightHits||0)+1;b.superCritical=this.insightHits%5===0;}
  const critical=projectileHit(e,b.damage*(b.superCritical?3:1),true,!!b.superCritical);
  if(b.kind==='bubble'||b.kind==='seed'||b.kind==='bomb'||r('blast')||r('shatter')){
   let radius=(b.kind==='bubble'?58:b.kind==='seed'?48:b.kind==='bomb'?100:28)+(r('blast')+r('shatter'))*14;
   radius*=this.stats.area*(1+r('pressure')*.22)*(b.whale?2:1)*(1+.15*(this.quantum('pressure')+this.quantum('shatter')+this.quantum('blast')));
   this.cue(b.kind==='bubble'?'water':b.kind==='seed'?'flower':'strike',b.x,b.y,this.hero.color);this.effect(b.x,b.y,radius,this.hero.color);
   for(const other of this.enemies)if(other.id!==e.id&&other.hp>0&&dist(b,other)<radius+other.r)projectileHit(other,b.damage*(.5+r('blast')*.16)*(1+.25*this.quantum('blast')),false);
   if(b.kind==='bubble'&&(r('tide')||r('undertow')))this.zone(b.x,b.y,60+16*r('tide'),2+1.3*r('tide')+this.quantum('tide'),b.damage*(.22+.14*r('tide'))*(1+.15*this.quantum('tide')),'water');
   if(b.kind==='seed')this.zone(b.x,b.y,48,2.3,b.damage*(.3+r('bloom')*.08),'flower');
   if(r('shatter')>=3&&!b.fragment){for(const off of (this.hero.id==='glm'&&this.trans('shatter')?Array.from({length:8},(_,i)=>i*TAU/8):[-.7,.7])){const f=this.bullet(b.angle+off,{damage:b.damage*(this.trans('shatter')?.8:.45)*(1+.15*this.quantum('shatter')),pierce:this.trans('shatter')?4:2,fragment:true,kind:'shard',life:.7});if(f){f.x=b.x;f.y=b.y;}}}
  }
  if(r('bloom'))e.burn=3;
  if(this.hero.id==='glm'&&(b.kind==='crystal'||b.fragment))this.glmChill(e);
  let chains=(this.hero.id==='gpt'&&this.trans('chain')?16:r('chain')*2)+(critical&&r('insight')>=3?1:0),origin=e,exclude=new Set([e.id]);
  while(chains-->0){const target=this.nearest(origin.x,origin.y,exclude,this.trans('chain')?420:r('chain')>=3?230:160);if(!target)break;exclude.add(target.id);this.cue('chain',target.x,target.y,this.hero.color);this.effects.push({x:origin.x,y:origin.y,x2:target.x,y2:target.y,color:this.hero.color,type:'line',t:.2,max:.2});target.chainStruck=true;projectileHit(target,b.damage*(this.trans('chain')?1.8:r('chain')>=3?1:.7)*(1+.15*this.quantum('chain')),false);if(this.hero.id==='gpt')this.judgmentMark(target);origin=target;}
  if(critical&&r('insight')>=3)b.pierce++;this.routeImpact(b,e);
 }
 hurt(amount,{ignoreArmor=false}={}){
  if(this.developerCombat.invulnerable||this.p.invuln>0||this.mode!=='playing')return;
  if(this.hero.id==='glm'&&this.trans('orbit')&&!this.ascClocks.royal){this.ascClocks.royal=4;this.routeFreeze(240,1.2);for(let i=0;i<12;i++)this.bullet(i*TAU/12,{damage:this.stats.damage*2,kind:'crystal',pierce:4,life:1.8});this.cue('barrier');return;}
  let incoming=amount*(ignoreArmor?1:1-this.stats.armor);for(const shield of ['dawnShield','bloodShield']){const used=Math.min(incoming,this[shield]||0);this[shield]=(this[shield]||0)-used;incoming-=used;}
  this.cue('hurt');this.p.hp-=incoming;this.p.invuln=.7;this.effect(this.p.x,this.p.y,36,'#ff5279');this.popup(this.p.x,this.p.y-35,'−'+Math.ceil(incoming),'#ff8d9d');
  if(this.p.hp<=0&&this.hero.id==='claude'&&this.trans('renew')&&!this.ascClocks.rebirth){this.p.hp=this.p.maxHp*.5;this.p.invuln=2;this.ascClocks.rebirth=30;this.effect(this.p.x,this.p.y,280,'#fff0b4');this.cue('evolve');this.notify('不熄晨曦 · 复生');}
  if(this.p.hp<=0){this.p.hp=0;this.mode='dead';this.cue('dead');this.notify('本次远征结束','danger');}
 }
 hostileShot(e,angle,speed=150){if(this.hostile.length>=260)return;this.hostile.push({x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:6,r:6,damage:e.damage*(e.needleConfig?.damageScale??.75),color:e.boss?'#ff9b7a':'#df8bff',source:e.id,kind:e.behavior==='porcupine'?'needle':undefined});}

 warnBeast(e,type,t,extra={}){
  this.cue('warn-'+type,e.x,e.y,e.color);const h={beast:true,type,source:e.id,x:e.x,y:e.y,r:70,t,total:t,damage:e.damage,...extra};this.hazards.push(h);e.windup=t;return h;
 }
 mobHeading(e,angle){
  if(e.boss||!e.pursuitLead||!this.playerVelocity)return angle;
  const pSpeed=Math.hypot(this.playerVelocity.x,this.playerVelocity.y);
  if(!pSpeed)return angle;
  const vScale=Math.min(1,210/pSpeed),vx=this.playerVelocity.x*vScale,vy=this.playerVelocity.y*vScale;
  const d=dist(e,this.p),lead=Math.min(e.pursuitLead,d/Math.max(1,e.speed)*.45);
  const x=clamp(this.p.x+vx*lead,25,this.world.w-25),y=clamp(this.p.y+vy*lead,25,this.world.h-25);
  const target=Math.atan2(y-e.y,x-e.x),turn=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));
  return angle+clamp(turn,-.55,.55);
 }
 separateMobs(dt){
  const grid=new Map(),pushes=new Map(),size=80;
  const mobile=e=>e.speed>0&&e.freeze<=0&&!(e.windup>0)&&!(e.burrow>0)&&!(e.chargeTime>0)&&!e.suicideArmed;
  const add=(e,x,y)=>{if(!mobile(e))return;const p=pushes.get(e)||{x:0,y:0};p.x+=x;p.y+=y;pushes.set(e,p);};
  for(const e of this.enemies){
   if(e.boss||e.hp<=0||e.dead)continue;
   const gx=Math.floor(e.x/size),gy=Math.floor(e.y/size);
   for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++)for(const o of grid.get(`${gx+ox},${gy+oy}`)||[]){
    let dx=e.x-o.x,dy=e.y-o.y,d=Math.hypot(dx,dy);const gap=(e.r+o.r)*1.08+5;if(d>=gap)continue;
    // Exactly coincident spawns also need a stable separating direction.
    if(d<1e-8){const a=((o.id*17+e.id*31)*.618033988749895)%1*TAU;dx=Math.cos(a);dy=Math.sin(a);d=0;}else{dx/=d;dy/=d;}
    const force=(1-d/gap)*90;add(e,dx*force,dy*force);add(o,-dx*force,-dy*force);
   }
   const key=`${gx},${gy}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(e);
  }
  for(const [e,p] of pushes){const length=Math.hypot(p.x,p.y);if(!length)continue;const step=Math.min(length,Math.min(70,e.speed*.32)*(e.slow>0?.48:1))*dt;
   e.x=clamp(e.x+p.x/length*step,e.r,this.world.w-e.r);e.y=clamp(e.y+p.y/length*step,e.r,this.world.h-e.r);
  }
 }
 bearComplete(e,phase,skill){
  // Count whole skills, not the warning, teleport or individual volley components.
  e.bearSkillCount=(e.bearSkillCount||0)+1;
  if(e.bearSkillCount%D.bearBoss.barrageEvery===0)e.bearBarragePending=true;
  if(e.combatPhase===3&&phase===3){
   e.bearPhaseThreeSeen??=new Set();e.bearPhaseThreeSeen.add(skill||'missile');
   e.phaseDone=e.bearPhaseThreeSeen.has('missile')&&e.bearPhaseThreeSeen.has('tripleRush');
  }else this.finishBossSkill(e,phase);
 }
 bearRushLock(e){
  const combo=e.bearRushCombo;if(!combo||e.dead||e.hp<=0)return;
  const c=D.bearBoss,a=Math.atan2(this.p.y-e.y,this.p.x-e.x),length=Math.min(c.tripleRushMaxDistance,dist(e,this.p)+c.tripleRushOvershoot);
  this.warnBeast(e,'charge',combo.index===1?c.tripleRushFirstWarning:c.tripleRushNextWarning,{angle:a,r:e.r,length,speed:c.tripleRushSpeed,duration:length/c.tripleRushSpeed,combo:combo.index,comboTotal:combo.total});
 }
 castBear(e,skill,a=Math.atan2(this.p.y-e.y,this.p.x-e.x)){
  const c=D.bearBoss;
  if(skill==='tripleRush'){
   if(e.combatPhase!==3)return false;
   e.bearRushCombo={index:1,total:c.tripleRushCount};e.clock=Infinity;this.bearRushLock(e);
  }else if(skill==='swipe'){
   this.warnBeast(e,'claw',c.clawWarning,{angle:a,r:c.clawRadius,spread:c.clawHalfAngle,damage:e.damage*1.15,skill:1});
   e.clock=this.bossCooldown(e,4.2);
  }else if(skill==='rush'){
   const length=Math.min(c.rushMaxDistance,dist(e,this.p)+c.rushOvershoot);
   this.warnBeast(e,'charge',c.rushWarning,{angle:a,r:e.r,length,speed:c.rushSpeed,duration:length/c.rushSpeed});
   e.clock=this.bossCooldown(e,4.8);
  }else if(skill==='warp'){
   this.warnBeast(e,'warp',.5,{x:clamp(this.p.x+Math.cos(a)*120,65,this.world.w-65),y:clamp(this.p.y+Math.sin(a)*120,65,this.world.h-65),r:70});
   e.clock=this.bossCooldown(e,4.8);
  }else if(skill==='missile'){
   this.warnBeast(e,'missile',2,{x:this.p.x,y:this.p.y,r:450,damage:50,ignoreArmor:true,last:true});
   e.clock=this.bossCooldown(e,5);
  }else if(skill==='barrage'){
   e.bearBarragePending=false;this.warnBeast(e,'barrage',.65,{angle:a,r:460});
   e.clock=this.bossCooldown(e,4.2);
  }
 }
 updateBearSkill(e,d,a){
  if(e.bearBarragePending){this.castBear(e,'barrage',a);return;}
  // Entering a new phase still guarantees its newly unlocked skill is demonstrated.
  if(!e.phaseDone&&e.combatPhase>1){this.castBear(e,e.combatPhase===2?'warp':e.bearPhaseThreeSeen?.has('missile')?'tripleRush':'missile',a);return;}
  const c=D.bearBoss,basic=d<=c.clawRange?'swipe':d>=c.rushRange?'rush':null;
  const skills=[basic,...(e.combatPhase>=2?['warp']:[]),...(e.combatPhase>=3?['missile','tripleRush']:[])].filter(Boolean);
  if(!skills.length){e.clock=.1;return;}
  this.castBear(e,skills[e.skillCycle++%skills.length],a);
 }
 updateBeast(e,dt){
  e.clock-=dt;e.windup=Math.max(0,(e.windup||0)-dt);e.burrow=Math.max(0,(e.burrow||0)-dt);
  const dx=this.p.x-e.x,dy=this.p.y-e.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx);
  let speed=e.speed*(e.slow>0?(e.boss?.78:.48):1)*(e.freeze>0?0:1),angle=this.mobHeading(e,a);
  if(e.behavior==='raven'&&!e.basic){angle=this.mobHeading(e,a)+(d<260?1.05:.35);if(e.clock<=0){e.dive=1;e.clock=4;}if(e.dive>0){e.dive-=dt;angle=this.mobHeading(e,a);speed*=1.65;}}
  if(e.behavior==='porcupine'&&d<340)speed=d<230?-speed*.4:0;
  if(e.behavior==='deer'&&d<300)speed=d<200?-speed*.55:0;
  if(e.windup>0||e.burrow>0)speed=0;
  if(e.chargeTime>0){
   const step=!e.boss&&e.freeze>0?0:Math.min(dt,e.chargeTime),x=e.x,y=e.y;e.chargeTime=Math.max(0,e.chargeTime-step);
   e.x=clamp(e.x+e.chargeX*step,e.r,this.world.w-e.r);e.y=clamp(e.y+e.chargeY*step,e.r,this.world.h-e.r);
   if(!e.boss&&e.behavior==='boar')this.specialContact(e,{x,y});
   if(e.bearRushActive){
    const vx=e.x-x,vy=e.y-y,t=clamp(((this.p.x-x)*vx+(this.p.y-y)*vy)/(vx*vx+vy*vy||1),0,1);
    if(Math.hypot(this.p.x-x-vx*t,this.p.y-y-vy*t)<e.r+this.p.r)this.hurt(e.damage*1.25);
    if(e.chargeTime<=1e-8){
     e.chargeTime=0;e.bearRushActive=false;
     if(e.bearRushCombo){
      if(e.bearRushCombo.index<e.bearRushCombo.total){e.bearRushCombo.index++;this.bearRushLock(e);}
      else{e.bearRushCombo=null;this.bearComplete(e,3,'tripleRush');e.clock=this.bossCooldown(e,4.8);}
     }else this.bearComplete(e,1);
    }
   }
  }else {e.x+=Math.cos(angle)*speed*dt;e.y+=Math.sin(angle)*speed*dt;}
  e.x=clamp(e.x,e.r,this.world.w-e.r);e.y=clamp(e.y,e.r,this.world.h-e.r);
  if(!e.basic&&e.clock<=0&&e.windup<=0&&e.freeze<=0&&!(e.chargeTime>0)&&!(e.burstLeft>0)){
   switch(e.behavior){
    case 'beetle':
     e.burrow=.9;this.warnBeast(e,'burrow',.9,{x:clamp(this.p.x+Math.cos(a)*35,30,this.world.w-30),y:clamp(this.p.y+Math.sin(a)*35,30,this.world.h-30),r:48});e.clock=5;break;
    case 'porcupine':case 'toad':case 'boar':case 'deer':this.castSpecial(e);break;
    case 'bear':this.updateBearSkill(e,d,a);break;
   }
  }
  if(e.burstLeft>0){e.burstClock-=dt;if(e.burstClock<=0){this.cue(e.boss?'barrage':'needles',e.x,e.y,e.color);const bear=e.behavior==='bear',c=e.needleConfig,n=bear?32:(c?.shots??5);for(let i=0;i<n;i++)this.hostileShot(e,bear?e.burstAngle+i*TAU/n+(4-e.burstLeft)*Math.PI/n:e.burstAngle+(i-(n-1)/2)*(c?.spread??.1),bear?230:(c?.speed??285));e.burstLeft--;e.burstClock=e.boss?.15:(c?.interval??.2);if(e.boss&&e.burstLeft===0)this.finishBossSkill(e,1);}}
  if(e.burrow<=0&&Math.hypot(this.p.x-e.x,this.p.y-e.y)<e.r+this.p.r)this.hurt(e.damage);
 }
 resolveBeastHazard(h){
  const e=this.enemies.find(e=>e.id===h.source&&e.hp>0);if(!e)return;this.cue(h.type,h.x,h.y,e.color);
  if(h.type==='needles'||h.type==='barrage'){e.burstLeft=h.type==='barrage'?4:(h.config?.volleys??3);e.burstClock=0;e.burstAngle=h.angle;e.needleConfig=h.config;}
  else if(h.type==='charge'){e.chargeTime=h.duration;e.chargeX=Math.cos(h.angle)*h.speed;e.chargeY=Math.sin(h.angle)*h.speed;e.bearRushActive=true;}
  else if(h.type==='rocket'){e.chargeTime=h.duration??.8;e.chargeX=Math.cos(h.angle)*(h.speed??520);e.chargeY=Math.sin(h.angle)*(h.speed??520);}
  else if(h.type==='burrow'){e.x=h.x;e.y=h.y;e.burrow=0;this.effect(h.x,h.y,h.r,'#ffb268');if(dist(h,this.p)<h.r+this.p.r)this.hurt(h.damage);}
  else if(h.type==='pulse'){this.effect(e.x,e.y,2900,'#ff7474','pulse');this.hurt(h.damage);e.hp=0;this.kill(e);}
  else if(h.type==='warp'){this.effect(e.x,e.y,95,'#bb89ff');e.x=h.x;e.y=h.y;this.effect(e.x,e.y,105,'#bb89ff');this.warnBeast(e,'claw',1.2,{x:e.x,y:e.y,angle:Math.atan2(this.p.y-e.y,this.p.x-e.x),r:560,spread:Math.PI*.45,damage:e.damage*1.6});}
  else if(h.type==='missile'){this.effect(h.x,h.y,h.r,'#ffb16b');if(dist(h,this.p)<h.r+this.p.r)this.hurt(h.damage,{ignoreArmor:!!h.ignoreArmor});if(h.last)this.bearComplete(e,3);}
  else if(h.type==='claw'){this.bearComplete(e,h.skill||2);this.effect(h.x,h.y,h.r,'#d297ff','clawSweep');Object.assign(this.effects[this.effects.length-1],{angle:h.angle,spread:h.spread});if(this.inSector(h,this.p))this.hurt(h.damage);}
 }
 labComplete(e,skill){
  if(!e||e.hp<=0)return;e.labSeen??=new Set();e.labSeen.add(skill);
  const needed=[['control','barrier'],['bombard','laser'],['saws']][e.combatPhase-1];
  e.phaseDone=needed.every(s=>e.labSeen.has(s));
 }
 labWarn(e,type,t,extra={}){
  this.cue('warn-'+type,e.x,e.y,e.color);if(!extra.background)e.windup=t;
  this.hazards.push({lab:true,type,source:e.id,x:e.x,y:e.y,r:70,t,total:t,damage:e.damage,...extra});
 }
 updateLabEnemy(e,dt){
  if(e.controlled){
   const owner=this.enemies.find(b=>b.id===e.controller&&b.hp>0);
   e.controlLife-=dt;
   if(!owner||e.controlLife<=0){e.hp=0;e.dead=true;this.effect(e.x,e.y,45,'#ff8c83');return;}
   if(e.suicideArmed)return;
   const dx=this.p.x-e.x,dy=this.p.y-e.y,d=Math.hypot(dx,dy)||1;
   if(d<90){e.suicideArmed=true;this.labWarn(e,'suicide',.6,{r:105,damage:30});return;}
   const move=Math.min(e.speed*1.35,310)*(e.slow>0?.65:1)*(e.freeze>0?0:1)*dt;
   e.x=clamp(e.x+dx/d*Math.min(move,d),e.r,this.world.w-e.r);e.y=clamp(e.y+dy/d*Math.min(move,d),e.r,this.world.h-e.r);return;
  }
  e.clock-=dt;e.windup=Math.max(0,(e.windup||0)-dt);
  const dx=this.p.x-e.x,dy=this.p.y-e.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx);
  let speed=e.speed*(e.slow>0?(e.boss?.78:.48):1)*(e.freeze>0?0:1)*(e.controlled?1.3:1),angle=this.mobHeading(e,a);
  if(e.behavior==='orb')angle+=d<200?.8:0;
  if(['radar','sonic','repair'].includes(e.behavior)&&d<320)speed=d<200?-speed*.45:0;
  if(e.behavior==='acid'&&d<180)speed=-speed*.38;
  if(e.boss&&d<110)speed=0;
  if(e.windup>0)speed=0;
  if(e.chargeTime>0){const from={x:e.x,y:e.y},moveTime=!e.boss&&e.freeze>0?0:Math.min(dt,e.chargeTime);e.chargeTime=Math.max(0,e.chargeTime-moveTime);if(e.chargeTime<1e-8)e.chargeTime=0;e.x=clamp(e.x+e.chargeX*moveTime,e.r,this.world.w-e.r);e.y=clamp(e.y+e.chargeY*moveTime,e.r,this.world.h-e.r);if(e.behavior==='lancer')this.specialContact(e,from);}
  else {e.x+=Math.cos(angle)*speed*dt;e.y+=Math.sin(angle)*speed*dt;}
  e.x=clamp(e.x,e.r,this.world.w-e.r);e.y=clamp(e.y,e.r,this.world.h-e.r);
  if(e.clock<=0&&e.windup<=0&&e.freeze<=0&&!(e.chargeTime>0)&&!(e.stabs>0)){
   if(e.boss){
    const groups=[['control','barrier'],['bombard','laser'],['saws']],needed=groups[e.combatPhase-1];
    const active=skill=>this.hazards.some(h=>h.source===e.id&&h.type===skill)||this.labFields.some(f=>f.source===e.id&&(f.kind===skill||skill==='bombard'&&f.kind==='bombardSequence'));
    const unseen=needed.find(s=>!e.labSeen?.has(s)&&!active(s));
    const unlocked=groups.slice(0,e.combatPhase).flat().filter(s=>!active(s)),skill=unseen||unlocked[e.skillCycle++%unlocked.length];
    if(!skill){e.clock=.2;return;}
    this.castLabBoss(e,skill,a);
   }else if(e.elite)this.castSpecial(e);else e.clock=3;
  }
  if(e.stabs>0&&e.chargeTime<=0&&e.windup<=0&&e.stabReady){e.stabReady=false;this.labWarn(e,'stab',e.specialCombo?.nextWarning??.5,{angle:a,r:24,config:e.specialCombo});}
  if(dist(e,this.p)<e.r+this.p.r)this.hurt(e.damage);
 }
 labBox(x,y,half=210){return [{x:x-half,y:y-half,x2:x+half,y2:y-half},{x:x+half,y:y-half,x2:x+half,y2:y+half},{x:x+half,y:y+half,x2:x-half,y2:y+half},{x:x-half,y:y+half,x2:x-half,y2:y-half}];}
 castLabBoss(e,skill,a){
  // Cooldown begins at dispatch; background summons/bombardments never restart it on completion.
  e.clock=this.bossCooldown(e,skill==='saws'||skill==='control'?5.5:skill==='barrier'?5:4.2);
  if(skill==='control')this.labWarn(e,skill,.7,{r:150,background:true});
  if(skill==='barrier')this.labWarn(e,skill,.8,{x:this.p.x,y:this.p.y,r:0,segments:this.labBox(this.p.x,this.p.y)});
  if(skill==='bombard'){
   this.labWarn(e,skill,.5,{x:this.p.x,y:this.p.y,r:85,damage:20,bombIndex:1,background:true});
   this.labFields.push({kind:'bombardSequence',source:e.id,life:3,max:3,tick:0,nextLock:.5,locked:1});
  }
  if(skill==='laser')this.labWarn(e,skill,.9,{angle:a,angles:[a,a+TAU/3,a+TAU*2/3],r:0});
  if(skill==='saws')this.labWarn(e,skill,.4,{r:125});
 }
 labFixedLaserLock(e,shot,deferTick=false){
  if(!e||e.hp<=0)return;
  const x=e.x,y=e.y,targetX=this.p.x,targetY=this.p.y,angle=Math.atan2(targetY-y,targetX-x);
  this.cue('warn-laser',x,y,e.color);
  this.hazards.push({lab:true,type:'fixedLaser',source:e.id,x,y,targetX,targetY,angle,r:0,t:D.labBoss.fixedLaserWarning,total:D.labBoss.fixedLaserWarning,shot,deferTick,damage:e.damage*1.25});
  // Five independent half-second locks and half-second beams begin as soon as the wall closes.
  const remaining=(D.labBoss.fixedLaserShots-shot+1)*(D.labBoss.fixedLaserWarning+D.labBoss.fixedLaserDuration);
  e.windup=Math.max(e.windup||0,remaining);e.clock=Math.max(e.clock,D.labBoss.fixedLaserWarning+D.labBoss.fixedLaserDuration);
 }
 resolveLabHazard(h){
  const e=this.enemies.find(e=>e.id===h.source&&e.hp>0);if(!e)return;
  this.cue(h.type==='fixedLaser'?'laser':h.type,h.x,h.y,e.color);
  const field=(kind,life,extra={})=>{if(this.labFields.length<40)this.labFields.push({kind,x:h.x,y:h.y,r:h.r,source:e.id,life,max:life,damage:e.damage,tick:0,angle:h.angle,...extra});};
  switch(h.type){
   case 'acid':field('acid',h.duration??5,{r:h.r,halfAngle:h.halfAngle??.5,interval:h.interval??.5,damage:h.damage});e.windup=0;break;
   case 'radar':{
    const c=h.config||this.specialConfig(e),center=(c.shots-1)/2;
    for(let i=0;i<c.shots;i++)if(this.hostile.length<260){const a=Math.atan2(h.y-e.y,h.x-e.x)+(i-center)*c.spread;this.hostile.push({x:e.x,y:e.y,vx:Math.cos(a)*c.speed,vy:Math.sin(a)*c.speed,r:8,life:c.duration,damage:h.damage,color:'#ff9d71',kind:'rocket',homingTime:c.homingTime,speed:c.speed,turnRate:c.turnRate,source:e.id});}break;}
   case 'stab':{const c=h.config||e.specialCombo||this.specialConfig(e);e.stabs--;e.chargeTime=c.duration;e.chargeX=Math.cos(h.angle)*c.speed;e.chargeY=Math.sin(h.angle)*c.speed;e.stabReady=e.stabs>0;break;}
   case 'sonic':{
    const c=h.config||this.specialConfig(e);for(let i=0;i<c.shots;i++)if(this.hostile.length<260){const a=h.angle+(i-(c.shots-1)/2)*c.spread;this.hostile.push({x:e.x,y:e.y,vx:Math.cos(a)*c.speed,vy:Math.sin(a)*c.speed,r:c.radius,life:c.duration,damage:h.damage,color:'#7deeff',kind:'sonic',source:e.id});}break;}
   case 'control':
    for(let i=0;i<3;i++){const a=i*TAU/3,unit=this.spawn(13+i,{x:clamp(e.x+Math.cos(a)*150,30,this.world.w-30),y:clamp(e.y+Math.sin(a)*150,30,this.world.h-30)});if(unit){unit.controlled=true;unit.controller=e.id;unit.controlLife=10;unit.xp=0;unit.hp*=5;unit.maxHp*=5;}}
    field('control',10,{r:180});break;
   case 'suicide':
    this.effect(h.x,h.y,h.r,'#ff706c','spark');if(dist(h,this.p)<h.r+this.p.r)this.hurt(30,{ignoreArmor:true});e.hp=0;e.dead=true;break;
   case 'barrier':
    // Close around the player's current position so movement during the warning cannot evade capture.
    field('barrier',5,{x:this.p.x,y:this.p.y,half:210,segments:this.labBox(this.p.x,this.p.y)});this.labFixedLaserLock(e,1);break;
   case 'bombard':
    this.effect(h.x,h.y,h.r,'#ffb66e');if(dist(h,this.p)<h.r+this.p.r)this.hurt(20,{ignoreArmor:true});
    if(h.bombIndex===5){this.labComplete(e,'bombard');for(const f of this.labFields)if(f.source===e.id&&f.kind==='bombardSequence')f.life=0;}break;
   case 'laser':field('laser',5,{baseAngle:h.angle,rotation:0,angles:h.angles,snakeClock:0,damage:e.damage*1.25});e.windup=5;break;
   case 'fixedLaser':field('fixedLaser',D.labBoss.fixedLaserDuration,{angle:h.angle,angles:[h.angle],shot:h.shot,damage:h.damage});break;
   case 'saws':field('saws',1.6,{r:125,spin:0,collected:0,damage:e.damage*1.1});break;
  }
 }
 labWallBlock(oldX,oldY){
  for(const f of this.labFields){if(f.kind!=='barrier'||f.life<=0||!this.enemies.some(e=>e.id===f.source&&e.hp>0))continue;
   const pad=this.p.r+8;
   if(f.half){this.p.x=clamp(this.p.x,Math.max(25,f.x-f.half+pad),Math.min(this.world.w-25,f.x+f.half-pad));this.p.y=clamp(this.p.y,Math.max(25,f.y-f.half+pad),Math.min(this.world.h-25,f.y+f.half-pad));continue;}
   for(const s of f.segments){
    if(s.x===s.x2&&this.p.y>=Math.min(s.y,s.y2)-pad&&this.p.y<=Math.max(s.y,s.y2)+pad&&Math.min(oldX,this.p.x)<=s.x+pad&&Math.max(oldX,this.p.x)>=s.x-pad)this.p.x=oldX<s.x?s.x-pad:oldX>s.x?s.x+pad:oldX;
    if(s.y===s.y2&&this.p.x>=Math.min(s.x,s.x2)-pad&&this.p.x<=Math.max(s.x,s.x2)+pad&&Math.min(oldY,this.p.y)<=s.y+pad&&Math.max(oldY,this.p.y)>=s.y-pad)this.p.y=oldY<s.y?s.y-pad:oldY>s.y?s.y+pad:oldY;
   }
  }
 }
 updateLabFields(dt){
  for(const f of this.labFields){const e=this.enemies.find(e=>e.id===f.source&&e.hp>0);if(!e){f.life=0;continue;}f.life=Math.max(0,f.life-dt);f.tick-=dt;
   if(f.kind==='bombardSequence'){
    f.nextLock-=dt;
    while(f.locked<5&&f.nextLock<=1e-8){f.locked++;const t=.5+dt+f.nextLock;this.cue('warn-bombard',this.p.x,this.p.y,e.color);this.hazards.push({lab:true,type:'bombard',source:e.id,x:this.p.x,y:this.p.y,r:85,t,total:.5,damage:20,bombIndex:f.locked});f.nextLock+=.5;}
   }
   if(f.kind==='saws'){
    f.x=e.x;f.y=e.y;f.spin+=dt*5;f.collected=Math.min(4,Math.floor((f.max-f.life)/.3));
    if(f.life<=1e-8){
     for(let i=0;i<4;i++){const a=f.spin+i*TAU/4,x=f.x+Math.cos(a)*f.r,y=f.y+Math.sin(a)*f.r,target=Math.atan2(this.p.y-y,this.p.x-x);this.hostile.push({x,y,vx:Math.cos(target)*440,vy:Math.sin(target)*440,r:25,life:D.labBoss.sawFlight+D.labBoss.sawGround,age:0,grounded:false,damage:f.damage,color:'#7deeff',kind:'saw',source:e.id});}
     this.cue('saws',e.x,e.y,e.color);f.life=0;
    }
   }
   if(f.kind==='acid'){const d=dist(f,this.p),a=Math.atan2(this.p.y-f.y,this.p.x-f.x),delta=Math.atan2(Math.sin(a-f.angle),Math.cos(a-f.angle));if(d<f.r+this.p.r&&Math.abs(delta)<(f.halfAngle??.5)&&f.tick<=0)this.hurt(f.damage);}
   if(f.kind==='laser'){
    f.x=e.x;f.y=e.y;const previous=f.rotation;f.rotation=TAU*Math.min(1,(f.max-f.life)/f.max);f.angles=[0,1,2].map(i=>f.baseAngle+i*TAU/3+f.rotation);
    const dx=this.p.x-f.x,dy=this.p.y-f.y,d=Math.hypot(dx,dy),target=Math.atan2(dy,dx),pad=Math.asin(Math.min(1,(20+this.p.r)/Math.max(1,d)));
    // Test the swept angular arc as well as the final beam, including at low frame rates.
    if(d<=3200+this.p.r)for(let i=0;i<3;i++){const start=f.baseAngle+i*TAU/3+previous,delta=((target-start)%TAU+TAU)%TAU;if(delta<=f.rotation-previous+pad||delta>=TAU-pad)this.hurt(f.damage);}
    f.snakeClock=(f.snakeClock??0)-dt;
    while(f.snakeClock<=1e-8&&f.life>1e-8){
     for(let i=0;i<3;i++)if(this.hostile.length<260){const angle=f.angles[i]+TAU/6;this.hostile.push({kind:'sCurve',source:e.id,x:e.x,y:e.y,originX:e.x,originY:e.y,angle,speed:210,amplitude:46,frequency:7,age:0,vx:Math.cos(angle)*210,vy:Math.sin(angle)*210,r:7,life:4,damage:e.damage*.75,color:'#e4a0ff'});}
     this.cue('needles',e.x,e.y,'#e4a0ff');f.snakeClock+=.16;
    }
    if(f.life<=1e-8)f.life=0;
   }
   if(f.kind==='fixedLaser'){
    const dx=this.p.x-f.x,dy=this.p.y-f.y,along=dx*Math.cos(f.angle)+dy*Math.sin(f.angle),across=Math.abs(-dx*Math.sin(f.angle)+dy*Math.cos(f.angle));
    if(along>=0&&along<=3200&&across<20+this.p.r)this.hurt(f.damage);
    if(f.life<=1e-8&&f.shot<D.labBoss.fixedLaserShots)this.labFixedLaserLock(e,f.shot+1,true);
   }
   if(f.kind==='control'){
    const units=this.enemies.filter(unit=>unit.controller===e.id&&unit.hp>0&&!unit.dead);
    for(const unit of units)if(f.tick<=0)this.effects.push({x:e.x,y:e.y-40,x2:unit.x,y2:unit.y-20,color:'#ff8c83',type:'line',t:.3,max:.3});
    if(!units.length)f.life=0;
   }
   if(f.tick<=0)f.tick=f.interval??.5;
   if(f.life<=1e-8){f.life=0;if(e.boss&&!['bombardSequence','fixedLaser'].includes(f.kind))this.labComplete(e,f.kind);}
  }
  this.labFields=this.labFields.filter(f=>f.life>0);
 }
 updateLabRocket(b,dt){if(b.kind!=='rocket'||!(b.homingTime>0))return;b.homingTime-=dt;const a=Math.atan2(b.vy,b.vx),target=Math.atan2(this.p.y-b.y,this.p.x-b.x),delta=Math.atan2(Math.sin(target-a),Math.cos(target-a)),next=a+clamp(delta,-dt*(b.turnRate??1.3),dt*(b.turnRate??1.3));b.vx=Math.cos(next)*(b.speed??266);b.vy=Math.sin(next)*(b.speed??266);}

 skyComplete(e,skill){if(!e?.boss||e.hp<=0)return;e.skySeen??=new Set();e.skySeen.add(skill);e.phaseDone=[['rift','thrust'],['pulsewave','discs'],['shield','oscillator','transfer']][e.combatPhase-1].every(s=>e.skySeen.has(s));}
 skyWarn(e,type,t,extra={}){this.cue('warn-sky-'+type,e.x,e.y,e.color);e.windup=Math.max(e.windup||0,t);this.hazards.push({sky:true,type,source:e.id,x:e.x,y:e.y,r:75,t,total:t,damage:e.damage,...extra});}
 skyLockRift(e,shot=1,deferTick=false){
  const x=e.x,y=e.y,angle=Math.atan2(this.p.y-y,this.p.x-x);
  e.windup=Math.max(e.windup||0,1.3);
  this.hazards.push({sky:true,type:'rift',source:e.id,x,y,angle,length:3200,halfAngle:Math.PI/24,r:22,t:.8,total:.8,shot,last:shot===3,deferTick,damage:e.damage});
  this.cue('warn-sky-beam',x,y,e.color);
 }
 skyThrustAim(e,h){
  h.x=e.x;h.y=e.y;h.angle=Math.atan2(this.p.y-e.y,this.p.x-e.x);
  if(h.type==='thrust'){const c=D.skyBoss;h.targetX=clamp(this.p.x+Math.cos(h.angle)*c.thrustBehind,e.r,this.world.w-e.r);h.targetY=clamp(this.p.y+Math.sin(h.angle)*c.thrustBehind,e.r,this.world.h-e.r);h.length=Math.hypot(h.targetX-e.x,h.targetY-e.y);}
 }
 updateSkyThrust(e,dt){
  const s=e.skyThrust;if(!s)return;
  if(s.stage==='travel'){
   s.elapsed=Math.min(D.skyBoss.thrustTravel,s.elapsed+dt);const f=s.elapsed/D.skyBoss.thrustTravel;
   const x=clamp(this.p.x+Math.cos(s.angle)*D.skyBoss.thrustBehind,e.r,this.world.w-e.r),y=clamp(this.p.y+Math.sin(s.angle)*D.skyBoss.thrustBehind,e.r,this.world.h-e.r);
   e.x=s.x+(x-s.x)*f;e.y=s.y+(y-s.y)*f;
   if(f>=1-1e-8){
    e.x=x;e.y=y;s.stage='slash';const c=D.skyBoss;
    this.skyWarn(e,'thrustSlash',c.thrustSlashLock,{x,y,angle:Math.atan2(this.p.y-y,this.p.x-x),r:c.thrustSlashRadius,spread:c.thrustSlashHalfAngle,deferTick:true,damage:e.damage*1.35});
   }
  }else{const h=this.hazards.find(h=>h.source===e.id&&h.type===(s.stage==='lock'?'thrust':'thrustSlash'));if(h)this.skyThrustAim(e,h);}
 }
 skyCooldown(e,skill){return skill==='oscillator'?D.skyBoss.oscillatorCooldown:this.bossCooldown(e,skill==='pulsewave'?5:skill==='shield'?4:4.5);}
 updateSkyDevice(f,e,dt){
  const c=D.skyBoss;f.elapsed+=dt;f.life=1;
  if(f.kind==='discs'){
   let moveTime=dt;
   if(!f.returning){moveTime=Math.min(dt,Math.max(0,c.discChaseTime-(f.elapsed-dt)));}
   const target=f.returning?e:this.p,dx=target.x-f.x,dy=target.y-f.y,d=Math.hypot(dx,dy),aim=Math.atan2(dy,dx);
   if(f.returning)f.angle=aim;
   else f.angle+=clamp(Math.atan2(Math.sin(aim-f.angle),Math.cos(aim-f.angle)),-moveTime*2.8,moveTime*2.8);
   const travel=(f.returning?c.discReturnSpeed:c.discSpeed)*moveTime;
   if(f.returning&&d<=travel+e.r){f.life=0;this.effect(e.x,e.y,24,'#a5f5ff');return;}
   const ox=f.x,oy=f.y;f.x+=Math.cos(f.angle)*travel;f.y+=Math.sin(f.angle)*travel;
   if(!f.returning){
    // Swept collision prevents a fast disc from passing through the player between frames.
    const vx=f.x-ox,vy=f.y-oy,t=clamp(((this.p.x-ox)*vx+(this.p.y-oy)*vy)/(vx*vx+vy*vy||1),0,1);
    if(Math.hypot(this.p.x-ox-vx*t,this.p.y-oy-vy*t)<=this.p.r+f.r){this.hurt(f.damage);f.returning=true;this.cue('sky-rift',f.x,f.y,'#b8eaff');}
    if(f.elapsed>=c.discChaseTime-1e-8)f.returning=true;
   }
  }else if(f.kind==='oscillator'){
   if(f.armed){
    f.warning-=dt;
    if(f.warning<=1e-8){
     if(dist(f,this.p)<=f.r+this.p.r)this.hurt(f.damage);
     this.effect(f.x,f.y,f.r,'#92eaff');this.cue('sky-pulsewave',f.x,f.y,'#92eaff');f.life=0;
    }
   }else if(dist(f,this.p)<=c.oscillatorTrigger+this.p.r){f.armed=true;f.warning=c.oscillatorWarn;this.cue('warn-sky-pulsewave',f.x,f.y,'#92eaff');}
  }
 }
 castSky(e,skill,a){
  if(!e.boss&&({warp:'warp',dragon:'breath',stealth:'veil',thunder:'thunder',tiger:'dash'}[e.behavior]===skill))return this.castSpecial(e);
  if((skill==='discs'||skill==='oscillator')&&(!e.boss||e.combatPhase<(skill==='discs'?2:3)||this.skyFields.some(f=>f.source===e.id&&f.kind===skill)))return;
  if(e.boss&&e.combatPhase===3&&skill!=='transfer')e.skySkillCount=(e.skySkillCount||0)+1;
  if(skill==='transfer'){
   if(!e.boss||e.combatPhase!==3||(e.quantumCharge>0||e.hubIntro>0))return;
   e.quantumIntroduced=true;e.skySkillCount=0;e.quantumCharge=12;e.windup=12;e.clock=12;
   const towers=[{x:100,y:100},{x:this.world.w-100,y:100},{x:this.world.w-100,y:this.world.h-100},{x:100,y:this.world.h-100}];
   this.skyFields.push({kind:'transfer',source:e.id,x:e.x,y:e.y,r:100,towers,life:12,max:12,tick:0});
   this.aimNearest();this.cue('sky-beam',e.x,e.y,e.color);this.notify('量子传输12秒 · 结束释放全场200伤害','boss');return;
  }
  if(skill==='discs'||skill==='oscillator'){
   const c=D.skyBoss;
   if(skill==='discs')for(let i=0;i<c.discCount;i++){
    const angle=a+(i-(c.discCount-1)/2)*.65;
    this.skyFields.push({kind:skill,source:e.id,x:e.x+Math.cos(angle)*60,y:e.y+Math.sin(angle)*60,r:18,angle,elapsed:0,returning:false,life:1,max:1,damage:e.damage*.8});
   }
   else this.skyFields.push({kind:skill,source:e.id,x:clamp(e.x+Math.cos(a)*c.oscillatorOffset,c.oscillatorRadius,this.world.w-c.oscillatorRadius),y:clamp(e.y+Math.sin(a)*c.oscillatorOffset,c.oscillatorRadius,this.world.h-c.oscillatorRadius),r:c.oscillatorRadius,elapsed:0,armed:false,life:1,max:1,damage:e.damage});
   e.clock=this.skyCooldown(e,skill);this.skyComplete(e,skill);this.cue('sky-'+(skill==='discs'?'rift':'shield'),e.x,e.y,e.color);return;
  }
  if(skill==='warp'){const angle=a+Math.PI;this.skyWarn(e,skill,1,{x:clamp(this.p.x+Math.cos(angle)*135,70,this.world.w-70),y:clamp(this.p.y+Math.sin(angle)*135,70,this.world.h-70),r:65});}
  if(skill==='breath')this.skyWarn(e,skill,1.25,{angle:a,r:440});
  if(skill==='veil')this.skyWarn(e,skill,.8,{r:55});
  if(skill==='thunder')for(let i=0;i<3;i++)this.skyWarn(e,skill,1.35+i*.25,{x:clamp(this.p.x+(i===0?0:i===1?-110:110),70,this.world.w-70),y:clamp(this.p.y+(i===0?0:60),70,this.world.h-70),r:65});
  if(skill==='dash'){e.skyDashes=3;this.skyWarn(e,skill,.8,{angle:a,r:26,length:190});}
  if(skill==='thrust'){
   if(!e.boss||e.skyThrust)return;
   e.skyThrust={stage:'lock'};this.skyWarn(e,'thrust',D.skyBoss.thrustLock,{angle:a,r:28,length:dist(e,this.p)+D.skyBoss.thrustBehind});
   this.skyThrustAim(e,this.hazards[this.hazards.length-1]);
  }
  if(skill==='rift')this.skyLockRift(e);
  if(skill==='pulsewave'){
   const facing=Math.atan2(this.p.y-e.y,this.p.x-e.x);this.effect(e.x,e.y,70,'#c995ff');
   e.x=clamp(this.p.x-Math.cos(facing)*100,e.r,this.world.w-e.r);e.y=clamp(this.p.y-Math.sin(facing)*100,e.r,this.world.h-e.r);
   this.effect(e.x,e.y,80,'#c995ff');this.skyWarn(e,skill,.5,{r:480});
  }
  if(skill==='shield')this.skyWarn(e,skill,.75,{r:88});
 }
 updateSkyEnemy(e,dt){
  e.clock-=dt;e.windup=Math.max(0,(e.windup||0)-dt);e.veil=Math.max(0,(e.veil||0)-dt);e.shield=Math.max(0,(e.shield||0)-dt);
  if((e.quantumCharge>0||e.hubIntro>0))return;
  if(e.skyThrust){this.updateSkyThrust(e,dt);return;}
  const dx=this.p.x-e.x,dy=this.p.y-e.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx);
  let speed=e.speed*(e.slow>0?(e.boss?.78:.48):1)*(e.freeze>0?0:1),angle=this.mobHeading(e,a);
  if(e.behavior==='lantern')angle+=d<240?.65:0;
  if(['dragon','thunder'].includes(e.behavior)&&d<380)speed=d<250?-speed*.35:0;
  if(e.veil>0){angle+=.8;speed*=this.specialConfig(e)?.speedScale??1.35;}
  if(e.windup>0||(!e.boss&&e.shield>0)||(e.boss&&d<120))speed=0;
  if(e.chargeTime>0){const from={x:e.x,y:e.y},step=!e.boss&&e.freeze>0?0:Math.min(dt,e.chargeTime);e.chargeTime=Math.max(0,e.chargeTime-step);if(e.chargeTime<1e-8)e.chargeTime=0;e.x=clamp(e.x+e.chargeX*step,e.r,this.world.w-e.r);e.y=clamp(e.y+e.chargeY*step,e.r,this.world.h-e.r);if(!e.boss)this.specialContact(e,from);}else{e.x+=Math.cos(angle)*speed*dt;e.y+=Math.sin(angle)*speed*dt;}
  e.x=clamp(e.x,e.r,this.world.w-e.r);e.y=clamp(e.y,e.r,this.world.h-e.r);
  if(e.skyDashes>0&&e.chargeTime<=0&&e.windup<=0&&e.skyDashReady){e.skyDashReady=false;this.skyWarn(e,'dash',e.specialCombo?.nextWarning??.5,{angle:a,r:26,length:(e.specialCombo?.speed??520)*(e.specialCombo?.duration??.36),config:e.specialCombo});}
  const riftActive=e.boss&&(this.hazards.some(h=>h.source===e.id&&h.type==='rift')||this.skyFields.some(f=>f.source===e.id&&f.kind==='rift'));
  if(!riftActive&&e.clock<=0&&e.windup<=0&&e.freeze<=0&&e.veil<=0&&!(e.chargeTime>0)&&!(e.skyDashes>0)&&(e.boss||e.shield<=0)){
   if(e.boss){
    if(e.combatPhase===3&&(!e.quantumIntroduced||(e.skySkillCount||0)>=15)){this.castSky(e,'transfer',a);return;}
    const groups=[['rift','thrust'],['pulsewave','discs'],['shield','oscillator']],required=groups[e.combatPhase-1];
    const active=skill=>this.hazards.some(h=>h.source===e.id&&h.type===skill)||this.skyFields.some(f=>f.source===e.id&&f.kind===skill);
    const unlocked=groups.slice(0,e.combatPhase).flat().filter(s=>!active(s)),skill=required.find(s=>!e.skySeen?.has(s)&&!active(s))||unlocked[e.skillCycle++%unlocked.length];
    if(skill){this.castSky(e,skill,a);e.clock=this.skyCooldown(e,skill);}else e.clock=.1;
   }
   else if(e.elite)this.castSpecial(e);else e.clock=3;
  }
  if(e.veil<=0&&dist(e,this.p)<e.r+this.p.r)this.hurt(e.damage);
 }
 resolveSkyHazard(h){
  const e=this.enemies.find(e=>e.id===h.source&&e.hp>0);if(!e)return;this.cue('sky-'+h.type,h.x,h.y,e.color);
  const field=(kind,life,extra={})=>{if(this.skyFields.length<32)this.skyFields.push({kind,source:e.id,x:h.x,y:h.y,r:h.r,angle:h.angle,length:h.length,life,max:life,damage:h.damage,tick:0,...extra});};
  if(h.type==='warp'){this.effect(e.x,e.y,70,'#c995ff');e.x=h.x;e.y=h.y;this.effect(e.x,e.y,80,'#c995ff');this.skyWarn(e,'ambush',h.config?.nextWarning??.65,{x:e.x,y:e.y,r:h.config?.radius??105,damage:h.damage});}
  if(h.type==='ambush'){this.effect(h.x,h.y,h.r,'#c995ff');if(dist(h,this.p)<h.r+this.p.r)this.hurt(h.damage);}
  if(h.type==='breath'){field('breath',h.duration??1.8,{halfAngle:h.halfAngle??.65,interval:h.interval??.5});e.windup=h.duration??1.8;}
  if(h.type==='veil'){e.veil=h.duration??2.5;field('veil',e.veil);}
  if(h.type==='thunder'){field('thunder',h.duration??.28);if(dist(h,this.p)<h.r+this.p.r)this.hurt(h.damage);}
  if(h.type==='dash'){const c=h.config||e.specialCombo||this.specialConfig(e);e.skyDashes--;e.chargeTime=c.duration;e.chargeX=Math.cos(h.angle)*c.speed;e.chargeY=Math.sin(h.angle)*c.speed;e.skyDashReady=e.skyDashes>0;}
  if(h.type==='rift'){field('rift',.5,{halfAngle:h.halfAngle,shot:h.shot,last:h.last});}
  if(h.type==='pulsewave'){field('pulsewave',3.5);e.windup=3.5;}
  if(h.type==='thrust'){
   this.skyThrustAim(e,h);e.skyThrust={stage:'travel',x:e.x,y:e.y,angle:h.angle,elapsed:0};e.windup=D.skyBoss.thrustTravel;
  }
  if(h.type==='thrustSlash'){
   this.skyThrustAim(e,h);this.effect(e.x,e.y,h.r,'#9aeef2','clawSweep');Object.assign(this.effects[this.effects.length-1],{angle:h.angle,spread:h.spread});
   if(this.inSector(h,this.p))this.hurt(h.damage);e.skyThrust=null;e.windup=0;this.skyComplete(e,'thrust');
  }
  if(h.type==='shield'){e.shield=D.skyBoss.shieldDuration;field('shield',D.skyBoss.shieldDuration);e.windup=0;e.clock=0;}
 }
 updateSkyFields(dt){
  for(const f of this.skyFields){const e=this.enemies.find(e=>e.id===f.source&&e.hp>0);if(!e){f.life=0;continue;}const before=f.max-f.life;f.life=Math.max(0,f.life-dt);f.tick-=dt;const age=f.max-f.life,dx=this.p.x-f.x,dy=this.p.y-f.y;
   if(f.kind==='discs'||f.kind==='oscillator'){this.updateSkyDevice(f,e,dt);continue;}
   if(f.kind==='transfer'){
    e.quantumCharge=f.life;f.x=e.x;f.y=e.y;
    if(f.life<=1e-8){e.quantumCharge=0;e.windup=0;e.clock=.2;this.cue('sky-pulsewave',e.x,e.y,e.color);this.effect(this.world.w/2,this.world.h/2,3000,'#7df5ff');this.notify('全域量子波 · 200固定伤害','boss');this.hurt(200,{ignoreArmor:true});}
   }
   if(f.kind==='breath'){const a=Math.atan2(dy,dx),delta=Math.atan2(Math.sin(a-f.angle),Math.cos(a-f.angle));if(Math.hypot(dx,dy)<f.r+this.p.r&&Math.abs(delta)<(f.halfAngle??.65)&&f.tick<=0)this.hurt(f.damage);}
   if(f.kind==='rift'){
    const d=Math.hypot(dx,dy),delta=Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-f.angle),Math.cos(Math.atan2(dy,dx)-f.angle)));
    // Distance from the player's center to the filled sector, including its radial edges and outer arc.
    const outside=Math.max(0,delta-f.halfAngle),projection=d*Math.cos(outside);
    if(Math.hypot(projection-clamp(projection,0,f.length),d*Math.sin(outside))<=this.p.r)this.hurt(f.damage*1.1);
   }
   if(f.kind==='beam'){const along=dx*Math.cos(f.angle)+dy*Math.sin(f.angle),across=Math.abs(-dx*Math.sin(f.angle)+dy*Math.cos(f.angle));if(along>=0&&along<f.length&&across<f.r+this.p.r)this.hurt(f.damage*1.3);}
   if(f.kind==='pulsewave'){const d=Math.hypot(dx,dy);for(let i=0;i<3;i++){const r=(age-i*.55)*210,old=(before-i*.55)*210;if(r>0&&r<480&&d>=Math.max(0,old)-this.p.r-10&&d<=r+this.p.r+10)this.hurt(f.damage);}}
   if(f.kind==='veil'||f.kind==='shield'){f.x=e.x;f.y=e.y;}
   if(f.tick<=0)f.tick=f.interval??.5;
   if(f.life<=1e-8){
    f.life=0;if(f.kind==='shield')e.shield=0;if(f.kind==='veil')e.veil=0;
    if(f.kind==='rift'&&!f.last)this.skyLockRift(e,f.shot+1,true);
    if(e.boss&&(f.kind!=='rift'||f.last))this.skyComplete(e,f.kind);
   }
  }this.skyFields=this.skyFields.filter(f=>f.life>0);
 }

 updateEnemies(dt){
  this.updateHubLinks();
  for(const e of this.enemies){
   if(e.hp<=0)continue;if(e.boss)e.phaseAge+=dt;e.slow=Math.max(0,e.slow-dt);e.freeze=Math.max(0,e.freeze-dt);e.flash=Math.max(0,e.flash-dt);e.orbitHit=Math.max(0,e.orbitHit-dt);
   if(e.burn>0){e.burn-=dt;this.hit(e,this.stats.damage*.3*dt*(1+.35*this.quantum('bloom'))*(this.trans('bloom')?(e.burnStacks||1):1),false);if(e.dead)continue;}
   if(e.atlas==='beasts'){this.updateBeast(e,dt);continue;}
   if(e.atlas==='lab'){this.updateLabEnemy(e,dt);continue;}
   if(e.atlas==='sky'){this.updateSkyEnemy(e,dt);continue;}
   if(e.atlas==='hub'){this.updateHubEnemy(e,dt);continue;}
   const dx=this.p.x-e.x,dy=this.p.y-e.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx);let speed=e.speed*(e.slow>0?(e.boss?.78:.48):1)*(e.freeze>0?0:1);
   if(e.type===2&&d<330)speed=d<230?-speed*.4:0;
   if(e.type===5&&d<390)speed=0;
   if(e.boss&&d<100)speed*=.8;
   if(e.chargeTime>0){e.chargeTime-=dt;e.x+=e.chargeX*dt;e.y+=e.chargeY*dt;if(e.boss&&e.chargeTime<=0)this.finishBossSkill(e,3);}else{const angle=this.mobHeading(e,a);e.x+=Math.cos(angle)*speed*dt;e.y+=Math.sin(angle)*speed*dt;}
   e.x=clamp(e.x,e.r,this.world.w-e.r);e.y=clamp(e.y,e.r,this.world.h-e.r);e.clock-=dt;
   if(e.type===2&&e.clock<=0){this.cue('needles',e.x,e.y,e.color);this.hostileShot(e,a,180);e.clock=2.4;}
   if(e.type===4&&d<85&&!e.armed){e.armed=true;this.cue('warn-pulse',e.x,e.y,e.color);this.hazards.push({x:e.x,y:e.y,r:88,t:.95,total:.95,damage:e.damage,source:e.id,type:'bomb'});}
   if(e.type===5&&e.clock<=0){this.cue('summon',e.x,e.y,e.color);this.spawn(0,{x:e.x+35,y:e.y});this.spawn(1,{x:e.x-35,y:e.y});e.clock=6;}
   if(e.boss&&e.clock<=0){
    e.pattern++;const skill=e.phaseDone?1+(e.skillCycle++%e.combatPhase):e.combatPhase;e.clock=this.bossCooldown(e,Math.max(1.7,3.3-this.stage*.3));
    if(skill===1){
     this.cue('barrage',e.x,e.y,e.color);const n=10+this.stage*4;for(let i=0;i<n;i++)this.hostileShot(e,i*TAU/n+e.pattern*.27,125+this.stage*15);
     this.effect(e.x,e.y,75,'#ffbc8d');this.finishBossSkill(e,1);
    }else if(skill===2){
     this.cue('warn-strike',e.x,e.y,e.color);this.hazards.push({x:this.p.x,y:this.p.y,r:360,t:2,total:2,damage:e.damage*1.4,type:'strike',source:e.id,skill:2,last:true});
    }else if(this.stage===0||this.stage===3){
     this.cue('warn-charge',e.x,e.y,e.color);this.hazards.push({x:e.x,y:e.y,r:50,t:.9,total:.9,damage:0,type:'charge',source:e.id,angle:a,skill:3});
    }else{
     this.cue('summon',e.x,e.y,e.color);for(let i=0;i<3+this.stage;i++)this.spawn(this.stage>=2?4:1,{x:e.x+Math.cos(i)*95,y:e.y+Math.sin(i)*95});this.finishBossSkill(e,3);
    }
   }
   if(d<e.r+this.p.r)this.hurt(e.damage);
  }
  this.separateMobs(dt);
 }
 updateBullets(dt){
  for(const b of this.bullets){
   b.life-=dt;b.age+=dt;if(b.life<=0)continue;
   if(b.returning&&b.age>.65){if(!b.returned){b.hit.clear();b.returned=true;b.pierce+=3;if(this.rank('return')>=3)b.damage*=1.35+.25*this.quantum('return');}b.angle=Math.atan2(this.p.y-b.y,this.p.x-b.x);if(dist(b,this.p)<20){const next=this.trans('return')&&(b.returnLaps||0)<3?this.nearest(this.p.x,this.p.y,null,1600):null;if(next){b.returnLaps=(b.returnLaps||0)+1;b.age=0;b.returned=false;b.hit.clear();b.pierce=6;b.life=1.8+.25*this.quantum('return');b.damage*=1.35;b.angle=Math.atan2(next.y-this.p.y,next.x-this.p.x);b.x=this.p.x+Math.cos(b.angle)*24;b.y=this.p.y+Math.sin(b.angle)*24;continue;}b.life=0;if(this.rank('return')>=3){const t=this.nearest(this.p.x,this.p.y,null,450);if(t)this.bullet(Math.atan2(t.y-this.p.y,t.x-this.p.x),{damage:b.damage*.5,returning:false,homing:true,life:1.2});}continue;}}
   else if(b.homing){const t=this.nearest(b.x,b.y,b.hit);if(t){const target=Math.atan2(t.y-b.y,t.x-b.x),delta=Math.atan2(Math.sin(target-b.angle),Math.cos(target-b.angle));b.angle+=clamp(delta,-dt*4,dt*4);}}
   b.x+=Math.cos(b.angle)*b.speed*dt;b.y+=Math.sin(b.angle)*b.speed*dt;
   for(const e of this.enemies){
    if(e.hp<=0||e.veil>0||e.burrow>0||(e.quantumCharge>0||e.hubIntro>0)||b.hit.has(e.id))continue;if(dist(b,e)<e.r+b.r){
     b.hit.add(e.id);this.impact(b,e);
     if(b.bounces>0){b.bounces--;const t=this.nearest(b.x,b.y,b.hit,330);if(t){b.angle=Math.atan2(t.y-b.y,t.x-b.x);b.homing=true;continue;}}
     if(b.pierce--<=0){if(b.returning&&!b.returned){b.age=.7;}else b.life=0;break;}
    }
   }
  }
  this.bullets=this.bullets.filter(b=>b.life>0);
  for(const b of this.hostile){
   if(b.life<=0)continue;const activeDt=Math.min(dt,b.life);this.updateLabRocket(b,activeDt);b.life=Math.max(0,b.life-dt);const oldX=b.x,oldY=b.y;
   if(b.kind==='saw'){
    const flight=Math.min(activeDt,Math.max(0,D.labBoss.sawFlight-b.age));b.age+=activeDt;
    b.x+=b.vx*flight;b.y+=b.vy*flight;
    if(b.age>=D.labBoss.sawFlight-1e-8){b.grounded=true;b.vx=0;b.vy=0;}
    if(b.life<=1e-8){b.life=0;continue;}
   }else if(b.kind==='sCurve'){
    b.age+=activeDt;const c=Math.cos(b.angle),s=Math.sin(b.angle),offset=b.amplitude*Math.sin(b.age*b.frequency);
    b.x=b.originX+c*b.speed*b.age-s*offset;b.y=b.originY+s*b.speed*b.age+c*offset;
    const lateral=b.amplitude*b.frequency*Math.cos(b.age*b.frequency);b.vx=c*b.speed-s*lateral;b.vy=s*b.speed+c*lateral;
   }else{b.x+=b.vx*activeDt;b.y+=b.vy*activeDt;}
   const dx=b.x-oldX,dy=b.y-oldY,t=clamp(((this.p.x-oldX)*dx+(this.p.y-oldY)*dy)/(dx*dx+dy*dy||1),0,1);
   if(dist(b,this.p)<this.p.r+b.r||(Math.hypot(this.p.x-oldX-dx*t,this.p.y-oldY-dy*t)<this.p.r+b.r)){this.hurt(b.damage);if(b.kind!=='saw')b.life=0;}
  }
  this.hostile=this.hostile.filter(b=>b.life>0);
 }
 updateZones(dt){
  this.updateLabFields(dt);this.updateSkyFields(dt);this.updateHubFields(dt);
  for(const z of this.zones){
   z.life-=dt;z.tick-=dt;z.echo-=dt;
   for(const e of this.enemies){if(e.hp<=0||dist(z,e)>z.r+e.r)continue;
    if(z.kind==='water'){e.slow=.3;if(this.rank('undertow')&&!e.boss){const d=dist(z,e)||1;const pull=45*this.rank('undertow')*(this.rank('undertow')>=3?1.5:1)*(1+.3*this.quantum('undertow'));e.x+=(z.x-e.x)/d*pull*dt;e.y+=(z.y-e.y)/d*pull*dt;}}
    if(z.tick<=0){if(z.kind==='water'&&this.hero.id==='deepseek'&&(e.hydroNext??-1)<=this.time){e.hydroNext=this.time+.49;this.hydroMark(e);}this.hit(e,z.damage*(z.kind==='fire'?1+.35*this.quantum('bloom'):1),false);if(this.rank('bloom')&&z.kind==='flower')e.burn=3;}
   }
   if(this.hero.id==='claude'&&this.trans('orbit')&&z.kind==='flower'&&dist(z,this.p)<z.r)this.p.hp=Math.min(this.p.maxHp,this.p.hp+6*dt);
   if(z.tick<=0)z.tick=.5;
   if(z.echo<=0&&z.kind==='water'&&this.rank('tide')>=3){z.echo=1;if(this.trans('tide')){this.routeAOE(z.x,z.y,z.r,z.damage*1.5);for(const off of [-.35,.35]){const target=this.nearest(z.x,z.y,null,600);if(target)this.bullet(Math.atan2(target.y-z.y,target.x-z.x)+off,{x:z.x,y:z.y,damage:z.damage,homing:true,kind:'drop',life:1.5});}}const e=this.nearest(z.x,z.y,null,300);if(e){const b=this.bullet(Math.atan2(e.y-z.y,e.x-z.x),{kind:'drop',damage:z.damage,life:.9});if(b){b.x=z.x;b.y=z.y;}}}
  }
  this.zones=this.zones.filter(z=>z.life>0);
  for(const h of [...this.hazards]){if(h.deferTick){h.deferTick=false;continue;}if(h.lab&&h.type==='barrier'){h.x=this.p.x;h.y=this.p.y;h.segments=this.labBox(h.x,h.y);}const before=Math.ceil(h.t);h.t-=dt;if(h.type==='pulse'&&Math.ceil(h.t)!==before&&h.t>0)this.cue('tick',h.x,h.y);if(h.t>1e-8)continue;h.t=0;
   if(h.beast){this.resolveBeastHazard(h);continue;}
   if(h.lab){this.resolveLabHazard(h);continue;}
   if(h.sky){this.resolveSkyHazard(h);continue;}
   if(h.hub){this.resolveHubHazard(h);continue;}
   this.cue(h.type==='bomb'?'pulse':h.type,h.x,h.y,'#ff846f');if(h.type==='charge'){const e=this.enemies.find(e=>e.id===h.source&&e.hp>0);if(e){e.chargeTime=.65;e.chargeX=Math.cos(h.angle)*420;e.chargeY=Math.sin(h.angle)*420;}}
   else {if(h.last&&h.skill)this.finishBossSkill(this.enemies.find(e=>e.id===h.source),h.skill);this.effect(h.x,h.y,h.r,'#ff846f');if(dist(h,this.p)<h.r+this.p.r)this.hurt(h.damage);if(h.type==='bomb'){const e=this.enemies.find(e=>e.id===h.source);if(e&&e.hp>0){e.hp=0;this.kill(e);}}}
  }
  this.hazards=this.hazards.filter(h=>h.t>0);
  const n=this.orbitCount();this.orbitClock+=dt*(n>=3?2.5:1.8);
  if(n){const radius=(n>=3?105:75)*this.stats.area;for(let i=0;i<n;i++){const x=this.p.x+Math.cos(this.orbitClock+i*TAU/n)*radius,y=this.p.y+Math.sin(this.orbitClock+i*TAU/n)*radius;for(const e of this.enemies)if(e.hp>0&&e.orbitHit<=0&&Math.hypot(e.x-x,e.y-y)<e.r+18){e.orbitHit=.35;this.hit(e,this.stats.damage*(n>=3?1:.7)*(1+.25*this.quantum('orbit')));}}}
 }
 giveXP(value){this.xp+=value;while(this.xp>=this.needed){this.xp-=this.needed;this.level++;this.cue('level');this.needed=experienceForLevel(this.level);this.upgradeQueue++;this.p.hp=Math.min(this.p.maxHp,this.p.hp+7+(this.rank('renew')>=3?25:0));}}
 offer(kind='level'){
  this.offerKind=kind;this.offerLevel=kind==='level'?this.level-Math.max(0,this.upgradeQueue-1):null;
  this.offerCategory=kind==='level'&&this.offerLevel%3===0?'route':'common';
  this.refreshRemaining=this.offerCategory==='common'?2:0;this.drawUpgradeChoices();this.mode='upgrade';
 }
 drawUpgradeChoices(){
  const pool=(this.offerCategory==='route'?this.hero.routes:D.common).filter(o=>this.offerCategory==='route'?!this.trans(o.id):this.rank(o.id)<o.max);
  const picked=[];
  while(picked.length<3&&picked.length<pool.length){const available=pool.filter(o=>!picked.includes(o));picked.push(available[Math.floor(this.random()*available.length)]);}
  if(!picked.length)picked.push({id:'heal',name:'应急修复',desc:'恢复 50% 最大生命',max:999});
  this.choices=picked.map(o=>D.common.some(c=>c.id===o.id)?this.commonChoice(o):o.effect?this.routeChoice(o):o);
 }
 refreshUpgrade(){
  if(this.mode!=='upgrade'||this.offerCategory!=='common'||this.refreshRemaining<=0)return false;
  this.refreshRemaining--;this.drawUpgradeChoices();this.cue('upgrade');return true;
 }
 choose(id){
  if(this.mode!=='upgrade'||!this.choices.some(c=>c.id===id))return false;
  const choice=this.choices.find(c=>c.id===id),common=D.common.some(c=>c.id===id),multiplier=common?(choice.multiplier||1):1;
  this.cue('upgrade');if(id==='heal')this.p.hp=Math.min(this.p.maxHp,this.p.hp+this.p.maxHp*.5);
  else if(choice.routeStep){if(choice.routeStep==='quantize'){if(this.rank(id)<4||this.quantum(id)>=2)return false;this.quantizations[id]=this.quantum(id)+1;}else{if(this.rank(id)<4||this.quantum(id)!==2||this.trans(id))return false;this.transmutations[id]=true;this.notify('质变觉醒 · '+choice.transName,'evolution');this.cue('transmute');}this.takeStats();this.effect(this.p.x,this.p.y,200,this.hero.color);}
  else {if(common)this.commonPoints[id]=this.commonRank(id)+multiplier;this.ranks[id]=this.rank(id)+1;this.takeStats();if(id==='vital')this.p.hp=Math.min(this.p.maxHp,this.p.hp+35*multiplier);if(id==='renew')this.p.hp=Math.min(this.p.maxHp,this.p.hp+12);const route=this.hero.routes.find(r=>r.id===id);if(route&&this.rank(id)===3){this.cue('evolve');this.notify(route.evolution,'evolution');}}
  this.choices=[];
  if(this.offerKind==='boss')this.mode='stage';
  else {this.upgradeQueue--;if(this.upgradeQueue>0)this.offer();else this.mode='playing';}
  return true;
 }
 developerSetCombat(option,on){if(!['invulnerable','highDamage'].includes(option)||typeof on!=='boolean')return false;this.developerCombat[option]=on;return true;}
 developerJump(stage,wave){
  if(!Number.isInteger(stage)||stage<0||stage>=D.stages.length||!Number.isInteger(wave)||wave<1||wave>D.stages[stage].wavePools.length)return false;
  this.stage=stage;this.wave=wave;this.phase='wave';this.mode='playing';this.pendingStage=false;
  this.waveTime=0;this.waveSpawned=0;this.waveOrdinary=0;this.waveRanged=0;this.introductions=[...(D.stages[stage].introductions?.[wave]||[])];
  this.hubTrail=[];this.hubTrailClock=0;this.playerVelocity={x:0,y:0};
  for(const key of ['enemies','bullets','hostile','gems','zones','effects','popups','hazards','labFields','skyFields','hubFields','events','avEvents'])this[key]=[];
  this.choices=[];this.offerKind='level';this.refreshRemaining=0;this.spawnClock=.1;this.fireClock=.1;this.targetId=null;
  this.singularity=null;this.sunburstQueue=[];this.inSunburst=false;
  this.p.x=this.world.w/2;this.p.y=this.world.h/2;this.p.invuln=1.5;if(this.p.hp<=0)this.p.hp=this.p.maxHp;
  this.notify(`开发者跳转 · 第 ${stage+1} 关 / 第 ${wave} 波`);
  if(this.upgradeQueue>0)this.offer();return true;
 }
 developerLevel(){
  if(!['playing','paused','upgrade','stage'].includes(this.mode))return false;
  const mode=this.mode;this.giveXP(this.needed-this.xp);
  if(mode==='playing'||mode==='paused')this.offer();return true;
 }

 advance(){
  if(this.mode!=='stage')return false;
  this.stage++;this.wave=1;this.waveTime=0;this.waveSpawned=0;this.waveOrdinary=0;this.waveRanged=0;this.introductions=[];this.phase='wave';this.spawnClock=1;this.mode='playing';this.notify(`阶段 ${this.stage+1} · ${D.stages[this.stage].name}：敌军进化`,'danger');
  if(this.upgradeQueue>0)this.offer();return true;
 }
 pause(){if(this.mode==='playing'){this.mode='paused';return true;}return false;}
 resume(){if(this.mode==='paused'){this.mode='playing';return true;}return false;}
 step(delta,input={}){
  if(this.mode!=='playing')return;
  const dt=clamp(delta,0,.05);this.time+=dt;for(const id of Object.keys(this.universalCooldowns))this.universalCooldowns[id]=Math.max(0,this.universalCooldowns[id]-dt);this.p.invuln=Math.max(0,this.p.invuln-dt);this.p.hp=Math.min(this.p.maxHp,this.p.hp+this.stats.regen*dt);
  const oldX=this.p.x,oldY=this.p.y;
  let mx=input.x||0,my=input.y||0,len=Math.hypot(mx,my)||1;if(len>1){mx/=len;my/=len;}const pull=this.hubPullVelocity(dt);this.p.x=clamp(this.p.x+(mx*this.stats.speed+pull.x)*dt,25,this.world.w-25);this.p.y=clamp(this.p.y+(my*this.stats.speed+pull.y)*dt,25,this.world.h-25);
  this.labWallBlock(oldX,oldY);this.hubWallBlock(oldX,oldY);this.playerVelocity={x:dt>0?(this.p.x-oldX)/dt:0,y:dt>0?(this.p.y-oldY)/dt:0};this.recordHubTrail(dt);this.aimNearest();this.moving=!!(mx||my);
  this.waveTime+=dt;
  if(this.phase==='wave'&&this.waveSpawned>=this.waveBudget()&&this.waveAlive()<=this.waveThreshold()){
   this.waveTime=0;this.waveSpawned=0;this.waveOrdinary=0;this.waveRanged=0;if(this.wave>=this.waveCount())this.spawnBoss();else{this.wave++;this.spawnClock=0;this.introductions=[...(D.stages[this.stage].introductions?.[this.wave]||[])];const note=this.stage===0?({5:' · 豪猪加入',7:' · 战猪、巨蟾加入',10:' · 灵鹿加入，全部特殊能力解锁'}[this.wave]||''):(D.stages[this.stage].introductions[this.wave]?' · '+D.stages[this.stage].introductions[this.wave].map(type=>D.enemies[type].name).join('、')+'加入':'');this.notify(`本关第 ${this.wave}/${this.waveCount()} 波 · 敌潮增强${note}`);}
  }
  this.spawnClock-=dt;
  if(this.spawnClock<=0){
   const sector=D.stages[this.stage],pool=sector.wavePools?sector.wavePools[this.phase==='boss'?0:this.wave-1]:sector.pool,baseCount=Math.ceil((2+this.stage)*this.diff.count);
   const count=this.phase==='boss'?2*baseCount:Math.max(0,Math.min(this.waveBudget()-this.waveSpawned,this.waveCap()-this.waveAlive(),Math.ceil(this.waveCap()*.35)));
   if((![1,2,3].includes(this.stage)||this.phase!=='boss')&&(this.phase==='wave'||this.enemies.filter(e=>!e.boss&&e.hp>0).length<24))for(let i=0;i<count;i++){
    if(this.waveAlive()>=(this.phase==='wave'?this.waveCap():330))break;
    let type=this.introductions.length?this.introductions.shift():this.pickEnemy(pool);
    const limits=this.eliteLimits(type);
    if(D.enemies[type].elite&&(this.enemies.filter(e=>e.elite&&e.hp>0).length>=limits.total||this.enemies.filter(e=>e.type===type&&e.hp>0).length>=limits.perType)){const available=pool.filter(candidate=>{if(!D.enemies[candidate].elite)return false;const cap=this.eliteLimits(candidate);return this.enemies.filter(e=>e.elite&&e.hp>0).length<cap.total&&this.enemies.filter(e=>e.type===candidate&&e.hp>0).length<cap.perType;});const fallback=available.length?available:pool.filter(candidate=>!D.enemies[candidate].elite);type=fallback[Math.floor(this.random()*fallback.length)];}
    if(this.spawn(type)){this.waveSpawned++;if(!D.enemies[type].elite)this.waveOrdinary++;if(this.isRanged(type))this.waveRanged++;}
   }
   this.spawnClock=this.phase==='boss'?3:1.05;
  }
  this.fireClock-=dt;if(this.fireClock<=0){if(this.attack())this.fireClock=this.stats.interval/(this.rank('frenzy')>=3&&this.p.hp<this.p.maxHp*.5?1.4:1);else this.fireClock=0;}
  this.updateEnemies(dt);if(this.mode==='dead')return;
  this.updateBullets(dt);if(this.mode==='dead')return;
  this.updateZones(dt);if(this.mode==='dead')return;this.updateAscensions(dt);if(this.mode==='dead')return;
  for(const g of this.gems){const d=dist(g,this.p);if(d<this.stats.magnet){const speed=300+Math.max(0,180-d)*3;g.x+=(this.p.x-g.x)/(d||1)*speed*dt;g.y+=(this.p.y-g.y)/(d||1)*speed*dt;}if(d<24){this.cue('pickup',g.x,g.y);this.giveXP(g.value);g.taken=true;}}
  this.gems=this.gems.filter(g=>!g.taken);this.enemies=this.enemies.filter(e=>e.hp>0);
  for(const fx of this.effects)fx.t-=dt;this.effects=this.effects.filter(f=>f.t>0).slice(-180);
  for(const pop of this.popups){pop.t-=dt;pop.y-=dt*30;}this.popups=this.popups.filter(p=>p.t>0);
  if(this.pendingStage){
   this.pendingStage=false;this.enemies=[];this.hostile=[];this.hazards=[];this.labFields=[];this.skyFields=[];this.hubFields=[];this.bullets=[];this.zones=[];
   for(const g of this.gems)this.giveXP(g.value);this.gems=[];this.p.hp=Math.min(this.p.maxHp,this.p.hp+this.p.maxHp*.35);
   if(this.stage===3){this.mode='won';this.notify('永恒中枢圣尊已击破，远征胜利！','success');}
   else this.offer('boss');
  }else if(this.upgradeQueue>0)this.offer();
 }
}
const hub=typeof module!=='undefined'&&module.exports?require('./survivor-hub.js'):root.SurvivorHub;hub.install(Run);
const specials=typeof module!=='undefined'&&module.exports?require('./survivor-specials.js'):root.SurvivorSpecials;specials.install(Run);
const API={Run,clamp,dist};if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.SurvivorCore=API;
})(typeof window==='undefined'?globalThis:window);
