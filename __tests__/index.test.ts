import {dirname, join, resolve} from 'path';

import {toMatchImageSnapshot} from 'jest-image-snapshot';
import {fromPath} from 'pdf2pic';
import puppeteer from 'puppeteer';
import {Browser} from 'puppeteer-core';

import {generatePdf} from '../src';

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

        await generatePdf({
            singlePagePath: join(dirname(pdfFile), 'single-page.json'),
            browser,
        });
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
