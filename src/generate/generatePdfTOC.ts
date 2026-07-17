import {PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFRef} from 'pdf-lib';

export interface TOCEntry {
    title: string;
    dest?: string;
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
    function walk(items: TOCItem[]): TOCEntry[] {
        return items.map((item) => {
            const children = Array.isArray(item.items) ? walk(item.items) : undefined;
            const dest = item.href ? item.href.replace(/^#/, '') : undefined;

            return {
                title: item.name,
                ...(dest ? {dest} : {}),
                ...(children && children.length > 0 ? {children} : {}),
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
              .map((item) => {
                  const classes = [item.labeled ? 'labeled' : '', item.hidden ? 'hidden' : '']
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
      <h2 data-original-article="./none/toc"></h2>
      ${renderItems(toc)}
    </div>`;
}

function resolveDest(entry: TOCEntry, pageIndexByDest: Map<string, number>): string | undefined {
    if (entry.dest) {
        if (pageIndexByDest.has(entry.dest)) {
            return entry.dest;
        }

        if (pageIndexByDest.has(entry.dest + 'index')) {
            return entry.dest + 'index';
        }
    }

    for (const child of entry.children ?? []) {
        const childDest = resolveDest(child, pageIndexByDest);

        if (childDest) {
            return childDest;
        }
    }

    return undefined;
}

export async function addBookmarksFromTOC(
    pdfBytes: Uint8Array,
    toc: TOCEntry[],
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const context = pdfDoc.context;
    const catalog = pdfDoc.catalog;

    const pages = pdfDoc.getPages();
    const refToIndex = new Map<string, number>();
    pages.forEach((page, index) => refToIndex.set(page.ref.tag, index));

    const pageIndexByDest = new Map<string, number>();
    const dests = context.lookup(catalog.get(PDFName.of('Dests')));

    if (dests instanceof PDFDict) {
        for (const [key, value] of dests.entries()) {
            const dest = context.lookup(value);
            const pageRef = dest instanceof PDFArray ? dest.get(0) : undefined;

            if (pageRef instanceof PDFRef && refToIndex.has(pageRef.tag)) {
                pageIndexByDest.set(key.decodeText(), refToIndex.get(pageRef.tag) as number);
            }
        }
    }

    let totalCount = 0;

    function createOutlineItems(
        entries: TOCEntry[],
        parentRef?: PDFRef,
    ): {first: PDFRef; last: PDFRef; count: number} {
        const itemRefs: PDFRef[] = [];
        let prevRef: PDFRef | undefined;

        for (const entry of entries) {
            const title = PDFHexString.fromText(entry.title);

            const outlineItemDict = context.obj({
                Title: title,
            }) as PDFDict;

            const destName = resolveDest(entry, pageIndexByDest);

            if (destName !== undefined) {
                const page = pages[pageIndexByDest.get(destName) as number];
                const {height} = page.getSize();
                const dest = context.obj([page.ref, PDFName.of('XYZ'), 0, height, 0]);

                outlineItemDict.set(PDFName.of('Dest'), dest);
            }

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
                const {first, last, count} = createOutlineItems(entry.children, outlineRef);
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

    const {first, last} = createOutlineItems(toc, outlinesRef);

    outlinesDict.set(PDFName.of('First'), first);
    outlinesDict.set(PDFName.of('Last'), last);
    outlinesDict.set(PDFName.of('Count'), PDFNumber.of(totalCount));

    catalog.set(PDFName.of('Outlines'), outlinesRef);
    catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));

    return await pdfDoc.save();
}
