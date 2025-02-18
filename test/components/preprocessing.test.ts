import { describe, it, expect, beforeEach } from 'vitest';
import { convertHtmlToMd } from '@/components/preprocessing';
import { fakeBrowser } from "wxt/testing";
import { JSDOM } from 'jsdom';

describe('convertHtmlToMd', () => {
    beforeEach(() => {
            fakeBrowser.reset();

    });
    it('should convert HTML to Markdown correctly', async () => {
        const htmlStr = `<div id="content"><h1>Hello World!</h1><p>This is a test paragraph.</p></div>`
        const dom = new JSDOM(htmlStr)
        const htmlElem = dom.window.document.getElementById('content')!;
        const markdown = await convertHtmlToMd(htmlElem);

        expect(markdown).toContain('Hello World!');
        expect(markdown).toContain('This is a test paragraph.');
    });
});
