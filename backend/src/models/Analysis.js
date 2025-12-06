import mongoose from 'mongoose';

let ExportedAnalysis = null;

// If SKIP_DB is set, use a lightweight in-memory stub model
if (process.env.SKIP_DB === 'true') {
  class StubAnalysis {
    constructor(data) {
      Object.assign(this, data || {});
    }
    async save() {
      // mimic mongoose return
      return this;
    }
    static async find() {
      return [];
    }
    static async findById() {
      return null;
    }
  }
  ExportedAnalysis = StubAnalysis;
} else {
  const AnalysisSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  title: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  h1: {
    type: String,
    trim: true,
  },
  technologies: [
    {
      name: String,
      confidence: Number,
      evidence: String,
    },
  ],
  metrics: {
    taskDuration: String,
    fcp: String,
    load: String,
  },
  screenshot: {
    type: String,
  },
  accessibility: {
    violations: Array,
  },
  seo: {
    description: String,
    descriptionLength: Number,
    hasH1: Boolean,
    wordCount: Number,
    robotsTxtStatus: String,
    canonicalUrl: String,
    jsonLdScripts: Number,
    hreflangTags: Number,
    sitemap: String,
  },
  lighthouse: {
    performance: Number,
    accessibility: Number,
    bestPractices: Number,
    seo: Number,
    pwa: Number,
    error: String,
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'failed'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  });

  const Analysis = mongoose.model('Analysis', AnalysisSchema);
  ExportedAnalysis = Analysis;
}

export default ExportedAnalysis;
