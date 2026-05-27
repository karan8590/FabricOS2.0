const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));
    
    console.log('Navigating to http://localhost:3000/catalog');
    await page.goto('http://localhost:3000/catalog', { waitUntil: 'networkidle0', timeout: 10000 }).catch(console.error);
    await browser.close();
})();
