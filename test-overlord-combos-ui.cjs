const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(!process.env.COMBOS_INSTALLED)for(const name of ['survivor-core.js','survivor-data.js','survivors.js'])await page.route('**/'+name,r=>r.fulfill({path:path.join(__dirname,name),contentType:'text/javascript'}));
 await page.addInitScript(()=>{let core;Object.defineProperty(window,'SurvivorCore',{get:()=>core,set:value=>core={...value,Run:class extends value.Run{constructor(...a){super(...a);window.fixture=this;}}}});});
 await page.goto('http://127.0.0.1:8765/survivors.html');await page.locator('.hero-choice[data-hero="gpt"]').click();await page.locator('#start:not(:disabled)').click();
 await page.evaluate(()=>{const r=fixture;r.step=()=>{};r.stage=1;r.spawnBoss();r.p.x=1400;r.p.y=800;r.p.invuln=999;const e=r.enemies[0];e.x=1050;e.y=800;e.clock=999;e.speed=0;
  window.tick=t=>{for(let i=0;i<Math.round(t/.01);i++){r.time+=.01;r.updateBullets(.01);r.updateZones(.01);}};
  window.cast=s=>{r.labFields=[];r.hazards=[];r.hostile=[];r.effects=[];e.labSeen=new Set();r.p.x=1400;r.p.y=800;r.castLabBoss(e,s,0);};cast('barrier');tick(.8);
 });
 assert.deepEqual(await page.evaluate(()=>({wall:fixture.labFields.some(f=>f.kind==='barrier'),shot:fixture.hazards.find(h=>h.type==='fixedLaser')?.shot,time:fixture.hazards.find(h=>h.type==='fixedLaser')?.t})),{wall:true,shot:1,time:.5});
 await page.screenshot({path:__dirname+'/combo-wall-immediate-lock.png'});
 await page.evaluate(()=>tick(.5));assert(await page.evaluate(()=>fixture.labFields.some(f=>f.kind==='fixedLaser'&&f.life===.5)));await page.screenshot({path:__dirname+'/combo-wall-static-beam.png'});
 await page.evaluate(()=>{fixture.p.y=940;tick(.5);});assert.equal(await page.evaluate(()=>fixture.hazards.find(h=>h.type==='fixedLaser').shot),2);
 await page.evaluate(()=>{fixture.p.y=660;tick(.5);});const angle=await page.evaluate(()=>fixture.labFields.find(f=>f.kind==='fixedLaser').angle);assert(angle>0);await page.evaluate(()=>tick(.5));assert.equal(await page.evaluate(()=>fixture.hazards.find(h=>h.type==='fixedLaser').shot),3);await page.evaluate(()=>tick(3));assert(await page.evaluate(()=>!fixture.labFields.some(f=>f.kind==='barrier'||f.kind==='fixedLaser')&&!fixture.hazards.some(h=>h.type==='fixedLaser')));
 await page.evaluate(()=>{cast('laser');tick(.9);tick(1.3);});assert(await page.evaluate(()=>fixture.hostile.filter(b=>b.kind==='sCurve').length>=12));await page.screenshot({path:__dirname+'/combo-rotating-laser-snake.png'});
 await page.setViewportSize({width:480,height:840});await page.screenshot({path:__dirname+'/combo-narrow.png'});assert.deepEqual(errors,[]);
 console.log('PASS actual page: immediate first lock inside wall, five successive stationary beams, .5-second beam life, S-shaped projectiles alongside rotating laser, desktop/narrow rendering, no runtime errors');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
