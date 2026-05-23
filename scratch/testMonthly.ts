import { getMonthlyReportData } from '../src/reports/utils/analytics';
import { generateMonthlyPDF } from '../src/reports/generators/generateMonthlyPDF';
import { sendTelegramReport } from '../src/reports/telegram/sendReport';

async function run() {
    try {
        console.log('Fetching monthly report data...');
        const data = getMonthlyReportData(new Date());
        console.log('SUCCESS fetching data.');
        
        console.log('Generating PDF...');
        const pdfPath = await generateMonthlyPDF(new Date());
        console.log('SUCCESS generating PDF at:', pdfPath);

        console.log('Sending to Telegram...');
        const dispatched = await sendTelegramReport(pdfPath, 'Monthly Summary Test', true);
        console.log('Telegram dispatch result:', dispatched);
    } catch (err) {
        console.error('ERROR in pipeline:', err);
    }
}

run();
