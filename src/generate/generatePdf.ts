import {readFileSync, writeFileSync, PathOrFileDescriptor, existsSync, PathLike} from 'fs';
import {dirname, join} from 'path';

import {Browser} from 'puppeteer-core';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFHexString, PDFNumber, PDFRef } from 'pdf-lib';

import {PDF_FILENAME, PDF_SOURCE_FILENAME, PUPPETEER_PAGE_OPTIONS, Status, DEFAULT_HTML_FOOTER_VALUE} from './constants';
import {generatePdfStaticMarkup} from './utils';
import {generateTOC, generateTOCHTML, addBookmarksFromTOC, TOCEntry} from './generatePdfTOC';

export interface GeneratePDFOptions {
    singlePagePath: string;
    browser: Browser;
    injectPlatformAgnosticFonts?: boolean;
    customHeader?: string;
    customFooter?: string;
}

export interface GeneratePDFResult {
    status: Status;
    error?: Error;
}

interface TOCEntry {
    title: string;
    pageIndex: number;
    children?: TOCEntry[];
}

type TOCItem = {
    name: string;
    href?: string;
    labeled?: boolean;
    hidden?: boolean;
    items?: TOCItem[];
  };

function generateTOC(data: any[]): TOCEntry[] {
    let counter = 0;
  
    function walk(items: any[]): TOCEntry[] {
      return items.map(item => {
        const currentIndex = counter++;
  
        const children = Array.isArray(item.items) ? walk(item.items) : undefined;
  
        return {
          title: item.name,
          pageIndex: currentIndex,
          ...(children && children.length > 0 ? { children } : {})
        };
      });
    }
  
    return walk(data);
  }
  
  
function generateTOCHTML(toc: TOCItem[]): string {
    function renderItems(items: TOCItem[]): string {
      return `
        <ul>
          ${items
            .map(item => {
              const classes = [
                item.labeled ? 'labeled' : '',
                item.hidden ? 'hidden' : '',
              ]
                .filter(Boolean)
                .join(' ');
              const classAttr = classes ? ` class="${classes}"` : '';
              const link = item.href
                ? `<a href="${item.href}"${classAttr}>${item.name}</a>`
                : `<span${classAttr}>${item.name}</span>`;
              const children = item.items ? renderItems(item.items) : '';
              return `<li>${link}${children}</li>`;
            })
            .join('\n')}
        </ul>
      `;
    }
  
    return `<div class="toc">
      ${renderItems(toc)}
    </div>`;
  }
  

async function addBookmarksFromTOC(pdfBytes: Uint8Array, toc: TOCEntry[]): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const context = pdfDoc.context;
    const catalog = pdfDoc.catalog;
  
    let totalCount = 0;
  
    function createOutlineItems(entries: TOCEntry[], parentRef?: PDFRef): { first: PDFRef, last: PDFRef, count: number } {
        const itemRefs: PDFRef[] = [];
        let prevRef: PDFRef | undefined;
      
        for (const entry of entries) {
          const title = PDFHexString.fromText(entry.title);
          const pageRef = pdfDoc.getPages()[entry.pageIndex].ref;
          const dest = context.obj([pageRef, PDFName.of('Fit')]) as PDFArray;
      
          const outlineItemDict = context.obj({
            Title: title,
            Dest: dest,
          }) as PDFDict;
      
          const outlineRef = context.register(outlineItemDict);
      
          if (prevRef) {
            const prevDict = context.lookup(prevRef, PDFDict);
            prevDict.set(PDFName.of('Next'), outlineRef);
            outlineItemDict.set(PDFName.of('Prev'), prevRef);
          }
      
          if (parentRef) {
            outlineItemDict.set(PDFName.of('Parent'), parentRef);
          }
      
          // Processing children recursively
          if (entry.children && entry.children.length > 0) {
            const { first, last, count } = createOutlineItems(entry.children, outlineRef);
            outlineItemDict.set(PDFName.of('First'), first);
            outlineItemDict.set(PDFName.of('Last'), last);
            outlineItemDict.set(PDFName.of('Count'), PDFNumber.of(count));
            totalCount += count;
          }
      
          totalCount++;
          itemRefs.push(outlineRef);
          prevRef = outlineRef;
        }
      
        return {
          first: itemRefs[0],
          last: itemRefs[itemRefs.length - 1],
          count: itemRefs.length,
        };
      }
  
    const outlinesDict = context.obj({
      Type: PDFName.of('Outlines'),
    }) as PDFDict;
  
    const outlinesRef = context.register(outlinesDict);
  
    const { first, last, count } = createOutlineItems(toc, outlinesRef);
  
    outlinesDict.set(PDFName.of('First'), first);
    outlinesDict.set(PDFName.of('Last'), last);
    outlinesDict.set(PDFName.of('Count'), PDFNumber.of(totalCount));
  
    catalog.set(PDFName.of('Outlines'), outlinesRef);
    catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
  
    return await pdfDoc.save();
}

async function generatePdf({
    singlePagePath,
    browser,
    injectPlatformAgnosticFonts,
    customHeader, 
    customFooter,
}: GeneratePDFOptions): Promise<GeneratePDFResult> {

    console.log(`Processing singlePagePath = ${singlePagePath}`)

    const result: GeneratePDFResult = {status: Status.SUCCESS};

    /* Create PDF source file content from single page data */
    const singlePageData = readFileSync(singlePagePath, 'utf8');
    const parsedSinglePageData = JSON.parse(singlePageData);

    const singlePageTOCPath = singlePagePath.replace(".json", "-toc.js");

    console.log(`Processing singlePageTOCPath = ${singlePageTOCPath}`)

    const singlePageTOCData = readFileSync(singlePageTOCPath, 'utf8');

    const TOCJSONInput = singlePageTOCData.replace("window.__DATA__.data.toc = ", "").replace(/="h/g, '=\\\\"h').replace(/">/g, '\">').replace(/;$/, "")

    const parsedSinglePageTOCData = JSON.parse(TOCJSONInput)

    const pdfFileContent = generatePdfStaticMarkup({
        html: parsedSinglePageData.data.html ?? '',
        tocHtml: generateTOCHTML(parsedSinglePageTOCData.items),
        base: parsedSinglePageData.router.base,
        injectPlatformAgnosticFonts,
    });

    /* Save PDF source file */
    const pdfDirPath = dirname(singlePagePath);
    const pdfFileSourcePath = join(pdfDirPath, PDF_SOURCE_FILENAME);


    writeFileSync(pdfFileSourcePath, pdfFileContent);

    try {
        const page = await browser.newPage();

        await page.goto(`file://${pdfFileSourcePath}`, {
            waitUntil: 'networkidle2',
            timeout: 0,
        });


        const fullPdfFilePath = join(pdfDirPath, PDF_FILENAME);

        /* PDF header/footer configuration */
        let headerTemplateVal = " ";
        if (customHeader) {
            if (!existsSync(customHeader)) {
                throw new Error(`Worker file not found: ${customHeader}`);
            }
            headerTemplateVal = readFileSync(customHeader as PathOrFileDescriptor, 'utf8');
        }

        
        let footerTemplateVal = "";
        if (customFooter) {
            if (!existsSync(customFooter)) {
                throw new Error(`Worker file not found: ${customFooter}`);
            }
            footerTemplateVal = readFileSync(customFooter as PathOrFileDescriptor, 'utf8');
        }

        const resFooterVal = `<div style="position: relative;width: 100%;height: 0;">` + footerTemplateVal + `<div style="position: absolute;right: 20px;bottom: 0;font-size: 10px;z-index: 0;padding: 0 5px;background: white;"><span class="pageNumber"></span></div></div>`;

        /* PDF header/footer configuration */
        let headerTemplateVal = " ";
        if (customHeader) {
            if (!existsSync(customHeader)) {
                throw new Error(`Worker file not found: ${customHeader}`);
            }
            headerTemplateVal = readFileSync(customHeader as PathOrFileDescriptor, 'utf8');
        }

        
        let footerTemplateVal = "";
        if (customFooter) {
            if (!existsSync(customFooter)) {
                throw new Error(`Worker file not found: ${customFooter}`);
            }
            footerTemplateVal = readFileSync(customFooter as PathOrFileDescriptor, 'utf8');
        }

        const resFooterVal = `<div style="position: relative;width: 100%;height: 0;">` + footerTemplateVal + `<div style="position: absolute;right: 20px;bottom: 0;font-size: 10px;z-index: 0;padding: 0 5px;background: white;"><span class="pageNumber"></span></div></div>`;

        await page.pdf({
            path: fullPdfFilePath,
            ...PUPPETEER_PAGE_OPTIONS,
            headerTemplate: headerTemplateVal,
            footerTemplate: resFooterVal,
            timeout: 0,
        });

        await page.close();

        console.log(`Generated PDF file: ${fullPdfFilePath}`);

        
        /* PDF bookmarks/outline configuration */

        const toc: TOCEntry[] = generateTOC(parsedSinglePageTOCData.items);

        const inputPdf = readFileSync(fullPdfFilePath);

        const outputPdf = await addBookmarksFromTOC(inputPdf, toc);
        
        // Write result PDF with bookmarks
        writeFileSync(fullPdfFilePath, outputPdf);
        

    } catch (error) {
        result.status = Status.FAIL;
        result.error = error;

        console.error(`${singlePagePath}: encountered an error while generating PDF.`);
        console.error(error);
    }

    return result;
}

export {generatePdf};

export default {generatePdf};
