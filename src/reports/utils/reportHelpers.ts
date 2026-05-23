import puppeteer, { Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';

// Common Google Chrome / Chromium executable locations on macOS and Unix
const CHROME_PATHS = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
];

function findChromeExecutable(): string {
    for (const executablePath of CHROME_PATHS) {
        if (fs.existsSync(executablePath)) {
            return executablePath;
        }
    }
    throw new Error('Google Chrome or Chromium executable not found on this system. Please make sure Google Chrome is installed.');
}

export async function htmlToPdf(htmlContent: string, outputPath: string): Promise<string> {
    let browser: Browser | null = null;
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

    try {
        if (isVercel || process.env.NODE_ENV === 'production') {
            // Production / Vercel Serverless environment
            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true,
            });
        } else {
            // Local environment
            const executablePath = findChromeExecutable();
            browser = await puppeteer.launch({
                executablePath,
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
            });
        }

        const page = await browser.newPage();
        
        // Disable cache for freshness
        await page.setCacheEnabled(false);

        // Set HTML content and wait until CDN assets, fonts, and javascript (like Chart.js) are loaded and executed.
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any, timeout: 30000 });

        // Wait a small extra delay for chart animations to finish rendering (just in case)
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Generate PDF
        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '12mm',
                right: '12mm',
                bottom: '12mm',
                left: '12mm'
            }
        });

        return outputPath;
    } catch (error) {
        console.error('Puppeteer HTML to PDF conversion failed:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
