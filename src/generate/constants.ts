import {PaperFormat} from 'puppeteer-core';

export const PUPPETEER_PAGE_OPTIONS = {
    format: 'a4' as PaperFormat,
    printBackground: true,
    margin: {top: '40px', bottom: '40px'},
    displayHeaderFooter: true,
};

export const PDF_FILENAME = 'single-page.pdf';
export const PDF_SOURCE_FILENAME = 'pdf-source.html';
export const SINGLE_PAGE_DATA_FILENAME = 'single-page.json';
export const DEFAULT_HTML_FOOTER_VALUE = `<div style="font-size:10px; width:100%; text-align:right; padding-right:20px; margin:0 auto;"><span class="pageNumber"></span></div>`;

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
