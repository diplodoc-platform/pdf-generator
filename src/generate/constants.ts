export const PUPPETEER_PAGE_OPTIONS = {
    format: 'A4',
    printBackground: true,
    margin: {top: '40px', bottom: '40px'},
};

export const PDF_FILENAME = 'single-page.pdf';
export const PDF_SOURCE_FILENAME = 'pdf-source.html';
export const SINGLE_PAGE_DATA_FILENAME = 'single-page.json';

export enum Status {
    SUCCESS,
    FAIL,
}

export const CHROMIUM_RESOLVER_OPTIONS = {
    revision: '',
    detectionPath: '',
    folderName: '.chromium-browser-snapshots',
    defaultHosts: ['https://storage.googleapis.com', 'https://npm.taobao.org/mirrors'],
    hosts: [],
    cacheRevisions: 2,
    retry: 3,
    silent: false,
};

export const PUPPETEER_BROWSER_LAUNCH_OPTIONS = {
    headless: true,
    args: ['--no-sandbox'],
};

export const PUPPETEER_PROCESS_LIMIT = 5;
