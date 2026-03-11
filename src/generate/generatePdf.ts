import {PathOrFileDescriptor, existsSync, readFileSync, writeFileSync} from 'fs';
import {dirname, join} from 'path';

import {Browser} from 'puppeteer-core';

import {
    PDF_DIRENAME,
    PDF_FILENAME,
    PDF_SOURCE_FILENAME,
    PUPPETEER_PAGE_OPTIONS,
    Status,
} from './constants';
import {TOCEntry, addBookmarksFromTOC, generateTOC, generateTOCHTML} from './generatePdfTOC';
import {
    calculateRelativePathsForPdf,
    generatePdfStaticMarkup,
    removeFirstNPageNumbers,
} from './utils';

export interface GeneratePDFOptions {
    singlePagePath: string;
    browser: Browser;
    injectPlatformAgnosticFonts?: boolean;
    customHeader?: string;
    customFooter?: string;
    imageQuality?: number;
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
    imageQuality,
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

    const cssLink = parsedSinglePageData.data.cssLink ?? [];
    cssLink.push(...(parsedSinglePageData.data.meta.style ?? []));

    /* Save PDF source file */
    const pdfDirPath = dirname(singlePagePath);
    const pdfFileSourcePath = join(pdfDirPath, PDF_SOURCE_FILENAME);

    const {cssLink: correctedCssLinks} = calculateRelativePathsForPdf(
        parsedSinglePageData.data.cssLink ?? [],
        [],
        pdfFileSourcePath,
    );

    const pdfFileContent = generatePdfStaticMarkup({
        titlePages: parsedSinglePageData.data.pdfTitlePages?.content ?? '',
        html: parsedSinglePageData.data.html ?? '',
        tocHtml: generateTOCHTML(parsedSinglePageTOCData.items),
        base: parsedSinglePageData.router.base,
        injectPlatformAgnosticFonts,
        script: parsedSinglePageData.data.meta.script ?? [],
        cssLink: correctedCssLinks,
    });

    writeFileSync(pdfFileSourcePath, pdfFileContent);

    try {
        const page = await browser.newPage();

        await page.goto(`file://${pdfFileSourcePath}`, {
            waitUntil: 'networkidle2',
            timeout: 0,
        });

        if (imageQuality !== undefined && imageQuality < 100) {
            await compressPageImages(page, imageQuality);
        }

        const fullPdfFilePath = join(pdfDirPath, PDF_FILENAME).replace(`/${PDF_DIRENAME}/`, '/');

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
            scale: 0.85,
        });

        await page.close();

        console.log(`Generated PDF file: ${fullPdfFilePath}`);

        /* PDF bookmarks/outline configuration */

        const toc: TOCEntry[] = generateTOC(parsedSinglePageTOCData.items);

        const inputPdf = readFileSync(fullPdfFilePath);

        const outputPdf = await addBookmarksFromTOC(inputPdf, toc);

        // Write result PDF with bookmarks
        writeFileSync(fullPdfFilePath, outputPdf);

        const titlesPageCount = parsedSinglePageData.data.pdfTitlePages?.pageCount;
        if (titlesPageCount) {
            await removeFirstNPageNumbers(fullPdfFilePath, titlesPageCount);
        }
    } catch (error) {
        result.status = Status.FAIL;
        result.error = error;

        console.error(`${singlePagePath}: encountered an error while generating PDF.`);
        console.error(error);
    }

    return result;
}

async function compressPageImages(page: import('puppeteer-core').Page, quality: number) {
    const stats = await page.evaluate((q) => {
        const MAX_DIMENSION = 1600;
        let compressed = 0;
        let skippedCrossOrigin = 0;
        let skippedSmallOrSvg = 0;

        function compressImage(img: HTMLImageElement) {
            if (!img.src || img.naturalWidth === 0) {
                return;
            }

            if (img.src.includes('.svg') || img.src.startsWith('data:image/svg')) {
                skippedSmallOrSvg++;
                return;
            }

            if (img.naturalWidth < 100 && img.naturalHeight < 100) {
                skippedSmallOrSvg++;
                return;
            }

            let {naturalWidth: w, naturalHeight: h} = img;

            if (w > MAX_DIMENSION) {
                h = Math.round((h * MAX_DIMENSION) / w);
                w = MAX_DIMENSION;
            }

            if (h > MAX_DIMENSION) {
                w = Math.round((w * MAX_DIMENSION) / h);
                h = MAX_DIMENSION;
            }

            const canvas = document.createElement('canvas');

            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext('2d')!;

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);

            try {
                img.src = canvas.toDataURL('image/jpeg', q / 100);
                compressed++;
            } catch (_e) {
                skippedCrossOrigin++;
            }
        }

        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));

        imgs.forEach((img) => {
            if (img.complete) {
                compressImage(img);
            } else {
                img.onload = () => compressImage(img);
            }
        });

        return {total: imgs.length, compressed, skippedCrossOrigin, skippedSmallOrSvg};
    }, quality);

    console.log(
        `Image compression (quality=${quality}): ` +
            `total=${stats.total}, compressed=${stats.compressed}, ` +
            `skipped_cross_origin=${stats.skippedCrossOrigin}, skipped_small_or_svg=${stats.skippedSmallOrSvg}`,
    );

    await page.evaluate(
        () =>
            new Promise<void>((resolve) => {
                const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
                const pending = imgs.filter((img) => !img.complete);

                if (pending.length === 0) {
                    resolve();
                    return;
                }

                let settled = 0;

                const onSettle = () => {
                    if (++settled >= pending.length) resolve();
                };

                pending.forEach((img) => {
                    img.onload = onSettle;
                    img.onerror = onSettle;
                });
            }),
    );
}

export {generatePdf, compressPageImages};

export default {generatePdf};
