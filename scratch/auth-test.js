const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));
    
    console.log('Navigating to http://localhost:3000/login');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    console.log('Logging in...');
    await page.type('input[type="text"]', 'admin@example.com');
    await page.type('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(console.error);
    
    console.log('Navigating to catalog...');
    await page.goto('http://localhost:3000/catalog', { waitUntil: 'networkidle0', timeout: 5000 }).catch(console.error);
    
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
})();
