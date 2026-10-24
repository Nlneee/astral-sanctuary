const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(!process.env.LAB_ATTACK_INSTALLED)for(const file of ['survivor-core.js','survivor-data.js','survivors.js','boss-showcase.js'])await page.route('**/'+file+'*',r=>r.fulfill({path:path.join(__dirname,file),contentType:'text/javascript'}));
 await page.addInitScript(()=>{let api;Object.defineProperty(window,'BossShowcase',{get:()=>api,set:v=>api={...v,Session:class extends v.Session{constructor(...a){super(...a);window.demoFixture=this;}}}});});
 await page.clock.install();await page.goto('http://127.0.0.1:8765/survivors.html?showcase=1');await page.locator('#boss-showcase:not([hidden])').waitFor();await page.locator('[data-demo-boss="1"]').click();await page.locator('#demo-auto').uncheck();
 await page.locator('[data-demo-skill="barrier"]').click();await page.locator('#demo-mode').selectOption('manual');await page.clock.runFor(5100);
 const fifth=await page.evaluate(()=>demoFixture.run.hazards.find(h=>h.type==='fixedLaser'));assert.equal(fifth.shot,5);assert.equal(fifth.total,.5);await page.screenshot({path:__dirname+'/lab-fifth-lock.png'});
 await page.clock.runFor(1800);assert(await page.evaluate(()=>demoFixture.finished));
 await page.locator('[data-demo-skill="saws"]').click();await page.locator('#demo-mode').selectOption('manual');await page.clock.runFor(4200);
 assert.equal(await page.evaluate(()=>demoFixture.run.hostile.filter(b=>b.kind==='saw'&&b.grounded).length),4);
 // Move the camera target beside a landed blade to inspect the actual on-ground renderer and damage.
 await page.evaluate(()=>{const r=demoFixture.run,b=r.hostile.find(b=>b.kind==='saw');r.p.x=b.x;r.p.y=b.y;r.p.invuln=0;});await page.clock.runFor(100);await page.screenshot({path:__dirname+'/lab-ground-saw.png'});
 assert(await page.evaluate(()=>demoFixture.snapshot().damageTaken>0));const pos=await page.evaluate(()=>demoFixture.run.hostile.map(b=>({x:b.x,y:b.y})));
 await page.clock.runFor(500);assert.deepEqual(await page.evaluate(()=>demoFixture.run.hostile.map(b=>({x:b.x,y:b.y}))),pos);
 await page.clock.runFor(2500);assert(await page.evaluate(()=>demoFixture.finished));assert.equal(await page.evaluate(()=>demoFixture.run.hostile.length),0);assert.deepEqual(errors,[]);
 console.log('PASS actual second-boss showcase: fifth .5s warning, complete five-beam chain, four landed rotating blades stay fixed, contact damages and expiry clears; no page errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
