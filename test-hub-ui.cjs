const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});
 if(!process.env.HUB_INSTALLED){
  for(const file of ['survivors.html','survivor-data.js','survivor-core.js','survivor-hub.js','survivor-archon-mech.js','survivor-archon-spirit.js','survivors.js','survivor-av.js','boss-showcase.js'])await page.route('**/'+file+'*',r=>r.fulfill({path:path.join(__dirname,file),contentType:file.endsWith('.html')?'text/html':'text/javascript'}));
  await page.route('**/hub-roster-source.png',r=>r.fulfill({path:path.join(__dirname,'assets/survivors/hub-roster-source.png'),contentType:'image/png'}));
 }
 await page.addInitScript(()=>{let core;Object.defineProperty(window,'SurvivorCore',{get:()=>core,set:value=>core={...value,Run:class extends value.Run{constructor(...a){super(...a);window.fixture=this;}}}});});
 await page.clock.install();await page.goto('http://127.0.0.1:8765/survivors.html');await page.locator('.hero-choice[data-hero="gpt"]').click();await page.locator('#start:not(:disabled)').click();await page.clock.runFor(100);
 await page.evaluate(()=>{
  const r=fixture;r.step=()=>{};r.stage=3;r.wave=20;r.p.x=1200;r.p.y=800;r.p.invuln=999;r.enemies=[];r.hazards=[];r.hubFields=[];r.bullets=[];r.hostile=[];
  window.advance=t=>{for(let i=0;i<Math.round(t/.01);i++){r.time+=.01;r.updateHubLinks();r.updateZones(.01);}};
  window.resetHub=()=>{r.enemies=[];r.hazards=[];r.hubFields=[];r.hostile=[];r.p.x=1400;r.p.y=800;r.p.invuln=999;};
  for(let i=0;i<9;i++){const e=r.spawn(31+i);e.x=900+i%3*270;e.y=580+Math.floor(i/3)*200;e.clock=999;e.speed=0;}r.updateHubLinks();
 });await page.clock.runFor(100);assert.equal(await page.evaluate(()=>fixture.enemies.filter(e=>e.atlas==='hub').length),9);await page.screenshot({path:__dirname+'/hub-roster.png'});
 await page.evaluate(()=>{resetHub();const r=fixture,e=r.spawn(35);e.x=1000;e.y=800;e.clock=999;e.speed=0;r.hubCast(e,'prism');});await page.clock.runFor(50);await page.screenshot({path:__dirname+'/hub-prism-warning.png'});
 await page.evaluate(()=>advance(1));await page.clock.runFor(50);await page.screenshot({path:__dirname+'/hub-prism-active.png'});assert.equal(await page.evaluate(()=>fixture.hubFields[0].angles.length),3);
 await page.evaluate(()=>{resetHub();const r=fixture,e=r.spawn(36);e.x=1000;e.y=800;r.playerVelocity={x:210,y:0};r.hubCast(e,'wall');advance(.85);});await page.clock.runFor(50);await page.screenshot({path:__dirname+'/hub-wall.png'});
 await page.evaluate(()=>{resetHub();const r=fixture,e=r.spawn(37);e.x=1000;e.y=800;r.hubTrail=Array.from({length:20},(_,i)=>({x:1200+i*20,y:750+Math.sin(i/6)*100,time:r.time-2+i*.1}));r.hubCast(e,'trace');});await page.clock.runFor(50);await page.screenshot({path:__dirname+'/hub-trace.png'});
 await page.evaluate(()=>{resetHub();const r=fixture,e=r.spawn(39);e.x=1000;e.y=800;r.hubCast(e,'mortar');advance(2);});await page.clock.runFor(50);await page.screenshot({path:__dirname+'/hub-plasma.png'});assert.equal(await page.evaluate(()=>fixture.hubFields.filter(f=>f.kind==='plasma').length),4);
 await page.evaluate(()=>{resetHub();const r=fixture;r.spawnBoss();const e=r.enemies[0];e.x=1000;e.y=800;e.clock=999;e.speed=0;r.hubCast(e,'aegis');advance(.55);});await page.clock.runFor(50);await page.screenshot({path:__dirname+'/hub-boss-mech.png'});assert.equal(await page.evaluate(()=>fixture.enemies[0].sprite),9);
 await page.evaluate(()=>{const r=fixture,e=r.enemies[0];r.hubFields=[];r.hazards=[];e.shield=0;r.hubInitBoss(e,'spirit');r.hubPhase(e);r.hubCast(e,'quantum');advance(1.5);});await page.clock.runFor(50);await page.screenshot({path:__dirname+'/hub-boss-spirit.png'});assert.equal(await page.evaluate(()=>fixture.enemies[0].sprite),10);assert(await page.evaluate(()=>fixture.hubFields.some(f=>f.kind==='quantum'&&f.coreRadius===46)));
 await page.goto('http://127.0.0.1:8765/survivors.html?showcase=1&boss=4&skill=ascended');await page.locator('#boss-showcase:not([hidden])').waitFor();await page.clock.runFor(200);assert.equal(await page.locator('[data-demo-skill]').count(),8);assert.equal(await page.evaluate(()=>SurvivorsDebug.snapshot().demo.skill),'ascended');await page.clock.runFor(1300);await page.screenshot({path:__dirname+'/hub-demo-spirit.png'});assert(await page.evaluate(()=>SurvivorsDebug.snapshot().demo.fields.includes('quantum')));assert.deepEqual(errors,[]);
 console.log('PASS actual Hub atlas9 mobs/2 boss bodies, split laser warnings/fields, wall/trace/plasma, shield, spirit homing quantum orb and8 selectable demo entries; no runtime errors');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
