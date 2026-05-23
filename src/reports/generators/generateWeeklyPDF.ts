import fs from 'fs';
import path from 'path';
import os from 'os';
import { getWeeklyReportData } from '../utils/analytics';
import { renderWeeklyReport } from '../templates/weekly-report';
import { htmlToPdf } from '../utils/reportHelpers';

export async function generateWeeklyPDF(targetDate: Date = new Date()): Promise<string> {
    // 1. Gather all weekly metrics
    const data = getWeeklyReportData(targetDate);

    // 2. Render React component to HTML
    const htmlContent = renderWeeklyReport(data);

    // 3. Define temp directory inside os tmpdir (Vercel compatible)
    const tempDir = os.tmpdir();

    const timestamp = Date.now();
    const outputPath = path.join(tempDir, `weekly-report-${timestamp}.pdf`);

    // 4. Convert using Puppeteer headless chrome
    await htmlToPdf(htmlContent, outputPath);

    return outputPath;
}
