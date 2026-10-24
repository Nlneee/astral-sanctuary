const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(process.env.TEST_SCENE_PLACEHOLDER==='1')await page.route('**/desert-battlefield.png',route=>route.fulfill({path:path.join(__dirname,'assets/survivors/machines.png'),contentType:'image/png'}));
  await page.addInitScript(()=>{
   let core;Object.defineProperty(window,'SurvivorCore',{get:()=>core,set:value=>{core={...value,Run:class extends value.Run{constructor(...a){super(...a);window.__sceneRun=this;}}};}});
   const draw=CanvasRenderingContext2D.prototype.drawImage;window.__desertDraws=0;
   CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if(image?.src?.endsWith('/desert-battlefield.png'))window.__desertDraws++;return draw.call(this,image,...args);};
  });
  await page.goto(process.env.DESERT_URL||pathToFileURL(path.join(__dirname,'survivors.html')).href);await page.locator('#start:not(:disabled)').waitFor();await page.locator('#start').click();
  await page.evaluate(()=>{const r=window.__sceneRun;r.p.invuln=1000;r.spawnClock=1000;r.waveDuration=1000;});await page.waitForTimeout(120);
  const snap=()=>page.evaluate(()=>SurvivorsDebug.snapshot());
  assert.equal((await snap()).scene,'desert');assert(await page.evaluate(()=>window.__desertDraws>0));assert((await page.locator('#stage-name').innerText()).includes('外围沙场'));
  await page.screenshot({path:path.join(__dirname,'desert-center.png')});
  const positions=[['left',26,800,'KeyA'],['right',2374,800,'KeyD'],['top',1200,26,'KeyW'],['bottom',1200,1574,'KeyS'],['corner',25,25,null]];
  for(const [label,x,y,key] of positions){
   await page.evaluate(({x,y})=>{const r=window.__sceneRun;r.p.x=x;r.p.y=y;r.enemies=[];r.hostile=[];r.bullets=[];}, {x,y});
   if(key)await page.keyboard.down(key);await page.waitForTimeout(180);if(key)await page.keyboard.up(key);
   let s=await snap();assert(s.x>=25&&s.x<=2375&&s.y>=25&&s.y<=1575,'movement escaped the arena');
   if(label==='left'||label==='corner')assert.equal(s.camera.x,-320);
   if(label==='right')assert.equal(s.camera.x+1440,2720);
   if(label==='top'||label==='corner')assert.equal(s.camera.y,-280);
   if(label==='bottom')assert.equal(s.camera.y+1000,1880);
   const px=s.x-s.camera.x,py=s.y-s.camera.y,aimX=Math.min(1380,px+125),aimY=Math.max(160,py-95);const oldAngle=s.angle;await page.mouse.move(aimX,aimY);await page.waitForTimeout(90);s=await snap();assert.equal(s.angle,oldAngle,'mouse changed attack direction without enemies');
   await page.screenshot({path:path.join(__dirname,`desert-${label}.png`)});
  }
  // Stage three still uses the original industrial floor and camera limits.
  await page.evaluate(()=>{window.__sceneRun.stage=2;});await page.waitForTimeout(100);const draws=await page.evaluate(()=>window.__desertDraws);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__desertDraws),draws);let s=await snap();assert.equal(s.scene,'industrial');assert.equal(s.camera.x,0);assert.equal(s.camera.y,0);await page.screenshot({path:path.join(__dirname,'industrial-preserved.png')});
  await page.evaluate(()=>{window.__sceneRun.stage=0;});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);s=await snap();assert(Math.abs(s.camera.x+109.2)<.01);assert(s.camera.y<0);assert(s.x-s.camera.x>0&&s.x-s.camera.x<390);await page.screenshot({path:path.join(__dirname,'desert-narrow.png')});
  assert.deepEqual(errors,[]);console.log('PASS: generated desert drawn, all four exterior borders + corner visible, movement bounds retained, mouse no longer controls aim, industrial stages preserved, narrow viewport, no runtime errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
