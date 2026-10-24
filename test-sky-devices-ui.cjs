const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(!process.env.SKY_DEVICES_INSTALLED)for(const file of ['survivor-core.js','survivor-data.js','survivors.js','boss-showcase.js'])await page.route('**/'+file+'*',r=>r.fulfill({path:path.join(__dirname,file),contentType:'text/javascript'}));
 await page.addInitScript(()=>{let api;Object.defineProperty(window,'BossShowcase',{get:()=>api,set:v=>api={...v,Session:class extends v.Session{constructor(...a){super(...a);window.demoFixture=this;}}}});});
 await page.clock.install();await page.goto('http://127.0.0.1:8765/survivors.html?showcase=1');await page.keyboard.type('kaifazhe');await page.locator('#boss-showcase:not([hidden])').waitFor();await page.locator('[data-demo-boss="2"]').click();await page.locator('#demo-auto').uncheck();
 await page.locator('[data-demo-skill="discs"]').click();await page.locator('#demo-mode').selectOption('manual');await page.clock.runFor(500);
 assert.equal(await page.evaluate(()=>demoFixture.run.skyFields.filter(f=>f.kind==='discs').length),3);await page.screenshot({path:__dirname+'/sky-discs.png'});
 await page.clock.runFor(8500);assert(await page.evaluate(()=>demoFixture.finished));assert.equal(await page.evaluate(()=>demoFixture.run.skyFields.length),0);
 await page.locator('[data-demo-skill="oscillator"]').click();await page.locator('#demo-mode').selectOption('manual');await page.clock.runFor(150);
 const device=await page.evaluate(()=>({armed:demoFixture.run.skyFields[0]?.armed,enemies:demoFixture.run.enemies.length}));assert(device.armed);assert.equal(device.enemies,1);await page.screenshot({path:__dirname+'/sky-oscillator.png'});
 await page.clock.runFor(2000);assert(await page.evaluate(()=>demoFixture.finished));assert.equal(await page.evaluate(()=>demoFixture.run.skyFields.length),0);assert(await page.evaluate(()=>demoFixture.snapshot().damageTaken>0));
 assert.deepEqual(errors,[]);console.log('PASS actual demo UI:3 rendered tracking discs return and clear; indestructible device triggers one shock and clears; no page errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
