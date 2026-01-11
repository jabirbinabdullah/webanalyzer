import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { flexibleAuth } from '../middleware/flexibleAuth.js';
import { protect } from '../middleware/auth.js';
import { isHostAllowed } from '../utils/hostValidator.js';
import { getReportHTML } from '../report-template.js';
import { getBrowser } from '../utils/browserManager.js';
import { validate } from '../middleware/validation.js';
import { z } from 'zod';

// Models
import Analysis from '../models/Analysis.js';
import RecentResult from '../models/RecentResult.js';

// Services
import analysisService from '../services/analysisService.js';

const router = express.Router();

// Define validation schema for the /api/analyze endpoint
const analyzeSchema = z.object({
    body: z.any().optional(),
    params: z.any().optional(),
    query: z.object({
        url: z.string().url({ message: 'A valid URL is required' }),
        types: z.union([z.string(), z.array(z.string())]).optional(),
    }),
});

router.get('/health', (req, res) => res.json({ ok: true }));

router.get('/analysis/:id/status', async (req: Request, res: Response) => {
    try {
        const analysis = await Analysis.findById(req.params.id);
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        res.json({ status: analysis.status });
    } catch (err: any) {
        console.error('Error fetching analysis status:', err.message);
        res.status(500).json({ error: 'Failed to retrieve analysis status' });
    }
});

router.get('/analysis/:id', async (req: Request, res: Response) => {
    try {
        const analysis = await Analysis.findById(req.params.id);
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        res.json(analysis);
    } catch (err: any) {
        console.error('Error fetching analysis:', err.message);
        res.status(500).json({ error: 'Failed to retrieve analysis' });
    }
});

router.get(
    '/analyze',
    flexibleAuth,
    validate(analyzeSchema),
    asyncHandler(async (req: any, res: Response) => {
        const { url, types } = req.query;
        const userId = req.user ? req.user.id : null;

        const analysisTypes = Array.isArray(types) ? types : types ? [types] : [];

        const urlObject = new URL(url as string);
        const hostAllowed = await isHostAllowed(urlObject.hostname);
        if (!hostAllowed) {
            return res
                .status(400)
                .json({ error: 'URL host resolves to a private or disallowed IP.' });
        }

        const result = await analysisService.startAnalysis(
            url as string,
            analysisTypes as string[],
            userId
        );
        res.status(202).json(result);
    })
);

router.get('/analyses', protect, async (req: any, res: Response) => {
    try {
        const analyses = await Analysis.find({ user: req.user.id }).sort({
            createdAt: -1,
        });
        res.json(analyses);
    } catch (err: any) {
        console.error('Error fetching analyses:', err.message);
        res.status(500).json({ error: 'Failed to retrieve analyses' });
    }
});

router.get(
    '/recent-results',
    asyncHandler(async (req: Request, res: Response) => {
        const limit = Math.min(parseInt((req.query.limit as string) || '20'), 100);

        try {
            const recentResults = await RecentResult.find()
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

            res.json(recentResults);
        } catch (err: any) {
            console.error('Error fetching recent results:', err.message);
            res.status(500).json({ error: 'Failed to retrieve recent results' });
        }
    })
);

router.post('/report', async (req: Request, res: Response) => {
    const { analysisId, format = 'pdf' } = req.body; // Default to PDF
    if (!analysisId) {
        return res
            .status(400)
            .json({ error: 'Missing analysisId in request body' });
    }

    let page = null;
    try {
        const analysis = await Analysis.findById(analysisId) as any; // Cast to accessing props
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        const reportHtml = getReportHTML(analysis);
        const baseFilename = `WebAnalyzer-Report-${analysis.url.replace(/https?:\/\//, '').replace(/[/?#]/g, '_')}-${new Date(analysis.createdAt).toISOString().split('T')[0]}`;

        if (format === 'html') {
            const filename = `${baseFilename}.html`;
            res.setHeader('Content-Type', 'text/html');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${filename}"`
            );
            res.send(reportHtml);
        } else if (format === 'pdf') {
            const browser = getBrowser();
            page = await browser.newPage();
            await page.setContent(reportHtml, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' },
            });

            const filename = `${baseFilename}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${filename}"`
            );
            res.send(pdfBuffer);
        } else {
            res
                .status(400)
                .json({ error: "Invalid format requested. Use 'pdf' or 'html'." });
        }
    } catch (err: any) {
        console.error(`Error generating ${format} report:`, err.message);
        res.status(500).json({ error: `Failed to generate ${format} report` });
    } finally {
        if (page) {
            await page.close();
        }
    }
});

export default router;
