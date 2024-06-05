import {resolve} from 'path';
import {execSync} from 'child_process';

import {toMatchImageSnapshot} from 'jest-image-snapshot';
import {fromPath} from 'pdf2pic';

expect.extend({toMatchImageSnapshot});

describe('integration', () => {
    const pdfFile = resolve(__dirname, '../integration-output/en/single-page.pdf');
    const options = {
        density: 100,
        format: 'png',
        width: 794,
        height: 1123,
    };
    const convertPdf2Pic = fromPath(pdfFile, options);
    const numberOfPages = 8;

    beforeAll(async () => {
        execSync('node build/cmd/index.js -i integration-output');
    });

    it('works', async () => {
        for (let currentPage = 1; currentPage <= numberOfPages; currentPage++) {
            const {buffer: expectedImage} = await convertPdf2Pic(currentPage, {
                responseType: 'buffer',
            });

            expect(expectedImage).toMatchImageSnapshot({
                updatePassedSnapshot: true,
                failureThreshold: 0.1,
                failureThresholdType: 'percent',
            });
        }
    });
});
