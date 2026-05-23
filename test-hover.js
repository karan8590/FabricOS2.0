const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/orders');
  // Wait for page to load
  await page.waitForTimeout(2000);
  // Hover over the 'E' chip
  await page.hover('.chipContainer');
  await page.waitForTimeout(500);
  const popover = await page.$('.popoverWrapper');
  if (popover) {
    const box = await popover.boundingBox();
    console.log('Popover found:', box);
  } else {
    console.log('Popover NOT found');
  }
  await browser.close();
})();
