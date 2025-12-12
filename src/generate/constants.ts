import {PaperFormat} from 'puppeteer-core';

export const PUPPETEER_PAGE_OPTIONS = {
    format: 'a4' as PaperFormat,
    printBackground: true,
    margin: {top: '40px', bottom: '40px'},
    displayHeaderFooter: true,
};

export const PDF_DIRENAME = 'pdf';
export const PDF_FILENAME = 'single-page.pdf';
export const PDF_SOURCE_FILENAME = 'pdf-source.html';
export const PDF_PAGE_DATA_FILENAME = `${PDF_DIRENAME}/pdf-page.json`;
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

export const FONTS_INJECTION = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono&family=Inter:opsz@14..32&display=swap" rel="stylesheet">
`.trim();

export const FONTS_OVERRIDE = `
    <style>
        body.yfm {
            font-family: 'Inter' !important;
            font-weight: 400 !important;
        }

        body.yfm code {
            font-family: 'Atkinson Hyperlegible Mono' !important;
            font-weight: 400 !important;
        }

        * {
            text-rendering: geometricprecision !important;
        }
    </style>
`.trim();

export const PDF_STYLE_OVERRIDE = `
    main.yfm, nav {
        margin: 0 auto;
        min-width: 200px;
        max-width: 980px;
        padding: 45px;
        position: relative !important;
    }

    main.yfm .yfm-page-constructor {
        transform: scale(0.95);
    }
    
    .yfm .yfm-table-container {
        position: static !important;
        height: fit-content !important;
    }
    
    .yfm .yfm-table-container > table {
        transform: scale(0.9) !important;
        position: static !important;
    }
    
    .yfm .yfm-table-container > table th,
    .yfm .yfm-table-container > table td {
        white-space: normal;
    }
    
    .shadow, .card, [class*="shadow"] {
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
    }
`;
