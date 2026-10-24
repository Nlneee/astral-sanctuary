const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});
 if(!process.env.MOB_MOVEMENT_INSTALLED)for(const file of ['survivor-core.js','survivor-data.js'])await page.route('**/'+file+'*',r=>r.fulfill({path:path.join(__dirname,file),contentType:'text/javascript'}));
 await page.addInitScript(()=>{let core;Object.defineProperty(window,'SurvivorCore',{get:()=>core,set:value=>core={...value,Run:class extends value.Run{constructor(...a){super(...a);window.fixture=this;}}}});});
 await page.clock.install();await page.goto('http://127.0.0.1:8765/survivors.html');await page.locator('.hero-choice[data-hero="gpt"]').click();await page.locator('#start:not(:disabled)').click();await page.clock.runFor(250);
 for(let stage=0;stage<4;stage++){
  const before=await page.evaluate(stage=>{const r=fixture;r.mode='playing';r.stage=stage;r.wave=20;r.waveSpawned=0;r.spawnClock=r.fireClock=Infinity;r.p.x=1200;r.p.y=800;r.p.invuln=999;r.playerVelocity={x:0,y:0};r.enemies=[];r.hazards=[];r.hostile=[];r.labFields=[];r.skyFields=[];r.bullets=[];
   const pool=SurvivorData.stages[stage].wavePools[19];for(let i=0;i<48;i++){const e=r.spawn(pool[i%pool.length]);e.x=1200+Math.cos(i/48*Math.PI*2)*480;e.y=800+Math.sin(i/48*Math.PI*2)*480;e.clock=999;e.armed=true;if(i<6){e.x=950;e.y=600;}}
   return {x:r.p.x,positions:r.enemies.map(e=>({id:e.id,x:e.x,y:e.y})),speeds:r.enemies.map(e=>e.speed)};
  },stage);
  assert(new Set(before.speeds).size>30);await page.keyboard.down('KeyD');await page.clock.runFor(600);await page.keyboard.up('KeyD');
  assert((await page.evaluate(()=>fixture.p.x))>before.x+100,JSON.stringify(await page.evaluate(()=>({x:fixture.p.x,mode:fixture.mode,t:fixture.time,v:fixture.playerVelocity,debug:SurvivorsDebug.snapshot()}))));assert((await page.evaluate(()=>fixture.playerVelocity.x))>190);
  await page.keyboard.down('KeyS');await page.clock.runFor(650);await page.keyboard.up('KeyS');await page.clock.runFor(600);
  const after=await page.evaluate(()=>fixture.enemies.map(e=>({id:e.id,x:e.x,y:e.y,r:e.r})));assert.equal(after.length,48);assert(after.every(e=>Number.isFinite(e.x+e.y)&&e.x>=e.r&&e.y>=e.r&&e.x<=2400-e.r&&e.y<=1600-e.r));
  assert(after.some((e,i)=>Math.hypot(e.x-before.positions[i].x,e.y-before.positions[i].y)>100));
  assert(new Set(after.slice(0,6).map(e=>`${e.x.toFixed(1)},${e.y.toFixed(1)}`)).size===6,'initial overlap splits');
  if(stage===0||stage===2)await page.screenshot({path:path.join(__dirname,`mob-movement-stage${stage+1}.png`)});
  const frozen=await page.evaluate(()=>fixture.enemies.map(e=>{e.freeze=2;return {x:e.x,y:e.y};}));await page.clock.runFor(200);const now=await page.evaluate(()=>fixture.enemies.map(e=>({x:e.x,y:e.y})));assert.deepEqual(now,frozen,'frozen units do not drift or retreat');
 }
 assert.deepEqual(errors,[]);console.log('PASS actual four-sector page:48 moving mobs each, distinct individual speeds, WASD velocity and motion, overlap separation, frozen positions and bounded movement, no runtime errors');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
