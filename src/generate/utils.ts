import {readFileSync, writeFileSync, existsSync} from 'fs';
import {join, relative, dirname} from 'path';

// @ts-ignore
import yfmPrintStyles from '@diplodoc/transform/dist/css/print.css';
// @ts-ignore
import yfmStyles from '@diplodoc/transform/dist/css/yfm.css';
// @ts-ignore
import yfmPrintJS from '@diplodoc/transform/dist/js/print.js';
// @ts-ignore
import yfmJS from '@diplodoc/transform/dist/js/yfm.js';
import {PDFDocument, rgb} from 'pdf-lib';

import {FONTS_INJECTION, FONTS_OVERRIDE, PDF_PAGE_DATA_FILENAME, PDF_STYLE_OVERRIDE, SINGLE_PAGE_DATA_FILENAME} from './constants';

type MarkupGeneratorOptions = {
    titlePages: string;
    html: string;
    tocHtml: string;
    base?: string;
    injectPlatformAgnosticFonts?: boolean;
    script: string[];
    cssLink: string[];
};

function findOutputRoot(pdfDir: string): string {
    let currentDir = pdfDir;
    
    while (currentDir !== dirname(currentDir)) {
        const parentDir = dirname(currentDir);
        const bundlePath = join(parentDir, '_bundle');
        
        if (existsSync(bundlePath)) {
            return parentDir;
        }
        
        currentDir = parentDir;
    }
    
    return dirname(pdfDir);
}

export function calculateRelativePathsForPdf(
    cssLinks: string[],
    scriptLinks: string[],
    pdfFilePath: string
): { cssLink: string[]; script: string[] } {
    const pdfDir = dirname(pdfFilePath);
    
    // Находим корень проекта, где находится _bundle директория
    const outputRoot = findOutputRoot(pdfDir);
    
    // Функция для расчета относительного пути от PDF файла до файла
    const getRelativePath = (src: string) => {
        const targetPath = join(outputRoot, src);
        const relativePath = relative(pdfDir, targetPath);
        return relativePath;
    };
    
    return {
        cssLink: cssLinks.map(getRelativePath),
        script: scriptLinks.map(getRelativePath)
    };
}

export function generatePdfStaticMarkup({
    titlePages,
    html,
    tocHtml,
    base,
    injectPlatformAgnosticFonts,
    script,
    cssLink,
}: MarkupGeneratorOptions) {
    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="UTF-8"/>
            <meta http-equiv="Content-Security-Policy" content="frame-src 'none'">
            ${cssLink.map((src) => `<link type="text/css" rel="stylesheet" href="${src}">`).join('')}
            <base href="${base ?? '.'}"/>
            ${injectPlatformAgnosticFonts ? FONTS_INJECTION : ''}  
            <style>
                ${yfmStyles}
                ${yfmPrintStyles}
                ${PDF_STYLE_OVERRIDE}
            </style>
            ${injectPlatformAgnosticFonts ? FONTS_OVERRIDE : ''}
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
        </html>s
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
