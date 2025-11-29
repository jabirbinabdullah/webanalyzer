import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

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
  seo.canonical = { raw: canonicalRaw, resolved: canonicalResolved, sameHost };

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
