import {join} from 'path';

import yfmStyles from '@diplodoc/transform/dist/css/yfm.css';
import yfmPrintJS from '@diplodoc/transform/dist/js/print.js';
import yfmJS from '@diplodoc/transform/dist/js/yfm.js';

import {SINGLE_PAGE_DATA_FILENAME} from './constants';

export function generatePdfStaticMarkup(html: string) {
    return `
<!doctype html>
<html>
<head>
    <meta charset="UTF-8"/>
    <style>
        ${yfmStyles}
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
