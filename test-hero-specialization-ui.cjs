const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 for(const hero of ['gpt','glm','deepseek']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(!process.env.HERO_SPECIALIZATION_INSTALLED)for(const file of ['survivor-data.js','survivor-core.js'])await page.route('**/'+file+'*',r=>r.fulfill({path:path.join(__dirname,file),contentType:'text/javascript'}));
  await page.addInitScript(()=>{let core;Object.defineProperty(window,'SurvivorCore',{get:()=>core,set:v=>core={...v,Run:class extends v.Run{constructor(...a){super(...a);window.fixture=this;}}}});});
  await page.clock.install();await page.goto('http://127.0.0.1:8765/survivors.html');await page.locator(`.hero-choice[data-hero="${hero}"]`).click();await page.locator('#start:not(:disabled)').click();
  await page.evaluate(()=>{fixture.level=3;fixture.upgradeQueue=1;fixture.offer();});await page.clock.runFor(500);assert((await page.locator('#dialog').innerText()).includes('6%'));await page.screenshot({path:__dirname+`/upgrade-${hero}.png`});
  await page.evaluate(()=>{const r=fixture;r.mode='playing';r.upgradeQueue=0;r.spawnClock=Infinity;r.p.invuln=999;for(const route of r.hero.routes)r.ranks[route.id]=3;r.takeStats();r.enemies=[];for(let i=0;i<8;i++){const e=r.spawn(6,{x:1450+i%4*40,y:760+Math.floor(i/4)*40});e.hp=e.maxHp=1e7;e.speed=0;e.clock=999;}r.fireClock=0;});
  await page.clock.runFor(5000);assert(await page.evaluate(()=>fixture.damageDone>0));assert.deepEqual(errors,[]);await page.screenshot({path:__dirname+`/combat-${hero}.png`});await page.close();
 }console.log('PASS upgraded route cards and real5s combat for GPT/GLM/DeepSeek, no runtime errors');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
