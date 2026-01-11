import express, { Request, Response } from 'express';
import { protect } from '../middleware/auth.js';
import Analysis from '../models/Analysis.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.get('/stats', protect, asyncHandler(async (req: any, res: Response) => {
    const userId = req.user.id;

    // Parallelize aggregations for performance
    const [overviewStats, techStats, recentTrend] = await Promise.all([
        // 1. Overview Stats (Averages & Counts)
        Analysis.aggregate([
            { $match: { user: userId, status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalAnalyses: { $sum: 1 },
                    avgPerformance: { $avg: '$performance.score' },
                    avgSeo: { $avg: '$seoScore' }, // Note: We might need to calculate this if not directly stored as top level in all docs, but simpler if we use what we have. 
                    // Wait, in worker.ts we calc SEO score for RecentResult but maybe not on Analysis model root?
                    // Let's check Analysis model. 
                    // Looking at previous context, Analysis has nested 'seo' object but maybe not a direct score.
                    // Let's average the explicit 'performance.score' from Lighthouse.
                    // For accessibility, it's 'accessibility.violations'. Score = 100 - violations.
                }
            }
        ]),

        // 2. Tech Stack Distribution
        Analysis.aggregate([
            { $match: { user: userId, status: 'completed' } },
            { $unwind: '$technologies' },
            {
                $group: {
                    _id: '$technologies.name',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]),

        // 3. Performance Trend (Last 10 scans)
        Analysis.find({ user: userId, status: 'completed' })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('createdAt performance.score url')
            .lean()
    ]);

    // Process Overview
    const stats = overviewStats[0] || { totalAnalyses: 0, avgPerformance: 0 };

    // Process Trend (reverse to show chronological info on chart left-to-right)
    const trend = recentTrend.reverse().map((item: any) => ({
        date: new Date(item.createdAt).toLocaleDateString(),
        score: item.performance?.score ? Math.round(item.performance.score * 100) : 0, // Lighthouse is 0-1, we want 0-100
        url: item.url
    }));

    // Process Tech Stats
    const techDistribution = techStats.map((item: any) => ({
        name: item._id,
        value: item.count
    }));

    res.json({
        overview: {
            total: stats.totalAnalyses,
            avgPerformance: Math.round((stats.avgPerformance || 0) * 100), // Convert to percentage
        },
        technology: techDistribution,
        trend: trend
    });
}));

export default router;
