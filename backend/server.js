import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import { load } from 'cheerio';
import axios from 'axios';
import { AxePuppeteer } from 'axe-puppeteer';
import lighthouse from 'lighthouse';
import { detectTechnologies } from './src/scanners/techScanner.js';
import analyzeSEO from './src/scanners/seoScanner.js';
import rateLimit from 'express-rate-limit';
import connectDB from './src/config/db.js';
import Analysis from './src/models/Analysis.js';
import { promises as dnsPromises } from 'dns';
import net from 'net';

// SSRF / IP validation helpers
function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p))) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function isPrivateIPv4(ip) {
  const i = ipv4ToInt(ip);
  if (i === null) return false;
  // 10.0.0.0/8
  if (i >= ipv4ToInt('10.0.0.0') && i <= ipv4ToInt('10.255.255.255')) return true;
  // 172.16.0.0/12
  if (i >= ipv4ToInt('172.16.0.0') && i <= ipv4ToInt('172.31.255.255')) return true;
  // 192.168.0.0/16
  if (i >= ipv4ToInt('192.168.0.0') && i <= ipv4ToInt('192.168.255.255')) return true;
  // 127.0.0.0/8 loopback
  if (i >= ipv4ToInt('127.0.0.0') && i <= ipv4ToInt('127.255.255.255')) return true;
  // link-local 169.254.0.0/16
  if (i >= ipv4ToInt('169.254.0.0') && i <= ipv4ToInt('169.254.255.255')) return true;
  return false;
}

function isPrivateIPv6(ip) {
  // simple checks: loopback ::1, fc00::/7 (unique local), fe80::/10 (link-local)
  if (!ip) return false;
  const norm = ip.toLowerCase();
  if (norm === '::1') return true;
  if (norm.startsWith('fc') || norm.startsWith('fd')) return true; // fc00::/7
  if (norm.startsWith('fe80')) return true; // fe80::/10
  return false;
}

async function isHostAllowed(hostname) {
  // In test environment, skip network/DNS checks to allow mocked hosts
  if (process.env.NODE_ENV === 'test') return true;
  // If hostname is an IP literal, check directly
  if (net.isIP(hostname)) {
    if (net.isIP(hostname) === 4) {
      return !isPrivateIPv4(hostname);
    }
    return !isPrivateIPv6(hostname);
  }

  // Resolve DNS to get IP addresses
  try {
    const records = await dnsPromises.lookup(hostname, { all: true });
    for (const r of records) {
      const addr = r.address;
      if (net.isIP(addr) === 4) {
        if (isPrivateIPv4(addr)) return false;
      } else if (net.isIP(addr) === 6) {
        if (isPrivateIPv6(addr)) return false;
      }
    }
    return true;
  } catch (err) {
    // If DNS resolution fails, be conservative and disallow
    return false;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Database
connectDB();

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

const PORT = process.env.PORT || 5000;

app.get('/api/health', (req, res) => res.json({ ok: true }));

/**
 * GET /api/analyze?url=
 * Returns basic metadata and technologies detected on the page.
 */
app.get('/api/analyze', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url query parameter' });

  try {
    // Basic but effective URL validation. The URL constructor will throw
    // a TypeError if the URL is malformed. We also check for a valid protocol.
    const urlObject = new URL(url);
    if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
      throw new Error('Invalid protocol.');
    }
    // Reject excessively long URLs
    if (url.length > 2000) {
      return res.status(400).json({ error: 'URL too long.' });
    }

    // SSRF guard: ensure the hostname resolves to a public IP
    const hostAllowed = await isHostAllowed(urlObject.hostname);
    if (!hostAllowed) {
      return res.status(400).json({ error: 'URL host resolves to a private or disallowed IP.' });
    }
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL provided.' });
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    const html = await page.content();
    const headers = response.headers();
    const $ = load(html);

    const title = await page.title();
    const description = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);
    const h1 = await page.$eval('h1', el => el.textContent).catch(() => null);

    const pageMetrics = await page.metrics();
    const performanceTiming = JSON.parse(await page.evaluate(() => JSON.stringify(performance.timing)));

    const metrics = {
      taskDuration: (pageMetrics.TaskDuration * 1000).toFixed(2), // ms
      fcp: (performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart).toFixed(2), // ms
      load: (performanceTiming.loadEventEnd - performanceTiming.navigationStart).toFixed(2), // ms
    };

    const screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 70 });

    const detectedGlobals = {
      hasChartJs: await page.evaluate(() => typeof window.Chart !== 'undefined'),
    };

    const technologies = detectTechnologies({ html, headers, $, detectedGlobals });

    const accessibility = await new AxePuppeteer(page).analyze();

    // SEO Checks (use analyzer module for richer checks)
    const robotsTxtUrl = new URL('/robots.txt', url).href;
    const robotsTxt = await axios.get(robotsTxtUrl).then(res => res.data).catch(() => null);

    const wordCount = $('body').text().split(/\s+/).filter(Boolean).length;

    let seoScannerResult = {};
    try {
      seoScannerResult = await analyzeSEO({ $, baseUrl: url, robotsTxtText: robotsTxt });
    } catch (err) {
      // Non-fatal: capture error into seo field so we can inspect later
      seoScannerResult = { error: err.message };
    }

    const seo = {
      description,
      descriptionLength: description ? description.length : 0,
      hasH1: !!h1,
      wordCount,
      robotsTxtStatus: robotsTxt ? 'found' : 'not_found',
      ...seoScannerResult,
    };

    let lighthouseResult = null;
    try {
      const { lhr } = await lighthouse(url, {
        port: (new URL(browser.wsEndpoint())).port, // Connect Lighthouse to the same Puppeteer instance
        output: 'json',
        // Only gather the categories we care about to keep report concise
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
      }, undefined, page); // Pass page to Lighthouse for existing session

      lighthouseResult = {
        performance: lhr.categories.performance.score * 100,
        accessibility: lhr.categories.accessibility.score * 100,
        bestPractices: lhr.categories['best-practices'].score * 100,
        seo: lhr.categories.seo.score * 100,
        pwa: lhr.categories.pwa.score * 100,
      };
    } catch (err) {
      console.error('Lighthouse audit failed:', err.message);
      lighthouseResult = { error: err.message };
    }

    const analysisData = {
      url,
      title,
      description,
      h1,
      technologies,
      metrics,
      screenshot,
      accessibility: {
        violations: accessibility.violations,
      },
      seo,
      lighthouse: lighthouseResult,
    };

    // Save the analysis to the database
    const analysis = new Analysis(analysisData);
    await analysis.save();

    res.json(analysis);
  } catch (err) {
    console.error('analyze error', err.message);
    res.status(500).json({ error: 'Failed to fetch or analyze the URL', details: err.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

/**
 * GET /api/analyses?url=
 * Returns all historical analyses for a given URL.
 */
app.get('/api/analyses', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  try {
    const analyses = await Analysis.find({ url }).sort({ createdAt: -1 });
    res.json(analyses);
  } catch (err) {
    console.error('Error fetching analyses:', err.message);
    res.status(500).json({ error: 'Failed to retrieve analyses' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
}

export default app;
