import {resolve} from 'path';

import {asyncify, mapLimit} from 'async';
// @ts-ignore
import pcr from 'puppeteer-chromium-resolver';
import {Browser} from 'puppeteer-core';
import walkSync from 'walk-sync';

import {
    CHROMIUM_RESOLVER_OPTIONS,
    PUPPETEER_BROWSER_LAUNCH_OPTIONS,
    PUPPETEER_PROCESS_LIMIT,
    Status,
} from './constants';
import {generatePdf} from './generatePdf';
import {prepareGlobs} from './utils';

export interface GeneratePDFsOptions {
    inputFolder: string;
    includeDirs?: string[];
    excludeDirs?: string[];
    injectPlatformAgnosticFonts?: boolean;
    customHeader?: string;
    customFooter?: string;
}

async function generatePdfs({
    inputFolder,
    includeDirs = ['**/'],
    excludeDirs = [],
    injectPlatformAgnosticFonts,
    customHeader = '',
    customFooter = '',
}: GeneratePDFsOptions): Promise<Status> {
    const globs = prepareGlobs(includeDirs);
    const ignore = prepareGlobs(excludeDirs);

    const singlePagePaths: string[] = walkSync(inputFolder, {
        directories: false,
        includeBasePath: false,
        globs,
        ignore,
    });

    let browser: Browser;
    try {
        browser = await launchBrowser();
    } catch (e) {
        console.error('The browser cannot be launched. Failed to generate PDF files.', e);

        return Status.FAIL;
    }

    let countSuccessPdfs = 0;
    let countFailedPdfs = 0;

    await mapLimit(
        singlePagePaths,
        PUPPETEER_PROCESS_LIMIT,
        asyncify(async (singlePagePath: string) => {
            const fullSinglePagePath = resolve(inputFolder, singlePagePath);

            const result = await generatePdf({
                singlePagePath: fullSinglePagePath,
                browser,
                injectPlatformAgnosticFonts,
                customHeader,
                customFooter,
            });

            if (result.status === Status.FAIL) {
                countFailedPdfs++;
            } else {
                countSuccessPdfs++;
            }
        }),
    );

    if (browser && browser.process() !== null) {
        browser.process()!.kill('SIGINT');
        await browser.close();
    }

    console.log(`PDF files generation is finished\nGenerated ${countSuccessPdfs} pdf files\n`);

    if (countFailedPdfs) {
        console.error(`Failed to generate ${countFailedPdfs} pdf files`);
        return Status.FAIL;
    }

    return Status.SUCCESS;
}

async function launchBrowser() {
    const stats = await pcr(CHROMIUM_RESOLVER_OPTIONS);

    return await stats.puppeteer.launch({
        ...PUPPETEER_BROWSER_LAUNCH_OPTIONS,
        protocolTimeout: 600_000,
        executablePath: stats.executablePath,
    });
}

export {generatePdfs};

export default {generatePdfs};
