/**
 * Service layer for analysis operations
 * Handles all analysis-related business logic
 */
import Analysis, { AnalysisDocument } from '../models/Analysis.js';
import analysisQueue from '../queue/analysisQueue.js';
import { IAnalysis } from '../../../shared/types/index.js';

export class AnalysisService {
    /**
     * Start a new website analysis
     * @param {string} url - Website URL to analyze
     * @returns {Promise<Partial<IAnalysis>>} Created analysis data
     */
    async startAnalysis(url: string, types: string[] = [], userId: string | null = null): Promise<Partial<IAnalysis>> {
        try {
            const analysis = new Analysis({
                url,
                user: userId,
                status: 'pending',
                createdAt: new Date(),
                // Potentially store the requested types in the model itself if desired
                // requestedAnalyses: types,
            });

            await analysis.save();

            // Queue the analysis job with the selected types
            await analysisQueue.add('analysis', {
                analysisId: analysis._id,
                url,
                types,
                userId,
            });

            return {
                _id: analysis._id as string,
                status: analysis.status as "pending" | "in-progress" | "completed" | "failed",
                url: analysis.url,
                user: analysis.user as any, // Cast because IAnalysis expects string but Mongoose might return ObjectId
            };
        } catch (err: any) {
            console.error('Error starting analysis:', err.message);
            // Re-throw the original error to be caught by the global error handler
            throw err;
        }
    }

    /**
     * Get analysis status
     * @param {string} analysisId - Analysis ID
     * @returns {Promise<Partial<IAnalysis>>} Status and metadata
     */
    async getAnalysisStatus(analysisId: string): Promise<Partial<IAnalysis>> {
        try {
            const analysis = await Analysis.findById(analysisId);

            if (!analysis) {
                const err = new Error('Analysis not found') as any;
                err.status = 404;
                throw err;
            }

            return {
                _id: analysis._id as string,
                status: analysis.status as "pending" | "in-progress" | "completed" | "failed",
                url: analysis.url,
                createdAt: analysis.createdAt,
                updatedAt: analysis.updatedAt,
            };
        } catch (err: any) {
            console.error('Error getting analysis status:', err.message);
            throw err;
        }
    }

    /**
     * Get complete analysis result
     * @param {string} analysisId - Analysis ID
     * @returns {Promise<AnalysisDocument>} Complete analysis data
     */
    async getAnalysisResult(analysisId: string): Promise<AnalysisDocument> {
        try {
            const analysis = await Analysis.findById(analysisId);

            if (!analysis) {
                const err = new Error('Analysis not found') as any;
                err.status = 404;
                throw err;
            }

            if (analysis.status !== 'completed') {
                const err = new Error(
                    `Analysis not completed. Current status: ${analysis.status}`
                ) as any;
                err.status = 422; // Unprocessable Entity - a good status for this case
                throw err;
            }

            return analysis; // Mongoose documents are objects
        } catch (err: any) {
            console.error('Error getting analysis result:', err.message);
            throw err;
        }
    }

    /**
     * Get all analyses for a URL
     * @param {string} url - Website URL
     * @returns {Promise<AnalysisDocument[]>} Array of analyses
     */
    async getAnalysesForUrl(url: string): Promise<AnalysisDocument[]> {
        try {
            return await Analysis.find({ url }).sort({ createdAt: -1 });
        } catch (err: any) {
            console.error('Error getting analyses for URL:', err.message);
            throw err;
        }
    }

    /**
     * Update analysis status
     * @param {string} analysisId - Analysis ID
     * @param {string} status - New status
     * @param {Object} data - Additional data to update
     * @returns {Promise<AnalysisDocument | null>} Updated analysis
     */
    async updateAnalysisStatus(analysisId: string, status: string, data: any = {}): Promise<AnalysisDocument | null> {
        try {
            const analysis = await Analysis.findByIdAndUpdate(
                analysisId,
                { status, ...data, updatedAt: new Date() },
                { new: true }
            );

            return analysis;
        } catch (err: any) {
            console.error('Error updating analysis status:', err.message);
            throw err;
        }
    }

    /**
     * Delete old analyses (cleanup)
     * @param {number} daysOld - Delete analyses older than this many days
     * @returns {Promise<any>} Deletion result
     */
    async deleteOldAnalyses(daysOld: number = 30): Promise<any> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const result = await Analysis.deleteMany({
                createdAt: { $lt: cutoffDate },
            });

            return result;
        } catch (err: any) {
            console.error('Error deleting old analyses:', err.message);
            throw err;
        }
    }
}

export default new AnalysisService();
