const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(!process.env.ACID_INSTALLED)for(const f of ['survivor-core.js','survivors.js'])await page.route('**/'+f,r=>r.fulfill({path:path.join(__dirname,f),contentType:'text/javascript'}));
 await page.addInitScript(()=>{let core;Object.defineProperty(window,'SurvivorCore',{get:()=>core,set:value=>core={...value,Run:class extends value.Run{constructor(...a){super(...a);window.fixture=this;}}}});});
 await page.goto('http://127.0.0.1:8765/survivors.html');await page.locator('.hero-choice[data-hero="gpt"]').click();await page.locator('#start:not(:disabled)').click();
 await page.evaluate(()=>{const r=fixture;r.step=()=>{};r.developerJump(1,10);r.p.invuln=999;r.p.x=1400;r.p.y=800;const e=r.spawn(17);e.x=1000;e.y=800;e.clock=0;e.speed=0;r.updateLabEnemy(e,.01);if(r.hazards.length)throw Error('out-of-range spray');e.x=1200;r.updateLabEnemy(e,.01);r.updateZones(.85);const f=r.labFields.find(f=>f.kind==='acid');window.cloudOrigin=f.x;r.p.x=1560;e.speed=50;for(let i=0;i<100;i++){r.time+=.01;r.updateLabEnemy(e,.01);r.updateZones(.01);}if(Math.abs(f.x-cloudOrigin)>1e-6||e.x<=cloudOrigin)throw Error('cloud followed emitter or emitter stayed rooted');});
 await page.screenshot({path:__dirname+'/acid-stationary-mobile-emitter.png'});assert(Math.abs(await page.evaluate(()=>fixture.labFields[0].life)-4)<1e-6);
 await page.evaluate(()=>{const r=fixture;r.labFields=[];r.hazards=[];r.enemies=[];r.p.x=1600;const e=r.spawn(19);e.x=1200;e.y=800;e.speed=0;e.clock=0;r.updateLabEnemy(e,.01);});await page.screenshot({path:__dirname+'/lancer-long-warning.png'});
 await page.evaluate(()=>{const r=fixture,e=r.enemies[0];r.updateZones(.75);for(let i=0;i<28;i++)r.updateLabEnemy(e,.01);if(Math.abs(e.x-1200-203.84)>1e-6)throw Error('dash distance');});assert.deepEqual(errors,[]);
 console.log('PASS actual page range gating, moving emitter with stationary lingering cloud, longer thrust warning and203.84 displacement; no runtime errors');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
