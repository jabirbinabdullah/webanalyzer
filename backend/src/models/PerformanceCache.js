import mongoose from 'mongoose';

const performanceCacheSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  score: Number,
  metrics: Object,
  recommendations: [String],
  details: Object,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // 24 hour TTL
  },
});

/**
 * PerformanceCache Model
 * Stores Lighthouse analysis results with 24-hour auto-expiry
 */
const PerformanceCache = mongoose.model('PerformanceCache', performanceCacheSchema);

/**
 * Get cached performance result if available and fresh
 * @param {string} url - Website URL
 * @returns {Promise<Object|null>} Cached result or null
 */
export const getCachedPerformance = async (url) => {
  try {
    const cached = await PerformanceCache.findOne({ url });
    if (cached) {
      console.log(`Cache HIT for performance analysis: ${url}`);
      return cached;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving performance cache:', error);
    return null;
  }
};

/**
 * Save performance result to cache
 * @param {string} url - Website URL
 * @param {Object} result - Performance analysis result
 * @returns {Promise<Object>} Saved cache document
 */
export const cachePerformance = async (url, result) => {
  try {
    // Update or create
    const cached = await PerformanceCache.findOneAndUpdate(
      { url },
      {
        url,
        score: result.score,
        metrics: result.metrics,
        recommendations: result.recommendations,
        details: result.details,
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );
    console.log(`Performance analysis cached for: ${url}`);
    return cached;
  } catch (error) {
    console.error('Error caching performance result:', error);
    return null;
  }
};

/**
 * Clear cache for specific URL
 * @param {string} url - Website URL
 * @returns {Promise<Object>} Delete result
 */
export const clearPerformanceCache = async (url) => {
  try {
    const result = await PerformanceCache.deleteOne({ url });
    console.log(`Performance cache cleared for: ${url}`);
    return result;
  } catch (error) {
    console.error('Error clearing performance cache:', error);
    return null;
  }
};

export default PerformanceCache;
