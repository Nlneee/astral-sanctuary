// Original composition: Circuit Pressure / 回路迫近. Deterministic synthesis, no samples.
const fs=require('node:fs'),path=require('node:path');
const sr=44100,bpm=112,beat=60/bpm,bars=32,duration=bars*4*beat,N=Math.round(duration*sr),L=new Float32Array(N),R=new Float32Array(N),tau=Math.PI*2;
let seed=271828;function noise(){seed=(1664525*seed+1013904223)>>>0;return seed/2147483648-1;}const hz=m=>440*2**((m-69)/12);
function add(at,len,fn,gain=1,pan=0,echo=false){const count=Math.floor(len*sr),start=Math.round(at*sr),lg=Math.sqrt((1-pan)/2)*gain,rg=Math.sqrt((1+pan)/2)*gain;for(let i=0;i<count;i++){const t=i/sr,v=fn(t,i)*Math.min(1,t/.006,(len-t)/.025),j=(start+i)%N;L[j]+=v*lg;R[j]+=v*rg;if(echo){for(let k=1;k<=2;k++){const q=(j+Math.round(beat*.75*k*sr))%N;const a=k===1?.22:.08;L[q]+=v*rg*a;R[q]+=v*lg*a;}}}}
const progression=[[38,53,57,60,64],[34,53,57,60,65],[31,55,58,62,65],[33,52,58,61,64]];
for(let bar=0;bar<bars;bar++){
 const at=bar*4*beat,ch=progression[Math.floor(bar/2)%4],section=Math.floor(bar/8),breakdown=section===2,energy=breakdown?.65:section===3?1:.85;
 // Soft suspended minor voicings; harmonic motion has no final cadence so the loop joins naturally.
 for(let v=1;v<ch.length;v++){const f=hz(ch[v]);add(at,4.7*beat,t=>{const env=Math.min(1,t/.5)*Math.exp(-t/3.8);return env*(Math.sin(tau*f*t)+.3*Math.sin(tau*f*1.003*t)+.12*Math.sin(tau*f*2*t));},.045,v%2?.55:-.55);}
 for(let step=0;step<16;step++){
  const pos=at+step*beat/4;
  if([0,3,6,8,10,14].includes(step)){const f=hz(ch[0]+(step===14?12:0));add(pos,.37,t=>Math.exp(-t*10)*(Math.sin(tau*f*t)+.22*Math.sin(tau*f*2*t)+.1*Math.sin(tau*f*3*t)),.27*energy);}
  if(!breakdown||step%2===0){const pattern=[0,2,1,3,2,1,3,1],m=ch[1+pattern[step%8]]+(step>=8?12:0),f=hz(m);add(pos,.29,t=>Math.exp(-t*15)*(Math.sin(tau*f*t)+.2*Math.sin(tau*2*f*t)+.1*Math.sin(tau*3*f*t)),.073*energy,(step%4-1.5)*.35,true);}
  if(step%4===0&&(!breakdown||step%8===0)){add(pos,.45,t=>Math.sin(tau*(46*t+95*.025*(1-Math.exp(-t/.025))))*Math.exp(-t*10)+noise()*.05*Math.exp(-t*120),.48);}
  if(step===4||step===12){let prior=0;add(pos,.23,t=>{const n=noise(),high=n-prior;prior=n;return high*.35*Math.exp(-t*25)+Math.sin(tau*175*t)*.25*Math.exp(-t*35);},breakdown?.13:.22,.1);}
  if(step%2===0||section===3){let prior=0;add(pos,step%4===2?.13:.065,t=>{const n=noise(),high=n-prior;prior=n;return high*Math.exp(-t*(step%4===2?36:70));},step%2?.018:.034,step%4===0?-.4:.4);}
 }
 // Sparse memorable call; the remaining space leaves room for combat warnings.
 if(section===1||section===3){const motif=[74,77,76,69,72,70,69,73],note=motif[bar%8];for(const [offset,m] of [[.5,note],[2.75,note-12]]){const f=hz(m);add(at+offset*beat,.8,t=>Math.exp(-t*4)*(Math.sin(tau*f*t+1.2*Math.sin(tau*f*2*t)*Math.exp(-t*7))),.085,bar%2?.25:-.25,true);}}
}
let peak=0,sum=0;for(let i=0;i<N;i++){L[i]=Math.tanh(L[i]*1.15);R[i]=Math.tanh(R[i]*1.15);peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));}const gain=.79/peak,buf=Buffer.alloc(44+N*4);buf.write('RIFF',0);buf.writeUInt32LE(36+N*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(N*4,40);for(let i=0;i<N;i++){buf.writeInt16LE(Math.round(L[i]*gain*32767),44+i*4);buf.writeInt16LE(Math.round(R[i]*gain*32767),46+i*4);sum+=(L[i]**2+R[i]**2)*gain**2;}const output=path.join(__dirname,'assets/survivors/circuit-pressure.wav');fs.writeFileSync(output,buf);const report={title:'回路迫近 / Circuit Pressure',bpm,bars,durationSeconds:N/sr,sampleRate:sr,channels:2,peakDb:20*Math.log10(.79),rmsDb:10*Math.log10(sum/(2*N)),seamDelta:Math.max(Math.abs(L[0]-L[N-1]),Math.abs(R[0]-R[N-1]))*gain,composition:'Original D minor electronic instrumental. 8 bars pulse, 8 bars motif, 8 bars reduced percussion, 8 bars full motif. Periodic wrapped delay and pad tails.',source:'generate-music.cjs; synthesized oscillators and seeded noise, no third-party samples'};fs.writeFileSync(path.join(__dirname,'assets/survivors/circuit-pressure.json'),JSON.stringify(report,null,2));console.log(report);
