const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(!process.env.BEAR_TRIPLE_INSTALLED)for(const file of ['survivor-core.js','survivor-data.js','survivors.js','boss-showcase.js'])await page.route('**/'+file+'*',r=>r.fulfill({path:path.join(__dirname,file),contentType:'text/javascript'}));
 await page.addInitScript(()=>{let api;Object.defineProperty(window,'BossShowcase',{get:()=>api,set:v=>api={...v,Session:class extends v.Session{constructor(...args){super(...args);window.demoFixture=this;this.locks=this.run.hazards.filter(h=>h.combo).map(h=>({...h}));const session=this,warn=this.run.warnBeast;this.run.warnBeast=function(...args){const h=warn.apply(this,args);if(h.combo)session.locks.push({...h});return h;};}}}});});
 await page.clock.install();await page.goto('http://127.0.0.1:8765/survivors.html?showcase=1');await page.keyboard.type('kaifazhe');await page.locator('#boss-showcase:not([hidden])').waitFor();await page.locator('#demo-mode').selectOption('manual');await page.locator('#demo-auto').uncheck();
 await page.locator('[data-demo-skill="tripleRush"]').click();await page.locator('#demo-mode').selectOption('manual');
 await page.clock.runFor(100);assert.equal(await page.evaluate(()=>SurvivorsDebug.snapshot().demo.skill),'tripleRush');assert((await page.locator('#boss-phase').innerText()).includes('三连冲撞'));
 await page.screenshot({path:process.env.TRIPLE_SCREENSHOT||__dirname+'/bear-triple-warning.png'});
 await page.clock.runFor(500);const speed=await page.evaluate(()=>Math.hypot(demoFixture.boss.chargeX,demoFixture.boss.chargeY));assert(Math.abs(speed-400)<1e-6);
 await page.keyboard.down('KeyS');await page.clock.runFor(600);await page.keyboard.up('KeyS');await page.clock.runFor(10000);
 const result=await page.evaluate(()=>({finished:demoFixture.finished,count:demoFixture.boss.bearSkillCount,locks:demoFixture.locks.map(h=>({index:h.combo,speed:h.speed,angle:h.angle}))}));
 assert(result.finished);assert.equal(result.count,1);assert.deepEqual(result.locks.map(h=>h.index),[1,2,3]);assert(result.locks.every(h=>h.speed===400));assert(result.locks.some(h=>Math.abs(h.angle-result.locks[0].angle)>.1));assert.deepEqual(errors,[]);
 console.log('PASS actual triple-rush demo button, visible warning, exact400 velocity, three re-aimed charges afterWASD movement, count1 and complete without runtime errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
