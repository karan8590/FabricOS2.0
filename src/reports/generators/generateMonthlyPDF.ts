import fs from 'fs';
import path from 'path';
import os from 'os';
import { getMonthlyReportData } from '../utils/analytics';
import { renderMonthlyReport } from '../templates/monthly-report';
import { htmlToPdf } from '../utils/reportHelpers';

export async function generateMonthlyPDF(targetDate: Date = new Date()): Promise<string> {
    // 1. Gather all monthly metrics
    const data = getMonthlyReportData(targetDate);

    // 2. Render React component to HTML
    const htmlContent = renderMonthlyReport(data);

    // 3. Define temp directory inside os tmpdir (Vercel compatible)
    const tempDir = os.tmpdir();

    const timestamp = Date.now();
    const outputPath = path.join(tempDir, `monthly-report-${timestamp}.pdf`);

    // 4. Convert using Puppeteer headless chrome
    await htmlToPdf(htmlContent, outputPath);

    return outputPath;
}
