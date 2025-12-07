import mongoose from 'mongoose';

/**
 * RecentResult Schema
 * Stores a brief record of each analyzed URL for the "Recent Results" view
 * Similar to MobSF.live's recent APK analyses display
 */
const recentResultSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    index: true,
  },
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    required: true,
  },
  status: {
    type: String,
    enum: ['completed', 'failed'],
    required: true,
  },
  title: {
    type: String,
    default: null,
  },
  description: {
    type: String,
    default: null,
  },
  technologies: [{
    name: String,
    confidence: Number,
  }],
  performanceScore: {
    type: Number,
    default: null,
  },
  accessibilityScore: {
    type: Number,
    default: null,
  },
  seoScore: {
    type: Number,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Automatically delete old results after 30 days (TTL index)
recentResultSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model('RecentResult', recentResultSchema);
