import {join} from 'path';

import {SINGLE_PAGE_DATA_FILENAME} from './constants';

// @ts-ignore
import yfmStyles from '@diplodoc/transform/dist/css/yfm.css';
// @ts-ignore
import yfmPrintStyles from '@diplodoc/transform/dist/css/print.css';
// @ts-ignore
import yfmPrintJS from '@diplodoc/transform/dist/js/print.js';
// @ts-ignore
import yfmJS from '@diplodoc/transform/dist/js/yfm.js';

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
