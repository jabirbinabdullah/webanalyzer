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

  test('json-ld validation reports missing @context/@type', async () => {
    const html = `
      <script type="application/ld+json">{"name":"NoContext"}</script>
    `;
    const $ = load(html);
    const res = await analyzeSEO({ $, baseUrl: 'https://example.com' });
    expect(res.jsonLd.count).toBe(1);
    expect(res.jsonLd.parsed.length).toBe(1);
    expect(res.jsonLd.validations[0].issues).toContain(
      'missing_schema_context_or_type'
    );
  });

  test('schema validation flags missing required fields for known types', async () => {
    const html = `
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline": ""}</script>
    `;
    const $ = load(html);
    const res = await analyzeSEO({ $, baseUrl: 'https://example.com' });
    // For WebSite, schema requires @context and optionally url; valid but may lack url
    expect(res.jsonLd.schemaValidation.length).toBeGreaterThanOrEqual(1);
    const hasWebSite = res.jsonLd.schemaValidation.some(
      (e) => e.matches && e.matches.includes('WebSite')
    );
    expect(hasWebSite).toBe(true);
  });

  test('schema validation recognizes Organization and BreadcrumbList', async () => {
    const html = `
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Acme Inc"}</script>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"item":{"@id":"/","name":"Home"}}]}</script>
    `;
    const $ = load(html);
    const res = await analyzeSEO({ $, baseUrl: 'https://example.com' });
    expect(res.jsonLd.count).toBe(2);
    // ensure schemaValidation entries include the type matches
    const flatMatches = (res.jsonLd.schemaValidation || []).flatMap(
      (e) => e.matches || []
    );
    expect(flatMatches).toEqual(
      expect.arrayContaining(['Organization', 'BreadcrumbList'])
    );
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

  test('canonical on different host is flagged', async () => {
    const html =
      '<head><link rel="canonical" href="https://other.example/canonical" /></head>';
    const $ = load(html);
    const res = await analyzeSEO({ $, baseUrl: 'https://example.com/page' });
    expect(res.canonical.raw).toBe('https://other.example/canonical');
    expect(res.canonical.issues).toContain('different_host');
  });

  test('product and recipe schema validation: product missing required shows errors, recipe matches', async () => {
    const html = `
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","image":"/p.jpg"}</script>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Recipe","name":"Pancakes","recipeIngredient":["1 cup flour","2 eggs"]}</script>
    `;
    const $ = load(html);
    const res = await analyzeSEO({ $, baseUrl: 'https://example.com' });
    expect(res.jsonLd.count).toBe(2);
    const sv = res.jsonLd.schemaValidation || [];
    // Find product entry and recipe entry
    const productEntry = sv.find((e) => (e.matches || []).includes('Product'));
    const recipeEntry = sv.find((e) => (e.matches || []).includes('Recipe'));
    // Product should have been matched but report errors because 'name' was missing
    expect(productEntry).toBeDefined();
    expect(
      productEntry.errors && productEntry.errors.length
    ).toBeGreaterThanOrEqual(1);
    // Recipe should be matched and have no AJV errors
    expect(recipeEntry).toBeDefined();
    const recipeErrors =
      recipeEntry.errors && recipeEntry.errors.length
        ? recipeEntry.errors.flatMap((x) => x.errors || [])
        : [];
    expect(recipeErrors.length).toBe(0);
  });

  test('offer, aggregateRating, and person schema handling', async () => {
    const html = `
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Offer","priceCurrency":"USD"}</script>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"AggregateRating","ratingValue":4.5,"reviewCount":10}</script>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Jane Doe"}</script>
    `;
    const $ = load(html);
    const res = await analyzeSEO({ $, baseUrl: 'https://example.com' });
    expect(res.jsonLd.count).toBe(3);
    const flatMatches = (res.jsonLd.schemaValidation || []).flatMap(
      (e) => e.matches || []
    );
    // Offer should be matched and report errors (missing price)
    expect(flatMatches).toEqual(
      expect.arrayContaining(['Offer', 'AggregateRating', 'Person'])
    );
    const offerEntry = (res.jsonLd.schemaValidation || []).find((e) =>
      (e.matches || []).includes('Offer')
    );
    expect(offerEntry).toBeDefined();
    expect(
      offerEntry.errors && offerEntry.errors.length
    ).toBeGreaterThanOrEqual(1);
    const aggEntry = (res.jsonLd.schemaValidation || []).find((e) =>
      (e.matches || []).includes('AggregateRating')
    );
    expect(aggEntry).toBeDefined();
    const aggErrors =
      aggEntry.errors && aggEntry.errors.length
        ? aggEntry.errors.flatMap((x) => x.errors || [])
        : [];
    expect(aggErrors.length).toBe(0);
    const personEntry = (res.jsonLd.schemaValidation || []).find((e) =>
      (e.matches || []).includes('Person')
    );
    expect(personEntry).toBeDefined();
    const personErrors =
      personEntry.errors && personEntry.errors.length
        ? personEntry.errors.flatMap((x) => x.errors || [])
        : [];
    expect(personErrors.length).toBe(0);
  });
});
