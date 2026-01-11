export interface ITechnology {
    name: string;
    confidence: number;
    evidence?: string;
}

export interface IPerformanceMetrics {
    firstContentfulPaint?: string;
    largestContentfulPaint?: string;
    cumulativeLayoutShift?: string;
    totalBlockingTime?: string;
    speedIndex?: string;
    interactive?: string;
    numeric?: {
        lcp?: number;
        cls?: number;
        tbt?: number;
        fcp?: number;
        si?: number;
        tti?: number;
    };
}

export interface ILighthouseScores {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
    pwa?: number;
    error?: string;
}

export interface ISslInfo {
    status?: string;
    isValid?: boolean;
    certificate?: {
        subject?: string;
        issuer?: string;
        validFrom?: string;
        validUntil?: string;
        daysUntilExpiry?: number;
        isExpired?: boolean;
        expiryWarning?: boolean;
    };
    hostname?: {
        requested?: string;
        commonName?: string;
        subjectAltNames?: string[];
        isValid?: boolean;
    };
    keyInfo?: {
        size?: number;
        algorithm?: string;
        strength?: string;
    };
    score?: number;
    recommendations?: string[];
}

export interface ISecurityInfo {
    status?: string;
    message?: string;
    headers?: Record<string, string>;
    leakageHeaders?: Record<string, string>;
    corsStatus?: string;
    isHTTPS?: boolean;
    securityScore?: number;
    recommendations?: string[];
    ssl?: ISslInfo;
}

export interface ISeoInfo {
    description?: string;
    descriptionLength?: number;
    hasH1?: boolean;
    wordCount?: number;
    robotsTxtStatus?: string;
    canonicalUrl?: string;
    jsonLdScripts?: number;
    hreflangTags?: number;
    sitemap?: string;
}

export interface IAnalysis {
    _id?: string;
    url: string;
    title?: string;
    description?: string;
    h1?: string;
    technologies?: ITechnology[];
    metrics?: {
        taskDuration?: string;
        fcp?: string;
        load?: string;
    };
    screenshot?: string;
    accessibility?: {
        violations: any[];
    };
    seo?: ISeoInfo;
    lighthouse?: ILighthouseScores;
    performance?: {
        score?: number;
        metrics?: IPerformanceMetrics;
        recommendations?: string[];
        details?: any;
    };
    security?: ISecurityInfo;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    user?: string; // Analysis.js schema has this but it was not in my read file. Added based on service usage.
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

export interface IUser {
    _id?: string;
    name: string;
    email: string;
    password?: string;
    emailNotifications?: boolean;
    createdAt?: string | Date;
}

export interface IRecentResult {
    _id?: string;
    url: string;
    analysisId: string; // ObjectId as string
    status: 'completed' | 'failed';
    title?: string;
    description?: string;
    technologies?: { name: string; confidence: number }[];
    performanceScore?: number;
    accessibilityScore?: number;
    seoScore?: number;
    error?: string;
    createdAt?: string | Date;
}
