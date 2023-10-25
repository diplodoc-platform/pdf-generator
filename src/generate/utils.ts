import {readFileSync} from 'fs';
import {join} from 'path';

const yfmStylesPath = require.resolve('@diplodoc/transform/dist/css/yfm.css');
const yfmStyles = readFileSync(yfmStylesPath, 'utf-8');

const yfmPrintStylesPath = require.resolve('@diplodoc/transform/dist/css/print.css');
const yfmPrintStyles = readFileSync(yfmPrintStylesPath, 'utf-8');

const yfmPrintJSPath = require.resolve('@diplodoc/transform/dist/js/print.js');
const yfmPrintJS = readFileSync(yfmPrintJSPath, 'utf-8');

const yfmJSPath = require.resolve('@diplodoc/transform/dist/js/yfm.js');
const yfmJS = readFileSync(yfmJSPath, 'utf-8');

import {SINGLE_PAGE_DATA_FILENAME} from './constants';

export function generatePdfStaticMarkup(html: string) {
    return `
<!doctype html>
<html>
<head>
    <meta charset="UTF-8"/>
    <style>
        ${yfmStyles}
        ${yfmPrintStyles}
    </style>
    <style>
        .yfm {
            margin: 0 auto;
            min-width: 200px;
            max-width: 980px;
            padding: 45px;
        }
    </style>
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
