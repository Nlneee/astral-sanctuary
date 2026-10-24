const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const errors=[];const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 if(process.env.TEST_ART_PLACEHOLDER==='1')await page.route('**/heroes.png',route=>route.fulfill({path:path.join(__dirname,'assets/survivors/machines.png'),contentType:'image/png'}));
 // Isolated browser fixture only; production exposes no mutable run state.
 await page.addInitScript(()=>{let core;Object.defineProperty(window,'SurvivorCore',{get:()=>core,set:value=>{core={...value,Run:class extends value.Run{constructor(...args){super(...args);window.__testRun=this;}}};}});});
 try{
  await page.goto(process.env.SURVIVORS_URL||pathToFileURL(path.join(__dirname,'survivors.html')).href);await page.locator('#start:not(:disabled)').waitFor();
  assert.equal(await page.locator('.hero-choice').count(),7);
  for(const id of ['gpt','gemini','glm','deepseek','claude','qwen','grok']){await page.locator(`[data-hero="${id}"]`).click();assert.equal(await page.locator('.route-card').count(),3);assert((await page.locator('#hero-name').innerText()).length>0);}
  await page.locator('[data-hero="gpt"]').click();await page.locator('[data-difficulty="easy"]').click();await page.screenshot({path:path.join(__dirname,'setup-desktop.png'),fullPage:true});
  await page.locator('#help-open').click();assert(await page.locator('#help').isVisible());await page.keyboard.press('Escape');assert(!(await page.locator('#help').isVisible()));
  await page.locator('#start').click();await page.waitForTimeout(300);let s=await page.evaluate(()=>SurvivorsDebug.snapshot());assert.equal(s.hero,'gpt');assert.equal(s.difficulty,'easy');
  await page.evaluate(()=>{const r=window.__testRun,e=r.spawn(0);e.x=r.p.x+400;e.y=r.p.y;e.speed=0;e.hp=e.maxHp=10000;r.spawnClock=999;});await page.mouse.move(50,50);await page.keyboard.down('KeyD');await page.waitForTimeout(700);await page.keyboard.up('KeyD');let moved=await page.evaluate(()=>SurvivorsDebug.snapshot());assert(moved.x>s.x+40);assert(Math.abs(moved.angle)<.3);assert(moved.bullets>0);
  await page.keyboard.press('Escape');assert.equal((await page.evaluate(()=>SurvivorsDebug.snapshot())).mode,'paused');const t=(await page.evaluate(()=>SurvivorsDebug.snapshot())).time;await page.waitForTimeout(200);assert.equal((await page.evaluate(()=>SurvivorsDebug.snapshot())).time,t);
  await page.locator('#resume').click();
  // Drive the actual visible game for a short play session and accept real upgrades.
  for(let i=0;i<18;i++){
   const state=await page.evaluate(()=>SurvivorsDebug.snapshot());
   if(state.mode==='upgrade'){await page.locator('.upgrade-card').first().click();continue;}
   if(state.mode==='dead')break;
   await page.mouse.move(950+Math.cos(i)*260,500+Math.sin(i)*250);
   await page.keyboard.down(i%4<2?'KeyD':'KeyA');await page.keyboard.down(i%4===0||i%4===3?'KeyW':'KeyS');await page.waitForTimeout(650);await page.keyboard.up('KeyD');await page.keyboard.up('KeyA');await page.keyboard.up('KeyW');await page.keyboard.up('KeyS');
  }
  await page.screenshot({path:path.join(__dirname,'battle-desktop.png')});const combat=await page.evaluate(()=>SurvivorsDebug.snapshot());assert(combat.time>5);console.log('Visible gameplay:',combat);
  if(combat.mode==='upgrade')await page.locator('.upgrade-card').first().click();
  if((await page.evaluate(()=>SurvivorsDebug.snapshot())).mode==='playing'){await page.keyboard.press('Escape');await page.locator('#exit-run').click();}else if((await page.evaluate(()=>SurvivorsDebug.snapshot())).mode==='dead')await page.locator('#reselect').click();
  await page.reload();await page.locator('#start:not(:disabled)').waitFor();await page.locator('#start').click();
  await page.evaluate(()=>{const r=window.__testRun;r.stage=2;r.time=190;r.level=20;r.p.invuln=30;r.ranks={focus:3,chain:3,orbit:3,power:2,haste:2};r.takeStats();r.spawnBoss();for(let i=0;i<30;i++){const e=r.spawn(i%5);e.x=r.p.x+Math.cos(i*.72)*(170+i*9);e.y=r.p.y+Math.sin(i*.72)*(170+i*7);}r.events=[];});
  await page.mouse.move(1200,500);await page.waitForTimeout(1500);await page.screenshot({path:path.join(__dirname,'boss-battle.png')});
  await page.evaluate(()=>{const r=window.__testRun;r.upgradeQueue=1;r.offer();});await page.locator('.upgrade-card').first().waitFor();assert.equal(await page.locator('.upgrade-card').count(),3);const stopped=(await page.evaluate(()=>SurvivorsDebug.snapshot())).time;await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>SurvivorsDebug.snapshot())).time,stopped);await page.screenshot({path:path.join(__dirname,'upgrade.png')});await page.keyboard.press('Digit1');assert.equal((await page.evaluate(()=>SurvivorsDebug.snapshot())).mode,'playing');
  await page.evaluate(()=>{const r=window.__testRun;const boss=r.enemies.find(e=>e.boss);r.p.invuln=999;for(let phase=0;phase<3;phase++){for(let i=0;i<2000&&(!boss.phaseDone||boss.phaseAge<4);i++){r.updateEnemies(.025);r.updateZones(.025);}r.hit(boss,boss.maxHp*2,false);}});await page.locator('.upgrade-card').first().waitFor();await page.locator('.upgrade-card').first().click();await page.locator('#advance').waitFor();assert.equal((await page.evaluate(()=>SurvivorsDebug.snapshot())).stage,2);await page.locator('#advance').click();assert.equal((await page.evaluate(()=>SurvivorsDebug.snapshot())).stage,3);
  await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('#start:not(:disabled)').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(__dirname,'setup-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: all 7 hero selection, three routes each, difficulty, help, movement, nearest-target aim, autofire, pause/resume, real gameplay, restart setup, mobile layout, no runtime errors');
 } finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
