import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import { load } from 'cheerio';
import axios from 'axios';
import { AxePuppeteer } from 'axe-puppeteer';
import { detectTechnologies } from './src/scanners/techScanner.js';
import analyzeSEO from './src/scanners/seoScanner.js';
import rateLimit from 'express-rate-limit';
import connectDB from './src/config/db.js';
import Analysis from './src/models/Analysis.js';
import { promises as dnsPromises } from 'dns';
import net from 'net';
import analysisQueue from './src/queue/analysisQueue.js';

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

import authRouter from './src/routes/auth.js';
import portfolioRouter from './src/routes/portfolio.js';

app.use('/api/auth', authRouter);
app.use('/api/portfolio', portfolioRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/analysis/:id/status', async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    res.json({ status: analysis.status });
  } catch (err) {
    console.error('Error fetching analysis status:', err.message);
    res.status(500).json({ error: 'Failed to retrieve analysis status' });
  }
});

app.get('/api/analysis/:id', async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    res.json(analysis);
  } catch (err) {
    console.error('Error fetching analysis:', err.message);
    res.status(500).json({ error: 'Failed to retrieve analysis' });
  }
});


/**
 * GET /api/analyze?url=
 * Returns basic metadata and technologies detected on the page.
 */
app.get('/api/analyze', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url query parameter' });

  try {
    const urlObject = new URL(url);
    if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
      throw new Error('Invalid protocol.');
    }
    if (url.length > 2000) {
      return res.status(400).json({ error: 'URL too long.' });
    }

    const hostAllowed = await isHostAllowed(urlObject.hostname);
    if (!hostAllowed) {
      return res.status(400).json({ error: 'URL host resolves to a private or disallowed IP.' });
    }
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL provided.' });
  }

  try {
    const analysis = new Analysis({
      url,
      status: 'pending',
    });
    await analysis.save();

    analysisQueue.add({ analysisId: analysis._id });

    res.status(202).json(analysis);
  } catch (err) {
    console.error('Failed to enqueue analysis job', err.message);
    res.status(500).json({ error: 'Failed to start analysis', details: err.message });
  }
});

/**
 * GET /api/analyses?url=
 * Returns all historical analyses for a given URL.
 */
import { protect } from './src/middleware/auth.js';
import { getReportHTML } from './src/report-template.js';

app.get('/api/analyses', protect, async (req, res) => {
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

/**
 * POST /api/report
 * Generates a PDF report for a given analysis ID.
 */
app.post('/api/report', async (req, res) => {
  const { analysisId } = req.body;
  if (!analysisId) {
    return res.status(400).json({ error: 'Missing analysisId in request body' });
  }

  let browser = null;
  try {
    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const reportHtml = getReportHTML(analysis);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(reportHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '40px',
        right: '40px',
        bottom: '40px',
        left: '40px',
      },
    });

    const filename = `WebAnalyzer-Report-${analysis.url.replace(/https?:\/\//, '').replace(/[\/\?#]/g, '_')}-${new Date(analysis.createdAt).toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating PDF report:', err.message);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});


if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
}

export default app;
