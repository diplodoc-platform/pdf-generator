const {resolve} = require('path');

const {fromPath} = require('pdf2pic');

const pdfFile = resolve(__dirname, '../integration-output/en/single-page.pdf');
const options = {
    density: 100,
    format: 'png',
    width: 794,
    height: 1123,
};
const convertPdf2Pic = fromPath(pdfFile, options);
const numberOfPages = 11;

for (let currentPage = 1; currentPage <= numberOfPages; currentPage++) {
    convertPdf2Pic(currentPage, {
        responseType: 'buffer',
    })
        .then((data) => console.log(data))
        .catch((err) => console.log(err));
}
