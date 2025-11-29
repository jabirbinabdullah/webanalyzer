import { load } from 'cheerio';
import axios from 'axios';
import analyzeSEO from '../seoScanner.js';

jest.mock('axios');

describe('seoScanner analyzeSEO', () => {
  test('resolves canonical relative URL and marks sameHost', async () => {
    const html = '<head><link rel="canonical" href="/canonical-path" /></head>';
    const $ = load(html);
    const res = await analyzeSEO({ $, baseUrl: 'https://example.com/page' });
    expect(res.canonical.raw).toBe('/canonical-path');
    expect(res.canonical.resolved).toBe('https://example.com/canonical-path');
    expect(res.canonical.sameHost).toBe(true);
  });

  test('parses valid JSON-LD and reports parse errors for invalid', async () => {
    const html = `
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script>
      <script type="application/ld+json">{ invalid json }</script>
    `;
    const $ = load(html);
    const res = await analyzeSEO({ $, baseUrl: 'https://example.com' });
    expect(res.jsonLd.count).toBe(2);
    expect(res.jsonLd.parsed.length).toBe(1);
    expect(res.jsonLd.errors.length).toBe(1);
  });

  test('detects hreflang duplicates', async () => {
    const html = `
      <link rel="alternate" hreflang="en" href="/en" />
      <link rel="alternate" hreflang="EN" href="/en-2" />
      <link rel="alternate" hreflang="fr" href="/fr" />
    `;
    const $ = load(html);
    const res = await analyzeSEO({ $, baseUrl: 'https://example.com' });
    expect(res.hreflang.total).toBe(3);
    expect(res.hreflang.duplicates).toContain('en');
  });

  test('fetches and parses sitemap.xml urlset', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/</loc></url>
        <url><loc>https://example.com/about</loc></url>
      </urlset>`;
    axios.get.mockResolvedValue({ data: xml });

    const $ = load('<html></html>');
    const res = await analyzeSEO({ $, baseUrl: 'https://example.com' });
    expect(res.sitemap.parsed).toBe(true);
    expect(res.sitemap.urlCount).toBe(2);
  });
});
