import {readFileSync, writeFileSync} from 'fs';
import {join} from 'path';

// @ts-ignore
import yfmPrintStyles from '@diplodoc/transform/dist/css/print.css';
// @ts-ignore
import yfmStyles from '@diplodoc/transform/dist/css/yfm.css';
// @ts-ignore
import yfmPrintJS from '@diplodoc/transform/dist/js/print.js';
// @ts-ignore
import yfmJS from '@diplodoc/transform/dist/js/yfm.js';
import {PDFDocument, rgb} from 'pdf-lib';

import {PDF_PAGE_DATA_FILENAME, SINGLE_PAGE_DATA_FILENAME} from './constants';

const FontsInjection = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono&family=Inter:opsz@14..32&display=swap" rel="stylesheet">
`.trim();

const FontsOverride = `
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

type MarkupGeneratorOptions = {
    titlePages: string;
    html: string;
    tocHtml: string;
    base?: string;
    injectPlatformAgnosticFonts?: boolean;
    script: string[];
};

export function generatePdfStaticMarkup({
    titlePages,
    html,
    tocHtml,
    base,
    injectPlatformAgnosticFonts,
    script,
}: MarkupGeneratorOptions) {
    return `
<!doctype html>
<html>
<head>
    <meta charset="UTF-8"/>
    <meta http-equiv="Content-Security-Policy" content="frame-src 'none'">
    <base href="${base ?? '.'}"/>
${injectPlatformAgnosticFonts ? FontsInjection : ''}  
    <style>
        ${yfmStyles}
        ${yfmPrintStyles}
    </style>
    <style>
        main.yfm, nav {
            margin: 0 auto;
            min-width: 200px;
            max-width: 980px;
            padding: 45px;
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
    </style>
${injectPlatformAgnosticFonts ? FontsOverride : ''}
</head>
<body class="yfm pdf">
    ${titlePages}
    <nav>
      ${tocHtml}
    </nav>
    <main class="yfm">
        ${html}
    </main>
    <script>
        ${yfmJS}
    </script>
    <script>
        ${yfmPrintJS}
    </script>
    ${script.map((src) => `<script src="../${src}"></script>`).join('')}
    <script>
        // Initialize mermaid runtime
        window.mermaidJsonp = window.mermaidJsonp || [];
        window.mermaidJsonp.push(function(mermaid) {
            mermaid.initialize({ startOnLoad: false });
            mermaid.run();
        });
    </script>
    </body>
</html>
    `.trim();
}

export function filterPaths(paths: string[]): string[] {
    const hasPdf = paths.some((p) => p.endsWith(PDF_PAGE_DATA_FILENAME));

    if (hasPdf) {
        return paths.filter((p) => p.endsWith(PDF_PAGE_DATA_FILENAME));
    }

    return paths.filter((p) => p.endsWith(SINGLE_PAGE_DATA_FILENAME));
}

export function prepareGlobs(items: string[]) {
    return items.flatMap((item) => [
        join(item, PDF_PAGE_DATA_FILENAME),
        join(item, SINGLE_PAGE_DATA_FILENAME),
    ]);
}

export async function removeFirstNPageNumbers(inputPath: string, n: number) {
    const pdfBytes = readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    for (let i = 0; i < Math.min(n, pages.length); i++) {
        const page = pages[i];
        const {width} = page.getSize();

        page.drawRectangle({
            x: 0,
            y: 0,
            width: width,
            height: 50,
            color: rgb(1, 1, 1),
        });
    }

    const modifiedPdfBytes = await pdfDoc.save();
    writeFileSync(inputPath, modifiedPdfBytes);
}
