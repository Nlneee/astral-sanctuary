const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(!process.env.MECH_TRACKING_INSTALLED)for(const file of ['survivor-archon-mech.js','survivor-hub.js','survivor-core.js','survivors.js','boss-showcase.js'])await page.route('**/'+file+'*',r=>r.fulfill({path:path.join(__dirname,file),contentType:'text/javascript'}));
 await page.addInitScript(()=>{let core;Object.defineProperty(window,'SurvivorCore',{get:()=>core,set:value=>core={...value,Run:class extends value.Run{constructor(...a){super(...a);window.fixture=this;}}}});});
 await page.clock.install();await page.goto('http://127.0.0.1:8765/survivors.html?showcase=1&boss=4&skill=orbital');await page.keyboard.type('kaifazhe');await page.locator('#boss-showcase:not([hidden])').waitFor();await page.locator('#demo-mode').selectOption('manual');await page.clock.runFor(100);
 assert((await page.locator('#boss-showcase').innerText()).includes('六连追踪天光'));
 await page.evaluate(()=>{window.shots=[];const r=fixture,resolve=r.resolveHubHazard.bind(r);r.resolveHubHazard=h=>{if(h.type==='orbital')shots.push({shot:h.shot,x:h.x,y:h.y});resolve(h);};});
 await page.screenshot({path:__dirname+'/mech-orbital-lock.png'});await page.clock.runFor(3500);assert.equal(await page.evaluate(()=>shots.length),6);assert(await page.evaluate(()=>new Set(shots.map(s=>s.x.toFixed(2)+','+s.y.toFixed(2))).size)>1);
 await page.locator('[data-demo-skill="aegis"]').click();await page.clock.runFor(850);assert(await page.evaluate(()=>fixture.hubFields.some(f=>f.kind==='aegis'&&f.pull&&f.life>4)));await page.screenshot({path:__dirname+'/mech-shield-pull.png'});
 await page.clock.runFor(3200);assert(await page.evaluate(()=>fixture.hubFields.some(f=>f.kind==='aegis'&&f.pulseRadius>0&&f.life<2)));await page.screenshot({path:__dirname+'/mech-shield-pulse.png'});
 await page.clock.runFor(2000);assert(!await page.evaluate(()=>fixture.hubFields.some(f=>f.kind==='aegis')));
 await page.locator('[data-demo-skill="spiritAegis"]').click();await page.clock.runFor(650);assert(await page.evaluate(()=>fixture.hubFields.some(f=>f.kind==='aegis'&&!f.pull&&!f.pulse&&f.max===3)));
 assert.deepEqual(errors,[]);console.log('PASS rendered live six-shot tracking, suction/shield and expanding pulse, independent spirit preview, no page errors');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
