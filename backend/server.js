import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import puppeteer from 'puppeteer';
import { load } from 'cheerio';
import axios from 'axios';
import { AxePuppeteer } from 'axe-puppeteer';
import { detectTechnologies } from './src/scanners/techScanner.js';
import analyzeSEO from './src/scanners/seoScanner.js';
import rateLimit from 'express-rate-limit';
import connectDB from './src/config/db.js';
import Analysis from './src/models/Analysis.js';
import RecentResult from './src/models/RecentResult.js';
import analysisQueue from './src/queue/analysisQueue.js';
import analysisService from './src/services/analysisService.js';
import { errorHandler, asyncHandler } from './src/middleware/errorHandler.js';
import { isHostAllowed, validateUrl } from './src/utils/hostValidator.js';
import authRouter from './src/routes/auth.js';
import portfolioRouter from './src/routes/portfolio.js';
import { protect } from './src/middleware/auth.js';
import { getReportHTML } from './src/report-template.js';

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
 * Start a new website analysis (asynchronous)
 * Returns analysis ID and initial status for polling
 */
app.get('/api/analyze', asyncHandler(async (req, res) => {
  const { url, types } = req.query; // Extract types from query
  
  if (!url) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  // Ensure 'types' is always an array
  const analysisTypes = Array.isArray(types) ? types : (types ? [types] : []);

  // Validate URL format
  const validation = validateUrl(url);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    // Check SSRF - prevent analyzing private IPs
    const urlObject = new URL(url);
    const hostAllowed = await isHostAllowed(urlObject.hostname);
    if (!hostAllowed) {
      return res.status(400).json({ error: 'URL host resolves to a private or disallowed IP.' });
    }

    // Start analysis via service, passing the selected types
    const result = await analysisService.startAnalysis(url, analysisTypes);
    res.status(202).json(result);
  } catch (err) {
    console.error('Failed to start analysis:', err.message);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
}));

/**
 * GET /api/analyses?url=
 * Returns all historical analyses for a given URL.
 */
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
 * GET /api/recent-results
 * Returns the most recent analyzed URLs (similar to MobSF.live)
 * Query params:
 *   - limit: number of results to return (default: 20, max: 100)
 */
app.get('/api/recent-results', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20'), 100);
  
  try {
    const recentResults = await RecentResult.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    res.json(recentResults);
  } catch (err) {
    console.error('Error fetching recent results:', err.message);
    res.status(500).json({ error: 'Failed to retrieve recent results' });
  }
}));

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

// Global error handler (must be last)
app.use(errorHandler);

// Start the background worker to process analysis jobs
import { processAnalysisJob } from './src/worker.js';

const startWorker = () => {
  console.log('Starting background worker...');
  setInterval(async () => {
    const job = analysisQueue.getNext();
    if (job) {
      try {
        await processAnalysisJob(job);
      } catch (err) {
        console.error('Worker error:', err.message);
      }
    }
  }, 2000); // Check queue every 2 seconds
};

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
    startWorker();
  });
}

export default app;
