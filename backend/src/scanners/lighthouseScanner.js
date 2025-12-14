import lighthouse from 'lighthouse';
import { URL } from 'url';

/**
 * Runs a full Lighthouse analysis and extracts key category scores and performance metrics.
 * @param {string} url - URL to analyze.
 * @param {import('puppeteer').Browser} browser - Shared Puppeteer browser instance.
 * @returns {Promise<Object>} Object containing Lighthouse category scores and performance details.
 */
export const analyzeLighthouseReport = async (url, browser) => {
  console.log(`Running full Lighthouse analysis for: ${url}`);
  try {
    const { lhr } = await lighthouse(url, {
      port: (new URL(browser.wsEndpoint())).port,
      output: 'json',
      // No 'onlyCategories' to get all categories
      throttlingMethod: 'simulate',
    }, null); // No config required

    // Extract main category scores (0-1 scaled, convert to 0-100)
    const lighthouseScores = {
      performance: Math.round((lhr.categories.performance?.score || 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
      seo: Math.round((lhr.categories.seo?.score || 0) * 100),
    };

    // Extract detailed performance metrics (similar to performanceScanner)
    const audits = lhr.audits;
    const extractMetric = (auditId) => audits[auditId] ? audits[auditId].displayValue : 'N/A';
    const extractNumericMetric = (auditId) => audits[auditId] ? audits[auditId].numericValue : null;

    const performanceMetrics = {
      firstContentfulPaint: extractMetric('first-contentful-paint'),
      largestContentfulPaint: extractMetric('largest-contentful-paint'),
      cumulativeLayoutShift: extractMetric('cumulative-layout-shift'),
      totalBlockingTime: extractMetric('total-blocking-time'),
      speedIndex: extractMetric('speed-index'),
      interactive: extractMetric('interactive'),
      numeric: {
        lcp: extractNumericMetric('largest-contentful-paint'),
        cls: extractNumericMetric('cumulative-layout-shift'),
        tbt: extractNumericMetric('total-blocking-time'),
        fcp: extractNumericMetric('first-contentful-paint'),
        si: extractNumericMetric('speed-index'),
        tti: extractNumericMetric('interactive'),
      }
    };

    const performanceRecommendations = lhr.categories.performance.auditRefs
      .filter(ref => ref.group === 'diagnostics' && ref.weight > 0 && audits[ref.id].score !== 1)
      .map(ref => audits[ref.id].title);

    const result = {
      lighthouse: lighthouseScores,
      performance: {
        score: lighthouseScores.performance, // Overall performance score from Lighthouse
        metrics: performanceMetrics,
        recommendations: performanceRecommendations,
        details: lhr.audits, // Full audits for debugging/further display
      },
      // Keep accessibility violations from AxePuppeteer for now,
      // Lighthouse's accessibility audit is a score, Axe gives violations
      // For SEO details, `seoScanner.js` provides more granular info.
    };

    console.log(`Lighthouse analysis for ${url} completed.`);
    return result;

  } catch (error) {
    console.error(`Error during full Lighthouse analysis for ${url}:`, error);
    return {
      lighthouse: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
      performance: {
        score: 0,
        metrics: {},
        recommendations: [`Error: ${error.message}`],
        details: null,
      },
    };
  }
};
