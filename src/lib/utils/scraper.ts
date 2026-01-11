import {Readability} from '@mozilla/readability';
import TurndownService from 'turndown';

export interface PageContent {
    title: string;
    content: string; // Markdown
    url: string;
    excerpt?: string;
    // Additional metadata
    domain: string;
    timestamp: string; // ISO format
    wordCount: number;
    language?: string;
    description?: string;
    author?: string;
    publishedDate?: string;
    modifiedDate?: string;
}

function getMetaContent(doc: Document, name: string): string | undefined {
    const meta = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return meta?.getAttribute('content') || undefined;
}

function getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export function extractPageContent(doc: Document): PageContent {
    console.debug('[Scraper] Starting page content extraction');
    console.debug('[Scraper] Page URL:', window.location.href);

    // Clone the document to avoid modifying the original page
    const docClone = doc.cloneNode(true) as Document;
    const reader = new Readability(docClone);
    const article = reader.parse();

    if (!article) {
        console.error('[Scraper] Failed to parse page content');
        throw new Error('Failed to parse page content');
    }

    console.debug('[Scraper] Article parsed:', {
        title: article.title,
        excerpt: article.excerpt?.substring(0, 100),
        contentLength: article.content?.length
    });

    const turndown = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
    });

    const markdownContent = turndown.turndown(article.content || '');
    const url = new URL(window.location.href);

    const pageContent: PageContent = {
        title: article.title || 'Untitled',
        content: markdownContent,
        url: window.location.href,
        excerpt: article.excerpt || undefined,
        domain: url.hostname,
        timestamp: new Date().toISOString(),
        wordCount: getWordCount(markdownContent),
        language: doc.documentElement.lang || undefined,
        description: getMetaContent(doc, 'description') ||
                    getMetaContent(doc, 'og:description') ||
                    article.excerpt ||
                    undefined,
        author: getMetaContent(doc, 'author') ||
               getMetaContent(doc, 'article:author') ||
               article.byline ||
               undefined,
        publishedDate: getMetaContent(doc, 'article:published_time') ||
                      getMetaContent(doc, 'datePublished') ||
                      undefined,
        modifiedDate: getMetaContent(doc, 'article:modified_time') ||
                     getMetaContent(doc, 'dateModified') ||
                     undefined
    };

    console.debug('[Scraper] Content extracted successfully:', {
        title: pageContent.title,
        domain: pageContent.domain,
        wordCount: pageContent.wordCount,
        language: pageContent.language,
        author: pageContent.author
    });

    return pageContent;
}

export function formatPageContextForLLM(pageContent: PageContent): string {
    console.debug('[Scraper] Formatting page context for LLM');

    const parts = [
        '=== PAGE CONTEXT ===',
        `Title: ${pageContent.title}`,
        `URL: ${pageContent.url}`,
        `Domain: ${pageContent.domain}`,
        `Captured: ${new Date(pageContent.timestamp).toLocaleString()}`,
        `Word Count: ${pageContent.wordCount}`,
    ];

    if (pageContent.language) {
        parts.push(`Language: ${pageContent.language}`);
    }

    if (pageContent.author) {
        parts.push(`Author: ${pageContent.author}`);
    }

    if (pageContent.publishedDate) {
        parts.push(`Published: ${new Date(pageContent.publishedDate).toLocaleString()}`);
    }

    if (pageContent.description) {
        parts.push(`\nDescription: ${pageContent.description}`);
    }

    parts.push('\n=== PAGE CONTENT ===');
    parts.push(pageContent.content);
    parts.push('\n=== END PAGE CONTENT ===');

    const formatted = parts.join('\n');
    console.debug('[Scraper] Formatted context length:', formatted.length, 'characters');

    return formatted;
}
