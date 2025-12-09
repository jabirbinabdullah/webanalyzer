import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { load } from 'cheerio';
import axios from 'axios';
import { AxePuppeteer } from 'axe-puppeteer';
import { detectTechnologies } from './scanners/techScanner.js';
import analyzeSEO from './scanners/seoScanner.js';
import { analyzePerformance } from './scanners/performanceScanner.js';
import { analyzeSecurity } from './scanners/securityScanner.js';
import { analyzeSSL } from './scanners/sslScanner.js';
import Analysis from './models/Analysis.js';
import PerformanceCache from './models/PerformanceCache.js';
import RecentResult from './models/RecentResult.js';
import connectDB from './config/db.js';

// Connect to the database
connectDB();

const processAnalysisJob = async (job) => {
    const { analysisId } = job;
    console.log(`Processing analysis for ID: ${analysisId}`);

    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
        console.error(`Analysis with ID ${analysisId} not found.`);
        return;
    }

    await analysis.updateOne({ status: 'in-progress' });
    const { url } = analysis;

    let browser = null;
    let performanceResult = null;
    let securityResult = null;

    try {
        // --- Run Performance Analysis (uses its own Puppeteer instance for Lighthouse) ---
        try {
            performanceResult = await analyzePerformance(url);
            console.log(`Performance analysis for ${url} completed.`);
        } catch (perfError) {
            console.error(`Error in performance analysis for ${url}:`, perfError);
            performanceResult = { score: null, metrics: {}, recommendations: [`Error: ${perfError.message}`] };
        }

        // --- Run Security Analysis ---
        try {
            securityResult = await analyzeSecurity(url);
            const sslResult = await analyzeSSL(url);
            securityResult.ssl = sslResult;
            console.log(`Security analysis for ${url} completed.`);
        } catch (secError) {
            console.error(`Error in security analysis for ${url}:`, secError);
            securityResult = { 
              status: 'error', 
              message: secError.message, 
              headers: {},
              ssl: { status: 'error', message: secError.message, isValid: false, score: 0 }
            };
        }

        // --- Existing browser-based analysis starts here ---
        puppeteer.use(StealthPlugin());
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        
        // Set realistic user agent and headers to avoid rate limiting
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        });
        
        const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        const html = await page.content();
        const headers = response.headers(); // Headers from the puppeteer request
        const $ = load(html);

        const title = await page.title();
        const description = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);
        const h1 = await page.$eval('h1', el => el.textContent).catch(() => null);

        const pageMetrics = await page.metrics();
        const performanceTiming = JSON.parse(await page.evaluate(() => JSON.stringify(performance.timing)));

        const metrics = {
            taskDuration: (pageMetrics.TaskDuration * 1000).toFixed(2), // ms
            fcp: (performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart).toFixed(2), // ms
            load: (performanceTiming.loadEventEnd - performanceTiming.navigationStart).toFixed(2), // ms
        };

        const screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 70 });

        const detectedGlobals = {
            hasChartJs: await page.evaluate(() => typeof window.Chart !== 'undefined'),
        };

        const technologies = detectTechnologies({ html, headers, $, detectedGlobals });

        const accessibility = await new AxePuppeteer(page).analyze();

        const robotsTxtUrl = new URL('/robots.txt', url).href;
        const robotsTxt = await axios.get(robotsTxtUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/plain,*/*',
            },
            timeout: 5000,
        }).then(res => res.data).catch(() => null);

        const wordCount = $('body').text().split(/\s+/).filter(Boolean).length;

        let seoScannerResult = {};
        try {
            seoScannerResult = await analyzeSEO({ $, baseUrl: url, robotsTxtText: robotsTxt });
        } catch (err) {
            seoScannerResult = { error: err.message };
        }

        const seo = {
            description,
            descriptionLength: description ? description.length : 0,
            hasH1: !!h1,
            wordCount,
            robotsTxtStatus: robotsTxt ? 'found' : 'not_found',
        };
        
        // Flatten seoScannerResult and convert sitemap object to string if needed
        if (seoScannerResult && typeof seoScannerResult === 'object') {
            for (const [key, value] of Object.entries(seoScannerResult)) {
                if (key === 'sitemap' && value && typeof value === 'object') {
                    seo[key] = JSON.stringify(value);
                } else {
                    seo[key] = value;
                }
            }
        }

        let lighthouseResult = null;
        try {
            const lighthouseModule = await import('lighthouse');
            const lighthouseFn = lighthouseModule && (lighthouseModule.default || lighthouseModule);

            if (typeof lighthouseFn === 'function') {
                const { lhr } = await lighthouseFn(url, {
                    port: (new URL(browser.wsEndpoint())).port,
                    output: 'json',
                    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
                }, undefined, page);

                lighthouseResult = {
                    performance: lhr.categories.performance ? lhr.categories.performance.score * 100 : 0,
                    accessibility: lhr.categories.accessibility ? lhr.categories.accessibility.score * 100 : 0,
                    bestPractices: lhr.categories['best-practices'] ? lhr.categories['best-practices'].score * 100 : 0,
                    seo: lhr.categories.seo ? lhr.categories.seo.score * 100 : 0,
                };
            } else {
                lighthouseResult = { error: 'Lighthouse module could not be loaded as a function.' };
            }
        } catch (err) {
            console.error('Lighthouse audit failed:', err.message);
            lighthouseResult = { error: err.message };
        }

        const analysisData = {
            title,
            description,
            h1,
            technologies,
            metrics,
            screenshot,
            accessibility: {
                violations: accessibility.violations,
            },
            seo,
            lighthouse: lighthouseResult,
            performance: performanceResult, // Add new performance data
            security: securityResult,     // Add new security data
            status: 'completed',
        };

        await analysis.updateOne(analysisData);
        
        // Save recent result for "Recent Results" view
        const topTechnologies = technologies.slice(0, 5).map(t => ({
            name: t.name,
            confidence: t.confidence,
        }));
        
        await RecentResult.create({
            url,
            analysisId: analysis._id,
            status: 'completed',
            title,
            description,
            technologies: topTechnologies,
            performanceScore: performanceResult?.score || null, // Use new performance score
            accessibilityScore: lighthouseResult?.accessibility || null,
            seoScore: lighthouseResult?.seo || null,
        });
        
        console.log(`Analysis completed for ID: ${analysisId}`);

    } catch (err) {
        console.error(`Analysis failed for ID: ${analysisId}`, err.message);
        await analysis.updateOne({ status: 'failed' });
        
        // Save failed result for "Recent Results" view
        await RecentResult.create({
            url,
            analysisId: analysis._id,
            status: 'failed',
            error: err.message,
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

export { processAnalysisJob };
