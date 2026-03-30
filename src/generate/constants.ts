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
    html, body {
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
    }

    .pdf-page-wrapper {
        page-break-after: always;
        page-break-inside: avoid;
    }

    .pdf-page-wrapper:last-child {
        page-break-after: avoid;
    }

    @media print {
        /* Prevent double page-break: pdf-page-wrapper has page-break-after: always,
           and h1/h2[data-original-article] inside it gets page-break-before: always
           from print.css — two adjacent breaks create a blank page. */
        .pdf-page-wrapper h1[data-original-article],
        .pdf-page-wrapper h2[data-original-article],
        nav .toc h2[data-original-article] {
            page-break-before: avoid;
        }
    }

    nav {
        page-break-after: always;
    }

    /* page-constructor has min-height: 100vh from bundle CSS which creates blank pages in PDF */
    .yfm-page-constructor,
    .pc-page-constructor,
    .pc-page-constructor__wrapper,
    .pc-layout,
    .pc-layout__content {
        min-height: 0 !important;
        height: auto !important;
    }

    /* Hide pdf-page-wrapper (including its page-break-after: always) when it contains
       an unhydrated page-constructor — it renders as empty divs and creates a blank page */
    .pdf-page-wrapper:has(.yfm-page-constructor[data-hydrated="false"]) {
        display: none;
    }

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
        overflow: visible !important;
    }

    .yfm .yfm-table-container > table {
        transform: scale(0.9) !important;
        position: static !important;
    }

    .yfm .yfm-table-container > table th,
    .yfm .yfm-table-container > table td {
        white-space: normal;
    }

    .yfm table[sticky-header="true"] {
        position: static !important;
        overflow: visible !important;
        display: table !important;
    }

    .yfm table[sticky-header="true"] th,
    .yfm table[sticky-header="true"] td {
        position: static !important;
        white-space: normal !important;
    }

    .shadow, .card, [class*="shadow"] {
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
    }

    pre, pre code {
        white-space: pre-wrap !important;
        word-break: break-all !important;
        overflow: visible !important;
    }

    main.yfm {
        overflow-wrap: break-word;
    }
`;
