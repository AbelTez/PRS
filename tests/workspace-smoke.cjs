// Read-only screen checks, suitable for local or deployed sample accounts.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const site=process.env.SITE_URL || 'http://127.0.0.1:5174';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 try{
  for(const [username,route] of [['dr.abdi','home'],['liaison.blacklion','home'],['it.blacklion','home'],['woreda.ws','dashboard'],['abeba.k','portal']]){
   const context=await browser.newContext({viewport:{width:1280,height:900}});
   const page=await context.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(site+'/login');await page.getByLabel('Username',{exact:true}).fill(username);
   await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/'+route);
   await page.locator('main').waitFor();await page.waitForTimeout(1000);
   if(username==='dr.abdi'){
    await page.locator('button[lang="am"]').filter({visible:true}).first().click();
    assert.equal(await page.locator('html').getAttribute('lang'),'am');
    await page.reload();assert.equal(await page.locator('html').getAttribute('lang'),'am');
    await page.locator('button[lang="en"]').filter({visible:true}).first().click();
    await page.goto(site+'/referrals?view=all');
    const detail=page.locator('a[href^="/referrals/"]').filter({visible:true}).first();
    await detail.click();await page.waitForTimeout(1000);
    assert.ok(await page.locator('main').innerText());
    await page.getByRole('tab',{name:/Activity/}).click();
    await page.getByRole('tabpanel').waitFor();
    for(const width of [360,768,1280,1920]){
     await page.setViewportSize({width,height:900});await page.goto(site+'/home');await page.waitForTimeout(500);
     await page.waitForFunction(()=>document.querySelector('main') && !document.querySelector('main .animate-pulse'));
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Home overflow at ${width}px`);
    }
    console.log('PASS language persistence, referral detail tabs and four viewport widths');
   }
   if(username==='woreda.ws'){
    await page.goto(site+'/referrals?view=all');
    await page.locator('a[href^="/referrals/"]').filter({visible:true}).first().click();
    await page.getByText('Clinical detail is not shown for oversight roles',{exact:false}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Accept referral',exact:true}).count(),0);
    console.log('PASS oversight chart redaction and read-only controls');
   }
   assert.deepEqual(errors,[]);console.log('PASS '+username+' login and '+route+' page');
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
