import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import Ajv from 'ajv';

function resolveUrl(base, href) {
  try {
    return new URL(href, base).href;
  } catch (err) {
    return null;
  }
}

/**
 * Analyze SEO-related pieces from a Cheerio `$` instance and page context.
 * @param {{ $: import('cheerio').CheerioAPI, baseUrl: string, robotsTxtText?: string }} opts
 */
export async function analyzeSEO({ $, baseUrl, robotsTxtText = null }) {
  const seo = {};

  // Canonical
  const canonicalRaw = $('link[rel="canonical"]').attr('href') || null;
  const canonicalResolved = canonicalRaw ? resolveUrl(baseUrl, canonicalRaw) : null;
  const sameHost = canonicalResolved ? new URL(canonicalResolved).hostname === new URL(baseUrl).hostname : null;
  // canonical checks: presence, resolution, same host, protocol consistency, path similarity
  const canonicalIssues = [];
  if (!canonicalRaw) {
    canonicalIssues.push('missing');
  } else if (!canonicalResolved) {
    canonicalIssues.push('invalid_url');
  } else {
    try {
      const baseU = new URL(baseUrl);
      const canU = new URL(canonicalResolved);
      if (baseU.hostname !== canU.hostname) canonicalIssues.push('different_host');
      if (baseU.protocol !== canU.protocol) canonicalIssues.push('different_protocol');
      // path similarity: warn if canonical path is root while page path is not (possible mismatch)
      if (baseU.pathname !== '/' && canU.pathname === '/') canonicalIssues.push('path_mismatch');
    } catch (e) {
      canonicalIssues.push('resolve_error');
    }
  }
  seo.canonical = { raw: canonicalRaw, resolved: canonicalResolved, sameHost, issues: canonicalIssues };

  // JSON-LD
  const jsonLdNodes = $('script[type="application/ld+json"]');
  seo.jsonLd = { count: jsonLdNodes.length, parsed: [], errors: [] };
  jsonLdNodes.each((i, el) => {
    const txt = $(el).text();
    try {
      const parsed = JSON.parse(txt);
      seo.jsonLd.parsed.push(parsed);
    } catch (err) {
      seo.jsonLd.errors.push({ index: i, message: err.message, raw: txt.slice(0, 200) });
    }
  });

  // Basic JSON-LD validation: for each parsed block, ensure it contains @context or @type or @graph
  seo.jsonLd.validations = [];
  seo.jsonLd.parsed.forEach((parsed, idx) => {
    const issues = [];
    // parsed can be object or array
    const checkObj = (obj) => {
      if (obj == null || typeof obj !== 'object') {
        issues.push('not_object');
        return;
      }
      if (!('@context' in obj) && !('@type' in obj) && !('@graph' in obj)) {
        issues.push('missing_schema_context_or_type');
      }
    };
    if (Array.isArray(parsed)) {
      parsed.forEach(p => checkObj(p));
    } else {
      checkObj(parsed);
    }
    seo.jsonLd.validations.push({ index: idx, issues });
  });

  // Schema validation for common JSON-LD types using AJV (lightweight)
  try {
    const ajv = new Ajv({ strict: false });
    // Minimal schemas for common types (WebSite, Article) - these are intentionally small
    const schemas = {
      WebSite: {
        type: 'object',
        properties: {
          '@context': { type: 'string' },
          '@type': { const: 'WebSite' },
          'url': { type: 'string' }
        },
        required: ['@context']
      },
      Article: {
        type: 'object',
        properties: {
          '@context': { type: 'string' },
          '@type': { const: 'Article' },
          'headline': { type: 'string' },
          'author': { type: 'object' }
        },
        required: ['@context', '@type', 'headline']
      },
      Organization: {
        type: 'object',
        properties: {
          '@context': { type: 'string' },
          '@type': { const: 'Organization' },
          'name': { type: 'string' },
          'url': { type: 'string' }
        },
        required: ['@context', '@type', 'name']
      },
      BreadcrumbList: {
        type: 'object',
        properties: {
          '@context': { type: 'string' },
          '@type': { const: 'BreadcrumbList' },
          'itemListElement': { type: 'array' }
        },
        required: ['@context', '@type', 'itemListElement']
      },
      Product: {
        type: 'object',
        properties: {
          '@context': { type: 'string' },
          '@type': { const: 'Product' },
          'name': { type: 'string' },
          'image': { type: ['string', 'array'] },
          'description': { type: 'string' },
          'brand': { type: ['string', 'object'] },
          'aggregateRating': {
            type: 'object',
            properties: {
              '@type': { type: 'string' },
              'ratingValue': { type: ['number', 'string'] },
              'reviewCount': { type: ['number', 'string'] }
            }
          },
          'offers': {
            type: 'object',
            properties: {
              'price': { type: ['number', 'string'] },
              'priceCurrency': { type: 'string' },
              'availability': { type: 'string' }
            }
          }
        },
        required: ['@context', '@type', 'name']
      },
      Recipe: {
        type: 'object',
        properties: {
          '@context': { type: 'string' },
          '@type': { const: 'Recipe' },
          'name': { type: 'string' },
          'image': { type: ['string', 'array'] },
          'author': { type: ['string', 'object'] },
          'recipeIngredient': { type: 'array', items: { type: 'string' } },
          'recipeInstructions': { 
            anyOf: [
              { type: 'string' },
              { type: 'array', items: { type: ['string','object'] } }
            ]
          },
          'cookTime': { type: 'string' },
          'prepTime': { type: 'string' },
          'totalTime': { type: 'string' },
          'recipeYield': { type: ['string', 'number'] }
        },
        required: ['@context', '@type', 'name', 'recipeIngredient']
      }
      ,
      Offer: {
        type: 'object',
        properties: {
          '@context': { type: 'string' },
          '@type': { const: 'Offer' },
          'price': { type: ['number', 'string'] },
          'priceCurrency': { type: 'string' },
          'availability': { type: 'string' },
          'url': { type: 'string' },
          'priceValidUntil': { type: 'string' },
          'itemCondition': { type: 'string' }
        },
        required: ['@context', '@type', 'price', 'priceCurrency']
      },
      AggregateRating: {
        type: 'object',
        properties: {
          '@context': { type: 'string' },
          '@type': { const: 'AggregateRating' },
          'ratingValue': { type: ['number', 'string'] },
          'reviewCount': { type: ['number', 'string'] },
          'bestRating': { type: ['number', 'string'] },
          'worstRating': { type: ['number', 'string'] }
        },
        required: ['@context', '@type', 'ratingValue']
      },
      Person: {
        type: 'object',
        properties: {
          '@context': { type: 'string' },
          '@type': { const: 'Person' },
          'name': { type: 'string' },
          'url': { type: 'string' }
        },
        required: ['@context', '@type', 'name']
      },
      Review: {
        type: 'object',
        properties: {
          '@context': { type: 'string' },
          '@type': { const: 'Review' },
          'reviewBody': { type: 'string' },
          'author': { type: ['string', 'object'] },
          'reviewRating': { type: 'object' }
        },
        required: ['@context', '@type', 'reviewBody']
      }
    };

    // compile validators
    const validators = Object.fromEntries(Object.entries(schemas).map(([k, s]) => [k, ajv.compile(s)]));

    seo.jsonLd.schemaValidation = [];
    seo.jsonLd.parsed.forEach((parsed, idx) => {
      const entry = { index: idx, matches: [], errors: [] };
      const objs = Array.isArray(parsed) ? parsed : [parsed];
      objs.forEach((obj) => {
        const type = obj['@type'];
        if (type && validators[type]) {
          const valid = validators[type](obj);
          if (!valid) {
            entry.matches.push(type);
            entry.errors.push({ type, errors: validators[type].errors });
          } else {
            entry.matches.push(type);
          }
        }
      });
      seo.jsonLd.schemaValidation.push(entry);
    });
  } catch (e) {
    // If AJV isn't available or something fails, record the error (non-fatal)
    seo.jsonLd.schemaValidationError = e.message;
  }

  // hreflang
  const hreflangNodes = $('link[rel="alternate"][hreflang]');
  const hreflangs = [];
  hreflangNodes.each((i, el) => {
    const val = $(el).attr('hreflang');
    if (val) hreflangs.push(val.toLowerCase());
  });
  const duplicates = hreflangs.filter((v, i, a) => a.indexOf(v) !== i);
  seo.hreflang = { total: hreflangs.length, duplicates: Array.from(new Set(duplicates)) };

  // robots.txt sitemap discovery
  let sitemapUrl = null;
  if (robotsTxtText) {
    const match = robotsTxtText.match(/Sitemap:\s*(\S+)/i);
    if (match) sitemapUrl = resolveUrl(baseUrl, match[1]);
  }

  // If no sitemap from robots, try common location
  if (!sitemapUrl) {
    const candidate = resolveUrl(baseUrl, '/sitemap.xml');
    sitemapUrl = candidate;
  }

  seo.sitemap = { url: sitemapUrl, parsed: false, urlCount: 0, errors: [] };
  if (sitemapUrl) {
    try {
      const resp = await axios.get(sitemapUrl, { timeout: 10000 });
      const xml = resp.data;
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
      const parsed = parser.parse(xml);
      // urlset -> urls
      if (parsed.urlset && parsed.urlset.url) {
        const urls = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];
        seo.sitemap.parsed = true;
        seo.sitemap.urlCount = urls.length;
      } else if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
        const maps = Array.isArray(parsed.sitemapindex.sitemap) ? parsed.sitemapindex.sitemap : [parsed.sitemapindex.sitemap];
        seo.sitemap.parsed = true;
        seo.sitemap.urlCount = maps.length;
      } else {
        seo.sitemap.parsed = false;
        seo.sitemap.errors.push('Unknown sitemap XML structure');
      }
    } catch (err) {
      seo.sitemap.errors.push(err.message);
    }
  }

  return seo;
}

export default analyzeSEO;
