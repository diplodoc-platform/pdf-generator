import {existsSync, readFileSync, writeFileSync} from 'fs';
import {dirname, join, relative} from 'path';

// @ts-ignore
import yfmPrintStyles from '@diplodoc/transform/dist/css/print.css';
// @ts-ignore
import yfmStyles from '@diplodoc/transform/dist/css/yfm.css';
// @ts-ignore
import yfmPrintJS from '@diplodoc/transform/dist/js/print.js';
// @ts-ignore
import yfmJS from '@diplodoc/transform/dist/js/yfm.js';
import {PDFDocument, rgb} from 'pdf-lib';

import {
    FONTS_INJECTION,
    FONTS_OVERRIDE,
    PDF_PAGE_DATA_FILENAME,
    PDF_STYLE_OVERRIDE,
    SINGLE_PAGE_DATA_FILENAME,
} from './constants';

type MarkupGeneratorOptions = {
    titlePages: string;
    endingPages: string;
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
    pdfFilePath: string,
): {cssLink: string[]; script: string[]} {
    const pdfDir = dirname(pdfFilePath);

    const outputRoot = findOutputRoot(pdfDir);

    const getRelativePath = (src: string) => {
        const targetPath = join(outputRoot, src);
        const relativePath = relative(pdfDir, targetPath);
        return relativePath;
    };

    return {
        cssLink: cssLinks.map(getRelativePath),
        script: scriptLinks.map(getRelativePath),
    };
}

export function generatePdfStaticMarkup({
    titlePages,
    endingPages,
    html,
    tocHtml,
    base,
    injectPlatformAgnosticFonts,
    script,
    cssLink,
}: MarkupGeneratorOptions) {
    const processedHtml = termsProcessing(html);

    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="UTF-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <meta http-equiv="Content-Security-Policy" content="frame-src 'none'">
            ${cssLink
                .map((src) => `<link type="text/css" rel="stylesheet" href="${src}">`)
                .join('')}
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
            ${processedHtml}
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
            ${endingPages ? `<div class="pdf-ending-pages">${endingPages}</div>` : ''}
            </body>
        </html>
    `.trim();
}

const PDF_PAGE_DELIMITER = '<div class="pdf-page-wrapper"';
const DFN_PATTERN = '<dfn\\b[^>]*\\bclass="[^"]*\\byfm-term_dfn\\b[^"]*"[^>]*>[\\s\\S]*?<\\/dfn>';
const DFN_RE = new RegExp(DFN_PATTERN, 'g');
const DFN_RUN_RE = new RegExp(`(?:${DFN_PATTERN}\\s*)+`, 'g');

type TermsState = {
    counter: number;
    numbers: Map<string, number>;
};

export function termsProcessing(html: string) {
    const state: TermsState = {counter: 1, numbers: new Map()};

    const segments = html.split(PDF_PAGE_DELIMITER);

    return segments
        .map((segment, index) => processTermsSegment(segment, `--p${index}`, state))
        .join(PDF_PAGE_DELIMITER);
}

function processTermsSegment(segment: string, pageScope: string, state: TermsState) {
    let processed = segment.replace(/yfm-term_dfn/g, 'yfm-term_dfn open');

    const numberFor = (targetId: string) => {
        const mapKey = `${pageScope}|${targetId}`;

        if (!state.numbers.has(mapKey)) {
            state.numbers.set(mapKey, state.counter++);
        }

        return state.numbers.get(mapKey) as number;
    };

    processed = processed.replace(
        /(<i\b[^>]*\bclass="[^"]*\byfm-term_title\b[^"]*"[^>]*>)([\s\S]*?)(<\/i>)/g,
        (match, openTag, content, closeTag) => {
            const aria = /\baria-controls="([^"]*)"/.exec(openTag);
            const key = /\bterm-key="([^"]*)"/.exec(openTag);

            let target: string | null = null;

            if (aria) {
                target = aria[1];
            } else if (key) {
                target = `${key[1]}_element`;
            }

            if (!target) {
                return match;
            }

            const n = numberFor(target);

            return `${openTag}<a href="#${target}${pageScope}">${content}<sup>${n}</sup></a>${closeTag}`;
        },
    );

    processed = processed.replace(
        /(<dfn\b[^>]*\bclass="[^"]*\byfm-term_dfn\b[^"]*"[^>]*>)([\s\S]*?)(<\/dfn>)/g,
        (match, openTag, content, closeTag) => {
            const idMatch = /\bid="([^"]*)"/.exec(openTag);

            if (!idMatch) {
                return match;
            }

            const n = numberFor(idMatch[1]);
            const scopedOpenTag = openTag.replace(/\bid="([^"]*)"/, `id="$1${pageScope}"`);
            const trimmedContent = content.replace(/^\s+/, '').replace(/\s+$/, '');
            const newContent = trimmedContent.replace(/(<[^>]+>)/, `$1<sup>${n}</sup> `);

            return `${scopedOpenTag}${newContent}${closeTag}`;
        },
    );

    const dfnNumber = (dfn: string) => Number(/<sup>(\d+)<\/sup>/.exec(dfn)?.[1] ?? Infinity);

    processed = processed.replace(DFN_RUN_RE, (run) => {
        const dfns = run.match(DFN_RE) ?? [];

        return dfns.sort((a, b) => dfnNumber(a) - dfnNumber(b)).join('\n');
    });

    return processed;
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

async function removePageNumbers(inputPath: string, getIndices: (total: number) => number[]) {
    const pdfDoc = await PDFDocument.load(new Uint8Array(readFileSync(inputPath)));
    const pages = pdfDoc.getPages();

    for (const i of getIndices(pages.length)) {
        const page = pages[i];
        const {width, height} = page.getSize();

        page.setCropBox(0, 50, width, height - 80);
        page.drawRectangle({x: 0, y: 0, width, height: 50, color: rgb(1, 1, 1)});
    }

    writeFileSync(inputPath, await pdfDoc.save());
}

export function removeFirstNPageNumbers(inputPath: string, n: number) {
    return removePageNumbers(inputPath, (total) =>
        Array.from({length: Math.min(n, total)}, (_, i) => i),
    );
}

export function removeLastNPageNumbers(inputPath: string, n: number) {
    return removePageNumbers(inputPath, (total) => {
        const start = Math.max(0, total - n);
        return Array.from({length: total - start}, (_, i) => start + i);
    });
}

// Rasterizes inline <svg> elements to PNG via canvas.
// Fixes rendering of complex inline SVGs (e.g. with masks, patterns, xlink:href)
// which Chromium's PDF print pipeline sometimes fails to render.
export async function rasterizeInlineSvgs(page: import('puppeteer-core').Page) {
    await page.evaluate(
        () =>
            new Promise<void>((resolveAll) => {
                const svgs = Array.from(document.querySelectorAll<SVGSVGElement>('svg'));

                if (svgs.length === 0) {
                    resolveAll();
                    return;
                }

                let pending = svgs.length;

                const done = () => {
                    if (--pending === 0) resolveAll();
                };

                svgs.forEach((svg) => {
                    const rect = svg.getBoundingClientRect();
                    const wAttr = svg.getAttribute('width');
                    const hAttr = svg.getAttribute('height');
                    const w = Math.ceil(rect.width) || (wAttr ? parseFloat(wAttr) : 0) || 100;
                    const h = Math.ceil(rect.height) || (hAttr ? parseFloat(hAttr) : 0) || 100;

                    const svgClone = svg.cloneNode(true) as SVGSVGElement;

                    if (!svgClone.getAttribute('xmlns')) {
                        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    }

                    const svgStr = new XMLSerializer().serializeToString(svgClone);
                    const blob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
                    const dataUrl = URL.createObjectURL(blob);

                    const img = new Image();

                    const timeout = setTimeout(() => {
                        URL.revokeObjectURL(dataUrl);
                        console.warn('Timeout rasterizing inline SVG');
                        done();
                    }, 5000);

                    img.onload = () => {
                        clearTimeout(timeout);
                        const canvas = document.createElement('canvas');
                        canvas.width = w * 2;
                        canvas.height = h * 2;

                        const ctx = canvas.getContext('2d')!;
                        ctx.scale(2, 2);

                        try {
                            ctx.drawImage(img, 0, 0, w, h);
                            const replacement = document.createElement('img');
                            replacement.src = canvas.toDataURL('image/png');
                            replacement.width = w;
                            replacement.height = h;
                            replacement.style.display = 'inline-block';
                            replacement.style.verticalAlign = 'middle';

                            if (svg.parentNode) {
                                svg.parentNode.replaceChild(replacement, svg);
                            }
                        } catch (e) {
                            console.warn('Failed to rasterize inline SVG:', e);
                        } finally {
                            URL.revokeObjectURL(dataUrl);
                            done();
                        }
                    };

                    img.onerror = (e) => {
                        clearTimeout(timeout);
                        URL.revokeObjectURL(dataUrl);
                        console.warn('Failed to load inline SVG as image:', e);
                        done();
                    };

                    img.src = dataUrl;
                });
            }),
    );
}

// Rasterizes SVG <img> elements to PNG via canvas.
// Fixes rendering of complex SVGs (e.g. with embedded base64 PNG, masks, xlink:href)
// which Chromium's PDF print pipeline sometimes fails to render.
export async function rasterizeSvgImages(page: import('puppeteer-core').Page) {
    await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));

        imgs.forEach((img) => {
            if (!img.src.includes('.svg') && !img.src.startsWith('data:image/svg')) {
                return;
            }

            if (!img.complete || (img.naturalWidth === 0 && img.naturalHeight === 0)) {
                return;
            }

            const w = img.naturalWidth || img.width || 100;
            const h = img.naturalHeight || img.height || 100;

            const canvas = document.createElement('canvas');

            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext('2d')!;

            try {
                ctx.drawImage(img, 0, 0, w, h);
                img.src = canvas.toDataURL('image/png');
            } catch (e) {
                console.warn('Failed to rasterize SVG image:', img.src, e);
            }
        });
    });
}

export async function compressPageImages(page: import('puppeteer-core').Page, quality: number) {
    await page.evaluate((q) => {
        const MAX_DIMENSION = 1600;

        function compressImage(img: HTMLImageElement) {
            if (!img.src || img.naturalWidth === 0) {
                return;
            }

            if (img.src.includes('.svg') || img.src.startsWith('data:image/svg')) {
                return;
            }

            if (img.naturalWidth < 100 && img.naturalHeight < 100) {
                return;
            }

            let {naturalWidth: w, naturalHeight: h} = img;

            if (w > MAX_DIMENSION) {
                h = Math.round((h * MAX_DIMENSION) / w);
                w = MAX_DIMENSION;
            }

            if (h > MAX_DIMENSION) {
                w = Math.round((w * MAX_DIMENSION) / h);
                h = MAX_DIMENSION;
            }

            const canvas = document.createElement('canvas');

            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext('2d')!;

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);

            try {
                img.src = canvas.toDataURL('image/jpeg', q / 100);
            } catch (_e) {
                // Cross-origin image (tainted canvas) — skip compression
            }
        }

        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));

        imgs.forEach((img) => {
            if (img.complete) {
                compressImage(img);
            } else {
                img.onload = () => compressImage(img);
            }
        });
    }, quality);

    await page.evaluate(
        () =>
            new Promise<void>((resolve) => {
                const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
                const pending = imgs.filter((img) => !img.complete);

                if (pending.length === 0) {
                    resolve();
                    return;
                }

                let settled = 0;

                const onSettle = () => {
                    if (++settled >= pending.length) resolve();
                };

                pending.forEach((img) => {
                    img.onload = onSettle;
                    img.onerror = onSettle;
                });
            }),
    );
}
