(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports,D=node?require('./survivor-data.js'):root.SurvivorData,{Run}=node?require('./survivor-core.js'):root.SurvivorCore;
const skills=[
 [{id:'barrage',phase:1,name:'360°环形弹幕',desc:'每完成8次技能后施放四轮错位环形弹幕，计数跨三个阶段累计。'},
  {id:'swipe',phase:1,name:'近身 · 扇形爪击',desc:'玩家进入210距离后，预警0.6秒，挥出半径230、夹角108°的近身爪击。'},
  {id:'rush',phase:1,name:'远距 · 直线冲撞',desc:'玩家超过520距离时锁定冲撞方向，预警0.7秒后直线冲锋；锁定后不会转弯。'},
  {id:'warp',phase:2,name:'瞬移 · 巨型爪击',desc:'先折跃到靶标附近，再挥出大扇面爪击，可移动到背后观察。'},
  {id:'missile',phase:3,name:'广域轰炸',desc:'锁定一次靶标位置后引爆；移动靶标可检查轰炸是否跟随。'},
  {id:'tripleRush',phase:3,name:'高速 · 三连冲撞',desc:'以400移速连续冲撞3次，每次冲撞结束后重新锁定当前位置；首段预警0.45秒，后两段各0.25秒，整组三连计为一次技能。'}],
 [{id:'control',phase:1,name:'自爆机兵召集',desc:'三台高生命机兵追近靶标后预警自爆；从开始召唤计技能间隔，不等待自爆结束即可衔接其他技能。'},
  {id:'barrier',phase:1,name:'力场墙 · 五连固定激光',desc:'方框生成时立即衔接五道固定激光，每道重新锁定当前位置，预警0.5秒、发射0.5秒。'},
  {id:'bombard',phase:2,name:'五连追踪轰炸',desc:'连续五次重新锁定当前靶标位置；从第一轮开始计技能间隔，轰炸尚未全部结束也可衔接其他技能。'},
  {id:'laser',phase:2,name:'旋转三向激光 · S形弹幕',desc:'三道激光旋转扫场，间隙同时发射S形弹幕。'},
  {id:'saws',phase:3,name:'四把光刃 · 齐射驻旋',desc:'四把光刃集结后瞄准射出，飞行2秒后停在各自落点旋转2秒，飞行与驻旋期间均造成接触伤害。'}],
 [{id:'rift',phase:1,name:'三连扇形量子激光',desc:'连续三次重新锁定当前位置0.8秒，各发射一片15°扇形激光，持续0.5秒，结束后衔接下一次。'},
  {id:'thrust',phase:1,name:'追踪突刺 · 身后近斩',desc:'原地实时追踪蓄力0.8秒，0.3秒内穿身突刺到玩家身后80距离；再原地蓄力0.8秒，朝玩家释放半径240的近身扇形斩击。'},
  {id:'pulsewave',phase:2,name:'瞬移贴身 · 量子震荡',desc:'先瞬移至靶标身边，短暂预警后释放三层震荡波。'},
  {id:'discs',phase:2,name:'三枚追踪 · 回收飞盘',desc:'投出3枚追踪飞盘，命中玩家或投出满5秒后返回Boss；回程不伤人，投出后即开始计算正常技能间隔。'},
  {id:'oscillator',phase:3,name:'近域部署 · 量子震荡机',desc:'在Boss附近部署不可破坏的震荡机，接近后短暂预警并释放一次小范围震荡，然后消失。部署后0.5秒即可衔接下一技能。'},
  {id:'shield',phase:3,name:'五秒莲花护盾',desc:'只开启持续5秒的无敌护盾。实战开启后可立即衔接下一技能，演示仅展示护盾。'},
  {id:'transfer',phase:3,name:'四角传输 · 全场量子波',desc:'切换为全场视角可看到四座塔。传输结束后释放全场波；第三关使用当前机制雏形。',overview:true}],
 [{id:'aegis',phase:1,name:'时空吸积盾 · 引力坍缩',desc:'5秒无敌：前3秒施加朝向Boss的吸引速度，可用WASD抵抗；后2秒扩散量子震荡波。护盾期间可衔接轰炸。'},
  {id:'orbital',phase:1,name:'天基星晷神罚 · 六连轰炸',desc:'逐次锁定玩家当前位置，0.5秒后轰炸，共6次。施放后可立即衔接其他技能。'},
  {id:'sweep',phase:2,name:'空间断罪死光 · 360°回旋',desc:'预警后同时射出4道激光，相邻间隔90°，以每圈5秒的速度旋转一整圈，与第二关三向激光同速。'},
  {id:'rush',phase:2,name:'时空折跃 · 裂空月华斩',desc:'冲锋落点重新锁定方向，预警0.6秒后挥出半径560、总夹角160°的扇面斩击，可侧移或绕后。'},
  {id:'spiritAegis',phase:1,form:'spirit',skill:'aegis',name:'星灵神盾 · 乾坤雷劫',desc:'开启3秒护盾，同时在玩家附近生成10处互不重叠的雷光落点，半径80，预警0.6秒后轰击。'},
  {id:'spiritOrbital',phase:1,form:'spirit',skill:'orbital',name:'星核湮灭 · 终末轨道炮',desc:'六道天光落地造成伤害，每个落点留下同范围的量子湮灭区域，持续5秒。'},
  {id:'ascended',phase:1,form:'spirit',skill:'quantum',name:'虚数奇点 · 量子湮灭球',desc:'释放一颗追踪玩家的大型量子球，周围湮灭领域持续攻击，球和领域共存8秒。'},
  {id:'phaseRush',phase:1,form:'spirit',skill:'rush',name:'星灵降维 · 双生相位斩',desc:'星灵本体连续两组相位突进接扇面斩击，每次斩击完成后再锁定下一次突进。'}]
];
const catalog=D.stages.map((s,index)=>({stage:index,name:s.boss,arena:s.name,skills:skills[index]}));
class Session{
 constructor(stage=0,id=skills[stage]?.[0]?.id,hero='gpt'){
  const item=skills[stage]?.find(s=>s.id===id);if(!item)throw Error('Unknown boss demo skill');
  this.stage=stage;this.skill=item;this.run=new Run(hero,'normal');const r=this.run;r.stage=stage;r.p.x=1400;r.p.y=800;r.p.maxHp=r.p.hp=1000000;r.p.invuln=0;r.spawnBoss();
  this.boss=r.enemies.find(e=>e.boss);const e=this.boss;e.x=1000;e.y=820;e.combatPhase=item.phase;e.phaseDone=false;e.clock=0;e.quantumIntroduced=stage===2&&id!=='transfer';
  if(stage===2&&id==='shield')e.skySeen=new Set(['transfer']);
  r.spawnClock=r.fireClock=Infinity;r.events=[];this.started=false;this.followup=false;this.manualGrace=0;this.finishedFor=0;this.finished=false;
  if(stage===0){if(item.phase===3)e.bearPhaseThreeSeen=new Set([id==='tripleRush'?'missile':'tripleRush']);if(id==='swipe')r.p.x=e.x+170;if(id==='rush')r.p.x=e.x+650;r.castBear(e,id);this.started=true;}
  if(stage===1){r.castLabBoss(e,id,Math.atan2(r.p.y-e.y,r.p.x-e.x));this.started=true;}
  if(stage===2){r.castSky(e,id,Math.atan2(r.p.y-e.y,r.p.x-e.x));if(id==='oscillator'){const f=r.skyFields.find(f=>f.kind===id);r.p.x=f.x+90;r.p.y=f.y;}this.started=true;}
  if(stage===3){r.hubInitBoss(e,item.form||'mech');e.combatPhase=item.phase;r.hubPhase(e);r.hubCast(e,item.skill||id);this.started=true;}
 }
 completed(){const e=this.boss;return this.stage===1?e.labSeen?.has(this.skill.id):this.stage===2?e.skySeen?.has(this.skill.id):this.stage===3?e.hubSeen?.has(this.skill.skill||this.skill.id):e.phaseDone;}
 step(dt,input={},autoMove=true){
  const r=this.run,e=this.boss;if(r.mode!=='playing')return;
  if(input.x||input.y)this.manualGrace=2;else this.manualGrace=Math.max(0,this.manualGrace-dt);
  if(autoMove&&!this.manualGrace){const a=r.time*.62,x=1400+Math.cos(a)*180-r.p.x,y=800+Math.sin(a)*140-r.p.y,d=Math.hypot(x,y);input=d>5?{x:x/d,y:y/d}:{};}
  r.spawnClock=r.fireClock=Infinity;
  const shieldFollow=this.stage===3&&e.hubForm!=='spirit'&&(this.skill.skill||this.skill.id)==='aegis'&&e.shield>0&&!this.followup;
  if(this.started)e.clock=shieldFollow?0:Infinity;
  r.step(dt,input);this.started=true;
  if(shieldFollow&&((this.stage===2&&(e.skySkillCount||0)>1)||(this.stage===3&&r.hazards.some(h=>h.type==='orbital'))))this.followup=true;
  const busy=r.hazards.length||r.labFields.length||r.skyFields.length||r.hubFields.length||r.hostile.length||e.burstLeft>0||e.chargeTime>0||r.enemies.some(x=>!x.boss&&x.hp>0&&!x.dead);
  this.finishedFor=this.completed()&&!busy?this.finishedFor+dt:0;this.finished=this.finishedFor>=.9;
 }
 snapshot(){const r=this.run;return {stage:this.stage,skill:this.skill.id,time:r.time,finished:this.finished,damageTaken:r.p.maxHp-r.p.hp,bossPhase:this.boss.combatPhase,bossForm:this.boss.hubForm||null,bossPhaseCount:r.bossPhaseCount(this.boss),hostile:r.hostile.length,hazards:r.hazards.map(h=>h.type),fields:[...r.labFields,...r.skyFields,...r.hubFields].map(f=>f.kind)};}
}
const API={catalog,Session};if(node)module.exports=API;else root.BossShowcase=API;
})(typeof window==='undefined'?globalThis:window);
