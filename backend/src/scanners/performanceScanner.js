import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';
import { getCachedPerformance, cachePerformance } from '../models/PerformanceCache.js';

/**
 * Analyze website performance using Lighthouse with caching
 * @param {string} url - URL to analyze
 * @param {boolean} skipCache - Force refresh by skipping cache (default: false)
 * @returns {Promise<Object>} Performance analysis results with score, metrics, and recommendations
 */
export const analyzePerformance = async (url, skipCache = false) => {
  console.log(`Starting performance analysis for: ${url}`);

  // Check cache first (unless explicitly skipped)
  if (!skipCache) {
    const cached = await getCachedPerformance(url);
    if (cached) {
      return {
        score: cached.score,
        metrics: cached.metrics,
        recommendations: cached.recommendations,
        details: cached.details,
        fromCache: true,
      };
    }
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    const { lhr } = await lighthouse(url, {
      port: (new URL(browser.wsEndpoint())).port,
      output: 'json',
      onlyCategories: ['performance'],
      throttlingMethod: 'simulate',
    }, null);

    const performanceScore = lhr.categories.performance.score * 100;
    const audits = lhr.audits;

    const extractMetric = (auditId) => audits[auditId] ? audits[auditId].displayValue : 'N/A';
    const extractNumericMetric = (auditId) => audits[auditId] ? audits[auditId].numericValue : null;

    const metrics = {
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

    const recommendations = lhr.categories.performance.auditRefs
      .filter(ref => ref.group === 'diagnostics' && ref.weight > 0 && audits[ref.id].score !== 1)
      .map(ref => audits[ref.id].title);

    const result = {
      score: performanceScore,
      metrics,
      recommendations,
      details: lhr.audits,
      fromCache: false,
    };

    // Cache the result for future use
    await cachePerformance(url, result);

    console.log(`Performance analysis for ${url} completed.`);
    return result;
  } catch (error) {
    console.error(`Error during performance analysis for ${url}:`, error);
    return {
      score: null,
      metrics: {},
      recommendations: [`Error: ${error.message}`],
      details: null,
      fromCache: false,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
