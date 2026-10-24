/* Shared special-enemy mechanics and editable numerical definitions. */
(function(root){
'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const definitions={
 porcupine:{title:'电磁钢针齐射',desc:'预警后发射三轮扇形钢针。保持距离并横向移动躲避。',cooldown:3.8,warning:.85,range:750,volleys:3,shots:5,interval:.2,speed:285,spread:.1,damageScale:.75},
 toad:{title:'超载全域脉冲',desc:'接近后进入3秒超载，倒计时结束自爆并伤及全场。倒计时内击杀可打断。',cooldown:99,warning:3,range:145,radius:100,damageScale:1},
 boar:{title:'火箭直线冲撞',desc:'预警后沿锁定方向直线冲撞，途中接触造成伤害。侧向移动可躲避。',cooldown:4.6,warning:1,range:850,speed:520,duration:.8,damageScale:1},
 deer:{title:'纳米修复雾',desc:'每秒为周围受损友军回复最大生命的4.5%，绿色光索指向实际接受治疗的目标。',cooldown:1,range:205,healRatio:.045,damageScale:0},
 acid:{title:'驻留腐蚀雾',desc:'进入喷射距离后蓄力，留下固定在地面的扇形毒雾5秒。喷射后可继续移动。',cooldown:5,warning:.85,range:260,duration:5,halfAngle:.5,interval:.5,damageScale:.55},
 radar:{title:'追踪导弹齐射',desc:'标记目标后发射3枚短时追踪导弹。导弹速度266，及时转向躲避。',cooldown:5.3,warning:1.1,range:900,shots:3,speed:266,homingTime:.9,turnRate:1.3,duration:4,spread:.18,damageScale:1},
 lancer:{title:'三连液压突刺',desc:'锁定方向连续突刺3次；后续每次重新预警并瞄准当前位置。',cooldown:5,warning:.75,nextWarning:.5,range:650,shots:3,speed:728,duration:.28,damageScale:1},
 repair:{title:'纳米修补光束',desc:'周期治疗半径230内的受损友军，每次回复最大生命的3.5%。',cooldown:1.2,range:230,healRatio:.035,damageScale:0},
 sonic:{title:'三重震荡音波',desc:'蓄力后射出三道月牙声波，沿固定方向前进。可从波束间隙穿过。',cooldown:4.4,warning:1,range:900,shots:3,speed:165,duration:5,spread:.18,radius:26,damageScale:.85},
 warp:{title:'裂空折跃伏击',desc:'预告折跃落点，瞬移到玩家附近后再次预警并爆发近身攻击。',cooldown:5.5,warning:1,nextWarning:.65,range:1000,offset:135,radius:105,damageScale:1},
 dragon:{title:'量子扇形吐息',desc:'进入射程后蓄力，沿固定方向持续喷吐1.8秒；离开扇形区域可规避。',cooldown:6.5,warning:1.25,range:440,duration:1.8,halfAngle:.65,interval:.5,damageScale:.65},
 stealth:{title:'灵子虚化潜行',desc:'预警后虚化2.5秒，期间无法锁定和受伤，并以额外机动速度游走；结束后重新显形。',cooldown:6,warning:.8,range:1000,duration:2.5,speedScale:1.35,damageScale:0},
 thunder:{title:'三点引雷',desc:'在玩家当前落点及左右位置标记三次落雷，各落点锁定后不再追踪。',cooldown:5.5,warning:1.35,range:1400,shots:3,interval:.25,radius:65,duration:.28,damageScale:1.2},
 tiger:{title:'灵风三连冲刺',desc:'三次短距离高速突击，后两次重新锁定并预警。侧移躲避连续追击。',cooldown:6,warning:.8,nextWarning:.5,range:750,shots:3,speed:520,duration:.36,damageScale:1},
 prism:{title:'三向分光激光',desc:'三条预警线后发射固定分叉激光，三束间保留可走位的空隙。',cooldown:4.5,warning:1,range:980,duration:.6,spread:.42,radius:10,damageScale:.85},
 wallBuilder:{title:'定空力场障壁',desc:'根据玩家移动方向预告一段临时力场墙，阻挡通路但可绕过两端。',cooldown:6.5,warning:.85,range:1000,duration:3.5,offset:125,halfLength:130,damageScale:0},
 chronist:{title:'残影轨迹劫雷',desc:'标记玩家过去2秒经过的位置，随后依次延迟爆炸。避免折返踩回标记。',cooldown:5.5,warning:.95,range:1200,shots:4,interval:.2,radius:66,duration:.3,damageScale:1.1},
 harmonist:{title:'三机共鸣同调',desc:'连接附近最多3个友军，提供25%移动加速和35%减伤；击杀同调仪可立即解除。',cooldown:1,range:340,targets:3,speedScale:1.25,armor:.35,damageScale:0},
 mortar:{title:'四连焚界投弹',desc:'连续4次重新标记玩家位置，落地形成持续4.5秒的危险池。离开池区避免持续伤害。',cooldown:7,warning:.9,range:1200,shots:4,interval:.35,radius:88,duration:4.5,tickInterval:.5,damageScale:.45}
};
const labels={cooldown:'冷却/秒',warning:'首轮预警/秒',nextWarning:'连招预警/秒',range:'触发/作用距离',volleys:'齐射轮数',shots:'次数/弹数',interval:'连发间隔/秒',speed:'技能移速',spread:'分叉间隔/弧度',damageScale:'技能伤害倍率',radius:'区域半径',duration:'持续/秒',healRatio:'每次回复比例',halfAngle:'扇形半角/弧度',homingTime:'追踪时长/秒',turnRate:'导弹转向/弧度每秒',offset:'落点偏移',speedScale:'移动倍率',halfLength:'墙体半长',targets:'连接数量',armor:'减伤比例',tickInterval:'伤害间隔/秒'};
const bounds={cooldown:[.2,120],warning:[.15,10],nextWarning:[.15,10],range:[60,1800],volleys:[1,8],shots:[1,12],interval:[.08,3],speed:[60,1000],spread:[.04,1],damageScale:[0,4],radius:[5,650],duration:[.15,15],healRatio:[.001,.15],halfAngle:[.1,1.4],homingTime:[0,5],turnRate:[.1,5],offset:[30,400],speedScale:[1,2],halfLength:[60,400],targets:[1,3],armor:[0,.6],tickInterval:[.2,3]};
function sanitize(behavior,input={}){const c={...definitions[behavior]};if(!c.title)return null;for(const [k,v]of Object.entries(input)){if(!bounds[k]||!Number.isFinite(Number(v)))continue;const [lo,hi]=bounds[k];c[k]=clamp(Number(v),lo,hi);if(['shots','volleys','targets'].includes(k))c[k]=Math.round(c[k]);}return c;}
const methods={
 specialConfig(e){const input=this.specialOverrides?.[e.behavior];if(!e._specialConfig||e._specialInput!==input){e._specialInput=input;e._specialConfig=sanitize(e.behavior,input);}return e._specialConfig;},
 specialContact(e,from){const dx=e.x-from.x,dy=e.y-from.y,t=clamp(((this.p.x-from.x)*dx+(this.p.y-from.y)*dy)/(dx*dx+dy*dy||1),0,1);const damage=e.damage*(this.specialConfig(e)?.damageScale??1);if(damage>0&&Math.hypot(this.p.x-from.x-dx*t,this.p.y-from.y-dy*t)<=e.r+this.p.r)this.hurt(damage);},
 castSpecial(e){
  const c=this.specialConfig(e);if(!c||e.dead||e.hp<=0)return false;
  const a=Math.atan2(this.p.y-e.y,this.p.x-e.x),d=dist(e,this.p),b=e.behavior;
  if(!['deer','repair','harmonist'].includes(b)&&d>c.range+this.p.r)return false;
  if(b==='toad'&&e.armed)return false;
  e.lastSpecial=this.time;e.specialCycle=(e.specialCycle||0)+1;e.specialCombo=c;e.clock=c.cooldown;
  const damage=e.damage*c.damageScale;
  if(b==='porcupine')this.warnBeast(e,'needles',c.warning,{angle:a,r:32,config:c,damage});
  if(b==='toad'){e.armed=true;this.warnBeast(e,'pulse',c.warning,{r:c.radius,damage});this.notify('巨蟾超载！'+c.warning+'秒内击杀，阻止全场脉冲','danger');}
  if(b==='boar')this.warnBeast(e,'rocket',c.warning,{angle:a,r:35,speed:c.speed,duration:c.duration,damage});
  if(b==='deer'||b==='repair'){
   e.healTargets=[];for(const ally of this.enemies)if(ally!==e&&ally.hp>0&&!ally.dead&&ally.hp<ally.maxHp&&dist(e,ally)<c.range){ally.hp=Math.min(ally.maxHp,ally.hp+ally.maxHp*c.healRatio);e.healTargets.push(ally.id);this.effects.push({x:e.x,y:e.y,x2:ally.x,y2:ally.y,color:'#71efad',type:'line',t:.35,max:.35});}
   this.cue('heal',e.x,e.y,'#71efad');this.effect(e.x,e.y,c.range,'#71efad');
  }
  if(b==='acid')this.labWarn(e,'acid',c.warning,{angle:a,r:c.range,duration:c.duration,halfAngle:c.halfAngle,interval:c.interval,damage});
  if(b==='radar')this.labWarn(e,'radar',c.warning,{x:this.p.x,y:this.p.y,r:55,config:c,damage});
  if(b==='lancer'){e.stabs=c.shots;this.labWarn(e,'stab',c.warning,{angle:a,r:24,config:c,damage});}
  if(b==='sonic')this.labWarn(e,'sonic',c.warning,{angle:a,r:c.radius,config:c,damage});
  if(b==='warp'){this.skyWarn(e,'warp',c.warning,{x:clamp(this.p.x-Math.cos(a)*c.offset,70,this.world.w-70),y:clamp(this.p.y-Math.sin(a)*c.offset,70,this.world.h-70),r:65,config:c,damage});}
  if(b==='dragon')this.skyWarn(e,'breath',c.warning,{angle:a,r:c.range,duration:c.duration,halfAngle:c.halfAngle,interval:c.interval,damage});
  if(b==='stealth')this.skyWarn(e,'veil',c.warning,{r:55,duration:c.duration});
  if(b==='thunder')for(let i=0;i<c.shots;i++){const off=i===0?0:(i%2?-1:1)*Math.ceil(i/2)*110;this.skyWarn(e,'thunder',c.warning+i*c.interval,{x:clamp(this.p.x+off,70,this.world.w-70),y:clamp(this.p.y+(i?60:0),70,this.world.h-70),r:c.radius,duration:c.duration,damage});}
  if(b==='tiger'){e.skyDashes=c.shots;this.skyWarn(e,'dash',c.warning,{angle:a,r:26,length:c.speed*c.duration,config:c,damage});}
  if(b==='prism'){this.hubWarn(e,'prism',c.warning,{angle:a,angles:[a-c.spread,a,a+c.spread],length:c.range,r:c.radius,duration:c.duration,damage});e.windup=c.warning+c.duration;}
  if(b==='wallBuilder'){
   const velocity=this.playerVelocity||{x:0,y:0},v=Math.hypot(velocity.x,velocity.y)>1?velocity:{x:Math.cos(a),y:Math.sin(a)},len=Math.hypot(v.x,v.y)||1,vertical=Math.abs(v.x)>=Math.abs(v.y);
   const x=clamp(this.p.x+v.x/len*c.offset,190,this.world.w-190),y=clamp(this.p.y+v.y/len*c.offset,190,this.world.h-190),segments=[vertical?{x,y:y-c.halfLength,x2:x,y2:y+c.halfLength}:{x:x-c.halfLength,y,x2:x+c.halfLength,y2:y}];this.hubWarn(e,'wall',c.warning,{x,y,segments,duration:c.duration});e.windup=c.warning;
  }
  if(b==='chronist'){
   const trail=(this.hubTrail||[]).filter(p=>p.time<=this.time-.2&&p.time>=this.time-2),points=[];
   for(let i=0;i<c.shots;i++){const p=trail[Math.floor(i*Math.max(0,trail.length-1)/Math.max(1,c.shots-1))]||this.p;if(points.every(o=>dist(o,p)>=55))points.push(p);}
   points.forEach((p,i)=>this.hubWarn(e,'trace',c.warning+i*c.interval,{x:p.x,y:p.y,r:c.radius,duration:c.duration,damage}));e.windup=.5;
  }
  if(b==='mortar'){this.hubMortarLock(e,1);this.hubField('mortarQueue',e,c.interval*(c.shots-1)+.1,{next:c.interval,shot:1,total:c.shots,interval:c.interval});e.windup=c.interval;}
  if(b==='harmonist')this.updateHubLinks();
  return true;
 }
};
const API={definitions,labels,bounds,sanitize,install:Run=>Object.assign(Run.prototype,methods)};if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.SurvivorSpecials=API;
})(typeof window==='undefined'?globalThis:window);
