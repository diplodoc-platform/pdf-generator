import {resolve} from 'path';
import {execSync} from 'child_process';

import {toMatchImageSnapshot} from 'jest-image-snapshot';
import {fromPath} from 'pdf2pic';
import puppeteer from 'puppeteer';
import {Browser} from 'puppeteer-core';

expect.extend({toMatchImageSnapshot});

describe('integration', () => {
    let browser: Browser;

    const pdfFile = resolve(__dirname, '../integration-output/en/single-page.pdf');
    const options = {
        density: 100,
        format: 'png',
        width: 794,
        height: 1123,
    };
    const convertPdf2Pic = fromPath(pdfFile, options);
    const numberOfPages = 7;

    beforeAll(async () => {
        // @ts-ignore
        browser = await puppeteer.launch({headless: true});

        execSync('node build/cmd/index.js -i integration-output');
    });

    it('works', async () => {
        for (let currentPage = 1; currentPage <= numberOfPages; currentPage++) {
            const {buffer: expectedImage} = await convertPdf2Pic(currentPage, {
                responseType: 'buffer',
            });

            expect(expectedImage).toMatchImageSnapshot({
                failureThreshold: 0.1,
                failureThresholdType: 'percent',
            });
        }
    });

    afterAll(async () => {
        if (!browser) {
            return;
        }

        await browser.close();
    });
});
