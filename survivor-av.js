/* Synthesized, local-only combat sound bank and bounded presentation particles. */
(function(root){
'use strict';
// [waveform, start Hz, end Hz, seconds, level, noise mix].
const bank={
 reset:['sine',440,1320,.5,.16,.02],
'suicide':['sawtooth',125,28,.45,.22,.8],'warn-suicide':['square',520,1300,.5,.1,.15],
'acid':['sawtooth',170,65,.5,.1,.75],'warn-acid':['triangle',260,520,.4,.1,.3],radar:['triangle',120,50,.35,.15,.5],'warn-radar':['square',800,1500,.4,.06,0],stab:['sawtooth',700,110,.15,.12,.4],'warn-stab':['triangle',550,900,.2,.1,0],sonic:['sine',140,50,.5,.24,0],'warn-sonic':['sine',70,320,.45,.18,0],control:['sine',330,880,.5,.15,0],'warn-control':['triangle',200,660,.5,.15,0],barrier:['triangle',880,220,.45,.12,.2],'warn-barrier':['sine',440,880,.45,.15,0],bombard:['triangle',100,30,.5,.2,.7],'warn-bombard':['square',950,500,.35,.07,0],laser:['sawtooth',320,90,.5,.1,.25],'warn-laser':['sine',200,1600,.5,.16,0],saws:['sawtooth',220,130,.5,.12,.5],'warn-saws':['triangle',150,700,.4,.13,.2],
 'shot-bolt':['triangle',920,380,.12,.17,0], 'shot-twin':['sine',760,1260,.13,.15,0],
 'shot-crystal':['sine',1480,680,.22,.16,0], 'shot-bubble':['sine',330,90,.19,.24,.06],
 'shot-seed':['triangle',540,780,.17,.13,.04], 'shot-fan':['triangle',1100,420,.13,.12,.2],
 'shot-shot':['sawtooth',125,45,.12,.14,.55],hit:['triangle',190,70,.055,.1,.3],crit:['square',880,240,.11,.09,.15],
 kill:['triangle',180,35,.2,.18,.5],hurt:['sawtooth',130,65,.23,.17,.2],pickup:['sine',1100,1500,.06,.07,0],
 level:['sine',520,1040,.45,.23,0],upgrade:['triangle',660,990,.24,.2,0],evolve:['sine',440,1760,.6,.22,0],
 boss:['sawtooth',65,160,.65,.18,.13],phase:['triangle',180,720,.6,.24,.1],
 'boss-bear':['sawtooth',140,36,.75,.28,.62],'warn-bear':['sawtooth',110,32,.55,.2,.5],
 'claw':['sawtooth',620,95,.32,.22,.35],'warn-claw':['triangle',180,520,.38,.14,.1],
 'boss-overlord':['square',240,1560,.68,.22,.15],'warn-overlord':['square',420,1200,.48,.16,.1],
 'boss-taotitan':['sine',587,147,1.1,.28,.04],'warn-taotitan':['triangle',440,880,.55,.18,.05],
 'transfer':['sine',220,880,.9,.22,.08],'warn-transfer':['triangle',440,1100,.5,.15,0],win:['sine',660,1320,.65,.23,0],dead:['triangle',220,40,.6,.2,.15],
 'warn-needles':['square',640,1200,.35,.07,0],'warn-pulse':['square',280,600,.5,.08,0],
 'warn-rocket':['sawtooth',75,260,.45,.12,.3],'warn-burrow':['triangle',90,50,.3,.16,.5],
 'warn-barrage':['sawtooth',120,440,.5,.1,.1],'warn-warp':['sine',200,1600,.45,.2,.1],
 'warn-claw':['triangle',360,140,.25,.16,.3],'warn-missile':['square',1000,680,.3,.07,.1],
 'warn-strike':['triangle',530,830,.3,.12,0],'warn-charge':['sawtooth',90,300,.4,.1,.3],
 needles:['square',1800,450,.13,.06,.12],pulse:['sine',85,25,.6,.28,.6],rocket:['sawtooth',180,50,.45,.12,.7],
 burrow:['triangle',110,35,.27,.18,.65],barrage:['triangle',360,100,.18,.15,.25],warp:['sine',1400,70,.34,.2,.12],
 claw:['sawtooth',500,55,.2,.13,.65],missile:['triangle',90,25,.45,.24,.8],strike:['triangle',150,35,.35,.2,.6],charge:['sawtooth',170,50,.35,.13,.5],
 summon:['triangle',220,660,.4,.17,.12],heal:['sine',650,900,.32,.12,0],freeze:['sine',2200,1300,.2,.1,.18],chain:['square',1600,700,.1,.055,.2],
 water:['sine',260,80,.27,.14,.2],flower:['triangle',420,680,.26,.13,.1],fire:['triangle',100,45,.25,.12,.6],tick:['square',800,800,.08,.07,0]
};
for(const [name,f0,f1,duration,type] of [['warp',1200,130,.4,'sine'],['ambush',450,80,.2,'triangle'],['breath',180,700,.6,'sawtooth'],['veil',800,1600,.4,'sine'],['thunder',90,30,.45,'sawtooth'],['dash',440,70,.22,'triangle'],['rift',700,90,.3,'sawtooth'],['beam',220,900,.6,'triangle'],['pulsewave',110,35,.5,'sine'],['shield',440,880,.6,'sine']]){bank['sky-'+name]=[type,f0,f1,duration,.13,name==='thunder'?.6:.08];bank['warn-sky-'+name]=['sine',f0*.5,f0,.3,.09,0];}
for(const [name,start,end,kind] of [['prism',1100,280,'triangle'],['wall',650,240,'sine'],['trace',1600,100,'square'],['plasma',160,45,'sawtooth'],['aegis',440,1100,'sine'],['orbital',90,25,'sawtooth'],['sweep',230,900,'sawtooth'],['rush',500,70,'triangle'],['rushSlash',680,95,'sawtooth'],['fox',1000,350,'sine'],['link',660,990,'sine'],['spiritThunder',1500,80,'square'],['quantum',660,220,'sine']]){bank['hub-'+name]=[kind,start,end,.4,.15,name==='orbital'?.5:.08];bank['warn-hub-'+name]=['sine',start*.5,start,.35,.1,0];}
bank['boss-archon']=['triangle',160,1280,.85,.22,.1];
bank.transmute=['triangle',220,1760,1,.23,.04];
class Sound {
 constructor(context=null){this.ctx=context;this.ready=false;this.enabled=true;this.volume=.4;this.voices=new Set();this.last=new Map();this.played=0;this.dropped=0;}
 unlock(){try{this.ctx??=new(root.AudioContext||root.webkitAudioContext)();if(!this.ready){const c=this.ctx;this.master=c.createGain();this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-18;this.compressor.ratio.value=8;this.master.connect(this.compressor);this.compressor.connect(c.destination);this.noise=c.createBuffer(1,Math.ceil(c.sampleRate*.8),c.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;this.ready=true;this.setVolume(this.volume);}if(this.ctx.state==='suspended'&&this.ctx.resume)this.ctx.resume().catch(()=>{});return true;}catch{return false;}}
 setVolume(v){this.volume=Math.max(0,Math.min(1,Number(v)||0));if(this.ready)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.ctx.currentTime,.015);}
 setEnabled(on){this.enabled=on;if(!on)this.stop();this.setVolume(this.volume);}
 stop(){for(const v of this.voices){for(const n of v.sources){try{n.stop();}catch{}}v.cleanup();}this.last.clear();}
 play(name,x=0,important=false){
  if(!this.enabled||!this.ready||this.volume<=0)return false;const recipe=bank[name];if(!recipe)return false;
  const c=this.ctx,t=c.currentTime,gap=name==='pickup'?.09:name==='hit'?.055:name.startsWith('warn-')?.18:.07;
  if(t-(this.last.get(name)??-10)<gap||this.voices.size>=(important?20:14)){this.dropped++;return false;}this.last.set(name,t);
  const [type,f0,f1,duration,level,noise]=recipe,env=c.createGain(),pan=c.createStereoPanner(),osc=c.createOscillator();
  pan.pan.value=Math.max(-.75,Math.min(.75,x));env.gain.setValueAtTime(.0001,t);env.gain.exponentialRampToValueAtTime(level,t+.008);env.gain.exponentialRampToValueAtTime(.0001,t+duration);env.connect(pan);pan.connect(this.master);
  osc.type=type;osc.frequency.setValueAtTime(f0,t);osc.frequency.exponentialRampToValueAtTime(f1,t+duration);osc.connect(env);
  const sources=[osc],nodes=[osc,env,pan];if(noise){const n=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();n.buffer=this.noise;filter.type='lowpass';filter.frequency.value=name==='freeze'?6500:1800;gain.gain.value=noise;n.connect(filter);filter.connect(gain);gain.connect(env);sources.push(n);nodes.push(n,filter,gain);}
  let cleaned=false;const voice={sources,cleanup:()=>{if(cleaned)return;cleaned=true;nodes.forEach(n=>n.disconnect());this.voices.delete(voice);}};this.voices.add(voice);osc.onended=voice.cleanup;sources.forEach(n=>{n.start(t);n.stop(t+duration+.02);});this.played++;return true;
 }
}
class Visuals {
 constructor(){
  this.particles=[];
  this.shockwaves=[];
  this.reduced=false;
  this.flash=0;
  this.shake={x:0,y:0,trauma:0};
 }
 clear(){
  this.particles=[];
  this.shockwaves=[];
  this.flash=0;
  this.shake={x:0,y:0,trauma:0};
 }
 addTrauma(val){
  if(this.reduced)return;
  this.shake.trauma=Math.min(1,this.shake.trauma+val);
 }
 emit(e){
  const shot=e.name.startsWith('shot-'),
        heavy=['pulse','missile','phase','boss','boss-bear','boss-overlord','boss-taotitan','strike'].includes(e.name),
        color=e.color||(['heal','flower'].includes(e.name)?'#7cf1b3':['warp','phase'].includes(e.name)?'#cc9aff':'#ffd496');
  if(e.name==='hurt'){
   this.flash=.22;
   this.addTrauma(.35);
  } else if(e.name==='boss'||e.name==='phase'||e.name==='strike'||e.name==='pulse'){
   this.addTrauma(.45);
  } else if(e.name==='crit'){
   this.addTrauma(.16);
  }

  // Shockwave rings for heavy actions and crits
  if(!this.reduced&&(heavy||e.name==='crit')){
   const maxR=e.name==='phase'||e.name==='boss'?260:e.name==='pulse'||e.name==='strike'?180:heavy?115:65;
   this.shockwaves.push({
    x:e.x,y:e.y,r:8,maxR,life:.38,maxLife:.38,
    color:e.name==='crit'?'#ffd700':color,width:heavy?3.5:2
   });
  }

  if(e.name.startsWith('warn-')||['pickup','tick'].includes(e.name))return;
  const count=this.reduced?3:heavy?22:shot?5:8,limit=this.reduced?120:460;
  for(let i=0;i<count&&this.particles.length<limit;i++){
   const a=shot?(e.angle||0)+(Math.random()-.5)*.8:Math.random()*Math.PI*2;
   const speed=shot?70+Math.random()*75:heavy?50+Math.random()*180:35+Math.random()*95;
   const life=heavy?.45+Math.random()*.35:.2+Math.random()*.22;
   let kind='spark';
   if(e.name==='heal'||e.name==='reset')kind='plus';
   else if(e.name==='freeze')kind='ice';
   else if(shot)kind='muzzle';
   else if(e.name==='kill')kind=i%2===0?'shard':'spark';
   else if(e.name==='crit')kind='star';

   this.particles.push({
    x:e.x,y:e.y,
    vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
    life,max:life,
    color:kind==='star'?'#ffe57f':color,
    size:heavy?2.5+Math.random()*3:1.6,
    rot:Math.random()*Math.PI*2,
    vRot:(Math.random()-.5)*12,
    kind
   });
  }
 }
 emitStep(x,y,color='#eed2a0'){
  if(this.reduced||this.particles.length>=460)return;
  for(let i=0;i<2;i++){
   const a=Math.random()*Math.PI*2,speed=12+Math.random()*22,life=.28+Math.random()*.2;
   this.particles.push({
    x:x+(Math.random()-0.5)*12,y:y+(Math.random()-0.5)*6,
    vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-8,
    life,max:life,color,size:2.5+Math.random()*2,
    rot:0,vRot:0,kind:'step'
   });
  }
 }
 emitMobStep(x,y,color='#ad9270',heavy=false){
  if(this.reduced||this.particles.length>=440)return;
  const count=heavy?3:1;
  for(let i=0;i<count;i++){
   const a=Math.random()*Math.PI*2,speed=8+Math.random()*(heavy?32:16),life=.22+Math.random()*.2;
   this.particles.push({
    x:x+(Math.random()-0.5)*(heavy?16:8),y:y+(Math.random()-0.5)*4,
    vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-4,
    life,max:life,color,size:(heavy?3.5:2)+Math.random()*1.8,
    rot:0,vRot:0,kind:'step'
   });
  }
 }
 emitMobThruster(x,y,vx=0,vy=0,color='#38bdf8'){
  if(this.reduced||this.particles.length>=440)return;
  const life=.18+Math.random()*.15;
  this.particles.push({
   x:x+(Math.random()-0.5)*6,y:y+(Math.random()-0.5)*6,
   vx:vx+(Math.random()-0.5)*18,vy:vy+(Math.random()-0.5)*18,
   life,max:life,color,size:2+Math.random()*2,
   rot:Math.random()*Math.PI*2,vRot:(Math.random()-0.5)*8,kind:'ember'
  });
 }
 emitMobAttackFlash(x,y,color='#ffd166',r=35){
  if(this.reduced)return;
  this.shockwaves.push({
   x,y,r:6,maxR:r,life:.22,maxLife:.22,color,width:2
  });
 }
 step(dt){
  this.flash=Math.max(0,this.flash-dt);
  if(this.shake.trauma>0){
   this.shake.trauma=Math.max(0,this.shake.trauma-dt*3.2);
   const mag=Math.pow(this.shake.trauma,2)*7.5;
   this.shake.x=(Math.random()-0.5)*mag;
   this.shake.y=(Math.random()-0.5)*mag;
  }else{
   this.shake.x=0;this.shake.y=0;
  }
  for(const sw of this.shockwaves){
   sw.life-=dt;
   sw.r+=((sw.maxR-sw.r)*0.24+4);
  }
  this.shockwaves=this.shockwaves.filter(sw=>sw.life>0);
  for(const p of this.particles){
   p.life-=dt;
   p.x+=p.vx*dt;
   p.y+=p.vy*dt;
   p.rot+=p.vRot*dt;
   p.vx*=Math.exp(-dt*3.2);
   p.vy*=Math.exp(-dt*3.2);
  }
  this.particles=this.particles.filter(p=>p.life>0);
 }
 draw(g){
  g.save();
  for(const sw of this.shockwaves){
   const alpha=Math.max(0,sw.life/sw.maxLife);
   g.save();
   g.globalAlpha=alpha*0.85;
   g.strokeStyle=sw.color;
   g.lineWidth=sw.width*alpha+1;
   g.beginPath();
   g.arc(sw.x,sw.y,Math.max(1,sw.r),0,Math.PI*2);
   g.stroke();
   g.restore();
  }
  g.globalCompositeOperation='lighter';
  for(const p of this.particles){
   const alpha=Math.max(0,p.life/p.max);
   g.globalAlpha=alpha;
   g.strokeStyle=p.color;
   g.fillStyle=p.color;
   g.lineWidth=p.size;
   if(p.kind==='ember'){
    g.save();g.translate(p.x,p.y);
    g.fillStyle=p.color;g.beginPath();g.arc(0,0,Math.max(0.5,p.size*alpha),0,Math.PI*2);g.fill();
    g.fillStyle='#ffffffdd';g.beginPath();g.arc(0,0,Math.max(0.2,p.size*0.45*alpha),0,Math.PI*2);g.fill();
    g.restore();
   }else if(p.kind==='plus'){
    g.fillRect(p.x-5,p.y-1,10,2);
    g.fillRect(p.x-1,p.y-5,2,10);
   }else if(p.kind==='step'){
    g.globalAlpha=alpha*0.35;
    g.beginPath();
    g.arc(p.x,p.y,p.size*(1+(1-alpha)),0,Math.PI*2);
    g.fill();
   }else if(p.kind==='shard'){
    g.save();
    g.translate(p.x,p.y);
    g.rotate(p.rot);
    g.fillRect(-p.size,-p.size*.6,p.size*2,p.size*1.2);
    g.restore();
   }else if(p.kind==='star'){
    g.save();
    g.translate(p.x,p.y);
    g.rotate(p.rot);
    const s=p.size*1.8;
    g.beginPath();
    g.moveTo(0,-s);g.lineTo(s*.3,-s*.3);g.lineTo(s,0);g.lineTo(s*.3,s*.3);
    g.lineTo(0,s);g.lineTo(-s*.3,s*.3);g.lineTo(-s,0);g.lineTo(-s*.3,-s*.3);
    g.closePath();
    g.fill();
    g.restore();
   }else if(p.kind==='ice'){
    g.save();
    g.translate(p.x,p.y);
    g.rotate(p.rot);
    g.beginPath();
    g.moveTo(0,-p.size*1.5);g.lineTo(p.size,0);g.lineTo(0,p.size*1.5);g.lineTo(-p.size,0);
    g.closePath();
    g.fill();
    g.restore();
   }else{
    g.beginPath();
    g.moveTo(p.x,p.y);
    g.lineTo(p.x-p.vx*.038,p.y-p.vy*.038);
    g.stroke();
   }
  }
  g.restore();
 }
}
root.SurvivorAV={Sound,Visuals,bank};
})(typeof window==='undefined'?globalThis:window);
