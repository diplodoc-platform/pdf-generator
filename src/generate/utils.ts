import {join} from 'path';

// @ts-ignore
import yfmPrintStyles from '@diplodoc/transform/dist/css/print.css';
// @ts-ignore
import yfmStyles from '@diplodoc/transform/dist/css/yfm.css';
// @ts-ignore
import yfmPrintJS from '@diplodoc/transform/dist/js/print.js';
// @ts-ignore
import yfmJS from '@diplodoc/transform/dist/js/yfm.js';

import {SINGLE_PAGE_DATA_FILENAME} from './constants';

const FontsInjection = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono&family=Inter:opsz@14..32&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100..900&family=Noto+Sans+TC:wght@100..900&display=swap" rel="stylesheet">
    `.trim();

const FontsOverride = `
    <style>
        body.yfm {
            font-family: 'Inter', 'Noto Sans SC', 'Microsoft Yahei', 'SimHei', sans-serif !important;
            font-weight: 400 !important;
        }

        body.yfm code {
            font-family: 'Atkinson Hyperlegible Mono', 'Noto Sans SC', 'Microsoft Yahei', 'SimHei', monospace !important;
            font-weight: 400 !important;
        }

        * {
            text-rendering: geometricprecision !important;
        }
    </style>
`.trim();

type MarkupGeneratorOptions = {
    html: string;
    base?: string;
    injectPlatformAgnosticFonts?: boolean;
};

export function generatePdfStaticMarkup({
    html,
    base,
    injectPlatformAgnosticFonts,
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
        body.yfm {
            margin: 0 auto;
            min-width: 200px;
            max-width: 980px;
            padding: 45px;
        }
    </style>
${injectPlatformAgnosticFonts ? FontsOverride : ''}
</head>
<body class="yfm pdf">
    ${html}
    <script>
        ${yfmJS}
    </script>
    <script>
        ${yfmPrintJS}
    </script>
</body>
</html>
    `.trim();
}

export function prepareGlobs(items: string[]) {
    return items.map((item) => join(item, SINGLE_PAGE_DATA_FILENAME));
}
