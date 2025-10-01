import {PathOrFileDescriptor, existsSync, readFileSync, writeFileSync} from 'fs';
import {dirname, join} from 'path';

import {Browser} from 'puppeteer-core';

import {PDF_DIRENAME, PDF_FILENAME, PDF_SOURCE_FILENAME, PUPPETEER_PAGE_OPTIONS, Status} from './constants';
import {TOCEntry, addBookmarksFromTOC, generateTOC, generateTOCHTML} from './generatePdfTOC';
import {generatePdfStaticMarkup, removeIframesInDetails} from './utils';

export interface GeneratePDFOptions {
    singlePagePath: string;
    browser: Browser;
    injectPlatformAgnosticFonts?: boolean;
    customHeader?: string;
    customFooter?: string;
}

export interface GeneratePDFResult {
    status: Status;
    error?: Error;
}

async function generatePdf({
    singlePagePath,
    browser,
    injectPlatformAgnosticFonts,
    customHeader,
    customFooter,
}: GeneratePDFOptions): Promise<GeneratePDFResult> {
    console.log(`Processing singlePagePath = ${singlePagePath}`);

    const result: GeneratePDFResult = {status: Status.SUCCESS};

    /* Create PDF source file content from single page data */
    const singlePageData = readFileSync(singlePagePath, 'utf8');
    const parsedSinglePageData = JSON.parse(singlePageData);

    const singlePageTOCPath = singlePagePath.replace('.json', '-toc.js');

    console.log(`Processing singlePageTOCPath = ${singlePageTOCPath}`);

    const singlePageTOCData = readFileSync(singlePageTOCPath, 'utf8');

    const TOCJSONInput = singlePageTOCData
        .replace('window.__DATA__.data.toc = ', '')
        .replace(/[=]"h/g, '=\\\\"h')
        .replace(/">/g, '">')
        .replace(/;$/, '');

    const parsedSinglePageTOCData = JSON.parse(TOCJSONInput);

    const pdfFileContent = generatePdfStaticMarkup({
        html: parsedSinglePageData.data.html ?? '',
        tocHtml: generateTOCHTML(parsedSinglePageTOCData.items),
        base: parsedSinglePageData.router.base,
        injectPlatformAgnosticFonts,
        script: parsedSinglePageData.data.meta.script ?? [],
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

        // Temp solution for iframes within cut
        await removeIframesInDetails(page);

        const fullPdfFilePath = join(pdfDirPath, PDF_FILENAME)
            .replace(`/${PDF_DIRENAME}/`, '/');;

        /* PDF header/footer configuration */
        let headerTemplateVal = ' ';
        if (customHeader) {
            if (!existsSync(customHeader)) {
                throw new Error(`Worker file not found: ${customHeader}`);
            }
            headerTemplateVal = readFileSync(customHeader as PathOrFileDescriptor, 'utf8');
        }

        let footerTemplateVal = '';
        if (customFooter) {
            if (!existsSync(customFooter)) {
                throw new Error(`Worker file not found: ${customFooter}`);
            }
            footerTemplateVal = readFileSync(customFooter as PathOrFileDescriptor, 'utf8');
        }

        const resFooterVal =
            `<div style="position: relative;width: 100%;height: 0;">` +
            footerTemplateVal +
            `<div style="position: absolute;right: 20px;bottom: 0;font-size: 10px;z-index: 0;padding: 0 5px;background: white;"><span class="pageNumber"></span></div></div>`;

        await page.pdf({
            path: fullPdfFilePath,
            ...PUPPETEER_PAGE_OPTIONS,
            headerTemplate: headerTemplateVal,
            footerTemplate: resFooterVal,
            timeout: 0,
        });

        await page.close();

        console.log(`Generated PDF file: ${fullPdfFilePath}`);

        /* PDF bookmarks/outline configuration */

        const toc: TOCEntry[] = generateTOC(parsedSinglePageTOCData.items);

        const inputPdf = readFileSync(fullPdfFilePath);

        const outputPdf = await addBookmarksFromTOC(inputPdf, toc);

        // Write result PDF with bookmarks
        writeFileSync(fullPdfFilePath, outputPdf);
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
