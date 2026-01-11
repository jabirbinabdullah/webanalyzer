import mongoose, { Document, Model, Schema } from 'mongoose';
import { IAnalysis } from '../../../shared/types/index.js';

// Define the document interface combining IAnalysis and Mongoose Document
export interface AnalysisDocument extends IAnalysis, Document {
    createdAt: Date;
    updatedAt: Date;
}

let ExportedAnalysis: Model<AnalysisDocument>;

// If SKIP_DB is set, use a lightweight in-memory stub model
if (process.env.SKIP_DB === 'true') {
    class StubAnalysis {
        constructor(data: any) {
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
    ExportedAnalysis = StubAnalysis as unknown as Model<AnalysisDocument>;
} else {
    const AnalysisSchema = new Schema<AnalysisDocument>({
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
        performance: {
            score: Number,
            metrics: {
                firstContentfulPaint: String,
                largestContentfulPaint: String,
                cumulativeLayoutShift: String,
                totalBlockingTime: String,
                speedIndex: String,
                interactive: String,
                numeric: {
                    lcp: Number,
                    cls: Number,
                    tbt: Number,
                    fcp: Number,
                    si: Number,
                    tti: Number,
                },
            },
            recommendations: [String],
            details: Object, // To store the full Lighthouse audit report if needed
        },
        security: {
            status: String,
            message: String,
            headers: Object,
            leakageHeaders: Object,
            corsStatus: String,
            isHTTPS: Boolean,
            securityScore: Number,
            recommendations: [String],
            ssl: {
                status: String,
                isValid: Boolean,
                certificate: {
                    subject: String,
                    issuer: String,
                    validFrom: String,
                    validUntil: String,
                    daysUntilExpiry: Number,
                    isExpired: Boolean,
                    expiryWarning: Boolean,
                },
                hostname: {
                    requested: String,
                    commonName: String,
                    subjectAltNames: [String],
                    isValid: Boolean,
                },
                keyInfo: {
                    size: Number,
                    algorithm: String,
                    strength: String,
                },
                score: Number,
                recommendations: [String],
            },
        },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'failed'],
            default: 'pending',
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    }, {
        timestamps: true
    });

    ExportedAnalysis = mongoose.model<AnalysisDocument>('Analysis', AnalysisSchema);
}

export default ExportedAnalysis;
