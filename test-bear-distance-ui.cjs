const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(!process.env.BEAR_DISTANCE_INSTALLED)for(const file of ['survivor-core.js','survivor-data.js','survivors.js','boss-showcase.js'])await page.route('**/'+file+'*',r=>r.fulfill({path:path.join(__dirname,file),contentType:'text/javascript'}));
 await page.clock.install();await page.goto('http://127.0.0.1:8765/survivors.html?showcase=1');await page.keyboard.type('kaifazhe');await page.locator('#boss-showcase:not([hidden])').waitFor();await page.locator('#demo-mode').selectOption('manual');
 for(const [id,time] of [['swipe',100],['rush',100],['barrage',100],['warp',650],['missile',100],['tripleRush',100]]){
  await page.locator(`[data-demo-skill="${id}"]`).click();await page.locator('#demo-mode').selectOption('manual');await page.locator('#demo-auto').uncheck();await page.clock.runFor(time);
  assert.equal(await page.evaluate(()=>SurvivorsDebug.snapshot().demo.skill),id);
  await page.screenshot({path:__dirname+'/bear-'+id+'-preview.png'});
  await page.clock.runFor(8000);
 }
 assert.deepEqual(errors,[]);console.log('PASS actual demo page displays both basics, three retained skills and phase-three triple rush with no runtime errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
