const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{let core;Object.defineProperty(window,'SurvivorCore',{get:()=>core,set:v=>core={...v,Run:class extends v.Run{constructor(...a){super(...a);window.fixture=this;}}}});});
 await page.goto('http://127.0.0.1:8765/survivors.html');await page.locator('#start:not(:disabled)').click();
 await page.evaluate(()=>{fixture.giveXP(15+28+42);fixture.offer();});
 const refresh=page.locator('#refresh-upgrades');await refresh.waitFor();
 assert((await refresh.textContent()).includes('2 / 2'));assert.equal(await refresh.locator('kbd').innerText(),'Y');assert.equal(await refresh.getAttribute('aria-keyshortcuts'),'Y');
 // A modified browser shortcut does not spend a reroll. Holding Y spends only one.
 await page.keyboard.press('Control+y');assert.equal(await page.evaluate(()=>fixture.refreshRemaining),2);
 await page.keyboard.down('y');await page.waitForFunction(()=>fixture.refreshRemaining===1);
 const once=await page.evaluate(()=>JSON.stringify(fixture.choices));
 await page.keyboard.down('y');assert.equal(await page.evaluate(()=>fixture.refreshRemaining),1);assert.equal(await page.evaluate(()=>JSON.stringify(fixture.choices)),once);
 await page.keyboard.up('y');await page.waitForFunction(()=>document.querySelector('#refresh-upgrades').textContent.includes('1 / 2'));
 // Mouse and keyboard share the existing two-use allowance.
 await refresh.click();await page.waitForFunction(()=>document.querySelector('#refresh-upgrades').textContent.includes('0 / 2'));
 assert(await refresh.isDisabled());const exhausted=await page.evaluate(()=>JSON.stringify(fixture.choices));await page.keyboard.press('y');assert.equal(await page.evaluate(()=>JSON.stringify(fixture.choices)),exhausted);
 assert((await page.locator('.upgrade-refresh p').textContent()).includes('神话 2%'));assert.equal(await page.evaluate(()=>fixture.upgradeQueue),3);
 await page.locator('.upgrade-card').first().click();await page.waitForFunction(()=>document.querySelector('#dialog-title').textContent.includes('专属路线'));assert.equal(await refresh.count(),0);
 const route=await page.evaluate(()=>JSON.stringify(fixture.choices));await page.keyboard.press('y');assert.equal(await page.evaluate(()=>JSON.stringify(fixture.choices)),route);
 await page.locator('.upgrade-card').first().click();await refresh.waitFor();assert((await refresh.textContent()).includes('2 / 2'));
 await page.keyboard.press('Shift+y');await page.waitForFunction(()=>fixture.refreshRemaining===1);
 await page.screenshot({path:process.env.REROLL_SCREENSHOT||__dirname+'/upgrade-y-key.png'});
 await page.locator('.upgrade-card').first().click();await page.waitForFunction(()=>fixture.mode==='playing');await page.keyboard.press('y');assert.equal(await page.evaluate(()=>fixture.mode),'playing');
 // Boss common reward uses the same action, and typing in the developer input is ignored.
 await page.evaluate(()=>fixture.offer('boss'));await refresh.waitFor();
 await page.evaluate(()=>{document.querySelector('#developer-panel').hidden=false;});await page.locator('#dev-wave').focus();await page.keyboard.press('y');assert.equal(await page.evaluate(()=>fixture.refreshRemaining),2);
 await refresh.focus();await page.keyboard.press('y');await page.waitForFunction(()=>fixture.refreshRemaining===1);assert.equal(await page.evaluate(()=>fixture.offerKind),'boss');
 assert.deepEqual(errors,[]);console.log('PASS Y/Shift+Y refresh, no repeated or modified/input/route/combat refresh, mouse shares2 uses, exhausted stable, next common reset, boss reward, visible shortcut, no runtime errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
