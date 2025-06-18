import { PDFDocument, PDFName, PDFDict, PDFArray, PDFHexString, PDFNumber, PDFRef } from 'pdf-lib';


export interface TOCEntry {
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

export function generateTOC(data: TOCItem[]): TOCEntry[] {
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
  
  
export function generateTOCHTML(toc: TOCItem[]): string {
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
  

export async function addBookmarksFromTOC(pdfBytes: Uint8Array, toc: TOCEntry[]): Promise<Uint8Array> {
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
