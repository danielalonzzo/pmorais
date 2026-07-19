const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('https://pmorais.pt/');
  await page.waitForTimeout(2000);
  
  console.log('Clicking sobre-mim');
  await page.click('a[href="/sobre-mim"]');
  await page.waitForTimeout(2000);
  
  console.log('Final URL:', page.url());
  
  await browser.close();
})();
