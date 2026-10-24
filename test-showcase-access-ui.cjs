const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const base=(process.env.GAME_URL||'http://127.0.0.1:8765/survivors.html').replace(/\/$/,'');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();
  const ready=()=>page.locator('#start:not(:disabled)').waitFor();
  const hidden=async()=>{for(const id of ['developer-boss-demo','developer-special-demo','boss-showcase','developer-panel','developer-launcher'])assert(await page.locator('#'+id).isHidden(),id+' stays hidden');};
  await page.goto(base);await ready();await hidden();
  // Programmatic activation of a hidden link must not bypass the developer gate.
  await page.locator('#developer-boss-demo').evaluate(e=>e.click());
  assert(await page.locator('#setup').isVisible());assert.equal(await page.evaluate(()=>SurvivorsDebug.snapshot()),null);
  await page.keyboard.type('kaifazh');await hidden();await page.keyboard.type('e');
  assert(await page.locator('#developer-panel').isVisible());assert(await page.locator('#developer-boss-demo').isVisible());assert(await page.locator('#developer-special-demo').isVisible());
  await page.locator('#developer-boss-demo').click();assert(await page.locator('#boss-showcase').isVisible());assert.equal(await page.locator('[data-demo-kind="boss"]').getAttribute('aria-pressed'),'true');
  assert(await page.locator('#developer-panel').isHidden());assert(await page.locator('#developer-launcher').isHidden());
  await page.locator('#demo-exit').click();assert(await page.locator('#developer-boss-demo').isVisible());assert(await page.locator('#developer-launcher').isVisible());
  await page.locator('#developer-special-demo').click();assert.equal(await page.locator('[data-demo-kind="special"]').getAttribute('aria-pressed'),'true');assert(await page.locator('#demo-tuning').isVisible());
  await page.locator('#demo-exit').click();await page.reload();await ready();await hidden();
  for(const query of ['?showcase=1&boss=2&skill=laser','?showcase=1&kind=special']){
   await page.goto(base+query);await ready();await hidden();assert(await page.locator('#setup').isVisible());
   await page.keyboard.type('kaifazhe');assert(await page.locator('#boss-showcase').isVisible());
   const snapshot=await page.evaluate(()=>SurvivorsDebug.snapshot());assert.equal(await page.locator('[data-demo-kind="'+(query.includes('special')?'special':'boss')+'"]').getAttribute('aria-pressed'),'true');
   if(!query.includes('special'))assert.equal(snapshot.demo.skill,'laser');
   await page.reload();await ready();await hidden();
  }
  // A stale deep link still allows normal gameplay and normal record persistence.
  await page.goto(base+'?showcase=1');await ready();await page.locator('#start').click();await page.clock.runFor(100);
  assert.equal(await page.evaluate(()=>SurvivorsDebug.snapshot().demo),null);assert(await page.locator('#play').isVisible());
  await page.keyboard.press('Escape');await page.locator('#sound').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('astral_survivors_v1')).sound),false);
  await page.setViewportSize({width:480,height:840});await page.goto(base);await ready();await hidden();await page.keyboard.type('kaifazhe');
  assert(await page.locator('#developer-boss-demo').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(process.env.ACCESS_SCREENSHOT)await page.screenshot({path:process.env.ACCESS_SCREENSHOT});
  assert.deepEqual(errors,[]);console.log('PASS developer-only Boss/special entries,blocked hidden clicks and direct URLs,deep-link unlock,correct skill,return/switch,refresh reset,normal play/save from old URLs,mobile and no runtime errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
