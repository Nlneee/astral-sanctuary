(() => {
'use strict';
const D=window.SurvivorData,{Run,clamp}=window.SurvivorCore,$=id=>document.getElementById(id),TAU=Math.PI*2;
const heroAtlas=new Image(),enemyAtlas=new Image();heroAtlas.src='./assets/survivors/heroes.png';enemyAtlas.src='./assets/survivors/machines.png';
const desertMap=new Image();desertMap.src='./assets/survivors/desert-battlefield.png';
const beastAtlas=new Image();beastAtlas.src='./assets/survivors/beasts.png';
const beastRects=[[0,45,433,385],[422,48,530,381],[861,120,480,315],[1318,80,456,355],[0,438,425,396],[430,480,530,360],[953,425,333,434],[1285,435,489,425]];
const labMap=new Image();labMap.src='./assets/survivors/mechanical-laboratory.png';
const labAtlas=new Image();labAtlas.src='./assets/survivors/lab-machines.png';
const labRects=[[20,0,390,390],[425,70,275,292],[705,35,515,360],[1220,20,300,375],[1530,25,453,365],[12,390,325,390],[350,440,445,330],[775,425,385,360],[1140,400,390,385],[1515,380,468,413]];
const skyAtlas=new Image();skyAtlas.src='./assets/survivors/sky-machines.png';
const skyRects=[[0,0,420,390],[416,0,410,390],[820,0,380,390],[1210,0,365,390],[1575,0,408,390],[0,390,410,403],[410,390,380,403],[790,390,365,403],[1150,390,390,403],[1470,390,513,403]];
const hubAtlas=new Image();hubAtlas.src='./assets/survivors/hub-roster-source.png';
const hubBossMechImg=new Image();hubBossMechImg.src='./assets/survivors/hub-boss-mech-overhaul.png';
const hubBossSpiritImg=new Image();hubBossSpiritImg.src='./assets/survivors/hub-boss-spirit-overhaul.png';
const hubRects=[[210,18,720,700],[1030,30,760,680],[1990,20,760,710],[2880,95,950,600],[150,730,480,610],[980,730,650,610],[1700,760,360,580],[2340,730,700,560],[3060,740,630,590],[130,1310,1440,840],[2340,1310,1180,840]];
const desertMargin=400;
// Atlas regions follow the generated artwork, including the wider carrier boss.
const machineRects=[[0,0,362,362],[362,0,340,362],[702,0,350,362],[1052,0,396,362],[0,363,355,353],[355,363,347,352],[702,354,389,375],[1091,363,357,358],[0,707,448,379],[448,699,425,387]];
const heroRects=[[0,0,440,465],[452,0,430,465],[891,0,433,465],[1334,0,440,465],[0,472,440,415],[450,472,433,415],[890,472,433,415]];
let demoActive=false,demoSession=null,demoSpeed=1,demoOverview=false,demoViewPreference=null,demoAuto=true,demoMode='all',demoAudio=false;
let demoKind='boss',demoEdits={};
const demoAPI=()=>demoKind==='special'?window.EnemyShowcase:window.BossShowcase;
let selected='gpt',difficulty='normal',run=null,ready=false,keys=new Set(),last=0,accumulator=0,lastMode='',lastBuild='',toastTime=0,toastText='',recorded=false,soundOn=true,uiClock=0;
const canvas=$('arena'),ctx=canvas.getContext('2d'),camera={x:0,y:0},view={w:innerWidth,h:innerHeight,dpr:1,zoom:1};
const ambientMotes=[];
for(let i=0;i<48;i++){
 ambientMotes.push({
  x:Math.random()*2400,y:Math.random()*1600,
  r:Math.random()*2.2+0.8,
  vx:(Math.random()-0.5)*18,vy:(Math.random()-0.5)*12,
  alpha:Math.random()*0.55+0.15
 });
}
function drawAmbient(dt){
 if(!run)return;
 const stage=run.stage,color=stage===0?'#ffe1a0':stage===1?'#70e9ff':'#d0b3ff';
 ctx.save();
 ctx.globalCompositeOperation='lighter';
 for(const m of ambientMotes){
  m.x+=(m.vx+(stage===0?26:stage===1?5:-8))*dt;
  m.y+=m.vy*dt;
  if(m.x<-200)m.x=run.world.w+200;
  if(m.x>run.world.w+200)m.x=-200;
  if(m.y<-200)m.y=run.world.h+200;
  if(m.y>run.world.h+200)m.y=-200;
  ctx.globalAlpha=m.alpha*(0.65+0.35*Math.sin(run.time*2.5+m.x));
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.arc(m.x,m.y,m.r,0,TAU);
  ctx.fill();
 }
 ctx.restore();
}
function readSave(){try{const value=JSON.parse(localStorage.getItem('astral_survivors_v1')||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}}
let save=readSave();if(D.heroes.some(h=>h.id===save.hero))selected=save.hero;if(D.difficulties[save.difficulty])difficulty=save.difficulty;
const sound=new window.SurvivorAV.Sound(),visuals=new window.SurvivorAV.Visuals();soundOn=save.sound!==false;sound.enabled=soundOn;sound.volume=Number.isFinite(save.volume)?Math.max(0,Math.min(1,save.volume)):.4;visuals.reduced=save.reducedEffects??matchMedia('(prefers-reduced-motion: reduce)').matches;
const music=new Audio('./assets/survivors/circuit-pressure.wav');music.loop=true;music.preload='auto';
const bossTracks={
 0:new Audio('./assets/survivors/boss-desert-bear.wav'),
 1:new Audio('./assets/survivors/boss-lab-overlord.wav'),
 2:new Audio('./assets/survivors/boss-sky-taotitan.wav'),
 3:new Audio('./assets/survivors/boss-hub-archon.wav')
};
for(const b in bossTracks){bossTracks[b].loop=true;bossTracks[b].preload='auto';}
let currentTrack=music;
let musicOn=save.music!==false,musicVolume=Number.isFinite(save.musicVolume)?Math.max(0,Math.min(1,save.musicVolume)):.35;
function pauseAllMusic(){
 music.pause();
 for(const b in bossTracks)bossTracks[b].pause();
}
function syncMusic(){
 const active=run&&['playing','upgrade','stage'].includes(run.mode)&&!document.hidden&&!devPaused;
 const isBoss=run&&run.phase==='boss'&&bossTracks[run.stage];
 const target=isBoss?bossTracks[run.stage]:music;
 if(currentTrack!==target){
  currentTrack.pause();
  currentTrack.currentTime=0;
  currentTrack=target;
 }
 currentTrack.volume=musicVolume*(run?.mode==='playing'?1:.5);
 if(musicOn&&active){
  if(currentTrack.paused)currentTrack.play().catch(()=>{});
 }else{
  pauseAllMusic();
 }
}
function persist(){if(demoActive||new URLSearchParams(location.search).get('showcase')==='1')return;try{localStorage.setItem('astral_survivors_v1',JSON.stringify(save));}catch{/* Private browsers can still play without records. */}}
function clock(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}
function sprite(g,img,index,cols,rows,x,y,size,flip=false,alpha=1){
 if(!img.complete||!img.naturalWidth)return;const sw=img.naturalWidth/cols,sh=img.naturalHeight/rows;
 let sx=(index%cols)*sw,sy=Math.floor(index/cols)*sh,cw=sw,ch=sh;
 if(img===enemyAtlas){const rect=machineRects[index];[sx,sy,cw,ch]=rect;}
 if(img===beastAtlas){[sx,sy,cw,ch]=beastRects[index];}
 if(img===labAtlas){[sx,sy,cw,ch]=labRects[index];}
 if(img===skyAtlas){[sx,sy,cw,ch]=skyRects[index];}
 if(img===hubAtlas){[sx,sy,cw,ch]=hubRects[index];}
 if(img===heroAtlas){[sx,sy,cw,ch]=heroRects[index];}
 const scale=size/Math.max(cw,ch),dw=cw*scale,dh=ch*scale;
 g.save();g.globalAlpha=alpha;g.translate(x,y);if(flip)g.scale(-1,1);if(img===beastAtlas){
  // Runtime atlas clipping excludes neighboring wings and feet without altering the artwork.
  const masks={1:[[422,48],[952,48],[952,160],[850,255],[790,430],[540,430],[540,250],[422,120]],2:[[1000,120],[1250,120],[1341,310],[1341,435],[861,435],[861,330],[930,240]]};
  const polygon=masks[index];if(polygon){g.beginPath();polygon.forEach(([px,py],i)=>{const xx=(px-sx)*scale-dw/2,yy=(py-sy)*scale-dh;i?g.lineTo(xx,yy):g.moveTo(xx,yy);});g.closePath();g.clip();}
 }if(img===labAtlas){
  const masks={6:[[350,440],[795,440],[795,630],[760,650],[760,770],[350,770]],7:[[800,425],[1160,425],[1160,650],[1120,670],[1140,720],[1100,785],[775,785],[775,630],[800,620]]};
  const polygon=masks[index];if(polygon){g.beginPath();polygon.forEach(([px,py],i)=>{const xx=(px-sx)*scale-dw/2,yy=(py-sy)*scale-dh;i?g.lineTo(xx,yy):g.moveTo(xx,yy);});g.closePath();g.clip();}
 }if(img===skyAtlas){const masks={8:[[1150,390],[1540,390],[1540,645],[1465,645],[1465,793],[1150,793]],9:[[1560,390],[1983,390],[1983,793],[1470,793],[1470,705],[1560,625]]};const polygon=masks[index];if(polygon){g.beginPath();polygon.forEach(([px,py],i)=>{const x=(px-sx)*scale-dw/2,y=(py-sy)*scale-dh;i?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();g.clip();}}if(img===hubAtlas){g.globalCompositeOperation='screen';if(index===9){g.beginPath();const poly=[[130,1310],[1570,1310],[1570,1590],[1350,1590],[1350,1820],[1260,1820],[1260,2150],[500,2150],[130,1750]];poly.forEach(([px,py],i)=>{const xx=(px-sx)*scale-dw/2,yy=(py-sy)*scale-dh;i?g.lineTo(xx,yy):g.moveTo(xx,yy);});g.closePath();g.clip();}}g.drawImage(img,sx,sy,cw,ch,-dw/2,-dh,dw,dh);g.restore();
}
function portrait(target,index){const g=target.getContext('2d');g.clearRect(0,0,target.width,target.height);const size=Math.min(target.width,target.height)*1.13;sprite(g,heroAtlas,index,4,2,target.width/2,target.height+size*.02,size);}
function setupRecord(){if(save.runs)$('record').innerHTML=`最高击破 ${Number(save.bestKills)||0}<br><small>远征 ${Number(save.runs)||0} 次 · 通关 ${Number(save.wins)||0} 次</small>`;}
function selectHero(id){
 selected=id;const h=D.heroes.find(h=>h.id===id),idx=D.heroes.indexOf(h);document.documentElement.style.setProperty('--accent',h.color);
 $('hero-title').textContent=h.title;$('hero-code').textContent='GUARDIAN / 0'+(idx+1);$('hero-name').textContent=h.name;$('hero-text').textContent=h.text;$('hero-weapon').textContent=h.weapon;
 $('hero-stats').innerHTML=`<span>生命<strong>${h.hp}</strong></span><span>移速<strong>${h.speed}</strong></span><span>路线<strong>03</strong></span>`;
 $('routes').innerHTML=h.routes.map((r,i)=>`<article class="route-card" title="${r.evolution}"><span>PATH / 0${i+1}</span><h3>${r.name}</h3><p>${r.desc}</p></article>`).join('');
 document.querySelectorAll('.hero-choice').forEach(b=>{const on=b.dataset.hero===id;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
 const g=$('hero-preview').getContext('2d');g.clearRect(0,0,560,500);sprite(g,heroAtlas,idx,4,2,280,490,480);
 save.hero=id;persist();
}
function selectDifficulty(id){difficulty=id;document.querySelectorAll('[data-difficulty]').forEach(b=>{b.classList.toggle('selected',b.dataset.difficulty===id);b.setAttribute('aria-pressed',String(b.dataset.difficulty===id));});$('difficulty-text').textContent=D.difficulties[id].desc;save.difficulty=id;persist();}
D.heroes.forEach((h,i)=>{const b=document.createElement('button');b.className='hero-choice';b.dataset.hero=h.id;b.setAttribute('aria-label',h.name+' · '+h.title);b.innerHTML=`<canvas width="100" height="100" aria-hidden="true"></canvas><span>${h.id==='deepseek'?'DeepSeek':h.id==='qwen'?'Qwen':h.id==='glm'?'GLM':h.name}</span>`;b.onclick=()=>selectHero(h.id);$('roster').appendChild(b);});
Object.entries(D.difficulties).forEach(([id,d],i)=>{const b=document.createElement('button');b.dataset.difficulty=id;b.innerHTML=`${d.name}<span>${['I','II','III'][i]}</span>`;b.onclick=()=>selectDifficulty(id);$('difficulty').appendChild(b);});
selectHero(selected);selectDifficulty(difficulty);setupRecord();
Promise.all([heroAtlas.decode(),enemyAtlas.decode(),desertMap.decode(),beastAtlas.decode(),labMap.decode(),labAtlas.decode(),skyAtlas.decode(),hubAtlas.decode(),hubBossMechImg.decode().catch(()=>{}),hubBossSpiritImg.decode().catch(()=>{})]).then(()=>{ready=true;document.querySelectorAll('.hero-choice canvas').forEach((c,i)=>portrait(c,i));selectHero(selected);$('start').disabled=false;$('start').textContent='开启远征　↗';if(new URLSearchParams(location.search).get('showcase')==='1')openBossDemo();}).catch(()=>{$('asset-error').hidden=false;$('asset-error').textContent='游戏素材加载失败，请刷新页面或检查 assets/survivors 目录。';$('start').textContent='素材未就绪';});
function resize(){
 const panel=demoActive?$('boss-showcase').getBoundingClientRect().height:0,w=innerWidth,h=Math.max(140,innerHeight-panel);
 view.zoom=demoActive&&demoOverview?Math.min(w/2560,h/1760):1;view.w=w/view.zoom;view.h=h/view.zoom;view.dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.round(w*view.dpr);canvas.height=Math.round(h*view.dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';
}
addEventListener('resize',resize);resize();
let profileOpen=false,profileStamp='';
function setProfileOpen(on){
 profileOpen=!!on&&!!run;$('character-profile').hidden=!profileOpen;$('profile-toggle').hidden=profileOpen||!run;
 $('profile-toggle').setAttribute('aria-expanded',String(profileOpen));
 if(profileOpen){profileStamp='';const hero=run.hero;$('profile-name').textContent=hero.name;$('profile-title').textContent=hero.title;$('profile-weapon').textContent=hero.weapon;portrait($('profile-portrait'),D.heroes.indexOf(hero));updateProfile();}
}
function updateProfile(){
 if(!profileOpen||!run)return;const s=run.stats,p=run.p,n=(v,d=1)=>Number(v).toLocaleString('zh-CN',{maximumFractionDigits:d}),pct=v=>n(v*100)+'%';
 const lowFrenzy=run.rank('frenzy')>=3&&p.hp<p.maxHp*.5,interval=s.interval/(lowFrenzy?1.4:1);
 const rows=[['level','角色等级','LV. '+run.level],['health','当前 / 最大生命',n(p.hp)+' / '+n(p.maxHp)],['damage','基础攻击',n(s.damage)],['rate','攻击频率',n(1/interval,2)+' 次/秒'],['interval','攻击间隔',n(interval,3)+' 秒'],['speed','移动速度',n(s.speed)],['armor','伤害减免',pct(s.armor)],['crit','暴击率',pct(s.crit)],['critmult','暴击伤害',n(s.critMult,2)+' 倍'],['regen','每秒生命恢复',n(s.regen)],['area','攻击范围 / 弹体',n(s.area,2)+' 倍'],['magnet','经验拾取半径',n(s.magnet)],['dawn','晨曦护盾',n(run.dawnShield||0)],['blood','血盾',n(run.bloodShield||0)]];
 const buffs=[];if(run.developerCombat.invulnerable)buffs.push('开发模式 · 无视伤害');if(run.developerCombat.highDamage)buffs.push('开发模式 · 每弹 10000');if(run.frenzyTime>0)buffs.push('赤红永动 · '+n(run.frenzyTime)+' 秒');if(lowFrenzy)buffs.push('低血暴走 · 攻速 ×1.4');if(run.hero.id==='glm'&&run.trans('orbit'))buffs.push(run.ascClocks.royal?'不破王庭 · 冷却 '+n(run.ascClocks.royal)+' 秒':'不破王庭 · 就绪');if(run.hero.id==='claude'&&run.trans('renew'))buffs.push(run.ascClocks.rebirth?'晨曦复生 · 冷却 '+n(run.ascClocks.rebirth)+' 秒':'晨曦复生 · 就绪');
 const routes=run.hero.routes.map(r=>({name:r.name,state:run.trans(r.id)?'质变 · '+r.transName:run.quantum(r.id)?'满级 · 量化 '+run.quantum(r.id)+'/2':run.rank(r.id)+' / '+r.max,desc:run.trans(r.id)?r.transDesc:run.quantum(r.id)?r.quantDesc:r.desc,trans:run.trans(r.id)}));
 const stamp=JSON.stringify([rows,buffs,routes]);if(stamp===profileStamp)return;profileStamp=stamp;
 $('profile-stats').innerHTML=rows.map(([id,label,value])=>`<div><dt>${label}</dt><dd id="profile-stat-${id}">${value}</dd></div>`).join('');
 $('profile-buffs').textContent=buffs.join(' · ')||'常态';$('profile-routes').innerHTML=routes.map(r=>`<div class="profile-route ${r.trans?'transmuted':''}" title="${r.desc}"><span>${r.name}</span><strong>${r.state}</strong></div>`).join('');
}
$('profile-toggle').onclick=()=>setProfileOpen(!profileOpen);
$('profile-close').onclick=()=>{setProfileOpen(false);if(run?.mode==='playing')$('arena').focus({preventScroll:true});};

let devEnabled=false,devPaused=false,devSpeed=1,devBuffer='',devLastKey=0,devMessage='',devImmune=false,devHighDamage=false;
function showDeveloperPanel(open){$('developer-panel').hidden=!devEnabled||!open;$('developer-launcher').hidden=!devEnabled||open;$('developer-launcher').setAttribute('aria-expanded',String(!!open));}
function developerUnlockKey(e){
 if(run||$('setup').hidden||!$('help').hidden||e.repeat||e.ctrlKey||e.altKey||e.metaKey)return false;
 if(e.key==='Backspace'){devBuffer=devBuffer.slice(0,-1);return false;}
 if(!/^[a-z]$/i.test(e.key))return false;const now=performance.now();if(now-devLastKey>5000)devBuffer='';devLastKey=now;devBuffer=(devBuffer+e.key.toLowerCase()).slice(-8);
 if(devBuffer!=='kaifazhe')return false;devBuffer='';devEnabled=true;devMessage='已解锁，选择角色后开始远征';showDeveloperPanel(true);updateDeveloperUI();return true;
}
function updateDeveloperUI(){
 if(!devEnabled)return;const mode=run?.mode,active=!!run;
 $('dev-pause').disabled=!['playing','paused'].includes(mode);$('dev-pause').textContent=devPaused||mode==='paused'?'继续游戏':'暂停游戏';
 $('dev-jump-stage').disabled=!active;$('dev-jump-wave').disabled=!active;$('dev-level').disabled=!['playing','paused','upgrade','stage'].includes(mode);
 const label=!active?'选角待机':devPaused||mode==='paused'?'已暂停':mode==='playing'?'运行中':mode==='upgrade'?'升级选卡':mode==='stage'?'等待突破':mode==='dead'?'本局结束':'远征胜利';
 const text=`${label} · ${devSpeed}×${run?' · 第 '+(run.stage+1)+' 关 / 第 '+run.wave+' 波':''}${devMessage?'\n'+devMessage:''}`;if($('dev-status').textContent!==text)$('dev-status').textContent=text;
 $('dev-wave').max=String(D.stages[run?.stage||0].wavePools.length);
}
function resetDeveloperRun(){devPaused=false;devMessage='';run.developerSetCombat('invulnerable',devEnabled&&devImmune);run.developerSetCombat('highDamage',devEnabled&&devHighDamage);$('dev-stage').value='1';$('dev-wave').value='1';updateDeveloperUI();}
function developerJump(kind){
 if(!devEnabled||!run)return;const stage=kind==='stage'?Number($('dev-stage').value)-1:run.stage,wave=kind==='stage'?1:Number($('dev-wave').value),paused=devPaused||run.mode==='paused';
 if(!run.developerJump(stage,wave)){devMessage='请输入有效的整数关卡和波次';updateDeveloperUI();return;}
 devPaused=paused;devMessage='已清理战场并保留角色成长';$('dev-stage').value=String(run.stage+1);$('dev-wave').value=String(run.wave);keys.clear();accumulator=0;sound.stop();visuals.clear();lastMode='';lastBuild='';recorded=false;syncMode();updateHUD(0);updateDeveloperUI();$('arena').focus({preventScroll:true});
}
$('dev-invulnerable').onchange=e=>{if(!devEnabled)return;devImmune=e.target.checked;if(run)run.developerSetCombat('invulnerable',devImmune);devMessage=devImmune?'无视伤害判定已开启':'已恢复正常受伤判定';updateDeveloperUI();};
$('dev-high-damage').onchange=e=>{if(!devEnabled)return;devHighDamage=e.target.checked;if(run)run.developerSetCombat('highDamage',devHighDamage);devMessage=devHighDamage?'弹幕命中伤害已固定为 10000':'已恢复角色正常弹幕伤害';updateDeveloperUI();};
$('developer-collapse').onclick=()=>showDeveloperPanel(false);$('developer-launcher').onclick=()=>showDeveloperPanel(true);
$('dev-speed').onchange=e=>{const value=Number(e.target.value);if(devEnabled&&[1,2,3,5].includes(value)){devSpeed=value;accumulator=0;devMessage='';updateDeveloperUI();}};
$('dev-pause').onclick=()=>{
 if(!devEnabled||!run)return;if(run.mode==='paused'){devPaused=false;resume();}else if(run.mode==='playing'){devPaused=!devPaused;keys.clear();accumulator=0;sound.stop();run.avEvents=[];syncMusic();}
 devMessage='';updateDeveloperUI();
};
$('dev-jump-stage').onclick=()=>developerJump('stage');$('dev-jump-wave').onclick=()=>developerJump('wave');
$('dev-level').onclick=()=>{if(!devEnabled||!run)return;if(run.mode==='paused')devPaused=true;if(!run.developerLevel())return;devMessage='已升至 '+run.level+' 级'+(run.mode==='stage'?'，突破后选择强化':'');keys.clear();accumulator=0;lastMode='';syncMode();updateHUD(0);updateDeveloperUI();};
$('developer-panel').addEventListener('focusin',()=>keys.clear());
let developerDrag=null;
function clampDeveloperPanel(){const panel=$('developer-panel');if(!panel.style.left)return;const rect=panel.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(rect.x,innerWidth-rect.width-8))+'px';panel.style.top=Math.max(8,Math.min(rect.y,innerHeight-rect.height-8))+'px';}
$('developer-drag').onpointerdown=e=>{if(e.button!==0||e.target.closest('button'))return;const panel=$('developer-panel'),rect=panel.getBoundingClientRect();developerDrag={x:e.clientX-rect.x,y:e.clientY-rect.y};panel.style.left=rect.x+'px';panel.style.top=rect.y+'px';panel.style.right='auto';panel.style.bottom='auto';e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();};
$('developer-drag').onpointermove=e=>{if(!developerDrag)return;const panel=$('developer-panel');panel.style.left=Math.max(8,Math.min(e.clientX-developerDrag.x,innerWidth-panel.offsetWidth-8))+'px';panel.style.top=Math.max(8,Math.min(e.clientY-developerDrag.y,innerHeight-panel.offsetHeight-8))+'px';};
$('developer-drag').onpointerup=$('developer-drag').onpointercancel=()=>{developerDrag=null;};addEventListener('resize',clampDeveloperPanel);

function start(){if(!ready)return;music.pause();music.currentTime=0;pauseAllMusic();for(const b in bossTracks)bossTracks[b].currentTime=0;currentTrack=music;sound.stop();sound.unlock();visuals.clear();run=new Run(selected,difficulty);resetDeveloperRun();setProfileOpen(false);recorded=false;lastMode='';lastBuild='';keys.clear();accumulator=0;$('setup').hidden=true;$('play').hidden=false;portrait($('hud-portrait'),D.heroes.findIndex(h=>h.id===selected));$('hud-name').textContent=run.hero.name;$('difficulty-badge').textContent=D.difficulties[difficulty].name;$('arena').focus();run.notify('远征开始 · 移动收集晶体，自动攻击最近的怪物');syncMode();}
$('start').onclick=start;
function useResetSkill(){
 if(!run||demoActive||devPaused)return false;const used=run.useUniversalSkill('reset');if(used)updateHUD(0);return used;
}
function updateResetSkill(){
 const button=$('reset-skill'),skill=D.universalSkills.reset,remaining=run.universalCooldowns.reset||0,cooling=remaining>1e-8;
 button.classList.toggle('cooling',cooling);button.classList.toggle('ready',!cooling);button.disabled=demoActive||devPaused||run.mode!=='playing'||cooling||run.p.hp>=run.p.maxHp;
 const label=cooling?'冷却 '+Math.ceil(remaining)+'秒':run.p.hp>=run.p.maxHp?'就绪 · 生命已满':'就绪 · 按V释放';$('reset-state').textContent=label;$('reset-countdown').hidden=!cooling;$('reset-countdown').textContent=Math.ceil(remaining)+'s';
 button.querySelector('.reset-cd-ring').style.strokeDashoffset=(182.2124*Math.min(1,remaining/skill.cooldown)).toFixed(3);button.setAttribute('aria-label','重置：回复'+skill.heal+'点生命，'+label);
}
$('reset-skill').onclick=useResetSkill;

function openBossDemo(){
 if(!ready)return;demoActive=true;document.body.classList.add('boss-demo');$('boss-showcase').hidden=false;$('setup').hidden=true;$('play').hidden=false;document.title='怪物技能展示 · 机械黎明';
 sound.enabled=false;const query=new URLSearchParams(location.search);demoKind=query.get('kind')==='special'?'special':'boss';const stage=Math.max(0,Math.min(3,(Number(query.get('boss'))||1)-1)),items=demoAPI().catalog[stage].skills;
 loadBossDemo(stage,items.find(s=>s.id===query.get('skill'))?.id||items[0].id);
}
function loadBossDemo(stage,id){
 sound.stop();visuals.clear();keys.clear();accumulator=0;devPaused=false;setProfileOpen(false);
 demoSession=new (demoAPI().Session)(stage,id,selected,demoEdits[id]||{});run=demoSession.run;recorded=true;lastMode='';lastBuild='';toastTime=0;
 const catalog=demoAPI().catalog;demoOverview=demoViewPreference??!!demoSession.skill.overview;$('demo-overview').checked=demoOverview;
 $('demo-bosses').innerHTML=catalog.map((b,i)=>`<button class="quiet-button ${i===stage?'selected':''}" data-demo-boss="${i}" aria-pressed="${i===stage}">${String(i+1).padStart(2,'0')} / ${demoKind==='special'?D.stages[i].name:['裂隙战熊','神罗主脑','太极天尊','中枢圣尊'][i]}</button>`).join('');
 $('demo-skills').innerHTML=catalog[stage].skills.map(s=>`<button class="quiet-button ${s.id===id?'selected':''}" data-demo-skill="${s.id}" aria-pressed="${s.id===id}">${s.name}</button>`).join('');
 $('demo-bosses').querySelectorAll('button').forEach(b=>b.onclick=()=>{demoMode='boss';$('demo-mode').value=demoMode;loadBossDemo(Number(b.dataset.demoBoss),catalog[Number(b.dataset.demoBoss)].skills[0].id);});
 $('demo-skills').querySelectorAll('button').forEach(b=>b.onclick=()=>{demoMode='one';$('demo-mode').value=demoMode;loadBossDemo(stage,b.dataset.demoSkill);});
 $('demo-description').textContent=demoSession.skill.desc;$('hud-name').textContent='演示靶标 · '+run.hero.name;$('difficulty-badge').textContent='实际技能演示';portrait($('hud-portrait'),D.heroes.findIndex(h=>h.id===selected));
 updateDemoTuning();
 resize();syncMode();updateHUD(0);syncMusic();
}
function nextBossDemo(auto=false){
 if(!demoSession)return;const catalog=demoAPI().catalog,stage=demoSession.stage,list=catalog[stage].skills,index=list.findIndex(s=>s.id===demoSession.skill.id);
 if(auto&&demoMode==='one'){loadBossDemo(stage,list[index].id);return;}
 if(index+1<list.length){loadBossDemo(stage,list[index+1].id);return;}
 const nextStage=auto&&demoMode==='boss'?stage:(stage+1)%catalog.length;loadBossDemo(nextStage,catalog[nextStage].skills[0].id);
}
function updateBossDemoStatus(){
 if(!demoActive||!demoSession)return;const paused=run.mode==='paused';$('demo-pause').textContent=paused?'▶ 继续':'Ⅱ 暂停';
 const charge=run.skyFields.find(f=>f.kind==='transfer'),state=paused?'已暂停':demoSession.finished?'演示结束':charge?'传输倒计时 '+charge.life.toFixed(1)+'s':'正在播放';
 $('demo-status').textContent=state+' · '+run.time.toFixed(1)+'s · WASD可移动靶标 · 点击技能可单独循环查看';
}
function updateDemoTuning(){
 const special=demoKind==='special';$('demo-tuning').hidden=!special;$('demo-export').hidden=true;
 document.querySelectorAll('[data-demo-kind]').forEach(b=>{const chosen=b.dataset.demoKind===demoKind;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',chosen);});
 $('demo-mode').options[0].textContent=special?'全部小怪轮播':'全部Boss轮播';$('demo-mode').options[1].textContent=special?'当前关卡轮播':'当前Boss轮播';
 if(!special)return;
 const values=demoSession.applied,S=window.SurvivorSpecials,statsLabels={hp:'实际生命',speed:'实际移动速度',damage:'实际基础伤害'};
 $('demo-stats').innerHTML=Object.entries(values).flatMap(([group,items])=>Object.entries(items).map(([key,value])=>{
  const [min,max]=group==='stats'?key==='hp'?[1,1e7]:key==='speed'?[0,500]:[0,1000]:S.bounds[key];
  return `<label>${group==='stats'?statsLabels[key]:S.labels[key]}<input type="number" data-stat-group="${group}" data-stat-key="${key}" value="${Number(Number(value).toFixed(4))}" min="${min}" max="${max}" step="any" required></label>`;
 })).join('');
}
document.querySelectorAll('[data-demo-kind]').forEach(b=>b.onclick=()=>{demoKind=b.dataset.demoKind;demoMode='boss';$('demo-mode').value=demoMode;const stage=demoSession?.stage||0;loadBossDemo(stage,demoAPI().catalog[stage].skills[0].id);});
$('demo-tuning-form').onsubmit=e=>{e.preventDefault();const values={stats:{},skill:{}};for(const input of $('demo-stats').querySelectorAll('input')){const v=Number(input.value);if(!Number.isFinite(v))return;values[input.dataset.statGroup][input.dataset.statKey]=v;}demoEdits[demoSession.skill.id]=values;loadBossDemo(demoSession.stage,demoSession.skill.id);};
$('demo-reset-values').onclick=()=>{delete demoEdits[demoSession.skill.id];loadBossDemo(demoSession.stage,demoSession.skill.id);};
$('demo-export-values').onclick=()=>{const box=$('demo-export');box.value=JSON.stringify({stage:demoSession.stage+1,enemy:demoSession.skill.id,...demoSession.applied},null,2);box.hidden=false;box.focus();box.select();};
$('demo-pause').onclick=()=>{if(!demoActive)return;if(run.mode==='paused')resume();else pause();};
$('demo-step').onclick=()=>{if(!demoActive)return;sound.stop();keys.clear();run.mode='playing';demoSession.step(1/60,{},demoAuto);run.mode='paused';present(0);updateHUD(0);syncMode();};
$('demo-replay').onclick=()=>{if(demoSession)loadBossDemo(demoSession.stage,demoSession.skill.id);};
$('demo-next').onclick=()=>nextBossDemo();
$('demo-mode').onchange=e=>{demoMode=e.target.value;};
$('demo-speed').onchange=e=>{demoSpeed=Number(e.target.value);accumulator=0;};
$('demo-auto').onchange=e=>{demoAuto=e.target.checked;};
$('demo-overview').onchange=e=>{demoOverview=e.target.checked;demoViewPreference=demoOverview;resize();};
$('demo-audio').onclick=()=>{demoAudio=!demoAudio;sound.setEnabled(demoAudio);if(demoAudio)sound.unlock();$('demo-audio').textContent=demoAudio?'关闭音效':'开启音效';};
$('demo-collapse').onclick=()=>{const compact=$('boss-showcase').classList.toggle('compact');$('demo-collapse').textContent=compact?'展开面板':'收起面板';resize();};
$('demo-exit').onclick=()=>{demoActive=false;demoSession=null;demoOverview=false;demoViewPreference=null;document.body.classList.remove('boss-demo');$('boss-showcase').hidden=true;sound.setEnabled(soundOn);history.replaceState(null,'',location.pathname);document.title='机械黎明 · 苍穹圣殿';toSetup();resize();};

function toSetup(){setProfileOpen(false);pauseAllMusic();currentTrack=music;sound.stop();visuals.clear();run=null;devPaused=false;devMessage='';updateDeveloperUI();keys.clear();$('overlay').hidden=true;$('play').hidden=true;$('setup').hidden=false;setupRecord();$('start').focus();}
function pause(){devPaused=false;if(run?.pause()){sound.stop();run.avEvents=[];keys.clear();syncMode();}}
function resume(){devPaused=false;if(run?.resume()){sound.unlock();keys.clear();accumulator=0;syncMode();$('arena').focus();}}
$('pause-button').onclick=pause;
$('help-open').onclick=()=>{$('help').hidden=false;$('help-close').focus();};$('help-close').onclick=()=>{$('help').hidden=true;$('help-open').focus();};
addEventListener('blur',()=>{music.pause();sound.stop();keys.clear();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){music.pause();sound.stop();keys.clear();pause();}});
addEventListener('keydown',e=>{
 if(!demoActive&&developerUnlockKey(e)){e.preventDefault();return;}
 if(demoActive&&e.target instanceof Element&&e.target.closest('#boss-showcase')&&(e.target.matches('select,input,textarea')||(['Space','Enter'].includes(e.code)&&e.target.closest('button,input'))))return;
 if(e.target instanceof Element&&e.target.closest('#developer-panel')&&(e.target.matches('input,select,textarea')||(['Space','Enter'].includes(e.code)&&e.target.closest('button'))))return;
 if(e.code==='Tab'){
  const modal=!$('help').hidden?$('help'):!$('overlay').hidden?$('dialog'):null;if(modal){const focus=[...modal.querySelectorAll('button,a')].filter(n=>!n.disabled);if(focus.length){const first=focus[0],end=focus[focus.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();end.focus();}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus();}}}return;
 }
 if(e.code==='Escape'&&!$('help').hidden){$('help-close').click();return;}
 if(!run)return;
 if(e.code==='KeyV'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
  if(e.isComposing||demoActive||!$('help').hidden||(e.target instanceof Element&&(e.target.matches('input,select,textarea')||e.target.isContentEditable)))return;
  e.preventDefault();if(!e.repeat)useResetSkill();return;
 }
 if(e.code==='KeyF'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat)setProfileOpen(!profileOpen);return;}
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Escape'].includes(e.code))e.preventDefault();
 if(e.code==='Escape'&&!e.repeat){if(run.mode==='playing')pause();else if(run.mode==='paused')resume();return;}
 if(run.mode==='upgrade'&&e.code==='KeyY'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
  if(e.isComposing||!$('help').hidden||(e.target instanceof Element&&(e.target.matches('input,select,textarea')||e.target.isContentEditable)))return;
  e.preventDefault();if(!e.repeat)$('refresh-upgrades')?.click();return;
 }
 if(run.mode==='upgrade'&&/^Digit[123]$/.test(e.code)&&!e.repeat){const choice=run.choices[Number(e.code.slice(-1))-1];if(choice){run.choose(choice.id);lastMode='';syncMode();}return;}
 if(run.mode==='playing')keys.add(e.code);
});
addEventListener('keyup',e=>keys.delete(e.code));
function present(dt){
 const list=run.avEvents.splice(0),important=e=>e.name.startsWith('warn-')||['phase','boss','level','win','dead','hurt','pulse'].includes(e.name);
 list.sort((a,b)=>Number(important(b))-Number(important(a)));
 for(const e of list){const distance=Math.hypot(e.x-run.p.x,e.y-run.p.y);if(distance<1100||important(e)){sound.play(e.name,(e.x-run.p.x)/650,important(e));visuals.emit(e);}}
 if(run.mode==='playing'&&!devPaused)visuals.step(dt);
}

function buildMarkup(){return Object.entries(run.ranks).map(([id,n])=>{const item=[...run.hero.routes,...D.common].find(i=>i.id===id);return `<span class="build-chip ${item?.effect&&n>=3?'evolved':''}" title="${run.trans(id)?item.transDesc:item?.desc||''}">${item?.effect&&n>=3?'✦ ':''}${item?.name||id} ${item?.effect?(run.trans(id)?'✦ '+item.transName:`${n}/${item.max}${run.quantum(id)?' · 量化 '+run.quantum(id)+'/2':''}`):`已升级 ${n} 次`}</span>`;}).join('');}
function recordRun(){if(demoActive||recorded)return;recorded=true;save.runs=(Number(save.runs)||0)+1;save.wins=(Number(save.wins)||0)+(run.mode==='won'?1:0);save.bestKills=Math.max(Number(save.bestKills)||0,run.kills);save.bestLevel=Math.max(Number(save.bestLevel)||0,run.level);persist();}
function syncMode(){
 syncMusic();if(demoActive){$('overlay').hidden=true;if(run?.mode==='paused')keys.clear();lastMode=run?.mode;updateBossDemoStatus();return;}
 if(!run||run.mode===lastMode)return;lastMode=run.mode;const mode=run.mode;const dialog=$('dialog');$('overlay').hidden=mode==='playing';keys.clear();
 if(mode==='playing')return;
 if(mode==='upgrade'){
  const boss=run.offerKind==='boss';dialog.innerHTML=`<div class="eyebrow">${boss?'BOSS REWARD / 突破赠礼':'LEVEL UP / 成长抉择'}</div><h2 id="dialog-title">${boss?'守门者已击破':(run.offerCategory==='route'?'专属路线':'通用强化')+' · 等级 '+run.offerLevel}</h2><p class="dialog-subtitle">${boss?'已恢复 35% 最大生命，并吸收场上经验。选择一项额外通用强化。':(run.choices[0]?.id==='heal'?'专属路线已全部完成质变，提供生命补给。':run.offerCategory==='route'?'每 3 级选择专属升级。路线 4 级满级后可量化两次，再选择独特质变。':'本级选择通用强化；达到 3、6、9……级时选择专属路线。')}<br>战斗已暂停，慢慢选择。</p><div class="upgrade-cards">${run.choices.map((o,i)=>{const rank=run.rank(o.id),evolve=o.effect&&rank===2;return `<button class="upgrade-card ${evolve?'evolution':''} ${o.routeStep?'route-'+o.routeStep:''} ${o.rarity?'rarity-'+o.rarity:''}" data-choice="${o.id}"><span class="route-type">${o.routeStep==='transmute'?'✦ 终极质变':o.routeStep==='quantize'?'量化强化':evolve?'✦ 即将进化':o.effect?'专属路线 / '+run.hero.name:(o.rarityName?o.rarityName+' · 通用强化':'通用强化')}</span><span class="upgrade-icon">${o.routeStep==='transmute'?'✺':o.routeStep==='quantize'?'⟡':o.effect?'✧':'◇'}</span><h3>${o.name}</h3><p>${o.desc}</p>${o.effect?`<span class="evolution-note">${o.evolution}</span>`:''}<span class="rank"><span>${o.id==='heal'?'生命补给':(o.routeStep?o.progress:o.rarity?`已升级 ${rank} 次 · 本次效果 ×${o.multiplier}`:`等级 ${rank} → ${rank+1} / ${o.max}`)}</span><kbd>${i+1}</kbd></span></button>`;}).join('')}</div>${run.offerCategory==='common'?`<div class="upgrade-refresh"><button id="refresh-upgrades" class="quiet-button" aria-keyshortcuts="Y" ${run.refreshRemaining<=0?'disabled':''}>刷新选项 <kbd>Y</kbd> · 剩余 ${run.refreshRemaining} / 2 次</button><p>每个选项独立抽取品质：${D.rarities.map(q=>q.name+' '+q.weight+'%').join(' · ')}<br>刷新同时重抽升级与品质，每次通用升级有 2 次机会。</p></div>`:''}<p class="dialog-note">点击卡片或按 1 / 2 / 3 · 本局强化在新远征时重置</p>`;
  if($('refresh-upgrades'))$('refresh-upgrades').onclick=()=>{if(run.refreshUpgrade()){lastMode='';syncMode();$('refresh-upgrades').focus();}};
  dialog.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{run.choose(b.dataset.choice);lastMode='';syncMode();});
 }else if(mode==='stage'){
  const next=D.stages[run.stage+1];dialog.innerHTML=`<div class="eyebrow">SECTOR CLEARED / 阶段突破</div><h2 id="dialog-title">前往${next.name}</h2><p class="dialog-subtitle">守门 Boss 已击败。确认后，敌军强度才会提升。</p><div class="stage-preview">下一阶段 <strong>${run.stage+2} / 4</strong><br>新增兵种：<strong>${D.stages[run.stage].unlock}</strong><br>敌人生命、接触伤害、移速与数量提升。<br>下一位守门者：<strong>${next.boss}</strong></div><div class="dialog-actions"><button id="advance" class="primary">确认突破 →</button></div>`;$('advance').onclick=()=>{run.advance();lastMode='';syncMode();};
 }else if(mode==='paused'){
  dialog.innerHTML=`<div class="pause-layout"><div class="eyebrow">EXPEDITION PAUSED</div><h2 id="dialog-title">星光暂歇</h2><p class="dialog-subtitle">战斗与计时均已暂停。WASD 移动，自动瞄准并攻击最近的怪物。</p><h3>${run.hero.name} · ${run.hero.weapon} · LV.${run.level}</h3><div class="end-build">${buildMarkup()||'<p>尚未获得强化，拾取经验开始构筑。</p>'}</div><p>第 ${run.stage+1} / 4 关 · ${D.stages[run.stage].name} · ${run.kills} 击破<br>退出本局会结束当前远征。</p><div class="dialog-actions"><button id="resume" class="primary">继续远征</button><button id="sound" class="quiet-button">音效：${soundOn?'开启':'关闭'}</button><label class="av-volume">音量 <input id="sfx-volume" type="range" min="0" max="100" value="${Math.round(sound.volume*100)}" aria-label="音效音量"></label><button id="music-toggle" class="quiet-button">音乐：${musicOn?'开启':'关闭'}</button><label class="av-volume">音乐音量 <input id="music-volume" type="range" min="0" max="100" value="${Math.round(musicVolume*100)}" aria-label="背景音乐音量"></label><button id="effects" class="quiet-button">特效：${visuals.reduced?'精简':'完整'}</button><button id="exit-run" class="quiet-button">结束本局并选人</button><a class="quiet-button" href="./index.html">返回大厅</a></div></div>`;
  $('music-toggle').onclick=()=>{musicOn=!musicOn;save.music=musicOn;persist();syncMusic();$('music-toggle').textContent='音乐：'+(musicOn?'开启':'关闭');};$('music-volume').oninput=e=>{musicVolume=Number(e.target.value)/100;save.musicVolume=musicVolume;persist();syncMusic();};$('resume').onclick=resume;$('sound').onclick=()=>{soundOn=!soundOn;sound.setEnabled(soundOn);if(soundOn){sound.unlock();sound.play('upgrade');}save.sound=soundOn;persist();$('sound').textContent='音效：'+(soundOn?'开启':'关闭');};$('sfx-volume').oninput=e=>{sound.setVolume(e.target.value/100);save.volume=sound.volume;persist();};$('sfx-volume').onchange=()=>{sound.unlock();sound.play('upgrade');};$('effects').onclick=()=>{visuals.reduced=!visuals.reduced;visuals.clear();save.reducedEffects=visuals.reduced;persist();$('effects').textContent='特效：'+(visuals.reduced?'精简':'完整');};$('exit-run').onclick=()=>{recordRun();toSetup();};
 }else if(mode==='dead'||mode==='won'){
  recordRun();dialog.innerHTML=`<div class="eyebrow">${mode==='won'?'VICTORY / 机械黎明':'EXPEDITION COMPLETE'}</div><h2 id="dialog-title">${mode==='won'?'群星长明，主脑已净化':'远征结束，星光仍在'}</h2><p class="dialog-subtitle">${run.hero.name} · ${D.difficulties[run.difficulty].name}难度 · ${mode==='won'?'完成全部四阶段':'抵达'+D.stages[run.stage].name}</p><div class="summary-grid"><div>生存时间<strong>${clock(run.time)}</strong></div><div>机械击破<strong>${run.kills}</strong></div><div>角色等级<strong>${run.level}</strong></div><div>Boss 击破<strong>${run.bosses} / 4</strong></div></div><div class="end-build">${buildMarkup()}</div><p class="dialog-note">本机最高击破 ${save.bestKills} · 最高等级 ${save.bestLevel} · 通关 ${save.wins} 次</p><div class="dialog-actions"><button id="retry" class="primary">再来一局 ↗</button><button id="reselect" class="quiet-button">重新选人</button><a href="./index.html" class="quiet-button">游戏大厅</a></div>`;$('retry').onclick=start;$('reselect').onclick=toSetup;
 }
 dialog.focus();dialog.querySelector('button')?.focus();
}
function updateHUD(dt){
 if(!run)return;updateProfile();updateDeveloperUI();updateResetSkill();
 $('health-fill').style.width=(run.p.hp/run.p.maxHp*100)+'%';$('health-text').textContent=`${Math.ceil(run.p.hp)} / ${run.p.maxHp}`;
 $('stage-name').textContent=`第 ${run.stage+1} / 4 关 · ${D.stages[run.stage].name}`;$('wave-name').textContent=run.phase==='boss'?'守门 BOSS 战':`第 ${run.wave} / ${run.waveCount()} 波`;
 $('wave-fill').style.width=(run.phase==='boss'?100:Math.min(100,Math.max(0,(run.waveSpawned-run.waveAlive())/Math.max(1,run.waveBudget()-run.waveThreshold())*100)))+'%';$('timer').textContent=clock(run.time);$('kills').textContent=run.kills+' 击破';$('level-name').textContent='LV.'+run.level;$('xp-fill').style.width=(run.xp/run.needed*100)+'%';$('xp-text').textContent=`${Math.floor(run.xp)} / ${run.needed}`;
 const boss=run.enemies.find(e=>e.boss&&e.hp>0),spirit=!!boss&&boss.hubForm==='spirit';
 $('boss-hud').hidden=!boss||spirit;$('boss-spirit-hud').hidden=!spirit;
 if(boss){const prefix=spirit?'boss-spirit':'boss';$(prefix+'-name').textContent=boss.name;
  $(prefix+'-phase').textContent=(spirit?'本体 · 单阶段':'阶段 '+boss.combatPhase+'/'+run.bossPhaseCount(boss))+' · '+run.bossSkill(boss)+(boss.hubIntro>0?' · 觉醒中':!run.bossPhaseReady(boss)?' · 技能体验保护':spirit?' · 可终结':' · 可突破');
  $(prefix+'-health').textContent=`${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;$(prefix+'-fill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';
 }
 const key=JSON.stringify([run.ranks,run.quantizations,run.transmutations]);if(key!==lastBuild){lastBuild=key;$('build').innerHTML=buildMarkup()||'<span class="build-chip">初始武装 · '+run.hero.weapon+'</span>';$('build-count').textContent=(Object.values(run.ranks).reduce((a,b)=>a+b,0)+Object.values(run.quantizations).reduce((a,b)=>a+b,0)+Object.keys(run.transmutations).length)+' 次强化';}
 if(run.events.length){const event=run.events.pop();run.events=[];toastText=event.text;toastTime=4;$('toast').textContent=toastText;}toastTime-=dt;$('toast').classList.toggle('show',toastTime>0);if(demoActive){$('wave-name').textContent=demoSession.skill.name;$('health-text').textContent='累计受击 '+Math.round(run.p.maxHp-run.p.hp);updateBossDemoStatus();}
}
function circle(x,y,r,color,fill=true){ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,TAU);if(fill){ctx.fillStyle=color;ctx.fill();}else{ctx.strokeStyle=color;ctx.stroke();}}
function updateCamera(){
 if(demoActive&&demoOverview){camera.x=(run.world.w-view.w)/2;camera.y=(run.world.h-view.h)/2;return;}
 // Input and rendering share this transform, including the revealed exterior.
 if(run.stage>1){camera.x=clamp(run.p.x-view.w/2,0,Math.max(0,run.world.w-view.w));camera.y=clamp(run.p.y-view.h/2,0,Math.max(0,run.world.h-view.h));return;}
 const axis=(position,extent,viewport,maxReveal)=>{
  const reveal=Math.min(maxReveal,viewport*.28);
  if(viewport>=extent+reveal*2)return (extent-viewport)/2;
  return clamp(position-viewport/2,-reveal,extent-viewport+reveal);
 };
 camera.x=axis(run.p.x,run.world.w,view.w,320);camera.y=axis(run.p.y,run.world.h,view.h,280);
}
function desertFloor(){
 const w=run.world.w,h=run.world.h,m=desertMargin;
 ctx.fillStyle='#ad9270';ctx.fillRect(0,0,view.w,view.h);ctx.save();ctx.translate(-camera.x,-camera.y);
 ctx.drawImage(desertMap,-m,-m,w+m*2,h+m*2);
 // Low-contrast dust ties the terrain to the sprites without obscuring threats.
 ctx.fillStyle='#58412912';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#30281d20';ctx.fillRect(-m,-m,w+m*2,m);ctx.fillRect(-m,h,w+m*2,m);ctx.fillRect(-m,0,m,h);ctx.fillRect(w,0,m,h);
 // These ground-level beacons mark the real collision boundary; wrecks are scenery.
 ctx.lineWidth=2;ctx.strokeStyle='#ffe3a36b';ctx.setLineDash([10,18]);ctx.strokeRect(8,8,w-16,h-16);ctx.setLineDash([]);
 const beacon=(x,y)=>{ctx.fillStyle='#352d2670';ctx.beginPath();ctx.ellipse(x+5,y+5,13,6,-.4,0,TAU);ctx.fill();ctx.fillStyle='#554d42';ctx.fillRect(x-6,y-7,12,12);ctx.strokeStyle='#c1b08a';ctx.lineWidth=1;ctx.strokeRect(x-6,y-7,12,12);ctx.fillStyle='#ffce80';ctx.fillRect(x-3,y-6,6,3);};
 for(let x=80;x<w;x+=200){beacon(x,-10);beacon(x,h+10);}
 for(let y=80;y<h;y+=200){beacon(-10,y);beacon(w+10,y);}
 const labels=[[w/2,-28,0],[w/2,h+42,0],[-28,h/2,-Math.PI/2],[w+28,h/2,Math.PI/2]];
 ctx.font='11px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillStyle='#392d22a6';for(const [x,y,a] of labels){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillText('警戒边界 · 外侧为机械残骸区',0,0);ctx.restore();}
 ctx.lineWidth=1;ctx.strokeStyle='#fff0cb1c';
 for(let i=0;i<28;i++){const span=w+2*m,x=((i*173+run.time*17)%span)-m,y=((i*307)% (h+2*m))-m;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+17+(i%4)*5,y-3);ctx.stroke();}
 ctx.restore();
}
function laboratoryFloor(){
 const w=run.world.w,h=run.world.h,m=desertMargin;
 ctx.fillStyle='#111e29';ctx.fillRect(0,0,view.w,view.h);ctx.save();ctx.translate(-camera.x,-camera.y);
 // Align the painted cyan floor outline with the actual world boundary.
 ctx.drawImage(labMap,20,41,1408,926,-m,-m,w+2*m,h+2*m);
 // Equipment is scenery outside the same collision rectangle used by the desert.
 ctx.fillStyle='#07111c10';ctx.fillRect(0,0,w,h);
 ctx.lineWidth=2;ctx.strokeStyle='#8ce9ef99';ctx.setLineDash([12,18]);ctx.strokeRect(8,8,w-16,h-16);ctx.setLineDash([]);
 const light=(x,y)=>{ctx.fillStyle='#54cddb22';ctx.fillRect(x-12,y-5,24,10);ctx.fillStyle='#a8f4efbb';ctx.fillRect(x-5,y-2,10,4);};
 for(let x=70;x<w;x+=180){light(x,-10);light(x,h+10);}for(let y=70;y<h;y+=180){light(-10,y);light(w+10,y);}
 ctx.font='11px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillStyle='#b1dce4bb';
 for(const [x,y,a] of [[w/2,-28,0],[w/2,h+42,0],[-28,h/2,-Math.PI/2],[w+28,h/2,Math.PI/2]]){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillText('实验区边界 · 外侧为机械体研究设施',0,0);ctx.restore();}
 // Slow perimeter status lamps; combat telegraphs remain the brightest moving shapes.
 if(!visuals.reduced){ctx.globalAlpha=.18+.08*Math.sin(run.time*1.5);ctx.strokeStyle='#8ce9ef';ctx.lineWidth=2;for(let i=0;i<8;i++){const x=100+i*300;ctx.beginPath();ctx.moveTo(x,-75);ctx.lineTo(x+35,-75);ctx.moveTo(x,h+75);ctx.lineTo(x+35,h+75);ctx.stroke();}ctx.globalAlpha=1;}
 ctx.restore();
}
function hubSanctumFloor(){
 const w=run.world.w,h=run.world.h,m=desertMargin;
 ctx.fillStyle='#070b14';ctx.fillRect(0,0,view.w,view.h);ctx.save();ctx.translate(-camera.x,-camera.y);
 const grid=96,sx=Math.floor(camera.x/grid)*grid,sy=Math.floor(camera.y/grid)*grid;
 for(let x=sx;x<camera.x+view.w+grid;x+=grid)for(let y=sy;y<camera.y+view.h+grid;y+=grid){
  ctx.fillStyle=((x/grid+y/grid)%2===0)?'#0d1322':'#090e1a';ctx.fillRect(x+2,y+2,grid-4,grid-4);
  ctx.strokeStyle='rgba(56,189,248,0.08)';ctx.strokeRect(x+3,y+3,grid-6,grid-6);
  if((x/grid*5+y/grid*7)%11===0){
   ctx.fillStyle='rgba(250,204,21,0.22)';ctx.fillRect(x+grid/2-2,y+grid/2-2,4,4);
  }
 }
 const cx=w/2,cy=h/2;
 ctx.save();
 ctx.translate(cx,cy);
 ctx.strokeStyle='rgba(250,204,21,0.22)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,260,0,TAU);ctx.stroke();
 ctx.strokeStyle='rgba(56,189,248,0.28)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,210,0,TAU);ctx.stroke();
 ctx.strokeStyle='rgba(192,132,252,0.22)';ctx.lineWidth=1.5;ctx.setLineDash([8,12]);ctx.beginPath();ctx.arc(0,0,160,0,TAU);ctx.stroke();ctx.setLineDash([]);
 for(let k=0;k<12;k++){
  const a=k*TAU/12;
  ctx.strokeStyle='rgba(250,204,21,0.32)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(Math.cos(a)*160,Math.sin(a)*160);ctx.lineTo(Math.cos(a)*260,Math.sin(a)*260);ctx.stroke();
 }
 ctx.rotate(Math.PI/4);ctx.strokeStyle='rgba(56,189,248,0.2)';ctx.lineWidth=2;ctx.strokeRect(-120,-120,240,240);
 ctx.restore();
 ctx.lineWidth=6;ctx.strokeStyle='rgba(250,204,21,0.45)';ctx.strokeRect(8,8,w-16,h-16);
 ctx.lineWidth=2;ctx.setLineDash([16,14]);ctx.strokeStyle='rgba(56,189,248,0.6)';ctx.strokeRect(22,22,w-44,h-44);ctx.setLineDash([]);
 const beacon=(x,y)=>{
  ctx.fillStyle='rgba(250,204,21,0.3)';circle(x,y,14);
  ctx.fillStyle='#fef08a';ctx.fillRect(x-4,y-4,8,8);
  ctx.strokeStyle='#38bdf8';ctx.lineWidth=1.5;ctx.strokeRect(x-6,y-6,12,12);
 };
 for(let x=90;x<w;x+=180){beacon(x,14);beacon(x,h-14);}
 for(let y=90;y<h;y+=180){beacon(14,y);beacon(w-14,y);}
 const labels=[[w/2,36,0],[w/2,h-36,0],[36,h/2,-Math.PI/2],[w-36,h/2,Math.PI/2]];
 ctx.font='bold 11px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(250,204,21,0.55)';
 for(const [x,y,a] of labels){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillText('最后的文明存续中枢 · 绝对防御领域',0,0);ctx.restore();}
 ctx.restore();
}
function floor(){
 if(run.stage===0){desertFloor();return;}
 if(run.stage===1){laboratoryFloor();return;}
 if(run.stage===3){hubSanctumFloor();return;}
 ctx.fillStyle='#121c29';ctx.fillRect(0,0,view.w,view.h);ctx.save();ctx.translate(-camera.x,-camera.y);
 const grid=96,sx=Math.floor(camera.x/grid)*grid,sy=Math.floor(camera.y/grid)*grid;ctx.lineWidth=1;
 for(let x=sx;x<camera.x+view.w+grid;x+=grid)for(let y=sy;y<camera.y+view.h+grid;y+=grid){
  ctx.fillStyle=((x/grid+y/grid)%2===0)?'#182330':'#15202d';ctx.fillRect(x+2,y+2,grid-4,grid-4);ctx.strokeStyle='#33465832';ctx.strokeRect(x+3,y+3,grid-6,grid-6);
  ctx.fillStyle='#526d7840';ctx.fillRect(x+9,y+9,3,3);ctx.fillRect(x+grid-12,y+grid-12,3,3);
  if((x/grid*7+y/grid*3)%13===0){ctx.strokeStyle='#6b9daa19';ctx.beginPath();ctx.moveTo(x+22,y+25);ctx.lineTo(x+65,y+25);ctx.lineTo(x+65,y+70);ctx.stroke();circle(x+22,y+25,3,'#68b9b322');}
 }
 const cx=run.world.w/2,cy=run.world.h/2;ctx.strokeStyle='#729ab71c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,200,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,175,0,TAU);ctx.stroke();ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.PI/4);ctx.strokeRect(-105,-105,210,210);ctx.restore();ctx.font='12px monospace';ctx.textAlign='center';ctx.fillStyle='#879eb82b';ctx.fillText('ASTRAL // SECTOR 0'+(run.stage+1),cx,cy+225);
 ctx.strokeStyle='#d8ac6855';ctx.lineWidth=7;ctx.strokeRect(7,7,run.world.w-14,run.world.h-14);ctx.setLineDash([14,16]);ctx.strokeStyle='#e0bb7644';ctx.lineWidth=2;ctx.strokeRect(20,20,run.world.w-40,run.world.h-40);ctx.setLineDash([]);ctx.restore();
}
function labSegment(s,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x2,s.y2);ctx.stroke();}
function labRay(x,y,a,color,width){labSegment({x,y,x2:x+Math.cos(a)*3200,y2:y+Math.sin(a)*3200},color,width);}
function labCone(x,y,a,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,r,a-.5,a+.5);ctx.closePath();ctx.fill();}
function drawLabWarning(h){
 ctx.save();const progress=Math.min(1,Math.max(0,1-h.t/h.total));
 if(h.type==='barrier'){
  if(h.segments&&h.segments.length>=4){
   const s0=h.segments[0], s2=h.segments[2];
   const minX=Math.min(s0.x,s0.x2,s2.x,s2.x2), maxX=Math.max(s0.x,s0.x2,s2.x,s2.x2);
   const minY=Math.min(s0.y,s0.y2,s2.y,s2.y2), maxY=Math.max(s0.y,s0.y2,s2.y,s2.y2);
   ctx.fillStyle='rgba(6,182,212,0.08)';
   ctx.fillRect(minX,minY,maxX-minX,maxY-minY);
   ctx.strokeStyle='rgba(34,211,238,0.2)';ctx.lineWidth=1;
   for(let x=minX+40;x<maxX;x+=40){ctx.beginPath();ctx.moveTo(x,minY);ctx.lineTo(x,maxY);ctx.stroke();}
   for(let y=minY+40;y<maxY;y+=40){ctx.beginPath();ctx.moveTo(minX,y);ctx.lineTo(maxX,y);ctx.stroke();}
  }
  for(const s of h.segments){
   labSegment(s,'rgba(6,182,212,0.3)',28);
   ctx.save();
   ctx.strokeStyle='#22d3ee';ctx.lineWidth=4;
   ctx.setLineDash([14,8]);ctx.lineDashOffset=-run.time*40;
   ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x2,s.y2);ctx.stroke();
   ctx.restore();
   labSegment(s,'#ffffff',1.5);
  }
  for(const s of h.segments){
   for(const pt of [{x:s.x,y:s.y},{x:s.x2,y:s.y2}]){
    ctx.save();ctx.translate(pt.x,pt.y);
    circle(0,0,14,'rgba(6,182,212,0.4)');
    circle(0,0,8,'#0891b2');
    circle(0,0,3,'#ffffff');
    ctx.rotate(run.time*4);
    ctx.strokeStyle='#67e8f9';ctx.lineWidth=1.5;
    ctx.strokeRect(-7,-7,14,14);
    ctx.restore();
   }
  }
  ctx.font='bold 14px sans-serif';ctx.textAlign='center';
  ctx.fillStyle='#a5f3fc';ctx.shadowColor='#0891b2';ctx.shadowBlur=8;
  ctx.fillText('◬ 自律电磁禁闭力场 · 即将闭合 · '+Math.max(0,h.t).toFixed(1)+'s ◬',h.x,h.y-18);
  ctx.restore();
  return;
 }
 else if(h.type==='fixedLaser'){
  labRay(h.x,h.y,h.angle,'rgba(244,63,94,0.22)',32);
  ctx.save();
  ctx.strokeStyle='#f43f5e';ctx.lineWidth=2.5;
  ctx.setLineDash([12,8]);ctx.lineDashOffset=-run.time*50;
  labRay(h.x,h.y,h.angle,'#f43f5e',2.5);
  ctx.restore();
  labRay(h.x,h.y,h.angle,'#ffffff',1);

  ctx.save();ctx.translate(h.targetX,h.targetY);
  ctx.rotate(run.time*2.5);
  circle(0,0,26,'rgba(244,63,94,0.25)');
  ctx.strokeStyle='#fb7185';ctx.lineWidth=2;
  circle(0,0,22,'#fb7185',false);
  for(let k=0;k<4;k++){
   ctx.save();ctx.rotate(k*Math.PI/2);
   ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(26,0);ctx.stroke();
   ctx.restore();
  }
  ctx.rotate(-run.time*5);
  ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;
  ctx.strokeRect(-8,-8,16,16);
  ctx.restore();

  ctx.font='bold 13px sans-serif';ctx.textAlign='center';
  ctx.fillStyle='#fecdd3';ctx.shadowColor='#e11d48';ctx.shadowBlur=6;
  ctx.fillText('⚡ 狙击死光锁定 · ['+(h.shot||1)+'/'+D.labBoss.fixedLaserShots+'] · '+Math.max(0,h.t).toFixed(1)+'s ⚡',h.targetX,h.targetY-34);
  ctx.restore();
  return;
 }
 else if(h.type==='bombard'){
  ctx.save();ctx.translate(h.x,h.y);
  const outerR=h.r+Math.sin(run.time*8)*4;
  circle(0,0,outerR,'rgba(249,115,22,0.18)');
  ctx.strokeStyle='#f97316';ctx.lineWidth=2.5;
  circle(0,0,outerR,'#f97316',false);

  ctx.save();ctx.rotate(run.time*2);
  ctx.strokeStyle='#fed7aa';ctx.lineWidth=1.5;
  for(let k=0;k<4;k++){
   ctx.save();ctx.rotate(k*Math.PI/2);
   ctx.beginPath();ctx.arc(0,0,h.r*0.75,-0.3,0.3);ctx.stroke();
   ctx.beginPath();ctx.moveTo(h.r*0.65,0);ctx.lineTo(h.r*0.85,0);ctx.stroke();
   ctx.restore();
  }
  ctx.restore();

  ctx.save();ctx.rotate(-Math.PI/2);
  ctx.strokeStyle='#ffffff';ctx.lineWidth=3.5;
  ctx.beginPath();ctx.arc(0,0,h.r*0.5,0,TAU*progress);ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle='rgba(251,146,60,0.5)';ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.lineDashOffset=-run.time*60;
  ctx.beginPath();ctx.moveTo(0,-180);ctx.lineTo(0,0);ctx.stroke();
  ctx.restore();

  ctx.restore();
  ctx.font='bold 13px sans-serif';ctx.textAlign='center';
  ctx.fillStyle='#fed7aa';ctx.shadowColor='#ea580c';ctx.shadowBlur=6;
  ctx.fillText('▲ 天基轨道轰击 · 0'+(h.bombIndex||1)+'/05 · '+Math.max(0,h.t).toFixed(1)+'s ▲',h.x,h.y-h.r-12);
  ctx.restore();
  return;
 }
 else if(h.type==='laser'){
  ctx.save();ctx.translate(h.x,h.y);
  ctx.save();ctx.rotate(run.time*3);
  ctx.strokeStyle='#fdba74';ctx.lineWidth=2;
  circle(0,0,50,'#fdba74',false);
  for(let k=0;k<3;k++){
   ctx.save();ctx.rotate(k*TAU/3);
   ctx.beginPath();ctx.moveTo(35,-8);ctx.lineTo(48,0);ctx.lineTo(35,8);ctx.stroke();
   ctx.restore();
  }
  ctx.restore();

  for(const a of h.angles){
   labRay(0,0,a,'rgba(249,115,22,0.22)',32);
   ctx.save();
   ctx.strokeStyle='#f97316';ctx.lineWidth=2.5;
   ctx.setLineDash([12,8]);ctx.lineDashOffset=-run.time*50;
   labRay(0,0,a,'#f97316',2.5);
   ctx.restore();
   labRay(0,0,a,'#ffffff',1);
  }
  ctx.restore();

  ctx.font='bold 13px sans-serif';ctx.textAlign='center';
  ctx.fillStyle='#fed7aa';ctx.shadowColor='#c2410c';ctx.shadowBlur=6;
  ctx.fillText('⚠ 120° 三向高能热射线 · 回旋预警 · '+Math.max(0,h.t).toFixed(1)+'s ⚠',h.x,h.y-65);
  ctx.restore();
  return;
 }
 else if(h.type==='saws'){
  ctx.save();ctx.translate(h.x,h.y);
  ctx.strokeStyle='rgba(34,211,238,0.45)';ctx.lineWidth=2;ctx.setLineDash([8,6]);
  circle(0,0,h.r||125,'rgba(34,211,238,0.1)');
  circle(0,0,h.r||125,'#22d3ee',false);
  ctx.save();ctx.rotate(run.time*4);
  for(let i=0;i<4;i++){
   const a=i*TAU/4, px=Math.cos(a)*(h.r||125), py=Math.sin(a)*(h.r||125);
   circle(px,py,12,'#0891b2');
   circle(px,py,6,'#cffafe');
  }
  ctx.restore();
  ctx.restore();

  ctx.font='bold 13px sans-serif';ctx.textAlign='center';
  ctx.fillStyle='#cffafe';ctx.shadowColor='#0891b2';ctx.shadowBlur=6;
  ctx.fillText('✦ 磁轨等离子光刃 · 集结序列 ✦',h.x,h.y-(h.r||125)-20);
  ctx.restore();
  return;
 }
 else if(h.type==='suicide'){
  ctx.save();ctx.translate(h.x,h.y);
  circle(0,0,h.r,'rgba(239,68,68,0.22)');
  ctx.strokeStyle='#ef4444';ctx.lineWidth=3;
  ctx.setLineDash([14,8]);ctx.lineDashOffset=-run.time*40;
  circle(0,0,h.r,'#ef4444',false);

  ctx.save();ctx.rotate(run.time*4);
  ctx.strokeStyle='#fca5a5';ctx.lineWidth=2;ctx.setLineDash([]);
  for(let k=0;k<6;k++){
   ctx.save();ctx.rotate(k*TAU/6);
   ctx.beginPath();ctx.moveTo(h.r*0.6,-8);ctx.lineTo(h.r*0.75,0);ctx.lineTo(h.r*0.6,8);ctx.stroke();
   ctx.restore();
  }
  ctx.restore();
  ctx.restore();

  ctx.font='bold 13px sans-serif';ctx.textAlign='center';
  ctx.fillStyle='#fee2e2';ctx.shadowColor='#b91c1c';ctx.shadowBlur=8;
  ctx.fillText('☢ 反应堆超载熔毁自爆 · '+Math.max(0,h.t).toFixed(1)+'s ☢',h.x,h.y-h.r-10);
  ctx.restore();
  return;
 }
 else if(h.type==='stab'){
  const endX=h.x+Math.cos(h.angle)*221, endY=h.y+Math.sin(h.angle)*221;
  labSegment({x:h.x,y:h.y,x2:endX,y2:endY},'rgba(56,189,248,0.22)',56);
  labSegment({x:h.x,y:h.y,x2:endX,y2:endY},'#38bdf8bb',24);
  labSegment({x:h.x,y:h.y,x2:endX,y2:endY},'#ffffff',4);
  for(let i=1;i<=3;i++){
   const px=h.x+Math.cos(h.angle)*i*60, py=h.y+Math.sin(h.angle)*i*60;
   ctx.save();ctx.translate(px,py);ctx.rotate(h.angle);ctx.setLineDash([]);
   ctx.strokeStyle='#7dd3fc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-12);ctx.lineTo(8,0);ctx.lineTo(-8,12);ctx.stroke();
   ctx.restore();
  }
 }
 else if(h.type==='acid'){
  labCone(h.x,h.y,h.angle,h.r,'rgba(163,230,53,0.18)');
  ctx.save();ctx.setLineDash([]);
  for(let k=0;k<7;k++){
   const a=h.angle+(k-3)*0.16;
   const dist=((run.time*240+k*45)%h.r);
   circle(h.x+Math.cos(a)*dist,h.y+Math.sin(a)*dist,4+Math.sin(run.time*8+k)*2,'#bef264aa');
  }
  ctx.restore();
 }
 else if(h.type==='radar'){
  circle(h.x,h.y,h.r,'rgba(244,63,94,0.18)');
  ctx.lineWidth=2.5;circle(h.x,h.y,h.r,'#fb7185ee',false);
  ctx.save();ctx.translate(h.x,h.y);ctx.rotate(run.time*3);ctx.setLineDash([]);
  ctx.strokeStyle='#ffffff';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,0,h.r*0.65,-0.4,0.4);ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,h.r*0.65,Math.PI-0.4,Math.PI+0.4);ctx.stroke();
  ctx.restore();
 }
 else {
  circle(h.x,h.y,h.r,'#ffb36c15');ctx.lineWidth=2;circle(h.x,h.y,h.r,'#ffb36caa',false);
  ctx.setLineDash([]);ctx.beginPath();ctx.arc(h.x,h.y,h.r+4,-Math.PI/2,-Math.PI/2+TAU*progress);ctx.stroke();
 }
 ctx.setLineDash([]);ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff0bf';
 const names={acid:'腐蚀喷雾',radar:'导弹锁定',stab:'穿心突刺',sonic:'震荡波',control:'自爆机兵召集'};
 ctx.fillText(names[h.type]||'!',h.x,h.y-15);
 ctx.restore();
}

function drawLabSaw(x,y,r){
 ctx.save();ctx.translate(x,y);ctx.rotate(run.time*24);
 ctx.save();ctx.shadowBlur=18;ctx.shadowColor='#06b6d4';
 ctx.fillStyle='#083344';ctx.beginPath();ctx.arc(0,0,r*0.55,0,TAU);ctx.fill();
 ctx.strokeStyle='#22d3ee';ctx.lineWidth=2.5;ctx.stroke();
 ctx.fillStyle='#cffafe';ctx.beginPath();ctx.arc(0,0,r*0.28,0,TAU);ctx.fill();
 ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(0,0,r*0.14,0,TAU);ctx.fill();
 for(let k=0;k<8;k++){
  const a=k*TAU/8;
  ctx.save();ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(r*0.45,-r*0.15);
  ctx.lineTo(r*1.18,0);
  ctx.lineTo(r*0.55,r*0.22);
  ctx.closePath();
  ctx.fillStyle='#0891b2';ctx.fill();
  ctx.strokeStyle='#67e8f9';ctx.lineWidth=2;ctx.stroke();
  ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(r*0.65,-r*0.08);ctx.lineTo(r*1.18,0);ctx.stroke();
  ctx.restore();
 }
 ctx.restore();
 ctx.save();ctx.rotate(-run.time*16);
 ctx.strokeStyle='#a5f3fc';ctx.lineWidth=1.5;
 ctx.strokeRect(-r*0.35,-r*0.35,r*0.7,r*0.7);
 ctx.restore();
 ctx.restore();
}

function drawLabFields(){
 for(const f of run.labFields){
  ctx.save();
  if(f.kind==='acid')drawSpecialConeField(f,true);
  if(f.kind==='barrier'){
   for(const s of f.segments){
    for(const pt of [{x:s.x,y:s.y},{x:s.x2,y:s.y2}]){
     ctx.save();ctx.translate(pt.x,pt.y);
     ctx.fillStyle='#083344';ctx.fillRect(-14,-14,28,28);
     ctx.strokeStyle='#22d3ee';ctx.lineWidth=2;ctx.strokeRect(-14,-14,28,28);
     ctx.rotate(run.time*5);
     circle(0,0,7,'#67e8f9');
     circle(0,0,3,'#ffffff');
     ctx.restore();
    }
    labSegment(s,'rgba(6,182,212,0.35)',34);
    labSegment(s,'#22d3ee',10);
    labSegment(s,'#ecfeff',3);

    const dx=s.x2-s.x,dy=s.y2-s.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
    for(let arc=0;arc<4;arc++){
     const along=(run.time*240+arc*len/4)%len,px=s.x+ux*along,py=s.y+uy*along,jitter=Math.sin(run.time*30+arc)*14;
     ctx.strokeStyle='#cffafe';ctx.lineWidth=2;
     ctx.beginPath();ctx.moveTo(px-ux*14,py-uy*14);ctx.lineTo(px-uy*jitter,py+ux*jitter);ctx.lineTo(px+ux*14,py+uy*14);ctx.stroke();
    }
   }
   ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillStyle='#a5f3fc';
   ctx.shadowColor='#0891b2';ctx.shadowBlur=8;
   ctx.fillText('◬ 全域电磁禁闭力场 · '+f.life.toFixed(1)+'s ◬',f.x,f.y-f.half-18);
  }
  if(f.kind==='fixedLaser'){
   labRay(f.x,f.y,f.angle,'rgba(244,63,94,0.35)',48);
   labRay(f.x,f.y,f.angle,'#fb7185',20);
   labRay(f.x,f.y,f.angle,'#fda4af',8);
   labRay(f.x,f.y,f.angle,'#ffffff',3);

   for(let p=1;p<=6;p++){
    const dist=((run.time*2600+p*450)%3000)+80;
    const px=f.x+Math.cos(f.angle)*dist, py=f.y+Math.sin(f.angle)*dist;
    ctx.save();ctx.translate(px,py);ctx.rotate(f.angle+Math.PI/2);
    ctx.strokeStyle='#ffe4e6';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.ellipse(0,0,18,6,0,0,TAU);ctx.stroke();
    ctx.restore();
   }

   ctx.save();ctx.shadowBlur=28;ctx.shadowColor='#f43f5e';
   circle(f.x,f.y,36,'#ffe4e6');circle(f.x,f.y,20,'#ffffff');ctx.restore();
  }
  if(f.kind==='laser'){
   for(const a of f.angles){
    labRay(f.x,f.y,a,'rgba(234,88,12,0.38)',72);
    labRay(f.x,f.y,a,'#f97316',34);
    labRay(f.x,f.y,a,'#fbbf24',16);
    labRay(f.x,f.y,a,'#ffffff',6);

    const len=3200;
    for(let side of [-1,1]){
     ctx.strokeStyle=side>0?'#fed7aa':'#fef08a';ctx.lineWidth=2.5;ctx.beginPath();
     for(let dist=40;dist<len;dist+=50){
      const wave=Math.sin(dist*0.015+run.time*22)*22*side;
      const hx=f.x+Math.cos(a)*dist-Math.sin(a)*wave;
      const hy=f.y+Math.sin(a)*dist+Math.cos(a)*wave;
      if(dist===40)ctx.moveTo(hx,hy);else ctx.lineTo(hx,hy);
     }
     ctx.stroke();
    }

    for(let p=1;p<=5;p++){
     const dist=((run.time*1800+p*560)%2800)+60;
     const px=f.x+Math.cos(a)*dist, py=f.y+Math.sin(a)*dist;
     ctx.save();ctx.translate(px,py);ctx.rotate(a+Math.PI/2);
     ctx.strokeStyle='#ffffff';ctx.lineWidth=3;
     ctx.beginPath();ctx.ellipse(0,0,26,7,0,0,TAU);ctx.stroke();
     ctx.restore();
    }
   }

   ctx.save();ctx.translate(f.x,f.y);
   ctx.rotate(-run.time*5);
   ctx.strokeStyle='#ea580c';ctx.lineWidth=3;
   circle(0,0,46,'#ea580c',false);
   for(let k=0;k<6;k++){
    const ba=k*TAU/6;
    ctx.beginPath();ctx.moveTo(Math.cos(ba)*40,Math.sin(ba)*40);ctx.lineTo(Math.cos(ba)*54,Math.sin(ba)*54);ctx.stroke();
   }
   ctx.restore();

   ctx.save();ctx.shadowBlur=32;ctx.shadowColor='#f97316';
   circle(f.x,f.y,44,'#ffedd5');circle(f.x,f.y,26,'#ffffff');ctx.restore();
  }
  if(f.kind==='control'){
   ctx.save();ctx.translate(f.x,f.y-65);
   ctx.rotate(run.time*2);
   ctx.strokeStyle='#f87171';ctx.lineWidth=2;
   circle(0,0,65,'rgba(239,68,68,0.15)');
   circle(0,0,65,'#ef4444',false);
   for(let i=0;i<6;i++){
    const a=i*TAU/6;
    const px=Math.cos(a)*65, py=Math.sin(a)*65;
    circle(px,py,6,'#b91c1c');
    circle(px,py,3,'#ffffff');
   }
   ctx.restore();
   ctx.font='bold 12px sans-serif';ctx.textAlign='center';
   ctx.fillStyle='#fca5a5';ctx.shadowColor='#b91c1c';ctx.shadowBlur=6;
   ctx.fillText('⚡ 全域自律机兵神经覆写中 ⚡',f.x,f.y-140);
  }
  if(f.kind==='saws'){
   ctx.save();ctx.translate(f.x,f.y);
   ctx.strokeStyle='rgba(34,211,238,0.4)';ctx.lineWidth=2.5;ctx.setLineDash([10,8]);
   circle(0,0,f.r,'rgba(6,182,212,0.12)');
   circle(0,0,f.r,'#22d3ee',false);

   ctx.save();ctx.rotate(f.spin);
   for(let i=0;i<4;i++){
    const a=i*TAU/4;
    ctx.save();ctx.rotate(a);
    ctx.strokeStyle='#67e8f9';ctx.lineWidth=2;ctx.setLineDash([]);
    ctx.strokeRect(f.r-10,-10,20,20);
    ctx.restore();
   }
   ctx.restore();
   ctx.restore();

   for(let i=0;i<f.collected;i++){
    const a=f.spin+i*TAU/4;
    drawLabSaw(f.x+Math.cos(a)*f.r,f.y+Math.sin(a)*f.r,25);
   }

   ctx.font='bold 14px sans-serif';ctx.textAlign='center';
   ctx.fillStyle='#cffafe';ctx.shadowColor='#0891b2';ctx.shadowBlur=8;
   ctx.fillText('✦ 磁轨等离子光刃集结 · ['+f.collected+'/4] ✦',f.x,f.y-f.r-42);
  }
  ctx.restore();
 }
}
function hubRay(f,a,color,width){labSegment({x:f.x,y:f.y,x2:f.x+Math.cos(a)*f.length,y2:f.y+Math.sin(a)*f.length},color,width);}
function hubSlashSector(h,fill,stroke){ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.arc(h.x,h.y,h.r,h.angle-h.spread,h.angle+h.spread);ctx.closePath();ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
function drawArchonAura(e){
 ctx.save();
 const isSpirit=e.hubForm==='spirit';
 ctx.save();
 ctx.translate(e.x,e.y+10);
 ctx.scale(1,0.44);
 const ringR=e.r+28;
 const grad=ctx.createRadialGradient(0,0,e.r*0.2,0,0,ringR+24);
 grad.addColorStop(0,isSpirit?'rgba(168,85,247,0.32)':'rgba(234,179,8,0.32)');
 grad.addColorStop(0.6,isSpirit?'rgba(56,189,248,0.18)':'rgba(34,211,238,0.18)');
 grad.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=grad;
 ctx.beginPath();ctx.arc(0,0,ringR+24,0,TAU);ctx.fill();
 ctx.rotate(-run.time*0.6);
 ctx.lineWidth=2.5;ctx.strokeStyle=isSpirit?'#c084fcee':'#facc15ee';
 ctx.setLineDash([16,8]);ctx.beginPath();ctx.arc(0,0,ringR,0,TAU);ctx.stroke();
 ctx.rotate(run.time*1.3);
 ctx.lineWidth=1.5;ctx.strokeStyle=isSpirit?'#38bdf8dd':'#22d3eedd';
 ctx.setLineDash([8,6]);ctx.beginPath();ctx.arc(0,0,ringR-14,0,TAU);ctx.stroke();
 ctx.setLineDash([]);
 ctx.restore();

 const haloY=e.y-34+Math.sin(run.time*4+e.id)*2;
 if(!isSpirit){
  ctx.save();ctx.translate(e.x,haloY);
  ctx.save();ctx.rotate(-run.time*0.5);
  ctx.strokeStyle='#eab308cc';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.arc(0,0,118,0,TAU);ctx.stroke();
  for(let k=0;k<12;k++){
   const a=k*TAU/12;
   ctx.beginPath();ctx.moveTo(Math.cos(a)*110,Math.sin(a)*110);ctx.lineTo(Math.cos(a)*124,Math.sin(a)*124);ctx.stroke();
  }
  ctx.restore();
  ctx.save();ctx.rotate(run.time*0.85);
  ctx.strokeStyle='#22d3eecc';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,0,92,0,TAU);ctx.stroke();
  for(let k=0;k<8;k++){
   const a=k*TAU/8;ctx.fillStyle='#67e8f9';circle(Math.cos(a)*92,Math.sin(a)*92,3.5);
  }
  ctx.restore();
  ctx.save();ctx.rotate(run.time*1.4);
  ctx.strokeStyle='#c084fcaa';ctx.lineWidth=1.5;ctx.setLineDash([6,6]);
  ctx.beginPath();ctx.arc(0,0,68,0,TAU);ctx.stroke();
  ctx.restore();
  for(let k=0;k<4;k++){
   const baseA=k*TAU/4+run.time*0.35;
   const px=Math.cos(baseA)*128,py=Math.sin(baseA)*48;
   ctx.save();ctx.translate(px,py);ctx.rotate(baseA+Math.PI/2);
   ctx.fillStyle='#fef08a';ctx.strokeStyle='#0284c7';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(7,8);ctx.lineTo(0,4);ctx.lineTo(-7,8);ctx.closePath();
   ctx.fill();ctx.stroke();
   ctx.fillStyle='#38bdf8';circle(0,-18,2.5);
   ctx.restore();
  }
  ctx.restore();
 }else{
  ctx.save();ctx.translate(e.x,haloY);
  ctx.globalAlpha=0.55+0.15*Math.sin(run.time*2.5);
  const haloGrad=ctx.createRadialGradient(0,0,30,0,0,145);
  haloGrad.addColorStop(0,'rgba(192,132,252,0.3)');
  haloGrad.addColorStop(0.5,'rgba(56,189,248,0.2)');
  haloGrad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=haloGrad;
  ctx.beginPath();ctx.arc(0,0,145,0,TAU);ctx.fill();
  ctx.rotate(run.time*0.4);
  ctx.strokeStyle='#e0e7ffcc';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,0,126,0,TAU);ctx.stroke();
  for(let k=0;k<8;k++){
   const a=k*TAU/8;ctx.save();ctx.rotate(a);
   ctx.fillStyle='#c084fc';
   ctx.beginPath();ctx.moveTo(118,0);ctx.lineTo(126,6);ctx.lineTo(134,0);ctx.lineTo(126,-6);ctx.closePath();
   ctx.fill();ctx.restore();
  }
  ctx.strokeStyle='rgba(255,255,255,0.45)';ctx.lineWidth=1.5;
  for(let k=0;k<6;k++){
   const a=k*TAU/6-run.time*0.2;
   ctx.beginPath();ctx.moveTo(Math.cos(a)*50,Math.sin(a)*50);ctx.lineTo(Math.cos(a)*140,Math.sin(a)*140);ctx.stroke();
  }
  ctx.restore();
 }
 ctx.restore();
}
function drawHubLightningWarning(h){
 const spirit=h.type==='spiritThunder',p=clamp(1-h.t/(h.total||1),0,1),color=spirit?'#c4b5fd':'#fde68a';
 ctx.save();ctx.setLineDash([]);ctx.lineWidth=2;
 circle(h.x,h.y,h.r,spirit?'#a78bfa18':'#fbbf2418');circle(h.x,h.y,h.r,color+'bb',false);
 ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(h.x,h.y,h.r*.92,-Math.PI/2,-Math.PI/2+TAU*p);ctx.stroke();
 circle(h.x,h.y,h.r*(1.4-.95*p),color+'44',false);
 ctx.translate(h.x,h.y);
 for(let i=0;i<4;i++){const a=i*TAU/4;ctx.save();ctx.rotate(a);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(h.r-7,0);ctx.lineTo(h.r+9,-5);ctx.lineTo(h.r+9,5);ctx.fill();ctx.restore();}
 const top=Math.min(-650,camera.y-h.y-80),leader=ctx.createLinearGradient(0,top,0,0);
 leader.addColorStop(0,color+'00');leader.addColorStop(.7,color+'33');leader.addColorStop(1,color+'aa');
 ctx.strokeStyle=leader;ctx.lineWidth=1+p*2;ctx.beginPath();ctx.moveTo(0,top);ctx.lineTo(0,0);ctx.stroke();
 circle(0,0,3+p*5,'#ffffff');
 for(let i=0;i<6;i++){const a=i*TAU/6+run.time*.7,d=h.r*(.25+.65*((i/6+p*.8)%1));circle(Math.cos(a)*d,Math.sin(a)*d,1.5,color);}
 ctx.restore();
}
function drawHubLightning(f){
 const spirit=f.kind==='spiritThunder',age=Math.max(0,f.max-f.life),p=clamp(age/f.max,0,1),fade=Math.pow(1-p,.65);
 const color=spirit?'#a78bfa':'#fbbf24',rim=spirit?'#67e8f9':'#fde68a',seed=Math.sin(f.x*.017+f.y*.031)*27;
 const top=Math.min(f.y-650,camera.y-90),height=f.y-top,points=[];
 // A shared continuous spine keeps the white core, colored sheath and branches joined end to end.
 for(let i=0;i<=18;i++){const u=i/18,envelope=Math.sin(Math.PI*u),jitter=(Math.sin(seed+i*2.71)*.7+Math.sin(i*5.17+seed)*.3)*19;points.push({x:f.x+envelope*jitter,y:top+u*height});}
 ctx.save();ctx.setLineDash([]);ctx.lineJoin='round';ctx.lineCap='round';ctx.globalCompositeOperation='lighter';
 const stroke=(ps,width,paint,alpha)=>{ctx.globalAlpha=alpha;ctx.strokeStyle=paint;ctx.lineWidth=width;ctx.beginPath();ps.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();};
 const pulse=.82+.18*Math.sin(p*Math.PI*3),width=(spirit?7:11)*(.55+.45*(1-p));
 stroke(points,width*4.5,color,fade*.10);stroke(points,width*2.3,color,fade*.35);stroke(points,width,rim,fade*.85);stroke(points,Math.max(1.6,width*.4),'#ffffff',fade*pulse);
 for(let side=-1;side<=1;side+=2){
  const origin=points[side<0?9:13],branch=[origin];
  for(let i=1;i<=4;i++)branch.push({x:origin.x+side*i*(11+Math.sin(seed+i)*4),y:origin.y+i*height*.025});
  stroke(branch,5,color,fade*.16);stroke(branch,1.5,rim,fade*.75);
 }
 ctx.globalAlpha=fade;
 const glow=ctx.createRadialGradient(f.x,f.y,2,f.x,f.y,f.r);glow.addColorStop(0,'#ffffffb0');glow.addColorStop(.18,rim+'99');glow.addColorStop(.6,color+'33');glow.addColorStop(1,color+'00');circle(f.x,f.y,f.r,glow);
 ctx.lineWidth=2.5;circle(f.x,f.y,f.r*(.22+.78*Math.sin(p*Math.PI/2)),rim+'bb',false);
 ctx.lineWidth=1;circle(f.x,f.y,f.r,color+'66',false);
 for(let i=0;i<10;i++){
  const a=seed+i*TAU/10,d=f.r*(.12+.85*Math.min(1,p*1.8)),x=f.x+Math.cos(a)*d,y=f.y+Math.sin(a)*d;
  ctx.strokeStyle=i%2?color:rim;ctx.lineWidth=i%2?1.4:2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(a)*9*(1-p),y-Math.sin(a)*9*(1-p)-5);ctx.stroke();
 }
 circle(f.x,f.y,Math.max(2,(spirit?12:18)*(1-p)),'#ffffff');ctx.restore();
}
function drawHubSweepWarning(h){
 const p=clamp(1-h.t/h.total,0,1),spin=run.time*2;
 ctx.save();ctx.setLineDash([]);ctx.lineCap='round';
 for(let i=0;i<h.beams;i++){
  const a=h.angle+i*TAU/h.beams;
  hubRay(h,a,'#f59e0b14',h.r*2.5);hubRay(h,a,'#fbbf2477',2);
  ctx.save();ctx.translate(h.x,h.y);ctx.rotate(a);ctx.strokeStyle='#fef3c7';ctx.lineWidth=2;
  for(let k=0;k<7;k++){const x=90+((k*150+run.time*120)%1050);ctx.beginPath();ctx.moveTo(x+9,-7);ctx.lineTo(x,0);ctx.lineTo(x+9,7);ctx.stroke();}
  ctx.restore();
 }
 ctx.translate(h.x,h.y);ctx.lineWidth=3;
 for(let i=0;i<4;i++){const a=spin+i*TAU/4;ctx.strokeStyle=i%2?'#67e8f9':'#fde68a';ctx.beginPath();ctx.arc(0,0,82-18*p,a,a+Math.PI*.33);ctx.stroke();}
 circle(0,0,110-44*p,'#fbbf2444',false);circle(0,0,15+12*p,'#fde68a66');circle(0,0,6+7*p,'#ffffff');
 ctx.strokeStyle='#fff7cf';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,72,-Math.PI/2,-Math.PI/2+TAU*p);ctx.stroke();ctx.restore();
}
function drawHubSweep(f){
 const age=Math.max(0,f.max-f.life),start=clamp(age/.18,0,1),finish=clamp(f.life/.25,0,1),power=start*finish;
 const angle=f.currentAngle??f.angle,length=Math.min(f.length,Math.hypot(view.w,view.h)+Math.hypot(f.x-camera.x-view.w/2,f.y-camera.y-view.h/2)+120);
 ctx.save();ctx.setLineDash([]);ctx.lineCap='round';ctx.lineJoin='round';ctx.globalCompositeOperation='lighter';
 for(let i=0;i<f.beams;i++){
  const a=angle+i*TAU/f.beams;
  // Faint swept afterimages show rotation; the brightest central spine marks the live beam.
  for(let j=3;j>=1;j--){ctx.globalAlpha=power*(.025+.012*(4-j));hubRay({...f,length},a-j*.035,'#f59e0b',f.r*(2.8-j*.3));}
  ctx.globalAlpha=power;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(a);
  const halo=ctx.createLinearGradient(0,0,0,f.r*2.4);halo.addColorStop(0,'#fbbf242e');halo.addColorStop(.5,'#f59e0b16');halo.addColorStop(1,'#f59e0b00');
  for(const side of [-1,1]){ctx.save();ctx.scale(1,side);ctx.fillStyle=halo;ctx.fillRect(0,0,length,f.r*2.4);ctx.restore();}
  const rim=ctx.createLinearGradient(0,0,length,0);rim.addColorStop(0,'#fff2bc');rim.addColorStop(.25,'#fbbf24');rim.addColorStop(1,'#f59e0b88');
  const envelope=(x)=>f.r*(.7+.12*Math.sin(x*.032-age*16))*(.45+.55*Math.min(1,x/75));
  ctx.fillStyle=rim;ctx.beginPath();ctx.moveTo(0,0);
  for(let x=0;x<=length+50;x+=50)ctx.lineTo(Math.min(x,length),-envelope(x));
  for(let x=length;x>=0;x-=50)ctx.lineTo(x,envelope(x));ctx.closePath();ctx.fill();
  ctx.globalAlpha=power;ctx.strokeStyle='#fff9dd';ctx.lineWidth=f.r*.40;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,0);ctx.stroke();
  ctx.strokeStyle='#ffffff';ctx.lineWidth=f.r*.20;ctx.stroke();
  ctx.globalCompositeOperation='source-over';ctx.strokeStyle='#67e8f9';ctx.lineWidth=2.5;ctx.globalAlpha=power*.75;
  for(const side of [-1,1]){ctx.beginPath();for(let x=28;x<=length;x+=28){const y=Math.sin(x*.026-age*13+i)*f.r*.55*side;x===28?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}
  ctx.globalCompositeOperation='lighter';
  // Coherent packets travel out from the emitter instead of regenerating random particles each frame.
  for(let k=0;k<12;k++){
   const x=70+(age*1150+k*170+i*41)%(Math.max(171,length)-70),wx=f.x+Math.cos(a)*x,wy=f.y+Math.sin(a)*x;
   if(wx<camera.x-80||wx>camera.x+view.w+80||wy<camera.y-80||wy>camera.y+view.h+80)continue;
   ctx.globalAlpha=power*.75;ctx.strokeStyle=k%2?'#67e8f9':'#fff7c2';ctx.lineWidth=2;
   ctx.beginPath();ctx.ellipse(x,0,7,f.r*(1.02+.10*Math.sin(age*8+k)),0,0,TAU);ctx.stroke();
   for(const side of [-1,1]){const y=side*f.r*(1.1+.2*Math.sin(age*5+k));ctx.strokeStyle='#fbbf24';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-25,y);ctx.lineTo(x-6,y);ctx.stroke();}
  }
  // Bright launch flare connects each ray to the rotating reactor.
  ctx.globalAlpha=power;ctx.fillStyle='#fff7cf';ctx.beginPath();ctx.moveTo(33,-9);ctx.lineTo(112,0);ctx.lineTo(33,9);ctx.closePath();ctx.fill();ctx.restore();
 }
 ctx.globalAlpha=power;ctx.translate(f.x,f.y);
 const glow=ctx.createRadialGradient(0,0,8,0,0,110);glow.addColorStop(0,'#fff7cfbb');glow.addColorStop(.38,'#fbbf2455');glow.addColorStop(1,'#f59e0b00');circle(0,0,110,glow);
 ctx.lineWidth=3;
 for(let i=0;i<4;i++){const a=angle+i*TAU/4;ctx.strokeStyle='#fde68a';ctx.beginPath();ctx.arc(0,0,64,a+.14,a+1.05);ctx.stroke();ctx.strokeStyle='#67e8f9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,80,-age*2+i*TAU/4,-age*2+i*TAU/4+.7);ctx.stroke();}
 circle(0,0,22+Math.sin(age*8)*2,'#fff8cf');circle(0,0,10,'#ffffff');ctx.restore();
}
function drawHubWarning(h){ctx.save();ctx.setLineDash([9,7]);
 if(h.type==='prism'){
  for(let i=0;i<h.angles.length;i++){
   const a=h.angles[i];
   hubRay(h,a,'rgba(147,234,255,0.4)',h.r*3.2);
   hubRay(h,a,'#7dd3fc',h.r*1.5);
   hubRay(h,a,'#ffffff',3);
  }
  if(h.angles.length>=3){
   const leftGap=(h.angles[0]+h.angles[1])/2, rightGap=(h.angles[1]+h.angles[2])/2;
   hubRay(h,leftGap,'rgba(74,222,128,0.22)',14);
   hubRay(h,rightGap,'rgba(74,222,128,0.22)',14);
  }
 }
 else if(h.type==='sweep'){drawHubSweepWarning(h);}
 else if(h.type==='rush'){
  hubRay(h,h.angle,'rgba(2,132,199,0.3)',h.r*2.6);
  hubRay(h,h.angle,'#7dd3fcbb',h.r*1.4);
  hubRay(h,h.angle,'#ffffff',3);
 }
 else if(h.type==='aegis'&&h.pull){
  const p=clamp(1-h.t/h.total,0,1);ctx.setLineDash([]);ctx.lineWidth=2;
  for(let i=0;i<3;i++){const r=55+(1-(p+i/3)%1)*150;circle(h.x,h.y,r,'#a5b4fc66',false);}
  circle(h.x,h.y,28+p*15,'#9efaff44');circle(h.x,h.y,h.r,'#c4b5fd99',false);
 }
 else if(h.type==='quantum'){circle(h.x,h.y,h.r,'#ad99ff22');circle(h.x,h.y,h.r,'#c4b6ffee',false);}
 else if(h.type==='rushSlash'){
  hubSlashSector(h,'rgba(250,204,21,0.25)','#fde047dd');
  ctx.save();ctx.translate(h.x,h.y);ctx.strokeStyle='#ffffff';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,0,h.r,h.angle-h.spread,h.angle+h.spread);ctx.stroke();
  ctx.restore();
 }
 else if(h.type==='wall'){for(const line of h.segments)labSegment(line,'#aad2ffbb',10);}
 else if(h.type==='orbital'||h.type==='spiritThunder'){drawHubLightningWarning(h);}
 else{circle(h.x,h.y,h.r,'#bd8bff22');ctx.lineWidth=2;circle(h.x,h.y,h.r,'#daafffee',false);}
 ctx.setLineDash([]);ctx.font='bold 12px sans-serif';ctx.fillStyle='#fff0ce';ctx.textAlign='center';
 const names={prism:'分光裁决 · 留意间隙',wall:'定空障壁',trace:'残影劫雷',plasma:'焚界落点',aegis:'时空吸积盾 · 引力坍缩',spiritThunder:'量子雷光',quantum:'大型量子球 · 湮灭领域',orbital:'天基星晷神罚'+(h.sequence?' · '+h.shot+'/'+h.totalShots+' 轨':''),sweep:'空间断罪死光 · 360°回旋',rush:'时空折跃突进 '+(h.shot||1)+'/'+(h.totalShots||1),rushSlash:'裂空月华斩'};
 ctx.fillText(names[h.type]||h.type,h.x,h.y-h.r-12);ctx.restore();}
function drawHubAnnihilation(f){
 const glow=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);glow.addColorStop(0,'#1c123cbb');glow.addColorStop(.7,'#8f65e24d');glow.addColorStop(1,'#cda7ff22');circle(f.x,f.y,f.r,glow);
 ctx.strokeStyle='#c5a0ff';ctx.lineWidth=2;circle(f.x,f.y,f.r,'#c5a0ffbb',false);
 for(let i=0;i<3;i++){const radius=f.r*((run.time*.3+i/3)%1);circle(f.x,f.y,radius,'#b894ff55',false);}
 if(f.kind==='quantum'){
  const ball=ctx.createRadialGradient(f.x-f.coreRadius*.3,f.y-f.coreRadius*.3,2,f.x,f.y,f.coreRadius);ball.addColorStop(0,'#ffffff');ball.addColorStop(.3,'#d6f0ff');ball.addColorStop(.65,'#a789ff');ball.addColorStop(1,'#513798');ctx.shadowColor='#a78bfa';ctx.shadowBlur=25;circle(f.x,f.y,f.coreRadius,ball);ctx.shadowBlur=0;
  ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(f.x,f.y,f.coreRadius*1.35,f.coreRadius*.45,run.time*1.6,0,TAU);ctx.stroke();
 }
 ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e4d9ff';ctx.fillText('量子湮灭 '+f.life.toFixed(1)+'s',f.x,f.y-f.r-12);
}
function drawHubQuantumPull(f){
 const age=Math.max(0,f.max-f.life),pulling=age<f.pull.duration,x=pulling?f.x:(f.pulseX??f.x),y=pulling?f.y:(f.pulseY??f.y);
 const colors=['#67e8f9','#a5b4fc','#c4b5fd','#fde68a'];
 ctx.save();ctx.setLineDash([]);ctx.lineCap='round';ctx.lineJoin='round';
 if(pulling){
  const p=clamp(age/f.pull.duration,0,1),outer=f.pulse.radius,fade=Math.min(1,age/.25),charge=clamp((p-.7)/.3,0,1);
  const well=ctx.createRadialGradient(x,y,30,x,y,outer);well.addColorStop(0,'#05132b66');well.addColorStop(.35,'#174c6b18');well.addColorStop(1,'#3972e000');circle(x,y,outer,well);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=fade;
  // Contracting field contours make the direction of the quantum well visible at a glance.
  for(let i=0;i<4;i++){
   const u=(age*.62+i/4)%1,r=48+(outer-48)*Math.pow(1-u,1.35);
   ctx.globalAlpha=fade*Math.sin(u*Math.PI)*.45;ctx.strokeStyle=colors[i];ctx.lineWidth=1.5;
   ctx.beginPath();ctx.ellipse(x,y,r,r*.84,age*.12,0,TAU);ctx.stroke();
  }
  // Six coherent spirals carry light inward; older samples leave outward-facing tails.
  for(let arm=0;arm<6;arm++){
   const point=u=>{const r=28+(outer-28)*Math.pow(1-u,1.7),a=arm*TAU/6+u*1.3+age*.4;return {x:x+Math.cos(a)*r,y:y+Math.sin(a)*r};};
   ctx.globalAlpha=fade*.14;ctx.strokeStyle=colors[arm%3];ctx.lineWidth=1.2;ctx.beginPath();
   for(let j=0;j<=24;j++){const q=point(j/24);j?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);}ctx.stroke();
   for(let i=0;i<8;i++){
    const u=(age*.8+i/8+arm*.031)%1,q=point(u),tail=point(Math.max(0,u-.035)),alpha=Math.sin(u*Math.PI)*fade;
    ctx.globalAlpha=alpha*.65;ctx.lineWidth=2.2;ctx.strokeStyle=colors[arm%3];ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(q.x,q.y);ctx.stroke();
    ctx.globalAlpha=alpha;ctx.fillStyle=i%3?'#baf7ff':'#ffffff';ctx.fillRect(q.x-1.6,q.y-1.6,3.2,3.2);
   }
  }
  // Packets between the player and the well show the actual direction of the applied pull.
  const dx=x-run.p.x,dy=y-run.p.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
  if(d>55){
   for(const side of [-1,1]){
    ctx.globalAlpha=fade*.22;ctx.strokeStyle='#a5b4fc';ctx.lineWidth=1.5;ctx.beginPath();
    ctx.moveTo(run.p.x,run.p.y);ctx.quadraticCurveTo((x+run.p.x)/2-Math.sin(a)*side*40,(y+run.p.y)/2+Math.cos(a)*side*40,x,y);ctx.stroke();
   }
   for(let i=0;i<7;i++){
    const u=(age*1.2+i/7)%1,px=run.p.x+dx*u,py=run.p.y+dy*u;
    ctx.save();ctx.globalAlpha=fade*Math.sin(Math.PI*u)*.8;ctx.translate(px,py);ctx.rotate(a);ctx.strokeStyle='#c7faff';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-8,-4);ctx.lineTo(0,0);ctx.lineTo(-8,4);ctx.stroke();ctx.restore();
   }
   ctx.globalAlpha=fade*.4;ctx.lineWidth=1.5;circle(run.p.x,run.p.y,run.p.r+12+Math.sin(age*5)*2,'#a5d8ff',false);
  }
  ctx.globalAlpha=fade;ctx.save();ctx.translate(x,y);
  const glow=ctx.createRadialGradient(0,0,8,0,0,105);glow.addColorStop(0,'#e0fbff66');glow.addColorStop(.45,'#67e8f933');glow.addColorStop(1,'#a78bfa00');circle(0,0,105,glow);
  for(let i=0;i<3;i++){const a=-age*(1.2+i*.25)+i*TAU/3;ctx.strokeStyle=colors[i];ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,55+i*13,a,a+Math.PI*.9);ctx.stroke();}
  ctx.globalCompositeOperation='source-over';circle(0,0,27,'#071727dd');circle(0,0,28,'#baf5ff',false);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=charge;circle(0,0,22+charge*18,'#fff7b777');ctx.lineWidth=3;circle(0,0,100-charge*48,'#fff5d7',false);ctx.restore();
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillStyle='#c9faff';ctx.fillText('量子吸积 '+Math.max(0,f.pull.duration-age).toFixed(1)+'s · WASD抵抗',x,y-f.r-34);
 }else{
  const t=age-f.pull.duration,p=clamp(t/f.pulse.duration,0,1),r=f.pulseRadius??f.pulse.radius*p,fade=Math.min(1,(1-p)/.18),burst=Math.max(0,1-t/.42);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=fade;
  if(r>1){
   // The white leading rim and the cyan annulus follow the real expanding collision front.
   const band=ctx.createRadialGradient(x,y,Math.max(0,r-f.pulse.width),x,y,r+f.pulse.width*.5);
   band.addColorStop(0,'#38bdf800');band.addColorStop(.45,'#818cf82b');band.addColorStop(.8,'#67e8f9bb');band.addColorStop(1,'#67e8f900');
   circle(x,y,r+f.pulse.width*.5,band);ctx.lineWidth=3.5;circle(x,y,r,'#dcfcff',false);
   ctx.globalAlpha=fade*.52;ctx.lineWidth=2;circle(x,y,Math.max(0,r-22),'#c4b5fd',false);
   ctx.globalAlpha=fade*.24;ctx.lineWidth=1.5;circle(x,y,r*.79,'#67e8f9',false);
   for(let i=0;i<36;i++){
    const a=i*TAU/36+Math.sin(i*4.7)*.025,dx=Math.cos(a),dy=Math.sin(a),tip=r+8*Math.sin(i*2.3+t*6);
    ctx.globalAlpha=fade*(i%3?.55:.85);ctx.strokeStyle=colors[i%3];ctx.lineWidth=i%3?1.4:2.5;
    ctx.beginPath();ctx.moveTo(x+dx*(tip-18),y+dy*(tip-18));ctx.lineTo(x+dx*tip-dy*4,y+dy*tip+dx*4);ctx.lineTo(x+dx*(tip+9),y+dy*(tip+9));ctx.stroke();
   }
  }
  if(burst>0){
   ctx.globalAlpha=burst*.7;const flash=ctx.createRadialGradient(x,y,0,x,y,130);flash.addColorStop(0,'#ffffffcc');flash.addColorStop(.3,'#9efaff66');flash.addColorStop(1,'#67e8f900');circle(x,y,130,flash);
   ctx.globalAlpha=burst;ctx.lineWidth=2;circle(x,y,35+(1-burst)*90,'#fff2c6',false);
  }
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e0faff';ctx.fillText('量子释能 · 震荡扩散',x,y-f.r-34);
 }
 ctx.restore();
}
function drawHubFields(){
 for(const e of run.enemies){if(e.behavior!=='harmonist'||e.hp<=0)continue;for(const id of e.hubLinks||[]){const ally=run.enemies.find(o=>o.id===id&&o.hp>0);if(!ally)continue;const p1={x:e.x,y:e.y-28},p2={x:ally.x,y:ally.y-18};labSegment({...p1,x2:p2.x,y2:p2.y},'rgba(254,240,138,0.25)',8);labSegment({...p1,x2:p2.x,y2:p2.y},'#fde047',2.5);const d=Math.hypot(p2.x-p1.x,p2.y-p1.y)||1;for(let k=0;k<3;k++){const t=((run.time*260+k*(d/3))%d)/d;const px=p1.x+(p2.x-p1.x)*t,py=p1.y+(p2.y-p1.y)*t+Math.sin(run.time*12+k)*4;circle(px,py,3.5,'#ffffff');circle(px,py,6,'#fde04788',false);}}}
 for(const f of run.hubFields){ctx.save();const age=f.max-f.life;
  if(f.kind==='quantum'||f.kind==='annihilation')drawHubAnnihilation(f);
  if(f.kind==='prism'){for(const a of f.angles){hubRay(f,a,'#75eaff55',f.r*3);hubRay(f,a,'#d6ffff',f.r*1.4);hubRay(f,a,'#ffffff',3);}}
  if(f.kind==='wall'){for(const line of f.segments){labSegment(line,'#8dc5ff33',20);labSegment(line,'#b6e4ffee',5);}ctx.font='12px sans-serif';ctx.fillStyle='#cde7ff';ctx.fillText('定空障壁 '+f.life.toFixed(1)+'s',f.x-40,f.y-25);}
  if(f.kind==='trace'){circle(f.x,f.y,f.r,'#ce8aff66');circle(f.x,f.y,f.r*(1+age),'#ecd4ff',false);}
  if(f.kind==='plasma'){circle(f.x,f.y,f.r,'#bc77ed44');ctx.lineWidth=2;circle(f.x,f.y,f.r,'#e8b3ff99',false);for(let i=0;i<5;i++){const a=run.time*2+i*TAU/5;circle(f.x+Math.cos(a)*f.r*.55,f.y+Math.sin(a)*f.r*.55,5,'#eecaff88');}}
  if(f.kind==='aegis'){
   const points=6;const outerR=f.r*1.12;
   ctx.save();ctx.translate(f.x,f.y);
   const rot=run.time*0.5;ctx.rotate(rot);
   ctx.fillStyle='rgba(34,211,238,0.12)';
   ctx.strokeStyle='#38bdf8';ctx.lineWidth=2.5;
   ctx.beginPath();
   for(let i=0;i<points;i++){
    const a=i*TAU/points;
    i?ctx.lineTo(Math.cos(a)*outerR,Math.sin(a)*outerR):ctx.moveTo(Math.cos(a)*outerR,Math.sin(a)*outerR);
   }
   ctx.closePath();ctx.fill();ctx.stroke();
   ctx.rotate(-rot*2);ctx.strokeStyle='rgba(250,204,21,0.7)';ctx.lineWidth=1.5;
   ctx.beginPath();
   for(let i=0;i<points;i++){
    const a=i*TAU/points;
    i?ctx.lineTo(Math.cos(a)*f.r*0.75,Math.sin(a)*f.r*0.75):ctx.moveTo(Math.cos(a)*f.r*0.75,Math.sin(a)*f.r*0.75);
   }
   ctx.closePath();ctx.stroke();
   ctx.restore();
   ctx.font='bold 12px sans-serif';ctx.fillStyle='#d6ffff';ctx.textAlign='center';ctx.fillText('引力透镜·时空吸积盾 '+f.life.toFixed(1)+'s',f.x,f.y-f.r-16);
  }
  if(f.kind==='aegis'&&f.pull)drawHubQuantumPull(f);
  if(f.kind==='spiritThunder'||f.kind==='orbital')drawHubLightning(f);
  if(f.kind==='sweep')drawHubSweep(f);
  if(f.kind==='rushSlash'){
   ctx.globalAlpha=Math.max(0,1-age/f.max);
   hubSlashSector(f,'rgba(250,204,21,0.35)','#fef08a');
   ctx.strokeStyle='#ffffff';ctx.lineWidth=24;
   ctx.beginPath();ctx.arc(f.x,f.y,f.r*0.88,f.angle-f.spread,f.angle-f.spread+2*f.spread*Math.min(1,age/f.max));ctx.stroke();
   ctx.strokeStyle='#c084fc';ctx.lineWidth=6;
   ctx.beginPath();ctx.arc(f.x,f.y,f.r*0.96,f.angle-f.spread,f.angle-f.spread+2*f.spread*Math.min(1,age/f.max));ctx.stroke();
  }
  if(f.kind==='rush'){
   labSegment({x:f.x,y:f.y,x2:f.x2,y2:f.y2},'rgba(56,189,248,0.4)',f.r*1.8);
   labSegment({x:f.x,y:f.y,x2:f.x2,y2:f.y2},'#ffffff',4);
   circle(f.x,f.y,36,'rgba(192,132,252,0.5)',false);
   circle(f.x2,f.y2,28,'rgba(56,189,248,0.7)',false);
  }
 ctx.restore();}
}
function skyLine(h,color,width){labSegment({x:h.x,y:h.y,x2:h.x+Math.cos(h.angle)*h.length,y2:h.y+Math.sin(h.angle)*h.length},color,width);}
function skyCone(h,color,outline){const half=h.halfAngle??.65,radius=h.length??h.r;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.arc(h.x,h.y,radius,h.angle-half,h.angle+half);ctx.closePath();ctx.fill();if(outline){ctx.strokeStyle=outline;ctx.lineWidth=2;ctx.stroke();}}
function skySeal(x,y,r,color,spin=0){ctx.save();ctx.translate(x,y);ctx.rotate(spin);ctx.strokeStyle=color;ctx.lineWidth=2;circle(0,0,r,color,false);circle(0,0,r*.83,color,false);for(let i=0;i<8;i++){ctx.save();ctx.rotate(i*TAU/8);for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(r*.62+k*4,-7);ctx.lineTo(r*.62+k*4,7);ctx.stroke();}ctx.restore();}ctx.restore();}
function drawSkyRiftWarning(h){
 ctx.save();
 const half=h.halfAngle??(Math.PI/24);
 const len=Math.min(h.length??3200,2400);
 const progress=Math.min(1,Math.max(0,1-(h.t/(h.total||0.8))));

 ctx.fillStyle='rgba(168,85,247,0.08)';
 ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.arc(h.x,h.y,len,h.angle-half,h.angle+half);ctx.closePath();ctx.fill();

 const sweepR=Math.min(len,180+progress*(len-180));
 ctx.fillStyle='rgba(56,189,248,0.13)';
 ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.arc(h.x,h.y,sweepR,h.angle-half,h.angle+half);ctx.closePath();ctx.fill();

 ctx.strokeStyle='rgba(192,132,252,0.38)';ctx.lineWidth=1.5;
 for(let r=250;r<=Math.min(len,1600);r+=300){
  ctx.beginPath();ctx.arc(h.x,h.y,r,h.angle-half,h.angle+half);ctx.stroke();
 }

 for(const side of [-1,1]){
  const a=h.angle+side*half;
  ctx.save();
  ctx.strokeStyle='#c084fc';ctx.lineWidth=2.5;
  ctx.setLineDash([12,8]);ctx.lineDashOffset=-run.time*45;
  ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(h.x+Math.cos(a)*len,h.y+Math.sin(a)*len);ctx.stroke();
  ctx.restore();
 }

 const sweepA=h.angle+Math.sin(run.time*12)*half*0.92;
 ctx.save();
 ctx.strokeStyle='rgba(56,189,248,0.7)';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(h.x+Math.cos(sweepA)*len,h.y+Math.sin(sweepA)*len);ctx.stroke();
 ctx.restore();

 ctx.save();ctx.translate(h.x,h.y);ctx.rotate(run.time*3);
 ctx.strokeStyle='#38bdf8';ctx.lineWidth=2;ctx.strokeRect(-18,-18,36,36);ctx.restore();

 ctx.font='bold 13px sans-serif';ctx.textAlign='center';
 ctx.fillStyle='#f3e8ff';ctx.shadowColor='#a855f7';ctx.shadowBlur=6;
 ctx.fillText('◬ 扇形量子激光锁定 · 15° · ['+(h.shot||1)+'/3] ◬',h.x,h.y-30);
 ctx.restore();
}

function drawSkyRiftLaser(f,age){
 ctx.save();
 const half=f.halfAngle??(Math.PI/24);
 const len=Math.min(f.length??3200,2400);
 const fade=Math.min(1,f.life/0.08)*Math.min(1,age/0.04);
 ctx.globalAlpha=fade;

 ctx.save();
 const radGrad=ctx.createRadialGradient(f.x,f.y,20,f.x,f.y,Math.min(len,1600));
 radGrad.addColorStop(0,'rgba(192,132,252,0.32)');
 radGrad.addColorStop(0.3,'rgba(56,189,248,0.18)');
 radGrad.addColorStop(0.7,'rgba(168,85,247,0.08)');
 radGrad.addColorStop(1,'transparent');
 ctx.fillStyle=radGrad;
 ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.arc(f.x,f.y,len,f.angle-half,f.angle+half);ctx.closePath();ctx.fill();

 ctx.lineWidth=1.8;
 for(let r=70;r<Math.min(len,1800);r+=70){
  const sweepR=r+((run.time*2600)%70);
  ctx.strokeStyle='rgba(125,211,252,0.38)';
  ctx.beginPath();
  ctx.arc(f.x,f.y,sweepR,f.angle-half,f.angle+half);
  ctx.stroke();
 }
 ctx.restore();

 for(const r of [240,520,880,1350,1900]){
  if(r>len)break;
  ctx.strokeStyle='rgba(233,213,255,0.55)';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.arc(f.x,f.y,r,f.angle-half,f.angle+half);
  ctx.stroke();

  for(const norm of [-1,-0.5,0,0.5,1]){
   const a=f.angle+norm*half;
   const px=f.x+Math.cos(a)*r, py=f.y+Math.sin(a)*r;
   ctx.fillStyle='#ffffff';
   ctx.fillRect(px-2.5,py-2.5,5,5);
  }
 }

 for(let k=-3;k<=3;k++){
  const norm=k/3;
  const rayA=f.angle+norm*half;
  const rayCos=Math.cos(rayA), raySin=Math.sin(rayA);
  const isCenter=k===0;
  const isBound=Math.abs(k)===3;

  ctx.strokeStyle=isCenter?'rgba(168,85,247,0.45)':isBound?'rgba(56,189,248,0.45)':'rgba(192,132,252,0.3)';
  ctx.lineWidth=isCenter?28:isBound?14:16;
  ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x+rayCos*len,f.y+raySin*len);ctx.stroke();

  ctx.strokeStyle=isCenter?'#c084fc':isBound?'#38bdf8':'#7dd3fc';
  ctx.lineWidth=isCenter?12:isBound?5:7;
  ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x+rayCos*len,f.y+raySin*len);ctx.stroke();

  ctx.strokeStyle='#ffffff';
  ctx.lineWidth=isCenter?4:2;
  ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x+rayCos*len,f.y+raySin*len);ctx.stroke();

  for(let p=0;p<4;p++){
   const pDist=(p*480+(run.time*2800+Math.abs(k)*140))%Math.min(len,2200);
   const px=f.x+rayCos*pDist, py=f.y+raySin*pDist;
   ctx.save();
   ctx.translate(px,py);
   ctx.rotate(rayA);
   ctx.fillStyle='#ffffff';
   ctx.fillRect(-14,-2.5,28,5);
   ctx.fillStyle=isBound?'#38bdf8':'#e9d5ff';
   ctx.fillRect(-20,-4,40,8);
   ctx.restore();
  }
 }

 for(let i=1;i<=8;i++){
  const d=i*190;
  if(d>len)break;
  const k1=((i*3)%6)-3;
  const k2=k1+(i%2===0?1:-1);
  const a1=f.angle+(k1/3)*half;
  const a2=f.angle+(k2/3)*half;
  const x1=f.x+Math.cos(a1)*d, y1=f.y+Math.sin(a1)*d;
  const x2=f.x+Math.cos(a2)*d, y2=f.y+Math.sin(a2)*d;
  const jitter=Math.sin(run.time*30+i*5)*14;
  const midX=(x1+x2)*0.5+Math.cos(f.angle+Math.PI/2)*jitter;
  const midY=(y1+y2)*0.5+Math.sin(f.angle+Math.PI/2)*jitter;
  ctx.strokeStyle=i%2?'#e9d5ff':'#bae6fd';
  ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(midX,midY);ctx.lineTo(x2,y2);ctx.stroke();
 }

 ctx.save();
 ctx.translate(f.x,f.y);
 ctx.save();
 ctx.rotate(-run.time*4);
 ctx.strokeStyle='#c084fc';ctx.lineWidth=2.5;
 circle(0,0,38,'#c084fc',false);
 for(let b=0;b<6;b++){
  const ba=b*TAU/6;
  ctx.beginPath();ctx.moveTo(Math.cos(ba)*32,Math.sin(ba)*32);ctx.lineTo(Math.cos(ba)*44,Math.sin(ba)*44);ctx.stroke();
 }
 ctx.restore();

 ctx.save();
 ctx.rotate(f.angle);
 ctx.fillStyle='rgba(168,85,247,0.4)';ctx.fillRect(-130,-14,260,28);
 ctx.fillStyle='rgba(56,189,248,0.6)';ctx.fillRect(-90,-8,180,16);
 ctx.fillStyle='#ffffff';ctx.fillRect(-70,-3,140,6);
 ctx.fillStyle='rgba(192,132,252,0.5)';ctx.fillRect(-6,-60,12,120);
 ctx.fillStyle='#ffffff';ctx.fillRect(-2.5,-45,5,90);
 ctx.restore();

 circle(0,0,22,'#ffffff');
 circle(0,0,32,'rgba(56,189,248,0.7)',false);
 ctx.restore();

 ctx.restore();
}
function drawSkyWarning(h){ctx.save();ctx.setLineDash([9,7]);
 if(h.type==='rift'){drawSkyRiftWarning(h);return;}
 else if(h.type==='thrust'){
  skyLine(h,'#79e8ef55',h.r*2);skyLine(h,'#c8ffffbb',2);circle(h.targetX,h.targetY,36,'#9efaff88',false);
 }
 else if(h.type==='thrustSlash'){skyCone({...h,halfAngle:h.spread},'#93e9f22b','#caffffbb');}
 else if(h.type==='dash'){
  skyLine(h,'rgba(34,211,238,0.25)',h.r*3.2);
  skyLine(h,'#38bdf8bb',h.r*1.6);
  skyLine(h,'#ffffff',3);
  const total=Math.min(h.length||320,600);
  for(let d=60;d<total;d+=70){
   const px=h.x+Math.cos(h.angle)*d, py=h.y+Math.sin(h.angle)*d;
   ctx.save();ctx.translate(px,py);ctx.rotate(h.angle);
   ctx.strokeStyle='#7dd3fc';ctx.lineWidth=2.5;ctx.setLineDash([]);
   ctx.beginPath();ctx.moveTo(-10,-12);ctx.lineTo(8,0);ctx.lineTo(-10,12);ctx.stroke();
   ctx.restore();
  }
 }
 else if(h.type==='beam')skyLine(h,'#e6baff88',h.r*2);
 else if(h.type==='breath'){
  skyCone(h,'rgba(56,189,248,0.22)');
  for(let k=0;k<6;k++){
   const a=h.angle+(k-2.5)*0.2;
   const dist=((run.time*300+k*60)%h.r);
   circle(h.x+Math.cos(a)*dist,h.y+Math.sin(a)*dist,4,'#a5f3fcbb');
  }
 }
 else if(h.type==='thunder'){
  circle(h.x,h.y,h.r,'rgba(192,132,252,0.22)');
  ctx.lineWidth=2.5;circle(h.x,h.y,h.r,'#c084fcee',false);
  skySeal(h.x,h.y,h.r*0.75,'#e9d5ff',run.time*2);
 }
 else{circle(h.x,h.y,h.r,'#b98aff16');ctx.lineWidth=2;circle(h.x,h.y,h.r,'#e7c6ffbb',false);}
 ctx.setLineDash([]);const names={warp:'折跃落点',ambush:'裂空突袭',breath:'量子吐息',veil:'即将虚化',thunder:'神雷锁定',dash:'白虎连突',rift:'扇形量子激光 · 15° · '+(h.shot||1)+'/3',beam:'量子主射线',pulsewave:'三重八卦震荡',shield:'莲花护盾 · 固定5秒',thrust:'追踪突刺 · 蓄力0.8秒',thrustSlash:'近身斩击 · 蓄力0.8秒'};ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f8e4ba';ctx.fillText(names[h.type]||h.type,h.x,h.y-20);ctx.restore();}
function drawQuantumTower(tower, targetX, targetY, idx, progress, time){
 ctx.save();
 const tx=tower.x, ty=tower.y;
 
 // 1. Ground Energy Array (八卦灵枢基底)
 const arrayR=52;
 ctx.save();
 ctx.translate(tx,ty);
 ctx.scale(1,0.52);
 ctx.strokeStyle='rgba(34,211,238,0.32)';ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(0,0,arrayR,0,TAU);ctx.stroke();
 ctx.strokeStyle='rgba(168,85,247,0.48)';ctx.lineWidth=2;ctx.setLineDash([8,6]);
 ctx.save();ctx.rotate(time*1.2+idx);
 ctx.beginPath();ctx.arc(0,0,arrayR-8,0,TAU);ctx.stroke();
 for(let k=0;k<4;k++){
  const a=k*Math.PI/2;
  ctx.fillStyle='#38bdf8';circle(Math.cos(a)*(arrayR-8),Math.sin(a)*(arrayR-8),3);
 }
 ctx.restore();ctx.setLineDash([]);
 ctx.restore();

 // 2. Stepped Metallic Cyber-Bronze Pedestal (八角重型台座)
 ctx.fillStyle='#09131f';ctx.fillRect(tx-32,ty-10,64,20);
 ctx.strokeStyle='#0e7490';ctx.lineWidth=2;ctx.strokeRect(tx-32,ty-10,64,20);
 for(const bx of [-26, 26]){
  circle(tx+bx,ty,4,'#06b6d4');
  circle(tx+bx,ty,1.8,'#ffffff');
 }
 ctx.fillStyle='#132738';ctx.fillRect(tx-22,ty-24,44,14);
 ctx.strokeStyle='#22d3ee';ctx.lineWidth=2;ctx.strokeRect(tx-22,ty-24,44,14);

 // 3. Twin Magnetic Pylon Columns (双重磁悬浮方尖碑外骨骼)
 const colH=68;
 for(const side of [-1, 1]){
  const cx=tx+side*18, topX=tx+side*12;
  ctx.save();
  ctx.fillStyle='#0f172a';
  ctx.beginPath();
  ctx.moveTo(cx-6,ty-24);ctx.lineTo(topX-4,ty-24-colH);
  ctx.lineTo(topX+4,ty-24-colH);ctx.lineTo(cx+6,ty-24);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='#14b8a6';ctx.lineWidth=1.5;ctx.stroke();

  // Cyan vertical power conduit
  ctx.strokeStyle='#38bdf8';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(cx,ty-24);ctx.lineTo(topX,ty-24-colH);ctx.stroke();

  // Tiered copper magnetic induction coils
  for(let c=1;c<=4;c++){
   const coilY=ty-24-(colH*c/5);
   const colW=12-c*1.2;
   const pulse=(Math.sin(time*8+c*1.5)+1)*0.5;
   ctx.fillStyle=pulse>0.5?'#38bdf8':'#0284c7';
   ctx.fillRect(topX+(cx-topX)*(1-c/5)-colW/2,coilY-2,colW,4);
  }
  ctx.restore();
 }

 // 4. Floating Resonating Quantum Core (悬浮量子共鸣水晶)
 const coreY=ty-56+Math.sin(time*4.5+idx*1.5)*5;
 ctx.save();
 const radG=ctx.createRadialGradient(tx,coreY,2,tx,coreY,32);
 radG.addColorStop(0,'rgba(255,255,255,0.95)');
 radG.addColorStop(0.35,'rgba(34,211,238,0.6)');
 radG.addColorStop(0.7,'rgba(168,85,247,0.3)');
 radG.addColorStop(1,'rgba(168,85,247,0)');
 ctx.fillStyle=radG;
 ctx.beginPath();ctx.arc(tx,coreY,32,0,TAU);ctx.fill();

 // Octahedron / Diamond facet geometry
 const rot=time*2.2+idx;
 const cw=12+Math.abs(Math.sin(rot))*4, ch=22;
 ctx.fillStyle='#a5f3fc';ctx.beginPath();ctx.moveTo(tx,coreY-ch);ctx.lineTo(tx-cw,coreY);ctx.lineTo(tx,coreY+3);ctx.closePath();ctx.fill();
 ctx.fillStyle='#38bdf8';ctx.beginPath();ctx.moveTo(tx,coreY-ch);ctx.lineTo(tx+cw,coreY);ctx.lineTo(tx,coreY+3);ctx.closePath();ctx.fill();
 ctx.fillStyle='#0284c7';ctx.beginPath();ctx.moveTo(tx,coreY+ch);ctx.lineTo(tx-cw,coreY);ctx.lineTo(tx,coreY+3);ctx.closePath();ctx.fill();
 ctx.fillStyle='#0369a1';ctx.beginPath();ctx.moveTo(tx,coreY+ch);ctx.lineTo(tx+cw,coreY);ctx.lineTo(tx,coreY+3);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(tx,coreY-ch+4);ctx.lineTo(tx,coreY+ch-4);ctx.stroke();

 // Rotating orbital quantum ring
 ctx.save();
 ctx.translate(tx,coreY);
 ctx.rotate(time*3.5+idx);
 ctx.strokeStyle='#e0f2fe';ctx.lineWidth=1.8;
 ctx.beginPath();ctx.ellipse(0,0,24,7,time*2,0,TAU);ctx.stroke();
 ctx.restore();

 // Electric jumping sparks
 if((Math.floor(time*20+idx)%3)===0){
  const side=Math.random()>0.5?1:-1;
  ctx.strokeStyle='#e0f2fe';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(tx+side*14,ty-52);
  ctx.lineTo(tx+side*6,coreY+(Math.random()-0.5)*10);
  ctx.lineTo(tx,coreY);ctx.stroke();
 }
 ctx.restore();

 // 5. Emitter Apex & Focusing Horn (引雷顶冠与光能喷口)
 const apexY=ty-96;
 ctx.save();
 ctx.fillStyle='#0f172a';
 ctx.beginPath();
 ctx.moveTo(tx-12,ty-90);ctx.lineTo(tx,apexY);ctx.lineTo(tx+12,ty-90);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#38bdf8';ctx.lineWidth=2;ctx.stroke();
 circle(tx,apexY,7,'#38bdf8');
 circle(tx,apexY,4,'#ffffff');
 ctx.restore();

 // 6. Holographic Display Tag (全息战术标牌)
 ctx.font='bold 11px monospace';ctx.textAlign='center';
 ctx.fillStyle='#bae6fd';
 ctx.shadowBlur=6;ctx.shadowColor='#0284c7';
 ctx.fillText('◆ TOWER-0'+(idx+1)+' ◆',tx,ty-108);
 ctx.font='9px sans-serif';ctx.fillStyle='#67e8f9';
 ctx.fillText('量子共振率 100%',tx,ty-120);
 ctx.shadowBlur=0;
 ctx.restore();
}

function drawSkyFields(){for(const f of run.skyFields){ctx.save();const age=f.max-f.life;
 if(f.kind==='discs'){
  ctx.translate(f.x,f.y);ctx.rotate(run.time*12);ctx.lineWidth=3;
  circle(0,0,22,f.returning?'#a7b6d0':'#8df9ff',false);circle(0,0,8,'#efffff');
  for(let i=0;i<3;i++){ctx.rotate(TAU/3);ctx.fillStyle=f.returning?'#9aacc9':'#63d5ff';ctx.beginPath();ctx.moveTo(8,-5);ctx.lineTo(29,0);ctx.lineTo(12,9);ctx.closePath();ctx.fill();}
 }
 if(f.kind==='oscillator'){
  const radius=f.armed?f.r:D.skyBoss.oscillatorTrigger;
  ctx.setLineDash(f.armed?[]:[8,8]);ctx.lineWidth=2;circle(f.x,f.y,radius,f.armed?'#f7bdffbb':'#7eeaff66',false);ctx.setLineDash([]);
  if(f.armed)circle(f.x,f.y,f.r*(1-f.warning/D.skyBoss.oscillatorWarn),'#b4c6ff44');
  circle(f.x,f.y,25,'#122e49');circle(f.x,f.y,25,'#9eeaff',false);circle(f.x,f.y,11,'#d1fbff');
  ctx.translate(f.x,f.y);ctx.rotate(run.time*1.8);ctx.strokeStyle='#83dbff';ctx.lineWidth=3;ctx.strokeRect(-18,-18,36,36);
 }

 if(f.kind==='transfer'){
  // Render four high-tech quantum towers with energy beams and inflow particles
  for(let i=0;i<f.towers.length;i++){
   const tower=f.towers[i];
   drawQuantumTower(tower, f.x, f.y, i, age/f.max, run.time);

   const ax=tower.x, ay=tower.y-96;
   const dx=f.x-ax, dy=f.y-ay;
   const dist=Math.hypot(dx,dy), angle=Math.atan2(dy,dx);

   // Multi-layer Quantum Conduit Beam
   ctx.save();
   ctx.strokeStyle='rgba(56, 189, 248, 0.22)';ctx.lineWidth=20;
   ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(f.x,f.y);ctx.stroke();
   ctx.strokeStyle='#22d3ee';ctx.lineWidth=6;
   ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(f.x,f.y);ctx.stroke();
   ctx.strokeStyle='#ffffff';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(f.x,f.y);ctx.stroke();
   ctx.restore();

   // Inflowing Energy Packets (逆流高速能量环)
   ctx.save();
   for(let p=0;p<6;p++){
    const travel=((run.time*550 + p*(dist/6))%dist);
    const px=ax+Math.cos(angle)*travel, py=ay+Math.sin(angle)*travel;
    ctx.save();
    ctx.translate(px,py);ctx.rotate(angle+Math.PI/2);
    ctx.strokeStyle='#ffffff';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(0,0,16,5,0,0,TAU);ctx.stroke();
    ctx.strokeStyle='#7dd3fc';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(0,0,24,8,0,0,TAU);ctx.stroke();
    ctx.restore();
   }
   // Inflow Sparkle Particles (逆流能量星屑)
   for(let j=0;j<5;j++){
    const travel=((run.time*320 + j*(dist/5) + i*77)%dist);
    const wave=Math.sin(run.time*18+j+i)*12;
    const px=ax+Math.cos(angle)*travel - Math.sin(angle)*wave;
    const py=ay+Math.sin(angle)*travel + Math.cos(angle)*wave;
    ctx.fillStyle='#f0fdf4';
    ctx.fillRect(px-2,py-2,4,4);
   }
   ctx.restore();
  }

  // Tianzun Central Absorption Vortex & Invincible Shield
  ctx.save();
  const vR=105;
  for(let w=0;w<3;w++){
   const wr=((1 - ((run.time*1.8 + w*0.33)%1))*vR);
   ctx.strokeStyle='#38bdf888';ctx.lineWidth=3;
   ctx.beginPath();ctx.arc(f.x,f.y,wr,0,TAU);ctx.stroke();
  }
  ctx.save();
  ctx.translate(f.x,f.y);
  ctx.rotate(-run.time*4.5);
  ctx.strokeStyle='rgba(168, 85, 247, 0.7)';ctx.lineWidth=3;
  for(let a=0;a<4;a++){
   ctx.rotate(Math.PI/2);
   ctx.beginPath();
   for(let r=10;r<=vR;r+=10){
    const th=r*0.04;
    const sx=Math.cos(th)*r, sy=Math.sin(th)*r;
    if(r===10)ctx.moveTo(sx,sy);else ctx.lineTo(sx,sy);
   }
   ctx.stroke();
  }
  ctx.restore();

  circle(f.x,f.y,vR+15,'rgba(34,211,238,0.18)');
  ctx.strokeStyle='#7dd3fc';ctx.lineWidth=4;ctx.setLineDash([16,10]);
  ctx.beginPath();ctx.arc(f.x,f.y,vR+15,0,TAU);ctx.stroke();ctx.setLineDash([]);
  circle(f.x,f.y,vR+8,'rgba(254,240,138,0.25)',false);

  ctx.save();
  ctx.shadowBlur=38;ctx.shadowColor='#38bdf8';
  circle(f.x,f.y,48,'rgba(224,242,254,0.85)');
  circle(f.x,f.y,28,'#ffffff');
  ctx.restore();

  const cd=f.life.toFixed(1);
  ctx.font='bold 18px sans-serif';ctx.textAlign='center';
  ctx.fillStyle='#fee2e2';ctx.shadowBlur=12;ctx.shadowColor='#ef4444';
  ctx.fillText('⚠ 量子终极传输 · '+cd+'s · 倒计时结束释放全场200伤害 ⚠',f.x,f.y-145);
  ctx.font='bold 14px sans-serif';ctx.fillStyle='#a5f3fc';ctx.shadowColor='#0284c7';
  ctx.fillText('【四角量子传输塔供能中 · 天尊绝对无敌】',f.x,f.y+vR+36);
  ctx.restore();
 }
 if(f.kind==='breath')drawSpecialConeField(f,false);
 if(f.kind==='rift'){
  drawSkyRiftLaser(f,age);
 }
 if(f.kind==='beam'){
  skyLine(f,'rgba(56,189,248,0.28)',f.r*2.8);
  skyLine(f,'rgba(168,85,247,0.38)',f.r*2.2);
  skyLine(f,'#38bdf8',32);
  skyLine(f,'#7dd3fc',18);
  skyLine(f,'#ffffff',8);
  const totalLen=Math.min(f.length,2600);
  for(let side of [-1, 1]){
   ctx.strokeStyle=side>0?'#bae6fd':'#e9d5ff';ctx.lineWidth=3;ctx.beginPath();
   for(let dist=0;dist<totalLen;dist+=30){
    const helixWave=Math.sin(dist*0.018+run.time*16)*26*side;
    const hx=f.x+Math.cos(f.angle)*dist-Math.sin(f.angle)*helixWave;
    const hy=f.y+Math.sin(f.angle)*dist+Math.cos(f.angle)*helixWave;
    if(dist===0)ctx.moveTo(hx,hy);else ctx.lineTo(hx,hy);
   }
   ctx.stroke();
  }
  ctx.save();ctx.shadowBlur=32;ctx.shadowColor='#38bdf8';
  circle(f.x,f.y,44,'#e0f2fe');circle(f.x,f.y,26,'#ffffff');ctx.restore();
 }
 if(f.kind==='thunder')drawHubLightning({...f,kind:'spiritThunder'});
 if(f.kind==='pulsewave'){
  for(let i=0;i<3;i++){
   const r=(age-i*0.55)*210;
   if(r>0&&r<480){
    ctx.lineWidth=8;circle(f.x,f.y,r,'rgba(251,191,36,0.75)',false);
    ctx.lineWidth=2.5;circle(f.x,f.y,r-4,'#fef08a',false);
    for(let k=0;k<8;k++){
     const ba=k*TAU/8+age*0.4;
     const bx=f.x+Math.cos(ba)*r, by=f.y+Math.sin(ba)*r;
     ctx.save();ctx.translate(bx,by);ctx.rotate(ba+Math.PI/2);
     ctx.strokeStyle='#fde047';ctx.lineWidth=2;
     for(let line=0;line<3;line++){
      const ly=(line-1)*5;
      if((k+line)%2===0){ctx.beginPath();ctx.moveTo(-10,ly);ctx.lineTo(10,ly);ctx.stroke();}
      else{ctx.beginPath();ctx.moveTo(-10,ly);ctx.lineTo(-2,ly);ctx.moveTo(2,ly);ctx.lineTo(10,ly);ctx.stroke();}
     }
     ctx.restore();
    }
    skySeal(f.x,f.y,r*0.8,'rgba(167,243,208,0.5)',age*0.3);
   }
  }
 }
 if(f.kind==='veil'){skySeal(f.x,f.y,22,'#cbb7ff44',run.time);}
 if(f.kind==='shield'){
  circle(f.x,f.y,92,'rgba(254,240,138,0.18)');
  skySeal(f.x,f.y,94,'#fde047',run.time*0.6);
  for(let i=0;i<8;i++){
   const a=i*TAU/8+run.time*0.5;
   ctx.save();ctx.translate(f.x+Math.cos(a)*80,f.y+Math.sin(a)*80);ctx.rotate(a);
   ctx.fillStyle='rgba(254,240,138,0.35)';ctx.beginPath();ctx.ellipse(0,0,26,13,0,0,TAU);ctx.fill();
   ctx.strokeStyle='#fef08a';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,24,11,0,0,TAU);ctx.stroke();
   ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(18,0);ctx.stroke();
   ctx.restore();
  }
  circle(f.x,f.y,86,'rgba(253,224,71,0.6)',false);
 }
 ctx.restore();}}


function drawAscensionAuras(){
 const p=run.p,t=run.time;ctx.save();
 if(run.hero.id==='gemini'&&run.trans('seeker'))for(let i=0;i<2;i++){const a=t*1.8+i*Math.PI;circle(p.x+Math.cos(a)*80,p.y+Math.sin(a)*80,12,'#b3a5ff66');circle(p.x+Math.cos(a)*80,p.y+Math.sin(a)*80,6,'#e7dcff');}
 if(run.hero.id==='gemini'&&run.trans('echo'))for(const side of [-1,1])sprite(ctx,heroAtlas,D.heroes.indexOf(run.hero),4,2,p.x+side*75,p.y-3,64,side<0,.3);
 if(run.hero.id==='gpt'&&run.trans('orbit')){ctx.lineWidth=2;circle(p.x,p.y,135,'#d6b5ff55',false);}
 if(run.hero.id==='glm'&&run.trans('orbit')){skySeal(p.x,p.y,40,run.ascClocks.royal?'#b5e4ff22':'#bbf0ffaa',t*.4);}
 if(run.singularity){const f=run.singularity;for(let i=0;i<4;i++){ctx.lineWidth=2;circle(f.x,f.y,35+((t*80+i*48)%195),'#85dfff55',false);}circle(f.x,f.y,25,'#223d76aa');circle(f.x,f.y,11,'#b6f5ff');}
 if(run.hero.id==='claude'&&run.trans('orbit'))for(let i=0;i<6;i++){const a=t*.8+i*TAU/6,x=p.x+Math.cos(a)*140,y=p.y+Math.sin(a)*140;for(let j=0;j<5;j++)circle(x+Math.cos(j*TAU/5)*7,y+Math.sin(j*TAU/5)*7,5,'#ffca8777');circle(x,y,4,'#fff4ae');}
 const shield=(run.dawnShield||0)+(run.bloodShield||0);if(shield>0){ctx.lineWidth=3;circle(p.x,p.y,33,run.hero.id==='grok'?'#ff6c8588':'#ffe7a288',false);ctx.fillStyle='#0d1329';ctx.fillRect(p.x-22,p.y+20,44,4);ctx.fillStyle=run.hero.id==='grok'?'#ff7c96':'#ffe0a3';ctx.fillRect(p.x-22,p.y+20,44*Math.min(1,shield/(p.maxHp*.6)),4);}
 if(run.frenzyTime>0){ctx.lineWidth=3;circle(p.x,p.y,38+Math.sin(t*16)*4,'#ff6e9588',false);}
 ctx.restore();
}

function bearClawShape(h,color,stroke=false){ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.arc(h.x,h.y,h.r,h.angle-h.spread,h.angle+h.spread);ctx.closePath();if(stroke){ctx.strokeStyle=color;ctx.stroke();}else{ctx.fillStyle=color;ctx.fill();}}

function drawBearBarrageWarning(h){
 ctx.save();ctx.translate(h.x,h.y);ctx.rotate(h.angle);
 const spread=0.85, progress=1-h.t/h.total;
 const grad=ctx.createRadialGradient(0,0,20,0,0,440);
 grad.addColorStop(0,'rgba(255,107,74,0.42)');
 grad.addColorStop(0.6,'rgba(174,122,255,0.22)');
 grad.addColorStop(1,'rgba(174,122,255,0.02)');
 ctx.fillStyle=grad;
 ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,440,-spread,spread);ctx.closePath();ctx.fill();
 ctx.lineWidth=3;ctx.strokeStyle='#d0abff';ctx.setLineDash([14,8]);ctx.stroke();ctx.setLineDash([]);
 for(let w=0;w<3;w++){
  const r=((progress*1.8+w*0.33)%1)*420+20;
  ctx.strokeStyle='#ff9b7488';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,0,r,-spread*0.9,spread*0.9);ctx.stroke();
 }
 for(let j=-2;j<=2;j++){
  const ang=j*spread*0.45+Math.sin(run.time*18+j)*0.03;
  ctx.strokeStyle='#ffd4ab99';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(35*Math.cos(ang),35*Math.sin(ang));ctx.lineTo(430*Math.cos(ang),430*Math.sin(ang));ctx.stroke();
 }
 ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffe2cf';
 ctx.fillText('⚠ 等离子弹幕轰炸 ⚠', 220, 0);
 ctx.restore();
}

function drawBearWarpWarning(h){
 ctx.save();const progress=1-h.t/h.total;
 const grad=ctx.createRadialGradient(h.x,h.y,4,h.x,h.y,h.r+22);
 grad.addColorStop(0,'rgba(15,0,32,0.92)');
 grad.addColorStop(0.5,'rgba(168,85,247,0.5)');
 grad.addColorStop(1,'rgba(168,85,247,0)');
 ctx.fillStyle=grad;ctx.beginPath();ctx.arc(h.x,h.y,h.r+22,0,TAU);ctx.fill();
 ctx.strokeStyle='#e9d5ff';ctx.lineWidth=2.5;
 ctx.save();ctx.translate(h.x,h.y);ctx.rotate(run.time*3.5);
 for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.arc(0,0,h.r*(0.5+0.5*progress),-0.45,0.45);ctx.stroke();}
 ctx.restore();
 const inR=Math.max(12,h.r*(1-progress*0.8));
 ctx.strokeStyle='#c084fc';ctx.lineWidth=3;ctx.beginPath();ctx.arc(h.x,h.y,inR,0,TAU);ctx.stroke();
 ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f5d0fe';
 ctx.fillText('相移折跃 · 警戒',h.x,h.y-h.r-12);
 ctx.restore();
}

function drawBearClawWarning(h){
 ctx.save();bearClawShape(h,'#b574fa28');ctx.lineWidth=3;ctx.setLineDash([12,8]);bearClawShape(h,'#d3b4ffbb',true);ctx.setLineDash([]);
 const progress=1-h.t/h.total;ctx.lineWidth=4;ctx.strokeStyle='#ecd5ff';
 ctx.beginPath();ctx.arc(h.x,h.y,65,h.angle-h.spread,h.angle-h.spread+2*h.spread*progress);ctx.stroke();
 for(let i=0;i<3;i++){
  const r=h.r*(0.54+i*0.2);
  ctx.strokeStyle='rgba(216,180,254,0.4)';ctx.lineWidth=2;ctx.setLineDash([8,6]);
  ctx.beginPath();ctx.arc(h.x,h.y,r,h.angle-h.spread,h.angle+h.spread);ctx.stroke();
 }
 ctx.setLineDash([]);
 ctx.fillStyle='#f0ddff';ctx.font='bold 15px sans-serif';ctx.textAlign='center';
 ctx.fillText(h.skill===1?'近身爪击 · 侧移躲避':'裂隙巨爪 · 躲到背后',h.x+Math.cos(h.angle)*h.r*.55,h.y+Math.sin(h.angle)*h.r*.55-25);
 ctx.restore();
}

function drawBearClawEffect(f){
 const progress=1-f.t/f.max;
 const sweepAng=f.angle-f.spread+2*f.spread*Math.min(1,progress*1.8);
 ctx.save();
 for(let i=0;i<3;i++){
  const r=f.r*(0.54+i*0.2);
  ctx.strokeStyle='rgba(147,51,234,0.48)';ctx.lineWidth=20*(1-progress);
  ctx.beginPath();ctx.arc(f.x,f.y,r,f.angle-f.spread,sweepAng);ctx.stroke();
  ctx.strokeStyle='#c084fc';ctx.lineWidth=8*(1-progress*0.6);
  ctx.beginPath();ctx.arc(f.x,f.y,r,f.angle-f.spread,sweepAng);ctx.stroke();
  ctx.strokeStyle='#ffffff';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.arc(f.x,f.y,r,f.angle-f.spread,sweepAng);ctx.stroke();
 }
 if(!visuals.reduced){
  for(let j=0;j<8;j++){
   const a=f.angle-f.spread+2*f.spread*(j/8);
   const r=f.r*(0.5+Math.random()*0.42);
   ctx.fillStyle='#f5d0fe';ctx.fillRect(f.x+Math.cos(a)*r-2,f.y+Math.sin(a)*r-2,4,4);
  }
 }
 ctx.restore();
}

function drawBearMissileHazard(h){
 ctx.save();const progress=1-h.t/h.total;
 const pulseR=h.r*(0.9+0.1*Math.sin(run.time*8));
 ctx.strokeStyle='#ef444499';ctx.lineWidth=2;ctx.setLineDash([12,8]);
 ctx.beginPath();ctx.arc(h.x,h.y,pulseR,0,TAU);ctx.stroke();
 ctx.setLineDash([]);
 for(let k=0;k<4;k++){
  const a=k*Math.PI/2+run.time*0.5;
  ctx.save();ctx.translate(h.x,h.y);ctx.rotate(a);
  ctx.strokeStyle='#f87171';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(h.r-15,0);ctx.lineTo(h.r+15,0);ctx.stroke();
  ctx.restore();
 }
 const cdR=Math.max(12,h.r*(1-progress));
 ctx.strokeStyle='#fee2e2';ctx.lineWidth=3.5;
 ctx.beginPath();ctx.arc(h.x,h.y,cdR,0,TAU);ctx.stroke();
 if(h.t<0.7){
  const drop=1-h.t/0.7;
  const rx=h.x+Math.cos(-Math.PI*0.75)*320*(1-drop);
  const ry=h.y+Math.sin(-Math.PI*0.75)*320*(1-drop);
  ctx.save();
  ctx.strokeStyle='#ff6b4a';ctx.lineWidth=6;
  ctx.beginPath();ctx.moveTo(rx-Math.cos(-Math.PI*0.75)*55,ry-Math.sin(-Math.PI*0.75)*55);ctx.lineTo(rx,ry);ctx.stroke();
  ctx.strokeStyle='#fff3c4';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(rx-Math.cos(-Math.PI*0.75)*35,ry-Math.sin(-Math.PI*0.75)*35);ctx.lineTo(rx,ry);ctx.stroke();
  ctx.restore();
 }
 ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fee2e2';
 ctx.fillText('⚠ 战术飞弹轰炸 · '+h.t.toFixed(1)+'s ⚠',h.x,h.y-h.r-14);
 ctx.restore();
}

function drawBearBarrageWarning(h){ctx.save();const progress=1-h.t/h.total;circle(h.x,h.y,h.r,'#a27de51c');ctx.lineWidth=2;ctx.setLineDash([9,7]);circle(h.x,h.y,h.r,'#d0b7ffbb',false);ctx.setLineDash([]);for(let i=0;i<32;i++){const a=h.angle+i*TAU/32;labSegment({x:h.x+Math.cos(a)*h.r*.78,y:h.y+Math.sin(a)*h.r*.78,x2:h.x+Math.cos(a)*h.r,y2:h.y+Math.sin(a)*h.r},'#e8d4ff99',2);}ctx.lineWidth=3;circle(h.x,h.y,40+progress*(h.r-40),'#c6a3ff88',false);ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f0ddff';ctx.fillText('360° 环形弹幕',h.x,h.y-200);ctx.restore();}

function drawBearChargeWarning(h){
 ctx.save();
 ctx.translate(h.x,h.y);
 ctx.rotate(h.angle);
 const length=h.length||600, half=h.r||45;
 const progress=Math.min(1,Math.max(0,1-h.t/h.total));
 const isCombo=!!h.combo;

 // 1. Charging lane floor glow with soft gradient
 const laneGrad=ctx.createLinearGradient(0,-half,0,half);
 laneGrad.addColorStop(0,'rgba(255,90,40,0.03)');
 laneGrad.addColorStop(0.25,'rgba(255,110,50,0.16)');
 laneGrad.addColorStop(0.5,'rgba(255,140,70,0.28)');
 laneGrad.addColorStop(0.75,'rgba(255,110,50,0.16)');
 laneGrad.addColorStop(1,'rgba(255,90,40,0.03)');
 ctx.fillStyle=laneGrad;
 ctx.fillRect(0,-half,length,half*2);

 // 2. Charging progress fill (expanding plasma flood from start to target)
 const fillGrad=ctx.createLinearGradient(0,0,length*progress,0);
 fillGrad.addColorStop(0,'rgba(255,140,50,0.35)');
 fillGrad.addColorStop(0.7,'rgba(255,100,40,0.25)');
 fillGrad.addColorStop(1,'rgba(255,220,150,0.65)');
 ctx.fillStyle=fillGrad;
 ctx.fillRect(0,-half*0.85,length*progress,half*1.7);

 // Wavefront line at charging front
 if(progress>0.02&&progress<0.99){
  ctx.save();
  ctx.strokeStyle='#fff4d6';
  ctx.lineWidth=4;
  ctx.shadowColor='#ff8d50';
  ctx.shadowBlur=10;
  ctx.beginPath();
  ctx.moveTo(length*progress,-half*0.9);
  ctx.lineTo(length*progress,half*0.9);
  ctx.stroke();
  ctx.restore();
 }

 // 3. Boundary laser rails with high-contrast energy dashes
 ctx.lineWidth=2.5;
 ctx.strokeStyle=isCombo?'#ffb066':'#ff8447';
 ctx.setLineDash([14,8]);
 ctx.lineDashOffset=-run.time*45;
 ctx.beginPath();
 ctx.moveTo(0,-half);ctx.lineTo(length,-half);
 ctx.moveTo(0,half);ctx.lineTo(length,half);
 ctx.stroke();
 ctx.setLineDash([]);

 // Subtle side teeth / hazard markers (///) along borders
 const step=40;
 ctx.strokeStyle='rgba(255,180,120,0.45)';
 ctx.lineWidth=1.5;
 ctx.beginPath();
 for(let x=20;x<length-20;x+=step){
  ctx.moveTo(x,-half);ctx.lineTo(x+14,-half+8);
  ctx.moveTo(x,half);ctx.lineTo(x+14,half-8);
 }
 ctx.stroke();

 // 4. Dynamic animated directional chevrons (>>>) sweeping forward
 const chevronSpacing=65;
 const chevronCount=Math.floor(length/chevronSpacing);
 const animOffset=((run.time*3.8)%1)*chevronSpacing;
 for(let i=0;i<chevronCount;i++){
  const cx=i*chevronSpacing+animOffset;
  if(cx>15&&cx<length-15){
   const alpha=Math.sin((cx/length)*Math.PI)*0.55+0.25;
   ctx.strokeStyle=`rgba(255,235,190,${alpha})`;
   ctx.lineWidth=2.5;
   ctx.beginPath();
   ctx.moveTo(cx-12,-half*0.4);
   ctx.lineTo(cx+4,0);
   ctx.lineTo(cx-12,half*0.4);
   ctx.stroke();
  }
 }

 // 5. Claw gouge marks at the origin
 ctx.save();
 for(let j=-2;j<=2;j++){
  const cy=j*(half*0.32);
  ctx.strokeStyle='rgba(255,130,50,0.55)';
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(-15,cy);
  ctx.lineTo(35+Math.abs(j)*8,cy);
  ctx.stroke();
 }
 ctx.restore();

 // 6. End-point impact zone crosshairs
 ctx.save();
 ctx.translate(length,0);
 ctx.strokeStyle='#ff6b4a';
 ctx.lineWidth=3;
 ctx.beginPath();
 ctx.arc(0,0,half*0.75,-Math.PI*0.5,Math.PI*0.5);
 ctx.stroke();
 ctx.beginPath();
 ctx.moveTo(-half*0.35,-half*0.45);ctx.lineTo(half*0.2,0);ctx.lineTo(-half*0.35,half*0.45);
 ctx.stroke();
 ctx.restore();

 // 7. Combat warning text plate
 ctx.save();
 const badgeText=isCombo?`⚡ 狂暴冲撞 [${h.combo}/${h.comboTotal}] · 侧移翻滚 ⚡`:'⚡ 裂隙重装冲撞 · 侧移规避 ⚡';
 ctx.font='bold 14px sans-serif';
 ctx.textAlign='center';
 ctx.textBaseline='bottom';
 ctx.fillStyle='#ffe8d6';
 ctx.fillText(badgeText,length*0.45,-half-8);
 ctx.restore();

 ctx.restore();
}

function drawBearRushEffects(e,size,anim){
 if(!e||e.behavior!=='bear'||e.hp<=0||e.dead)return;

 // Maintain afterimages buffer
 e.rushTrail=e.rushTrail||[];
 if(e.chargeTime>0){
  e.rushTrail.push({
   x:e.x,y:e.y,
   bob:anim.bob,tilt:anim.tilt,scaleX:anim.scaleX,scaleY:anim.scaleY,flip:anim.flip,
   t:run.time
  });
  if(e.rushTrail.length>5)e.rushTrail.shift();
 }else if(e.rushTrail.length>0){
  e.rushTrail.shift();
 }

 // 1. Render motion afterimages behind the boss
 if(e.rushTrail.length>0){
  const count=e.rushTrail.length;
  for(let i=0;i<count-1;i++){
   const ghost=e.rushTrail[i];
   const alpha=((i+1)/count)*0.38;
   ctx.save();
   ctx.globalAlpha=alpha;
   ctx.globalCompositeOperation='screen';
   ctx.filter='brightness(1.6) saturate(1.4) drop-shadow(0 0 10px #ff7a45)';
   ctx.translate(ghost.x,ghost.y+12+ghost.bob);
   if(ghost.tilt)ctx.rotate(ghost.tilt);
   if(ghost.scaleX!==1||ghost.scaleY!==1)ctx.scale(ghost.scaleX,ghost.scaleY);
   sprite(ctx,beastAtlas,e.sprite,4,3,0,0,size,ghost.flip,1);
   ctx.restore();
  }
 }

 // 2. When actively charging: draw sonic boom bow shockwave and ground friction furrows
 if(e.chargeTime>0){
  const rushAngle=Math.atan2(e.chargeY,e.chargeX);
  const perpX=-Math.sin(rushAngle),perpY=Math.cos(rushAngle);
  const backX=-Math.cos(rushAngle),backY=-Math.sin(rushAngle);

  // A. Twin ground furrow tracks (glowing claw drag marks)
  ctx.save();
  ctx.lineCap='round';
  for(const side of [-1,1]){
   const ox=side*perpX*(e.r*0.48),oy=side*perpY*(e.r*0.48);
   const startX=e.x+ox,startY=e.y+oy+10;
   const trailLen=Math.min(130,Math.hypot(e.chargeX,e.chargeY)*0.18+40);
   const endX=startX+backX*trailLen,endY=startY+backY*trailLen;
   const grad=ctx.createLinearGradient(startX,startY,endX,endY);
   grad.addColorStop(0,'rgba(255,230,160,0.85)');
   grad.addColorStop(0.35,'rgba(255,120,50,0.65)');
   grad.addColorStop(1,'rgba(255,70,30,0)');
   ctx.strokeStyle=grad;
   ctx.lineWidth=5;
   ctx.beginPath();
   ctx.moveTo(startX,startY);ctx.lineTo(endX,endY);
   ctx.stroke();
  }
  ctx.restore();

  // B. Aerodynamic hypersonic bow shockwave cone
  ctx.save();
  ctx.translate(e.x,e.y+anim.bob);
  ctx.rotate(rushAngle);
  const shockR=e.r*0.9;

  // Outer shock bloom
  ctx.strokeStyle='rgba(255,100,50,0.35)';
  ctx.lineWidth=14;
  ctx.beginPath();
  ctx.arc(shockR*0.35,0,shockR*0.85,-Math.PI*0.48,Math.PI*0.48);
  ctx.stroke();

  // Core bright plasma bow
  ctx.strokeStyle='rgba(255,190,100,0.85)';
  ctx.lineWidth=5;
  ctx.beginPath();
  ctx.arc(shockR*0.4,0,shockR*0.8,-Math.PI*0.42,Math.PI*0.42);
  ctx.stroke();

  // White sonic-boom edge
  ctx.strokeStyle='#ffffff';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.arc(shockR*0.42,0,shockR*0.76,-Math.PI*0.35,Math.PI*0.35);
  ctx.stroke();

  // Twin swept-back slipstream ribbons
  ctx.strokeStyle='rgba(255,220,160,0.45)';
  ctx.lineWidth=2.5;
  ctx.beginPath();
  ctx.moveTo(shockR*0.7,-shockR*0.6);ctx.lineTo(-shockR*1.1,-shockR*0.85);
  ctx.moveTo(shockR*0.7,shockR*0.6);ctx.lineTo(-shockR*1.1,shockR*0.85);
  ctx.stroke();

  // Back thruster flame exhausts
  for(const side of [-1,1]){
   const ty=side*(shockR*0.42),tx=-shockR*0.65;
   const fLen=32+Math.random()*18;
   const fGrad=ctx.createLinearGradient(tx,ty,tx-fLen,ty);
   fGrad.addColorStop(0,'#ffffff');
   fGrad.addColorStop(0.35,'#ff9b54');
   fGrad.addColorStop(1,'rgba(255,60,20,0)');
   ctx.fillStyle=fGrad;
   ctx.beginPath();
   ctx.moveTo(tx,ty-7);
   ctx.lineTo(tx-fLen,ty);
   ctx.lineTo(tx,ty+7);
   ctx.closePath();
   ctx.fill();
  }
  ctx.restore();

  // C. Dynamic embers and sparks
  if(Math.random()<0.45){
   visuals.emitMobThruster(e.x+backX*35,e.y+backY*35+10,backX*90,backY*90,'#ff8d50');
  }
 }

 // 3. Detect charge completion impact
 if(e.wasCharging&&e.chargeTime<=0){
  visuals.emitMobAttackFlash(e.x,e.y+10,'#ff9e54',85);
  visuals.emitMobStep(e.x,e.y+10,'#ffb076',true);
 }
 e.wasCharging=e.chargeTime>0;
}

function getMobAnimation(e,run){
 const dx=run.p.x-e.x,dy=run.p.y-e.y,d=Math.hypot(dx,dy)||1;
 const faceRight=e.atlas==='hub'&&e.behavior==='fox'?e.x<run.p.x:e.x>run.p.x;
 let isRetreating=false;
 if(e.behavior==='porcupine'&&d<230)isRetreating=true;
 else if(e.behavior==='deer'&&d<200)isRetreating=true;
 else if(['radar','sonic','repair'].includes(e.behavior)&&d<200)isRetreating=true;
 else if(e.behavior==='acid'&&d<180)isRetreating=true;
 else if(e.type===2&&d<230)isRetreating=true;

 const isImmobilized=e.freeze>0||(e.windup>0)||(e.burrow>0)||(e.shield>0&&!e.boss);
 const isStoppedRange=(e.boss&&d<110)||(e.type===5&&d<390)||(!isRetreating&&['radar','sonic','repair','porcupine','deer'].includes(e.behavior)&&d<(e.behavior==='deer'?300:e.behavior==='porcupine'?340:320));
 const isMoving=!isImmobilized&&(e.chargeTime>0||!isStoppedRange);
 const moveXDir=e.chargeTime>0?(e.chargeX>=0?1:-1):(isRetreating?(dx>0?-1:1):(dx>=0?1:-1));
 const facingSign=dx>=0?1:-1;

 let bob=0,tilt=0,scaleX=1,scaleY=1;
 if(e.boss){
  if(e.atlas==='hub'&&e.hubForm!=='spirit'){
   const breath=Math.sin(run.time*2.4)*0.024;
   bob=Math.sin(run.time*1.8)*5.5;
   scaleX=1+breath;scaleY=1-breath;
   tilt=(e.chargeTime>0?(e.chargeX>=0?1:-1)*0.12:(isMoving?facingSign*0.045:0))+Math.sin(run.time*1.4)*0.012;
   if(e.chargeTime>0){scaleX*=1.08;scaleY*=0.92;}
  }else if(e.behavior==='bear'){
   const isChargingWindup=(e.windup>0)||run.hazards.some(h=>h.beast&&h.source===e.id&&h.type==='charge');
   if(e.chargeTime>0){
    const rushDir=e.chargeX>=0?1:-1;
    tilt=rushDir*0.28;
    scaleX=1.24;scaleY=0.82;
    bob=4+Math.sin(run.time*28)*3.2;
   }else if(isChargingWindup){
    const quiver=Math.sin(run.time*26)*0.035;
    bob=9+Math.sin(run.time*22)*1.2;
    scaleY=0.82+quiver;scaleX=1.18-quiver;
    tilt=-facingSign*0.12;
   }else if(isMoving){
    const strideFreq=Math.min(9.5,Math.max(5.5,e.speed*0.065));
    const cycle=run.time*strideFreq;
    const footStep=Math.abs(Math.sin(cycle));
    bob=-footStep*5.4+Math.cos(cycle*2)*1.6;
    const squish=footStep*0.052;
    scaleX=1+squish;scaleY=1-squish;
    const roll=Math.sin(cycle)*0.065*facingSign;
    const prowl=facingSign*0.075;
    tilt=prowl+roll;
   }else{
    const breath=Math.sin(run.time*2.2)*0.032;
    bob=Math.sin(run.time*2.2)*2.2;
    scaleX=1+breath;scaleY=1-breath;
    tilt=Math.sin(run.time*1.4)*0.02;
   }
   const flip=e.chargeTime>0?(e.chargeX<0):faceRight;
   return {bob,tilt,scaleX,scaleY,flip};
  }else{
   bob=Math.sin(run.time*2.2+e.id)*4;
   tilt=isMoving?facingSign*0.05:Math.sin(run.time*1.2)*0.02;
   const breath=Math.sin(run.time*2)*0.02;
   scaleX=1+breath;scaleY=1-breath;
  }
  return {bob,tilt,scaleX,scaleY,flip:faceRight};
 }

 const b=e.behavior;
 if(['bomber','summoner','raven','orb','lantern','disc','prism','warp','stealth'].includes(b)||e.type===4||e.type===5){
  const floatFreq=b==='raven'?4.5:3.2;
  bob=Math.sin(run.time*floatFreq+e.id*1.6)*4.5;
  tilt=isMoving?moveXDir*0.11:Math.sin(run.time*2+e.id)*0.03;
  const breathe=Math.sin(run.time*3+e.id)*0.025;
  scaleX=1+breathe;scaleY=1-breathe;
 }else if(['runner','hound','boar','deer','runeDog','tiger','fox'].includes(b)||e.type===1){
  const strideFreq=Math.min(18,Math.max(8,e.speed*0.08));
  const cycle=run.time*strideFreq+e.id*2.1;
  if(isMoving){
   bob=-Math.abs(Math.sin(cycle))*4.5;
   const stretch=Math.sin(cycle)*0.07;
   scaleX=1+stretch;scaleY=1-stretch;
   tilt=moveXDir*0.12+Math.sin(cycle)*0.035;
  }else{
   bob=Math.sin(run.time*2.5+e.id)*1.2;
  }
 }else if(['beetle','porcupine','toad'].includes(b)){
  if(b==='toad'){
   const hopPhase=(run.time*2.6+e.id)%1;
   if(isMoving&&hopPhase<0.45){
    const pNorm=hopPhase/0.45;
    bob=-Math.sin(pNorm*Math.PI)*7.5;
    tilt=moveXDir*0.14;
    scaleX=0.94;scaleY=1.08;
   }else{
    bob=0;scaleX=1.06;scaleY=0.94;
   }
  }else{
   if(isMoving){
    tilt=moveXDir*0.05+Math.sin(run.time*16+e.id)*0.06;
    bob=Math.abs(Math.sin(run.time*14+e.id))*1.5;
   }else{
    bob=Math.sin(run.time*2+e.id)*0.6;
   }
  }
 }else if(b==='dragon'){
  bob=Math.sin(run.time*3+e.id)*4;
  tilt=(isMoving?moveXDir*0.07:0)+Math.sin(run.time*4.5+e.id)*0.07;
  const wave=Math.sin(run.time*3.8+e.id)*0.03;
  scaleX=1+wave;scaleY=1-wave;
 }else if(['shooter','acid','radar','sonic','repair','thunder','wallBuilder','chronist','harmonist','mortar'].includes(b)||e.type===2){
  if(isMoving){
   bob=-Math.abs(Math.sin(run.time*6.5+e.id))*2.2;
   tilt=moveXDir*0.045+Math.sin(run.time*8+e.id)*0.02;
  }else{
   bob=Math.sin(run.time*2+e.id)*0.8;
  }
 }else{
  const isHeavy=['shield','bulwark','guard','engineer'].includes(b)||e.type===3;
  const strideFreq=Math.min(14,Math.max(6,e.speed*0.065));
  const cycle=run.time*strideFreq+e.id*1.7;
  if(isMoving){
   bob=-Math.abs(Math.sin(cycle))*(isHeavy?2.5:3.8);
   tilt=moveXDir*(isHeavy?0.05:0.08)+Math.sin(cycle)*(isHeavy?0.02:0.035);
   const stomp=Math.cos(cycle*2)*0.025;
   scaleX=1+stomp;scaleY=1-stomp;
  }else{
   bob=Math.sin(run.time*2.2+e.id)*0.8;
  }
 }

 if(e.elite&&!e.boss&&e.windup>0){const c=run.specialConfig(e);if(c){const p=clamp(1-e.windup/(c.warning||1),0,1);scaleX*=1+p*.06;scaleY*=1-p*.06;bob+=Math.sin(run.time*16)*p*.6;}}
 if(e.chargeTime>0){
  tilt=(e.chargeX>=0?1:-1)*0.16;
  scaleX=1.12;scaleY=0.9;
 }
 return {bob,tilt,scaleX,scaleY,flip:faceRight};
}
function drawSpecialGlyph(x,y,r,color,spin=0){
 ctx.save();ctx.translate(x,y);ctx.rotate(spin);ctx.strokeStyle=color;ctx.lineWidth=1.5;circle(0,0,r,color,false);
 for(let i=0;i<4;i++){ctx.rotate(TAU/4);ctx.beginPath();ctx.moveTo(r-5,0);ctx.lineTo(r+5,-3);ctx.lineTo(r+5,3);ctx.closePath();ctx.stroke();}ctx.restore();
}
function drawSpecialWarning(h){
 const e=run.enemies.find(e=>e.id===h.source&&e.elite&&!e.boss&&e.hp>0);if(!e)return false;
 const c=run.specialConfig(e);if(!c)return false;
 const p=clamp(1-h.t/h.total,0,1),color=e.color,dir=['needles','rocket','stab','dash','sonic'].includes(h.type);
 ctx.save();ctx.setLineDash([]);ctx.lineWidth=2;
 if(dir){
  const count=h.type==='needles'||h.type==='sonic'?(c.shots||3):1,length=h.type==='rocket'||h.type==='stab'||h.type==='dash'?c.speed*c.duration:Math.min(c.range,650),half=h.type==='sonic'?c.radius:Math.max(14,h.r);
  ctx.translate(h.x,h.y);ctx.rotate(h.angle||0);
  for(let i=0;i<count;i++){
   const a=(i-(count-1)/2)*(c.spread||0);ctx.save();ctx.rotate(a);
   const grad=ctx.createLinearGradient(0,0,length,0);grad.addColorStop(0,color+'36');grad.addColorStop(1,color+'08');ctx.fillStyle=grad;ctx.fillRect(0,-half,length,half*2);
   ctx.strokeStyle=color+'bb';ctx.setLineDash([9,7]);ctx.strokeRect(0,-half,length,half*2);ctx.setLineDash([]);
   for(let j=0;j<4;j++){const x=35+((run.time*80+j*90)%Math.max(100,length-35));if(x>length)continue;ctx.strokeStyle='#ecffff';ctx.beginPath();ctx.moveTo(x-7,-5);ctx.lineTo(x,0);ctx.lineTo(x-7,5);ctx.stroke();}
   ctx.restore();
  }
 }else if(h.type==='acid'||h.type==='breath'){
  const half=h.halfAngle??c.halfAngle;
  skyCone({...h,halfAngle:half},color+'18',color+'aa');
  ctx.strokeStyle=color;ctx.beginPath();ctx.arc(h.x,h.y,h.r*p,h.angle-half,h.angle+half);ctx.stroke();
 }else if(h.type==='prism'){
  for(const a of h.angles){hubRay(h,a,color+'18',h.r*3);hubRay(h,a,color+'bb',2);}
  for(let i=0;i<h.angles.length-1;i++)hubRay(h,(h.angles[i]+h.angles[i+1])/2,'#72e6ae33',10);
 }else if(h.type==='wall'){
  for(const s of h.segments){labSegment(s,color+'33',20);labSegment(s,color,2);drawSpecialGlyph(s.x,s.y,15,color,run.time);drawSpecialGlyph(s.x2,s.y2,15,color,-run.time);}
 }else{
  const r=h.type==='veil'?e.r+20:h.r;
  circle(h.x,h.y,r,color+'18');drawSpecialGlyph(h.x,h.y,r,color,0);
  ctx.strokeStyle='#f4faff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(h.x,h.y,r*.88,-Math.PI/2,-Math.PI/2+TAU*p);ctx.stroke();
  circle(h.x,h.y,r*(1.25-.85*p),color+'66',false);
  if(h.type==='warp'){ctx.strokeStyle='#ddaaff';ctx.beginPath();ctx.ellipse(h.x,h.y-20,r*.6,r*(.3+.5*p),-.3,0,TAU);ctx.stroke();}
  if(h.type==='thunder'){ctx.strokeStyle='#dfd0ff99';ctx.lineWidth=1+p*2;ctx.beginPath();ctx.moveTo(h.x,h.y-300*p);ctx.lineTo(h.x,h.y);ctx.stroke();}
  if(h.type==='plasma'){const y=h.y-300*(1-p);circle(h.x,y,10,'#e9bfff');labSegment({x:h.x,y:y-50,x2:h.x,y2:y},'#bb77ee77',4);}
  if(h.type==='trace'){ctx.font='16px monospace';ctx.textAlign='center';ctx.fillStyle='#e8caff';ctx.fillText('◇',h.x,h.y+5);}
 }
 ctx.restore();ctx.save();ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle=color;
 const text=h.type==='pulse'?'超载自爆 · 全场':h.type==='ambush'?'折跃伏击':c.title;
 ctx.fillText(text+' · '+h.t.toFixed(1)+'s',h.x,h.y-(dir?45:Math.min(h.r,90)+18));ctx.restore();return true;
}
function drawSpecialConeField(f,acid){
 const age=f.max-f.life,half=f.halfAngle??(acid?.5:.65),color=acid?'#a3e75d':'#73e8f4';
 ctx.save();const glow=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);glow.addColorStop(0,color+'22');glow.addColorStop(.7,color+'44');glow.addColorStop(1,color+'18');
 skyCone({...f,halfAngle:half},glow,color+'aa');
 const count=visuals.reduced?7:18;
 for(let i=0;i<count;i++){
  const u=(age*(acid?.23:.8)+i/count)%1,a=f.angle+Math.sin(i*7.31+age*(acid?.45:1.3))*half*.88,r=acid?f.r*(.15+.8*((i*.618)%1)):f.r*u;
  const x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r;
  if(acid){circle(x,y,10+Math.sin(age*2+i)*4,color+'30');circle(x+3,y-3,2,'#ddff9a99');}
  else{ctx.strokeStyle=i%2?'#b6ffffaa':'#e1a6ff88';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-Math.cos(a)*20,y-Math.sin(a)*20);ctx.lineTo(x,y);ctx.stroke();circle(x,y,2,'#f2ffff');}
 }
 ctx.font='11px sans-serif';ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText((acid?'腐蚀驻留 ':'量子吐息 ')+f.life.toFixed(1)+'s',f.x+Math.cos(f.angle)*f.r*.6,f.y+Math.sin(f.angle)*f.r*.6-10);ctx.restore();
}
function drawSpecialFields(){
 for(const f of run.hubFields){
  const e=run.enemies.find(e=>e.id===f.source&&e.elite&&!e.boss);if(!e)continue;ctx.save();const age=f.max-f.life;
  if(f.kind==='prism')for(const a of f.angles){
   ctx.save();ctx.translate(f.x,f.y);ctx.rotate(a);ctx.strokeStyle='#e4ffff';ctx.lineWidth=2;
   for(let i=0;i<5;i++){const x=30+(age*950+i*170)%Math.min(f.length,1000);ctx.beginPath();ctx.ellipse(x,0,5,f.r*1.8,0,0,TAU);ctx.stroke();}ctx.restore();
  }
  if(f.kind==='wall')for(const s of f.segments){
   labSegment(s,'#90caff33',18);drawSpecialGlyph(s.x,s.y,15,'#c5eaff',age);drawSpecialGlyph(s.x2,s.y2,15,'#c5eaff',-age);
   for(let i=0;i<7;i++){const u=(age*.6+i/7)%1;circle(s.x+(s.x2-s.x)*u,s.y+(s.y2-s.y)*u,3,'#e4f7ff');}
  }
  if(f.kind==='trace'){
   ctx.globalAlpha=f.life/f.max;ctx.lineWidth=3;circle(f.x,f.y,f.r*(.4+age/f.max*.6),'#edc9ff',false);
   for(let i=0;i<8;i++){const a=i*TAU/8;labSegment({x:f.x+Math.cos(a)*f.r*.2,y:f.y+Math.sin(a)*f.r*.2,x2:f.x+Math.cos(a)*f.r,y2:f.y+Math.sin(a)*f.r},'#cc99ff',2);}
  }
  if(f.kind==='plasma'){
   const glow=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);glow.addColorStop(0,'#5b237b66');glow.addColorStop(.7,'#b574ee55');glow.addColorStop(1,'#f1b7ff22');circle(f.x,f.y,f.r,glow);ctx.lineWidth=2;
   for(let i=0;i<3;i++){const a=age*(i%2?-1:1)+i*TAU/3;ctx.strokeStyle=i%2?'#edc7ff':'#a5dfff';ctx.beginPath();ctx.arc(f.x,f.y,f.r*(.45+i*.2),a,a+1.9);ctx.stroke();}
   ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f1ceff';ctx.fillText('焚界池 '+f.life.toFixed(1)+'s',f.x,f.y-f.r-8);
  }
  ctx.restore();
 }
}
function drawSpecialUnit(e,size,anim){
 if(e.demoAlly){ctx.save();ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#a7e9c1';ctx.fillText('受损友军',e.x,e.y-45);ctx.restore();}if(e.boss||!e.elite)return;const c=run.specialConfig(e);if(!c)return;
 ctx.save();const age=run.time-(e.lastSpecial??-99),color=e.color;
 if((e.windup||0)>0){ctx.lineWidth=2;drawSpecialGlyph(e.x,e.y,e.r+9,color,run.time*.7);}
 if(e.chargeTime>0){
  const d=Math.hypot(e.chargeX,e.chargeY)||1,ux=e.chargeX/d,uy=e.chargeY/d,atlas=e.atlas==='beasts'?beastAtlas:e.atlas==='sky'?skyAtlas:labAtlas;
  for(let i=visuals.reduced?1:3;i>=1;i--)sprite(ctx,atlas,e.sprite,4,3,e.x-ux*i*22,e.y+12-uy*i*22+anim.bob,size,anim.flip,.10+(3-i)*.04);
  labSegment({x:e.x-ux*65,y:e.y-uy*65,x2:e.x,y2:e.y},color+'88',e.r*1.3);
 }
 if(['deer','repair'].includes(e.behavior)&&age>=0&&age<.7){
  const fade=1-age/.7;ctx.globalAlpha=fade;ctx.lineWidth=1.5;circle(e.x,e.y,c.range, '#77e8b577',false);
  for(const id of e.healTargets||[]){const ally=run.enemies.find(o=>o.id===id&&o.hp>0);if(!ally)continue;
   labSegment({x:e.x,y:e.y-12,x2:ally.x,y2:ally.y-12},'#87f4bd88',2);
   for(let i=0;i<3;i++){const u=(age*1.5+i/3)%1,x=e.x+(ally.x-e.x)*u,y=e.y+(ally.y-e.y)*u-12;ctx.strokeStyle='#ddffe8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();}
  }
 }
 if(e.behavior==='harmonist'&&(e.hubLinks||[]).length){drawSpecialGlyph(e.x,e.y,e.r+15,'#ffe6a3',-run.time);for(const id of e.hubLinks){const ally=run.enemies.find(o=>o.id===id);if(ally)drawSpecialGlyph(ally.x,ally.y,ally.r+8,'#ffe19a77',run.time);}}
 if(e.veil>0){ctx.globalAlpha=.4;drawSpecialGlyph(e.x,e.y,e.r+12,'#d8c7ff',run.time*1.4);for(let i=0;i<6;i++){const a=i*TAU/6+run.time*.7;circle(e.x+Math.cos(a)*35,e.y+Math.sin(a)*18,2,'#bbcdff');}}
 if(age>=0&&age<.35&&['porcupine','radar','sonic','dragon','thunder','prism','mortar'].includes(e.behavior)){ctx.globalAlpha=1-age/.35;circle(e.x,e.y-15,8+age*38,color+'99',false);}
 if(e.demoAlly){ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#a7e9c1';ctx.fillText('受损友军',e.x,e.y-45);}
 ctx.restore();
}
function drawWorld(){
 if(!run)return;ctx.setTransform(view.dpr*view.zoom,0,0,view.dpr*view.zoom,0,0);updateCamera();floor();ctx.save();ctx.translate(-camera.x,-camera.y);
 drawAmbient(1/60);
 for(const z of run.zones){ctx.globalAlpha=Math.min(1,z.life);const color=z.kind==='water'?'#4aadee':z.kind==='fire'?'#ff8b58':'#ffa46e';circle(z.x,z.y,z.r,color+'20');ctx.lineWidth=1.5;circle(z.x,z.y,z.r*(.9+Math.sin(run.time*3)*.04),color+'77',false);for(let i=0;i<6;i++){const a=i*TAU/6+run.time*.5;circle(z.x+Math.cos(a)*z.r*.65,z.y+Math.sin(a)*z.r*.65,4,color+'88');}ctx.globalAlpha=1;}
 visuals.draw(ctx);
 drawLabFields();drawSkyFields();drawHubFields();drawSpecialFields();drawAscensionAuras();
 for(const h of run.hazards){
  if(drawSpecialWarning(h))continue;
  if(h.beast&&h.type==='claw'&&h.spread){drawBearClawWarning(h);continue;}
   if(h.beast&&h.type==='charge'){drawBearChargeWarning(h);continue;}
  if(h.type==='barrage'){drawBearBarrageWarning(h);continue;}
  if(h.type==='warp'&&h.source&&run.enemies.some(e=>e.id===h.source&&e.boss)){drawBearWarpWarning(h);continue;}
  if(h.type==='missile'){drawBearMissileHazard(h);continue;}
  if(h.sky){drawSkyWarning(h);continue;}
  if(h.hub){drawHubWarning(h);continue;}
  if(h.lab){drawLabWarning(h);continue;}
  const progress=1-h.t/h.total;
  if(['charge','rocket','needles'].includes(h.type)){
   ctx.save();ctx.translate(h.x,h.y);ctx.rotate(h.angle);
   if(h.type==='needles'){
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,440,-.27,.27);ctx.closePath();
    ctx.fillStyle='#ae7aff25';ctx.fill();ctx.strokeStyle='#d0abff99';ctx.stroke();ctx.restore();continue;
   }
   const length=h.length||(h.type==='rocket'?420:290),half=h.length?h.r:35;
   ctx.fillStyle='#ff745426';ctx.fillRect(0,-half,length,half*2);
   ctx.strokeStyle='#ff9b74aa';ctx.setLineDash([12,9]);ctx.strokeRect(0,-half,length,half*2);ctx.setLineDash([]);
   if(h.beast&&h.type==='charge'){ctx.fillStyle='#ffdfb3';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText(h.combo?'三连冲撞 '+h.combo+' / '+h.comboTotal+' · 侧移躲避':'直线冲撞 · 侧移躲避',length*.5,-half-15);}
   ctx.restore();
  }else{const tint=['warp','claw'].includes(h.type)?'#bd87ff':'#ff9879';ctx.save();ctx.strokeStyle=tint;ctx.lineWidth=4;ctx.beginPath();ctx.arc(h.x,h.y,h.r+5,-Math.PI/2,-Math.PI/2+TAU*progress);ctx.stroke();ctx.restore();if(h.type==='missile'&&h.t<.6){ctx.strokeStyle='#ffdd9b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(h.x+35*h.t/.6,h.y-180*h.t/.6);ctx.lineTo(h.x+35*h.t/.6+9,h.y-180*h.t/.6-45);ctx.stroke();}circle(h.x,h.y,h.r,'#ff74541a');circle(h.x,h.y,h.r*progress,'#ff745433');ctx.lineWidth=2;circle(h.x,h.y,h.r,'#ff9879bb',false);ctx.fillStyle='#ffd2ab';ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText(h.type==='pulse'?Math.ceil(h.t)+' · 击杀中断':h.type==='warp'?'折跃':h.type==='claw'?'爪击':h.type==='missile'?'广域轰炸 · '+h.t.toFixed(1)+'s':h.type==='strike'?'锁定轰炸 · '+h.t.toFixed(1)+'s':'!',h.x,h.y+8);}}
 for(const g of run.gems){
  ctx.save();
  const bob=Math.sin(run.time*3.5+g.x)*2.5;
  ctx.translate(g.x,g.y+bob);
  const dPlayer=Math.hypot(g.x-run.p.x,g.y-run.p.y);
  if(dPlayer<240&&!visuals.reduced){
   const toAngle=Math.atan2(run.p.y-g.y,run.p.x-g.x);
   ctx.save();ctx.rotate(toAngle);ctx.strokeStyle=g.value>15?'#fde68a77':'#7dd3fc77';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(0,0);ctx.stroke();ctx.restore();
  }
  ctx.rotate(Math.PI/4+run.time*(g.value>15?1.5:0.8));
  const s=g.value>15?9:5.5;
  ctx.fillStyle=g.value>15?'#fef08a':'#a5f3fc';
  ctx.shadowBlur=14;ctx.shadowColor=g.value>15?'#eab308':'#38bdf8';
  ctx.fillRect(-s/2,-s/2,s,s);
  ctx.fillStyle='#ffffff';ctx.fillRect(-s/4,-s/4,s/2,s/2);
  ctx.restore();
 }
 const objects=[...run.enemies,{player:true,y:run.p.y}].sort((a,b)=>a.y-b.y);
 for(const e of objects){
  if(e.player){
   const p=run.p,idx=D.heroes.indexOf(run.hero),bob=run.moving?Math.sin(run.time*15)*3:Math.sin(run.time*3)*1;
   const xDir=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
   const tilt=run.moving?xDir*0.08:0;
   if(run.moving&&Math.random()<0.28){visuals.emitStep(p.x,p.y+14,run.hero.color);}

   // Multi-layer hero magic aura under feet
   ctx.save();
   ctx.translate(p.x,p.y+14);ctx.scale(1,0.45);
   const grad=ctx.createRadialGradient(0,0,4,0,0,p.r+22);
   grad.addColorStop(0,run.hero.color+'55');grad.addColorStop(0.7,run.hero.color+'22');grad.addColorStop(1,'transparent');
   ctx.fillStyle=grad;ctx.beginPath();ctx.arc(0,0,p.r+22,0,TAU);ctx.fill();
   ctx.rotate(run.time*1.2);ctx.strokeStyle=run.hero.color+'66';ctx.lineWidth=1.5;ctx.setLineDash([6,8]);
   ctx.beginPath();ctx.arc(0,0,p.r+12,0,TAU);ctx.stroke();ctx.setLineDash([]);
   ctx.restore();

   // Shadow
   ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.35);circle(0,9,26,'#0007');ctx.restore();

   // Hero sprite with directional tilt
   const alpha=p.invuln>0&&Math.sin(run.time*35)>0?.55:1;
   ctx.save();ctx.translate(p.x,p.y+12+bob);
   if(tilt)ctx.rotate(tilt);
   sprite(ctx,heroAtlas,idx,4,2,0,0,83,Math.cos(p.angle)<0,alpha);
   ctx.restore();

   // Nearest enemy lock-on indicator and aim ray
   const activeTarget=run.enemies.find(en=>en.hp>0&&!en.dead&&!(en.veil>0)&&!(en.burrow>0)&&Math.hypot(en.x-p.x,en.y-p.y)<=750);
   if(activeTarget){
    ctx.save();ctx.translate(activeTarget.x,activeTarget.y);ctx.rotate(run.time*2.5);
    ctx.strokeStyle=run.hero.color+'aa';ctx.lineWidth=2;
    const lr=activeTarget.r+12;
    for(let k=0;k<4;k++){ctx.save();ctx.rotate(k*Math.PI/2);ctx.beginPath();ctx.arc(0,0,lr,-0.3,0.3);ctx.stroke();ctx.restore();}
    ctx.restore();
    ctx.save();ctx.strokeStyle=run.hero.color+'44';ctx.lineWidth=1.5;ctx.setLineDash([4,6]);ctx.lineDashOffset=-run.time*25;
    ctx.beginPath();ctx.moveTo(p.x+Math.cos(p.angle)*35,p.y+Math.sin(p.angle)*35);ctx.lineTo(activeTarget.x,activeTarget.y);ctx.stroke();ctx.restore();
   }

   // Direction arrow
   const ax=p.x+Math.cos(p.angle)*45,ay=p.y+Math.sin(p.angle)*45;ctx.strokeStyle=run.hero.color+'aa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(p.x+Math.cos(p.angle)*67,p.y+Math.sin(p.angle)*67);ctx.stroke();ctx.save();ctx.translate(p.x+Math.cos(p.angle)*72,p.y+Math.sin(p.angle)*72);ctx.rotate(p.angle);ctx.fillStyle=run.hero.color;ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-4,-4);ctx.lineTo(-4,4);ctx.fill();ctx.restore();
  }else{
   if(e.x<camera.x-120||e.x>camera.x+view.w+120||e.y<camera.y-120||e.y>camera.y+view.h+120)continue;
   const size=e.atlas==='hub'?(e.boss?210:e.elite?108:e.behavior==='bulwark'?105:85):e.atlas==='sky'?(e.boss?210:e.elite?105:78):e.atlas==='lab'?(e.boss?200:e.elite?100:76):e.atlas==='beasts'?(e.boss?180:e.elite?92:72):e.boss?150+run.stage*10:e.type===5?85:e.type===3?76:60;
   if(e.behavior==='deer'||e.behavior==='repair'){circle(e.x,e.y,205,'#70eeaa0c');circle(e.x,e.y,205,'#70eeaa55',false);}
   if(e.burrow>0){circle(e.x,e.y,22,'#9f744e88');continue;}
   ctx.save();ctx.translate(e.x,e.y);ctx.scale(1,.4);circle(0,5,e.r*1.1,'#0006');ctx.restore();

   if(e.boss){
    if(e.atlas==='hub'){drawArchonAura(e);}
    else{
     ctx.save();ctx.translate(e.x,e.y+8);ctx.scale(1,0.45);
     ctx.rotate(-run.time*0.8);ctx.lineWidth=3;ctx.strokeStyle='#ff7b54bb';ctx.setLineDash([14,10]);ctx.beginPath();ctx.arc(0,0,e.r+26,0,TAU);ctx.stroke();
     ctx.rotate(run.time*1.6);ctx.lineWidth=2;ctx.strokeStyle='#ffa26e88';ctx.setLineDash([8,6]);ctx.beginPath();ctx.arc(0,0,e.r+12,0,TAU);ctx.stroke();
     ctx.restore();
    }
   }

   const anim=getMobAnimation(e,run);
   drawSpecialUnit(e,size,anim);
   ctx.save();
   if(e.flash>0){ctx.filter='brightness(2.2) saturate(1.2)';}
   if(e.atlas==='hub'&&e.boss){
    const bImg=e.hubForm==='spirit'?hubBossSpiritImg:hubBossMechImg;
    if(bImg.complete&&bImg.naturalWidth){
     const bScale=size/Math.max(bImg.naturalWidth,bImg.naturalHeight);
     const bdw=bImg.naturalWidth*bScale,bdh=bImg.naturalHeight*bScale;
     ctx.save();
     ctx.globalCompositeOperation='screen';
     ctx.translate(e.x,e.y+12+anim.bob);
     if(anim.tilt)ctx.rotate(anim.tilt);
     if(anim.scaleX!==1||anim.scaleY!==1)ctx.scale(anim.scaleX,anim.scaleY);
     if(anim.flip)ctx.scale(-1,1);
     const yOff=e.hubForm==='spirit'?-bdh:-bdh+bdh*(74/800);
     ctx.drawImage(bImg,-bdw/2,yOff,bdw,bdh);
     ctx.restore();
    }else{
     ctx.save();
     ctx.translate(e.x,e.y+12+anim.bob);
     if(anim.tilt)ctx.rotate(anim.tilt);
     if(anim.scaleX!==1||anim.scaleY!==1)ctx.scale(anim.scaleX,anim.scaleY);
     sprite(ctx,hubAtlas,e.sprite,4,3,0,0,size,anim.flip,e.veil>0?.18:1);
     ctx.restore();
    }
   }else{
    ctx.save();
    ctx.translate(e.x,e.y+12+anim.bob);
    if(e.behavior==='bear'){
     drawBearRushEffects(e,size,anim);
    }
    if(anim.tilt)ctx.rotate(anim.tilt);
    if(anim.scaleX!==1||anim.scaleY!==1)ctx.scale(anim.scaleX,anim.scaleY);
    sprite(ctx,e.atlas==='hub'?hubAtlas:e.atlas==='sky'?skyAtlas:e.atlas==='lab'?labAtlas:e.atlas==='beasts'?beastAtlas:enemyAtlas,e.sprite,4,3,0,0,size,anim.flip,e.veil>0?.18:1);
    ctx.restore();
   }
   ctx.restore();
   if(e.atlas==='hub'&&e.hubBoost){circle(e.x,e.y,e.r+6,'#ffe09e99',false);}
   if(e.atlas==='hub'&&e.foxStep>0){circle(e.x,e.y,e.r+12,'#b4f4ff66',false);}
   if(e.controlled){circle(e.x,e.y,e.r+8,'#ff776bcc',false);ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffb1a7';ctx.fillText(e.suicideArmed?'自爆准备':'自爆机兵',e.x,e.y-size*.5-8);}

   if(e.freeze>0){ctx.fillStyle='#a5e8ff44';ctx.beginPath();ctx.moveTo(e.x-e.r,e.y+5);ctx.lineTo(e.x-e.r*.65,e.y-45);ctx.lineTo(e.x,e.y-25);ctx.lineTo(e.x+e.r*.7,e.y-52);ctx.lineTo(e.x+e.r,e.y+5);ctx.closePath();ctx.fill();}if(e.chargeTime>0&&e.behavior!=='bear'){ctx.strokeStyle='#ffbd76';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(e.x,e.y-10);ctx.lineTo(e.x-e.chargeX*.09,e.y-e.chargeY*.09-10);ctx.stroke();}
   if(e.freeze>0||e.slow>0){ctx.lineWidth=1.5;circle(e.x,e.y,e.r+4,'#81cfff88',false);}if(e.hp<e.maxHp&&!e.boss){const w=32;ctx.fillStyle='#070c17';ctx.fillRect(e.x-w/2,e.y-size+16,w,3);ctx.fillStyle=e.color;ctx.fillRect(e.x-w/2,e.y-size+16,w*e.hp/e.maxHp,3);}
  }
 }
 const orbit=run.orbitCount();for(let i=0;i<orbit;i++){const a=run.orbitClock*(run.hero.id==='gpt'&&run.trans('orbit')&&i>=orbit-4?-1:1)+i*TAU/orbit,r=(orbit>=3?105:75)*run.stats.area,x=run.p.x+Math.cos(a)*r,y=run.p.y+Math.sin(a)*r;ctx.save();ctx.translate(x,y);ctx.rotate(run.time);ctx.shadowBlur=16;ctx.shadowColor=run.hero.color;ctx.fillStyle=run.hero.color;ctx.beginPath();for(let j=0;j<8;j++){const ang=j*TAU/8,rr=j%2?5:12;j?ctx.lineTo(Math.cos(ang)*rr,Math.sin(ang)*rr):ctx.moveTo(Math.cos(ang)*rr,Math.sin(ang)*rr);}ctx.closePath();ctx.fill();ctx.restore();}
 for(const b of run.bullets){
  if(!visuals.reduced){ctx.save();ctx.globalAlpha=.45;ctx.strokeStyle=b.color;ctx.lineWidth=Math.max(2.5,b.r*.7);ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-Math.cos(b.angle)*b.speed*.08,b.y-Math.sin(b.angle)*b.speed*.08);ctx.stroke();ctx.restore();}
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);ctx.fillStyle=b.color;ctx.strokeStyle=b.color;ctx.shadowBlur=15;ctx.shadowColor=b.color;
  if(b.judgment){ctx.fillRect(-70,-b.r,120,b.r*2);ctx.fillStyle='#ffffff';ctx.fillRect(-75,-4,130,8);}
  else if(b.kind==='bubble'){circle(0,0,b.r,b.color+'33');ctx.lineWidth=2.5;circle(0,0,b.r,b.color,false);circle(-3,-3,b.r*0.35,'#ffffffdd');}
  else if(b.kind==='fan'||b.kind==='crystal'||b.kind==='shard'){
   ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-9,-b.r);ctx.lineTo(-4,0);ctx.lineTo(-9,b.r);ctx.closePath();ctx.fill();
   ctx.fillStyle='#ffffffdd';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-4,-b.r*0.4);ctx.lineTo(-1,0);ctx.lineTo(-4,b.r*0.4);ctx.closePath();ctx.fill();
  }
  else if(b.kind==='seed'){ctx.rotate(run.time*6);for(let i=0;i<5;i++){const a=i*TAU/5;circle(Math.cos(a)*6,Math.sin(a)*6,4.5,b.color);}circle(0,0,3.5,'#ffffff');}
  else {
   ctx.beginPath();ctx.ellipse(0,0,b.kind==='bolt'?b.r*2.5:b.r,b.r,0,0,TAU);ctx.fill();
   ctx.fillStyle='#ffffffdd';ctx.beginPath();ctx.ellipse(0,0,b.kind==='bolt'?b.r*1.4:b.r*0.5,b.r*0.5,0,0,TAU);ctx.fill();
  }
  ctx.restore();
 }
 for(const b of run.hostile){
  if(b.kind==='rocket'){
   ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));
   const plume=ctx.createLinearGradient(-40,0,-8,0);plume.addColorStop(0,'#ff795400');plume.addColorStop(.7,'#ffc66aaa');plume.addColorStop(1,'#ffffff');ctx.fillStyle=plume;
   ctx.beginPath();ctx.moveTo(-9,-5);ctx.lineTo(-39-4*Math.sin(run.time*23),0);ctx.lineTo(-9,5);ctx.fill();ctx.fillStyle='#c9d4e5';ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(3,-5);ctx.lineTo(-10,-5);ctx.lineTo(-10,5);ctx.lineTo(3,5);ctx.closePath();ctx.fill();ctx.fillStyle='#ff997c';ctx.fillRect(-8,-2,12,4);ctx.strokeStyle='#fff5cc';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-7,-5);ctx.lineTo(-12,-9);ctx.moveTo(-7,5);ctx.lineTo(-12,9);ctx.stroke();ctx.restore();continue;
  }
  if(b.kind==='needle'){
   ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.strokeStyle='#9ceaff77';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-30,0);ctx.lineTo(0,0);ctx.stroke();ctx.fillStyle='#c9b3ff';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-7,-3);ctx.lineTo(-4,0);ctx.lineTo(-7,3);ctx.closePath();ctx.fill();ctx.strokeStyle='#efffff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(13,0);ctx.stroke();ctx.restore();continue;
  }
  if(b.kind==='sCurve'){
   ctx.save();ctx.shadowBlur=14;ctx.shadowColor=b.color;ctx.strokeStyle=b.color;ctx.lineWidth=4.5;ctx.globalAlpha=.7;ctx.beginPath();
   for(let i=7;i>=0;i--){const age=Math.max(0,b.age-i*.035),offset=b.amplitude*Math.sin(age*b.frequency),c=Math.cos(b.angle),s=Math.sin(b.angle),x=b.originX+c*b.speed*age-s*offset,y=b.originY+s*b.speed*age+c*offset;if(i===7)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();ctx.globalAlpha=1;circle(b.x,b.y,b.r+1,b.color);circle(b.x,b.y,b.r*.5,'#ffffff');ctx.restore();continue;
  }
  if(b.kind==='saw'){if(b.grounded){circle(b.x,b.y,b.r+7,'#67e8f933');circle(b.x,b.y,b.r+7,'#67e8f9aa',false);}ctx.save();ctx.strokeStyle='#67e8f988';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx*.13,b.y-b.vy*.13);ctx.stroke();ctx.restore();drawLabSaw(b.x,b.y,b.r);continue;}
  if(b.kind==='sonic'){
   ctx.save();ctx.strokeStyle=b.color;ctx.lineWidth=7;
   ctx.shadowBlur=16;ctx.shadowColor=b.color;
   const a=Math.atan2(b.vy,b.vx);
   ctx.beginPath();ctx.arc(b.x,b.y,b.r+2,a-1.25,a+1.25);ctx.stroke();
   ctx.strokeStyle='#ffffff';ctx.lineWidth=3;
   ctx.beginPath();ctx.arc(b.x,b.y,b.r*0.8,a-1.0,a+1.0);ctx.stroke();
   ctx.restore();continue;
  }
  ctx.save();
  const bAngle=Math.atan2(b.vy,b.vx);
  ctx.translate(b.x,b.y);ctx.rotate(bAngle);
  const trailLen=Math.min(32,Math.hypot(b.vx,b.vy)*0.13+6);
  const tGrad=ctx.createLinearGradient(-trailLen,0,0,0);
  tGrad.addColorStop(0,'transparent');tGrad.addColorStop(0.5,b.color+'55');tGrad.addColorStop(1,b.color);
  ctx.fillStyle=tGrad;ctx.beginPath();ctx.moveTo(b.r*0.8,0);ctx.lineTo(-trailLen,-b.r*0.6);ctx.lineTo(-trailLen*0.7,0);ctx.lineTo(-trailLen,b.r*0.6);ctx.closePath();ctx.fill();
  ctx.shadowBlur=12;ctx.shadowColor=b.color;
  circle(0,0,b.r,b.color);
  circle(b.r*0.2,0,b.r*0.48,'#ffffff');
  ctx.restore();
 }
 for(const f of run.effects){const progress=1-f.t/f.max;ctx.save();ctx.globalAlpha=Math.max(0,1-progress);ctx.strokeStyle=f.color;ctx.lineWidth=f.type==='line'?2.5:Math.max(1,4*(1-progress));
  if(f.type==='clawSweep'){drawBearClawEffect(f);}
  else if(f.type==='reset'){
   const r=25+progress*70;ctx.lineWidth=3;circle(f.x,f.y,r,'#9dffe0',false);ctx.globalAlpha=(1-progress)*.28;circle(f.x,f.y,r*.8,'#66ebc8');ctx.globalAlpha=1-progress;
   for(let i=0;i<6;i++){const a=i*TAU/6+progress*1.4,x=f.x+Math.cos(a)*r*.7,y=f.y+Math.sin(a)*r*.7;ctx.strokeStyle='#d2ffed';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();}
  }
  else if(f.type==='line'){ctx.beginPath();ctx.moveTo(f.x,f.y);const dx=f.x2-f.x,dy=f.y2-f.y;for(let j=1;j<6;j++){const zig=(j%2?1:-1)*7;ctx.lineTo(f.x+dx*j/6-dy/Math.max(1,Math.hypot(dx,dy))*zig,f.y+dy*j/6+dx/Math.max(1,Math.hypot(dx,dy))*zig);}ctx.lineTo(f.x2,f.y2);ctx.stroke();}
  else{const rad=f.r*(1-Math.pow(1-progress,3));circle(f.x,f.y,rad,f.color,false);if(!visuals.reduced&&f.r<400){ctx.globalAlpha=(1-progress)*.2;circle(f.x,f.y,rad*.7,f.color);ctx.globalAlpha=1-progress;circle(f.x,f.y,rad*.68,f.color,false);}if(f.type==='spark'){for(let i=0;i<8;i++){const a=i*TAU/8;ctx.beginPath();ctx.moveTo(f.x+Math.cos(a)*rad*.65,f.y+Math.sin(a)*rad*.65);ctx.lineTo(f.x+Math.cos(a)*rad,f.y+Math.sin(a)*rad);ctx.stroke();}}}ctx.restore();}
 for(const p of run.popups){
  ctx.save();
  const isCrit=p.text.startsWith('💥')||p.text.includes('暴击');
  const isHeal=p.text.startsWith('+');
  const popScale=p.t>0.8?1+(p.t-0.8)*2.2:1;
  ctx.translate(p.x,p.y);
  ctx.scale(popScale,popScale);
  ctx.globalAlpha=Math.min(1,p.t*3);
  ctx.font=isCrit?'900 17px sans-serif':isHeal?'bold 14px sans-serif':'bold 13px sans-serif';
  ctx.textAlign='center';
  ctx.shadowBlur=isCrit?12:4;
  ctx.shadowColor=isCrit?'#f59e0b':'#000000';
  ctx.fillStyle=isCrit?'#fef08a':p.color;
  ctx.fillText(p.text,0,0);
  ctx.restore();
 }
 ctx.restore();
 const pulse=run.hazards.find(h=>h.type==='pulse');if(pulse){ctx.fillStyle='#dc343416';ctx.fillRect(0,0,view.w,view.h);ctx.textAlign='center';ctx.fillStyle='#ffe3db';ctx.font='bold 20px sans-serif';ctx.fillText('超载脉冲 '+Math.ceil(pulse.t)+' 秒 · 优先击杀巨蟾',view.w/2,155);}
 if(!visuals.reduced&&run.effects.some(f=>f.type==='pulse')){ctx.fillStyle='#ff737320';ctx.fillRect(0,0,view.w,view.h);}
 if(visuals.flash>0&&!visuals.reduced){ctx.save();ctx.globalAlpha=visuals.flash*2;ctx.strokeStyle='#ff537c';ctx.lineWidth=14;ctx.strokeRect(7,7,view.w-14,view.h-14);ctx.restore();}
 // Cinematic vignette with Quantum Transfer Apocalyptic mode
 const transferField=run&&run.skyFields&&run.skyFields.find(f=>f.kind==='transfer');
 if(transferField){
  const progress=1-transferField.life/transferField.max;
  const pulseFreq=3+progress*9;
  const pulse=Math.sin(run.time*pulseFreq)*0.5+0.5;
  const minDim=Math.min(view.w,view.h);
  const innerR=minDim*(0.48-progress*0.22);
  const outerR=Math.max(view.w,view.h)*0.82;
  const apocVig=ctx.createRadialGradient(view.w/2,view.h/2,innerR,view.w/2,view.h/2,outerR);
  apocVig.addColorStop(0,'rgba(0,0,0,0)');
  apocVig.addColorStop(0.65,`rgba(88,28,135,${0.25+progress*0.35})`);
  apocVig.addColorStop(1,`rgba(69,10,10,${0.55+progress*0.35+pulse*0.12})`);
  ctx.fillStyle=apocVig;ctx.fillRect(0,0,view.w,view.h);
  
  if(transferField.life<5){
   ctx.save();
   ctx.fillStyle='rgba(239,68,68,0.18)';
   ctx.fillRect(0,0,view.w,45);
   ctx.font='bold 16px sans-serif';ctx.textAlign='center';
   ctx.fillStyle='#fee2e2';
   ctx.shadowBlur=10;ctx.shadowColor='#ef4444';
   ctx.fillText('⚡ 警告：超载量子能量即将全域释放（倒计时 '+transferField.life.toFixed(1)+'s）· 保持机动 ⚡',view.w/2,30);
   ctx.restore();
  }
 } else if(!visuals.reduced){
  const vig=ctx.createRadialGradient(view.w/2,view.h/2,Math.min(view.w,view.h)*0.38,view.w/2,view.h/2,Math.max(view.w,view.h)*0.78);
  vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(5,8,15,0.44)');
  ctx.fillStyle=vig;ctx.fillRect(0,0,view.w,view.h);
 }
 if(view.w>950&&!demoActive){const w=130,h=87,x=view.w-w-25,y=view.h-h-85;ctx.fillStyle='#0a111bc9';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#8392a633';ctx.strokeRect(x,y,w,h);for(const e of run.enemies){ctx.fillStyle=e.boss?'#ffba80':'#b9788b';const s=e.boss?4:2;ctx.fillRect(x+e.x/run.world.w*w,y+e.y/run.world.h*h,s,s);}circle(x+run.p.x/run.world.w*w,y+run.p.y/run.world.h*h,3,run.hero.color);ctx.font='8px monospace';ctx.textAlign='left';ctx.fillStyle='#8392a6';ctx.fillText('SECTOR MAP',x+5,y+11);}
}
function frame(now){
 const dt=Math.min(.1,(now-last)/1000||0);last=now;
 if(run){
  if(run.mode==='playing'&&!devPaused){
   const speed=demoActive?demoSpeed:devEnabled?devSpeed:1;accumulator=Math.min(accumulator+dt*speed,.15*speed);
   while(accumulator>=1/60&&run.mode==='playing'){
    updateCamera();
    const x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
    if(demoActive)demoSession.step(1/60,{x,y},demoAuto);else run.step(1/60,{x,y});accumulator-=1/60;if(demoActive&&demoSession.finished&&demoMode!=='manual'){nextBossDemo(true);break;}
   }
  }else accumulator=0;
  present(dt*(demoActive?demoSpeed:devEnabled?devSpeed:1));drawWorld();uiClock+=dt;if(uiClock>.08){updateHUD(uiClock);uiClock=0;}
  // Consecutive level-ups need a fresh selection even if the mode stays upgrade.
  if(run.mode==='upgrade'&&$('dialog').dataset.offer!==run.offerKind+':'+run.offerLevel+':'+run.refreshRemaining+':'+run.choices.map(c=>c.id+':'+(c.rarity||'')+':'+run.rank(c.id)+':'+run.quantum(c.id)+':'+run.trans(c.id)).join(','))lastMode='';
  syncMode();if(run.mode==='upgrade')$('dialog').dataset.offer=run.offerKind+':'+run.offerLevel+':'+run.refreshRemaining+':'+run.choices.map(c=>c.id+':'+(c.rarity||'')+':'+run.rank(c.id)+':'+run.quantum(c.id)+':'+run.trans(c.id)).join(',');
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Read-only telemetry for browser smoke checks and performance inspection.
function setupPreviewLoop(t){
 if($('setup')&&!$('setup').hidden&&ready){
  const h=D.heroes.find(h=>h.id===selected),idx=D.heroes.indexOf(h);
  const g=$('hero-preview').getContext('2d');
  g.clearRect(0,0,560,500);
  const bob=Math.sin(t*0.0025)*5;
  sprite(g,heroAtlas,idx,4,2,280,490+bob,480);
 }
 requestAnimationFrame(setupPreviewLoop);
}
requestAnimationFrame(setupPreviewLoop);
window.SurvivorsDebug=Object.freeze({snapshot:()=>run?{mode:run.mode,hero:run.hero.id,difficulty:run.difficulty,time:run.time,stage:run.stage,wave:run.wave,phase:run.phase,level:run.level,hp:run.p.hp,x:run.p.x,y:run.p.y,angle:run.p.angle,kills:run.kills,enemies:run.enemies.length,bullets:run.bullets.length,rank:{...run.ranks},camera:{...camera},scene:run.stage===0?'desert':run.stage===1?'laboratory':'industrial',demo:demoActive?demoSession.snapshot():null,audio:{enabled:sound.enabled,volume:sound.volume,voices:sound.voices.size,played:sound.played},particles:visuals.particles.length}:null});
})();
