import {compressPageImages} from '../src/generate/generatePdf';

const defaultStats = {total: 0, compressed: 0, skippedCrossOrigin: 0, skippedSmallOrSvg: 0};

function makeMockPage(evaluateImpl?: (fn: Function, ...args: unknown[]) => Promise<unknown>) {
    let callCount = 0;
    return {
        evaluate: jest.fn(
            evaluateImpl ??
                (() => {
                    // First call returns compression stats, second call (wait for loads) returns void
                    return Promise.resolve(callCount++ === 0 ? defaultStats : undefined);
                }),
        ),
    };
}

describe('compressPageImages', () => {
    it('calls page.evaluate twice: once to compress, once to wait for loads', async () => {
        const page = makeMockPage();
        await compressPageImages(page as any, 80);
        expect(page.evaluate).toHaveBeenCalledTimes(2);
    });

    it('passes quality value to the first evaluate call', async () => {
        const page = makeMockPage();
        await compressPageImages(page as any, 60);
        const [_fn, quality] = page.evaluate.mock.calls[0];
        expect(quality).toBe(60);
    });

    it('does not throw when page.evaluate rejects (e.g. unexpected browser error)', async () => {
        const page = makeMockPage(() => Promise.reject(new Error('browser crashed')));
        await expect(compressPageImages(page as any, 80)).rejects.toThrow('browser crashed');
        // Verifies the error propagates — caller (generatePdf) already wraps in try-catch
    });
});
