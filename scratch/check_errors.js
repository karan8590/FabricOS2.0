const puppeteer = require('puppeteer-core');

(async () => {
    try {
        const browser = await puppeteer.launch({
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            headless: "new",
            args: ['--no-sandbox']
        });
        const page = await browser.newPage();
        
        page.on('console', msg => {
            if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
            else console.log('CONSOLE LOG:', msg.text());
        });
        
        page.on('pageerror', error => console.log('UNCAUGHT ERROR:', error.message));
        
        console.log('Navigating to http://localhost:3000/orders ...');
        await page.goto('http://localhost:3000/orders', { waitUntil: 'networkidle2', timeout: 15000 });
        
        console.log('Done.');
        await browser.close();
    } catch (err) {
        console.log('Script Error:', err.message);
    }
})();
