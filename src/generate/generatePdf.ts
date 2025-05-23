import {readFileSync, writeFileSync} from 'fs';
import {dirname, join} from 'path';

import {Browser} from 'puppeteer-core';

import {PDF_FILENAME, PDF_SOURCE_FILENAME, PUPPETEER_PAGE_OPTIONS, Status} from './constants';
import {generatePdfStaticMarkup} from './utils';

export interface GeneratePDFOptions {
    singlePagePath: string;
    browser: Browser;
    injectPlatformAgnosticFonts?: boolean;
}

export interface GeneratePDFResult {
    status: Status;
    error?: Error;
}

async function generatePdf({
    singlePagePath,
    browser,
    injectPlatformAgnosticFonts,
}: GeneratePDFOptions): Promise<GeneratePDFResult> {
    const result: GeneratePDFResult = {status: Status.SUCCESS};

    /* Create PDF source file content from single page data */
    const singlePageData = readFileSync(singlePagePath, 'utf8');
    const parsedSinglePageData = JSON.parse(singlePageData);
    const pdfFileContent = generatePdfStaticMarkup({
        html: parsedSinglePageData.data.html ?? '',
        base: parsedSinglePageData.router.base,
        injectPlatformAgnosticFonts,
    });

    /* Save PDF source file */
    const pdfDirPath = dirname(singlePagePath);
    const pdfFileSourcePath = join(pdfDirPath, PDF_SOURCE_FILENAME);

    writeFileSync(pdfFileSourcePath, pdfFileContent);

    try {
        const page = await browser.newPage();

        await page.goto(`file://${pdfFileSourcePath}`, {
            waitUntil: 'networkidle2',
            timeout: 0,
        });

        const fullPdfFilePath = join(pdfDirPath, PDF_FILENAME);

        await page.pdf({
            path: fullPdfFilePath,
            ...PUPPETEER_PAGE_OPTIONS,
            timeout: 0,
        });

        await page.close();

        console.log(`Generated PDF file: ${fullPdfFilePath}`);
    } catch (error) {
        result.status = Status.FAIL;
        result.error = error;

        console.error(`${singlePagePath}: encountered an error while generating PDF.`);
        console.error(error);
    }

    return result;
}

export {generatePdf};

export default {generatePdf};
