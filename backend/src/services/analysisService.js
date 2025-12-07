/**
 * Service layer for analysis operations
 * Handles all analysis-related business logic
 */
import Analysis from '../models/Analysis.js';
import analysisQueue from '../queue/analysisQueue.js';

export class AnalysisService {
  /**
   * Start a new website analysis
   * @param {string} url - Website URL to analyze
   * @returns {Promise<Object>} Created analysis document with _id and status
   */
  async startAnalysis(url) {
    try {
      const analysis = new Analysis({
        url,
        status: 'pending',
        createdAt: new Date(),
      });
      
      await analysis.save();
      
      // Queue the analysis job
      await analysisQueue.add({
        analysisId: analysis._id,
        url,
      });
      
      return {
        _id: analysis._id,
        status: analysis.status,
        url: analysis.url,
      };
    } catch (err) {
      console.error('Error starting analysis:', err.message);
      throw new Error('Failed to start analysis');
    }
  }

  /**
   * Get analysis status
   * @param {string} analysisId - Analysis ID
   * @returns {Promise<Object>} Status and metadata
   */
  async getAnalysisStatus(analysisId) {
    try {
      const analysis = await Analysis.findById(analysisId);
      
      if (!analysis) {
        throw new Error('Analysis not found');
      }
      
      return {
        _id: analysis._id,
        status: analysis.status,
        url: analysis.url,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt,
      };
    } catch (err) {
      console.error('Error getting analysis status:', err.message);
      throw err;
    }
  }

  /**
   * Get complete analysis result
   * @param {string} analysisId - Analysis ID
   * @returns {Promise<Object>} Complete analysis data
   */
  async getAnalysisResult(analysisId) {
    try {
      const analysis = await Analysis.findById(analysisId);
      
      if (!analysis) {
        throw new Error('Analysis not found');
      }
      
      if (analysis.status !== 'completed') {
        throw new Error(`Analysis not completed. Current status: ${analysis.status}`);
      }
      
      return analysis.toObject();
    } catch (err) {
      console.error('Error getting analysis result:', err.message);
      throw err;
    }
  }

  /**
   * Get all analyses for a URL
   * @param {string} url - Website URL
   * @returns {Promise<Array>} Array of analyses
   */
  async getAnalysesForUrl(url) {
    try {
      return await Analysis.find({ url }).sort({ createdAt: -1 });
    } catch (err) {
      console.error('Error getting analyses for URL:', err.message);
      throw err;
    }
  }

  /**
   * Update analysis status
   * @param {string} analysisId - Analysis ID
   * @param {string} status - New status
   * @param {Object} data - Additional data to update
   * @returns {Promise<Object>} Updated analysis
   */
  async updateAnalysisStatus(analysisId, status, data = {}) {
    try {
      const analysis = await Analysis.findByIdAndUpdate(
        analysisId,
        { status, ...data, updatedAt: new Date() },
        { new: true }
      );
      
      return analysis;
    } catch (err) {
      console.error('Error updating analysis status:', err.message);
      throw err;
    }
  }

  /**
   * Delete old analyses (cleanup)
   * @param {number} daysOld - Delete analyses older than this many days
   * @returns {Promise<Object>} Deletion result
   */
  async deleteOldAnalyses(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await Analysis.deleteMany({
        createdAt: { $lt: cutoffDate },
      });
      
      return result;
    } catch (err) {
      console.error('Error deleting old analyses:', err.message);
      throw err;
    }
  }
}

export default new AnalysisService();
