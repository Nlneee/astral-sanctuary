(function(root){
'use strict';
const route=(id,name,desc,evolution,effect)=>({id,name,desc,evolution,effect,max:4});
const heroes=[
 {id:'gpt',name:'GPT',title:'紫晶裁决',color:'#c4a1ff',weapon:'裁决光矢',text:'光矢贯穿叠加裁决印记，满 3 层引爆范围伤害；专属共鸣：路线每级 +6% 全伤害系数。',hp:110,speed:210,damage:26,interval:.6,kind:'bolt',routes:[
  route('focus','全知贯穿','伤害 +32%，贯穿 +1；命中叠印记，满 3 层引爆 200% 范围伤害','三阶·终末裁决：每 3 次射击发射 1 发 300% 威力巨型光矢','focus'),
  route('chain','推演连锁','连锁目标 +2；跳跃范围 160，造成 70% 伤害并叠印记','三阶·因果回路：连锁范围增至 230，连锁伤害增至 100%','chain'),
  route('orbit','守护星环','环绕星晶 +2 颗；75 半径环绕，触敌造成 70% 伤害','三阶·星冠：环绕半径扩至 105，转速 +39%，伤害提至 100%','orbit')]},
 {id:'gemini',name:'Gemini',title:'双星幻奏',color:'#b0a9ff',weapon:'双生星弹',text:'成对射出星弹，专属双星弹幕无衰减倾泻，以多重子星构筑星空火力。',hp:95,speed:235,damage:15,interval:.48,kind:'twin',routes:[
  route('split','繁星分裂','射击追加 2 枚星弹；每枚造成 90% 伤害','三阶·星雨：单轮射击追加 2 枚侧翼星弹（齐射达 8 弹）','split'),
  route('seeker','星轨追猎','星弹附带自动追踪导向，弹体伤害 +15%','三阶·双星回旋：星弹命中后向邻近目标弹射 1 次','seeker'),
  route('echo','镜像幻奏','攻击频率 +16%；同步向身后发射 1 枚 70% 伤害背向星弹','三阶·四重奏：每 4 次攻击向四周爆发 12 向 360° 星环弹幕','echo')]},
 {id:'glm',name:'GLM · 智谱',title:'菱晶律令',color:'#e6c6df',weapon:'律令晶锥',text:'发射宽阔晶锥，积寒冻结配合碎冰共振控制战局；专属共鸣：路线每级 +6% 全伤害系数。',hp:135,speed:195,damage:30,interval:.72,kind:'crystal',routes:[
  route('orbit','菱晶卫阵','环绕晶盾 +2 枚，护甲 +8%；触敌造成 70% 冰霜伤害','三阶·王庭：晶盾半径扩至 105，转速 +39%，伤害提至 100%','orbit'),
  route('frost','凛夜封锁','伤害 +26%；积攒 3 层积寒冻结敌人，Boss 霜蚀破甲 2.5 秒','三阶·零度律令：普通敌人积寒门槛降为 2 层即可冻结','frost'),
  route('shatter','碎晶风暴','爆裂半径 +14；命中冻结目标触发 113 半径碎冰范围爆发','三阶·万象棱镜：碎裂时额外射出 2 枚贯穿晶锥（贯穿 2 目标）','shatter')]},
 {id:'deepseek',name:'DeepSeek',title:'深海回响',color:'#6fd6ff',weapon:'深潜水泡',text:'水泡形成持续潮汐水域，4 层压强引发深海坍缩；专属共鸣：路线每级 +6% 全伤害系数。',hp:110,speed:210,damage:24,interval:.75,kind:'bubble',routes:[
  route('pressure','深海压强','水泡伤害 +40%，范围 +22%；叠满 4 层引爆 225% 范围坍缩','三阶·渊海鲸落：每 3 发水泡释放 1 发双倍范围的巨鲸水泡','pressure'),
  route('tide','永续潮汐','水域持续 +1.3 秒、半径 +16；每 0.5 秒造成 36% 水伤并叠印记','三阶·海之回声：水域每秒向 300 范围内最近敌人发射 1 枚水滴','tide'),
  route('undertow','逆流引力','水域减速 70% 并以 45/s 聚怪，经验拾取半径 +30','三阶·深渊漩涡：水域聚怪牵引力 +50%，水泡获得贯穿 +2','undertow')]},
 {id:'claude',name:'Claude',title:'日冕花语',color:'#ffbc80',weapon:'日光花种',text:'花种绽放日光花圃，提供持续灼烧、生命复苏与环绕防御；专属共鸣：路线每级 +6% 全伤害系数。',hp:120,speed:205,damage:22,interval:.65,kind:'seed',routes:[
  route('bloom','燎原花火','绽放伤害 +32%；附加 3 秒灼烧，花圃持续造成灼烧伤害','三阶·日冕：灼烧敌人阵亡时留下一片 60 半径日冕烈火区域','bloom'),
  route('renew','温柔复苏','每秒恢复 1.1 生命，最大生命 +18；选取时立刻恢复 12 生命','三阶·晨曦：角色每次升级额外恢复 25 点生命（总计 32 点）','renew'),
  route('orbit','向阳花园','环绕太阳花 +2 朵；75 半径环绕，触敌造成 70% 伤害','三阶·盛夏：花环半径扩至 105，伤害提至 100%，花种贯穿 +1','orbit')]},
 {id:'qwen',name:'Qwen · 通义',title:'千问流风',color:'#80dace',weapon:'流风折扇',text:'扇形风刃回旋贯穿，破绽洞察引爆高额暴击伤害；专属共鸣：路线每级 +6% 全伤害系数。',hp:100,speed:225,damage:18,interval:.66,kind:'fan',routes:[
  route('fan','千叠扇阵','每次射击风刃 +3 枚，覆盖扇面随数量同步拓宽','三阶·万卷：每 4 次攻击释放 16 道 360° 全方位环形风刃','fan'),
  route('return','流风归鞘','风刃伤害 +22%；飞行尽头折返回收，刷新命中并造成二次伤害','三阶·回雪：风刃折返伤害 +35%，回收时发射 1 枚 50% 追踪风刃','return'),
  route('insight','破绽洞察','暴击率 +16%，暴击伤害 +35%（超出 100% 暴击率转为暴伤）','三阶·无问：触发暴击时光刃贯穿 +1，并向邻近敌人连锁 1 次','insight')]},
 {id:'grok',name:'Grok',title:'赤夜狂想',color:'#ff7b96',weapon:'叛逆霰弹',text:'近距离散射重火力压制，狂热极速与猩红吸血越战越勇；专属共鸣：路线每级 +6% 全伤害系数。',hp:115,speed:220,damage:15,interval:.7,kind:'shot',routes:[
  route('blast','赤夜爆破','霰弹溅射伤害 +16%，爆破半径 +14','三阶·末日礼炮：每 4 次攻击发射 1 枚 400% 威力巨型高爆核弹','blast'),
  route('frenzy','狂想加速','攻击频率 +25%，移动速度 +7%','三阶·暴走：生命低于 50% 时进入狂怒，攻击频率额外 +40%','frenzy'),
  route('leech','猩红盛宴','子弹命中恢复 0.2 生命，攻击伤害 +18%','三阶·不落幕：击杀敌人恢复 1.2 生命，暴击率提升 12%','leech')]}
];
const ascensions={
 gpt:{
  focus:['光矢伤害 +15%，全伤害系数 +10%','终焉天律','普攻化为 400% 伤害、99 次贯穿的终焉巨大光矢'],
  chain:['连锁伤害 +15%，全伤害系数 +10%','因果审判','连锁增至 16 目标与 420 范围，造成 180% 伤害，击杀留下雷域'],
  orbit:['星晶追加 1 颗，触伤 +25%，全伤害系数 +10%','星穹天盾','星晶追加 4 颗；每 0.25 秒拦截敌弹并反击 300% 伤害光矢']},
 gemini:{
  split:['单次射击额外追加 2 枚星弹','星系增殖','主星弹命中分裂为 3 枚 80% 伤害的追踪子星'],
  seeker:['星弹伤害 +15%，弹射次数 +1','双子猎星','双子核心绕身，每 0.6 秒各射 180% 伤害、弹射 4 次的追踪星'],
  echo:['攻击频率额外 +10%，背向星弹 +1 枚','镜界交响','左右双镜像同步复制普攻弹幕，镜像各造成 75% 伤害']},
 glm:{
  orbit:['晶盾追加 1 枚，触伤 +25%，全伤害系数 +10%','不破王庭','每 4 秒免疫 1 次伤害，受击爆发 12 枚双倍冰晶并冻结周围'],
  frost:['减速持续 +0.3 秒，冻结 +0.2 秒，全伤害系数 +10%','绝对零域','每 4 秒冻结 350 范围敌人 1.8 秒，冻结目标额外受伤 50%'],
  shatter:['爆裂范围 +15%，碎晶伤害 +15%，全伤害系数 +10%','万象裂镜','命中向 8 向散射 80% 伤害、4 次贯穿的碎晶裂片']},
 deepseek:{
  pressure:['水泡伤害 +15%，爆破范围 +15%，全伤害系数 +10%','利维坦鲸落','每第 3 次水泡命中引发 220 半径、500% 伤害的鲸落大爆破'],
  tide:['水域持续 +1 秒，水域伤害 +15%，全伤害系数 +10%','万流归海','水域每秒追加 150% 范围伤害并向目标发射 3 枚追踪水滴'],
  undertow:['水域牵引力 +30%，拾取半径 +25，全伤害系数 +10%','奇点海渊','召唤跟随敌人的奇点：230 范围强吸附，每 0.5 秒造成 120% 伤害']},
 claude:{
  bloom:['灼烧与火焰伤害 +35%，全伤害系数 +10%','永燃日冕','灼烧可叠 5 层；燃烧阵亡引发 160 半径、200% 伤害的连锁引燃'],
  renew:['每秒恢复 +0.8，最大生命 +20，全伤害系数 +10%','不熄晨曦','每秒积蓄 3 点晨曦护盾（上限 60%）；每 30 秒抵挡 1 次致死伤'],
  orbit:['环绕花追加 1 朵，触伤 +25%，全伤害系数 +10%','六瓣日轮','6 朵花台每秒各射 1 颗 80% 花种，花圃内自身每秒回血 6 点']},
 qwen:{
  fan:['风刃数量额外 +2 枚，全伤害系数 +10%','万卷天书','普攻追加 32 道全向风刃，每 4 次攻击额外射 12 枚追踪书页'],
  return:['回程伤害 +25%，弹体存活 +0.25 秒，全伤害系数 +10%','回雪无尽','风刃回收后再出击 3 轮（每轮伤害 +35% 并重置命中）'],
  insight:['暴击率 +5%，暴击伤害 +25%，全伤害系数 +10%','洞天照彻','每第 5 次风刃必出 300% 超暴击，使目标易伤 40% 持续 3 秒']},
 grok:{
  blast:['爆炸范围 +15%，爆炸伤害 +25%，全伤害系数 +10%','终焉链爆','巨弹命中留下 160 半径连爆雷区 3 秒，每 0.5 秒造成双倍伤害'],
  frenzy:['攻击频率额外 +15%，移速 +5%，全伤害系数 +10%','赤红永动','每 6 次射击进入 4 秒狂热（攻速 2.5 倍），追加 300% 赤色穿甲弹'],
  leech:['命中恢复量 +50%，攻击伤害 +15%，全伤害系数 +10%','血海盛宴','吸血 4% 并转化最高 50% 血盾，每 3 秒耗半盾引爆 260 范围血爆']}
};
for(const hero of heroes)for(const item of hero.routes){const [quantDesc,transName,transDesc]=ascensions[hero.id][item.id];Object.assign(item,{quantDesc,transName,transDesc});}

const common=[
 {id:'power',name:'超频核心',desc:'所有伤害 +15%',max:Infinity},
 {id:'haste',name:'加速回路',desc:'攻击频率 +12%',max:Infinity},
 {id:'vital',name:'生命容器',desc:'最大生命 +25，并恢复 35 生命',max:Infinity},
 {id:'boots',name:'轻量推进',desc:'移动速度 +8%',max:Infinity},
 {id:'magnet',name:'引力拾取',desc:'经验拾取半径 +35',max:Infinity},
 {id:'armor',name:'适应装甲',desc:'护甲强度 +8%（持续降低承伤，收益递减）',max:Infinity},
 {id:'area',name:'广域增幅',desc:'攻击范围与弹体尺寸 +15%',max:Infinity},
 {id:'luck',name:'精准演算',desc:'暴击率 +8%（超出 100% 转为暴击伤害）',max:Infinity}
];
const rarities=[{id:'normal',name:'普通',color:'#e6e9ef',multiplier:1,weight:50},{id:'rare',name:'稀有',color:'#5ba8ff',multiplier:1.5,weight:28},{id:'epic',name:'史诗',color:'#bc7cff',multiplier:2,weight:14},{id:'legendary',name:'传奇',color:'#ffd166',multiplier:3,weight:6},{id:'mythic',name:'神话',color:'#ff647b',multiplier:4,weight:2}];
const difficulties={easy:{name:'轻松',hp:.72,damage:.65,count:.8,desc:'敌人生命与伤害降低，适合熟悉角色与构筑。'},normal:{name:'标准',hp:1,damage:1,count:1,desc:'完整的机械潮汐，考验走位与成长搭配。'},hard:{name:'灾厄',hp:1.4,damage:1.35,count:1.25,desc:'敌群更密集、伤害更高，适合熟练指挥官。'}};
const enemies=[
 {id:'scout',name:'巡逻机兵',hp:30,speed:150,damage:10,xp:3,r:15,sprite:0,color:'#8faabd'},
 {id:'runner',name:'疾走猎犬',hp:23,speed:139,damage:8,xp:4,r:13,sprite:1,color:'#ffd17d'},
 {id:'shooter',name:'脉冲射手',hp:48,speed:102,damage:10,xp:6,r:17,sprite:2,color:'#a3b6ff'},
 {id:'shield',name:'重装壁垒',hp:130,speed:72,damage:20,xp:9,r:22,sprite:3,color:'#8bd4d3'},
 {id:'bomber',name:'自爆蜂群',hp:35,speed:125,damage:24,xp:6,r:14,sprite:4,color:'#ff9b77'},
 {id:'summoner',name:'装配母机',hp:180,speed:58,damage:15,xp:15,r:24,sprite:5,color:'#df98ef'}
];
const beasts=[
 ['hound','改装机械猎犬',29,129,9,4,14,'#69e5ed'],
 ['raven','侦察机械渡鸦',24,141,8,4,13,'#ff8888'],
 ['beetle','合金刃甲遁地虫',48,116,12,5,17,'#ffb268'],
 ['porcupine','电磁雷针豪猪',100,92,12,12,21,'#ad96ff'],
 ['toad','超载脉冲巨蟾',75,117,22,12,21,'#ff7979'],
 ['boar','火箭撞角战猪',135,158,18,14,23,'#ffb36b'],
 ['deer','纳米生化灵鹿',105,112,8,15,19,'#72eeb7']
];
beasts.forEach(([behavior,name,hp,speed,damage,xp,r,color],sprite)=>enemies.push({behavior,name,hp,speed,damage,xp,r,color,sprite,atlas:'beasts',elite:sprite>=3}));
const labMachines=[
 ['biped','双足侦察机',100,115,12,6,15,'#7deaff'],['orb','多面体悬浮球',95,124,11,6,16,'#7deaff'],
 ['engineer','四足工兵机',150,86,17,8,21,'#ffc17c'],['trooper','人形突击机兵',130,148,15,7,18,'#8eabff'],
 ['acid','蚀质喷雾重装机',370,78,22,20,25,'#a4f56c'],['radar','轨导锁定轰炸者',330,106,24,20,23,'#ff8b7b'],
 ['lancer','疾刺狂徒·穿心机',300,132,22,20,20,'#8bdfff'],['repair','纳米高能修补机',300,138,10,22,23,'#73efb5'],
 ['sonic','震荡音波重炮机',410,64,23,23,26,'#83eaff']
];
labMachines.forEach(([behavior,name,hp,speed,damage,xp,r,color],sprite)=>enemies.push({behavior,name,hp,speed,damage,xp,r,color,sprite,atlas:'lab',elite:sprite>=4}));
const skyMachines=[
 ['sword','御剑机偶',105,118,14,7,16,'#9be5da'],['runeDog','机关灵犬',100,121,14,7,16,'#d7be82'],['guard','符文甲士',185,82,20,10,23,'#dfb574'],['lantern','悬浮灵灯',105,126,12,7,17,'#8ceaff'],
 ['warp','太虚裂空兽',320,152,23,23,23,'#c598ff'],['dragon','青溟量子螭龙',430,74,26,26,26,'#79e7ef'],['stealth','无相遁光机',285,119,19,23,20,'#d2b7ff'],['thunder','九霄引雷台',350,68,25,25,23,'#f3d5ff'],['tiger','迅影白虎机',355,122,25,24,23,'#9ceef0']
];
skyMachines.forEach(([behavior,name,hp,speed,damage,xp,r,color],sprite)=>enemies.push({behavior,name,hp,speed,damage,xp,r,color,sprite,atlas:'sky',elite:sprite>=4}));
// Light pursuit chassis aim slightly ahead; heavy/ranged chassis keep their existing roles.
const pursuitLead={scout:0.2,runner:0.65,bomber:0.35,hound:0.55,raven:0.3,toad:0.25,boar:0.2,biped:0.2,orb:0.25,trooper:0.15,lancer:0.45,sword:0.3,runeDog:0.6,stealth:0.4,tiger:0.5};
for(const e of enemies)e.pursuitLead=pursuitLead[e.behavior||e.id]||0;
// Final Hub: the supplied platinum army; original indices stay stable for earlier sectors.
const hubMachines=[
 ['blade','圣枢巡守·灵刃机卫',195,104,24,10,18,'#b6efff',.3],
 ['disc','溯空巡弋·追魂灵盘',165,107,21,10,17,'#9ae9ff',.55],
 ['bulwark','磐石金刚·重盾重装偶',560,76,30,14,27,'#d8e5f5',0],
 ['fox','灵狐迅影·相位奔袭兽',155,110,20,11,16,'#a8f6ff',.65],
 ['prism','分光裁决使·三向天光机',390,108,29,27,23,'#94eaff',0],
 ['wallBuilder','封域筑垒者·定空障壁机',480,88,25,28,26,'#9ecaff',0],
 ['chronist','溯迹判官·残影劫雷偶',360,134,28,28,21,'#d29bff',0],
 ['harmonist','枢纽同调仪·聚灵圣弦机',350,100,17,29,22,'#ffe09e',0],
 ['mortar','湮灭倾覆者·焚界投弹台',510,60,31,30,27,'#e4b4ff',0]
];
hubMachines.forEach(([behavior,name,hp,speed,damage,xp,r,color,pursuitLead],sprite)=>enemies.push({behavior,name,hp,speed,damage,xp,r,color,pursuitLead,sprite,atlas:'hub',elite:sprite>=4}));
const stages=[
 {name:'外围沙场',pool:[6,7,8],wavePools:Array.from({length:20},(_,i)=>[6,7,8,...(i>=4?[9]:[]),...(i>=6?[11,10]:[]),...(i>=9?[12]:[])]),introductions:{5:[9],7:[11,10],10:[12]},boss:'相移弹幕 · 裂隙战熊领主',sprite:7,atlas:'beasts',behavior:'bear',unlock:'研究室智械军团'},
 {name:'机械体研究室',pool:[13,14,15,16],wavePools:[[13,14,15,16],[13,14,15,16,17,18,19],[13,14,15,16,17,18,19,20,21]],introductions:{2:[17,18,19],3:[20,21]},boss:'全域统辖者 · 神罗智械主脑',sprite:9,atlas:'lab',behavior:'overlord',unlock:'仙侠机关军团'},
 {name:'熔核禁区',pool:[22,23,24,25],wavePools:[[22,23,24,25],[22,23,24,25,26,27,28],[22,23,24,25,26,27,28,29,30]],introductions:{2:[26,27,28],3:[29,30]},boss:'真武神霄·太极量子机甲天尊',sprite:9,atlas:'sky',behavior:'taoTitan',unlock:'永恒中枢军团'},
 {name:'主脑中枢',pool:[31,32,33,34],boss:'文明主宰·永恒中枢圣尊',sprite:9,atlas:'hub',behavior:'archon',unlock:'净化完成'}
];
// All sectors share the same 20-wave cadence; each retains its own species.
const sectorRosters=[
 {basic:[6,7,8],steps:{5:[9],7:[11,10],10:[12]},ranged:[9],healers:[12]},
 {basic:[13,14,15,16],steps:{5:[17],7:[18,19],10:[20,21]},ranged:[18,21],healers:[20]},
 {basic:[22,23,24,25],steps:{5:[26],7:[27,28],10:[29,30]},ranged:[27,29],healers:[]},
 {basic:[31,32,33,34],steps:{5:[35],7:[36,37],10:[38,39]},ranged:[35,37,39],healers:[]}
];
for(const i of [2,3,4,5])enemies[i].elite=true;
sectorRosters.forEach((roster,index)=>{const stage=stages[index];stage.pool=roster.basic;stage.introductions=roster.steps;stage.ranged=roster.ranged;stage.healers=roster.healers;stage.wavePools=Array.from({length:20},(_,i)=>[...roster.basic,...Object.entries(roster.steps).filter(([wave])=>i+1>=Number(wave)).flatMap(([,types])=>types)]);});
// First-sector boss: range-reactive basics and a shared cross-phase barrage counter.
const bearBoss={moveMultiplier:1.2,cooldownExtra:.5,barrageEvery:8,
 clawRange:210,clawRadius:230,clawWarning:.6,clawHalfAngle:Math.PI*.3,
 rushRange:520,rushWarning:.7,rushSpeed:560,rushMaxDistance:850,rushOvershoot:100,
 tripleRushSpeed:400,tripleRushCount:3,tripleRushFirstWarning:.45,tripleRushNextWarning:.25,tripleRushMaxDistance:600,tripleRushOvershoot:100};
const skyBoss={discCount:3,discChaseTime:5,discSpeed:240,discReturnSpeed:650,oscillatorOffset:160,oscillatorTrigger:125,oscillatorRadius:170,oscillatorWarn:.35,oscillatorCooldown:.5,shieldDuration:5,thrustLock:.8,thrustTravel:.3,thrustBehind:80,thrustSlashLock:.8,thrustSlashRadius:240,thrustSlashHalfAngle:Math.PI/3};
const labBoss={fixedLaserShots:5,fixedLaserWarning:.5,fixedLaserDuration:.5,sawFlight:2,sawGround:2};
const universalSkills={reset:{name:'重置',heal:50,cooldown:120}};
const data={heroes,common,rarities,difficulties,enemies,stages,bearBoss,skyBoss,labBoss,universalSkills};
if(typeof module!=='undefined'&&module.exports)module.exports=data;else root.SurvivorData=data;
})(typeof window==='undefined'?globalThis:window);
