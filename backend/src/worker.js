import { load } from 'cheerio';
import axios from 'axios';
import { AxePuppeteer } from 'axe-puppeteer';
import { detectTechnologies } from './scanners/techScanner.js';
import analyzeSEO from './scanners/seoScanner.js';
import { analyzeLighthouseReport } from './scanners/lighthouseScanner.js';
import { analyzeSecurity } from './scanners/securityScanner.js';
import { analyzeSSL } from './scanners/sslScanner.js';
import { getBrowser } from './utils/browserManager.js';
import Analysis from './models/Analysis.js';
import PerformanceCache from './models/PerformanceCache.js';
import RecentResult from './models/RecentResult.js';
import connectDB from './config/db.js';

// Connect to the database
connectDB();

const processAnalysisJob = async (job) => {
    const { analysisId, types } = job;
    console.log(`Processing analysis for ID: ${analysisId} with types: ${JSON.stringify(types)}`);

    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
        console.error(`Analysis with ID ${analysisId} not found.`);
        return;
    }

    await analysis.updateOne({ status: 'in-progress' });
    const { url } = analysis;

    // If types array is empty or undefined, run all analyses for backward compatibility.
    const runAll = !types || types.length === 0;
    const runTech = runAll || types.includes('tech');
    const runSeo = runAll || types.includes('seo');
    const runPerformance = runAll || types.includes('performance');
    const runAccessibility = runAll || types.includes('accessibility');
    const runSecurity = runAll || types.includes('security');

    let page = null;
    let analysisData = {};

    try {
        const browser = getBrowser();
        
        if (runPerformance) {
            try {
                const lighthouseResult = await analyzeLighthouseReport(url, browser);
                console.log(`Lighthouse analysis for ${url} completed.`);
                analysisData.lighthouse = lighthouseResult.lighthouse;
                analysisData.performance = lighthouseResult.performance;
            } catch (perfError) {
                console.error(`Error in Lighthouse analysis for ${url}:`, perfError);
                analysisData.lighthouse = { performance: 0, accessibility: 0, 'best-practices': 0, seo: 0 };
                analysisData.performance = { score: null, metrics: {}, recommendations: [`Error: ${perfError.message}`] };
            }
        }

        if (runSecurity) {
            try {
                const securityResult = await analyzeSecurity(url);
                const sslResult = await analyzeSSL(url);
                securityResult.ssl = sslResult;
                console.log(`Security analysis for ${url} completed.`);
                analysisData.security = securityResult;
            } catch (secError) {
                console.error(`Error in security analysis for ${url}:`, secError);
                analysisData.security = { 
                  status: 'error', 
                  message: secError.message, 
                  headers: {},
                  ssl: { status: 'error', message: secError.message, isValid: false, score: 0 }
                };
            }
        }

        // The main browser-based analysis is needed for tech, seo, and accessibility
        if (runTech || runSeo || runAccessibility) {
            page = await browser.newPage();
            
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            });
            
            const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            const html = await page.content();
            const headers = response.headers();
            const $ = load(html);

            analysisData.title = await page.title();
            analysisData.description = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);
            analysisData.h1 = await page.$eval('h1', el => el.textContent).catch(() => null);
            analysisData.screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 70 });

            if (runTech) {
                console.log('Running Tech analysis...');
                const detectedGlobals = { hasChartJs: await page.evaluate(() => typeof window.Chart !== 'undefined') };
                analysisData.technologies = detectTechnologies({ html, headers, $, detectedGlobals });
            }

            if (runAccessibility) {
                console.log('Running Accessibility analysis...');
                const originalWarn = console.warn;
                console.warn = (...args) => { if (!args[0]?.toString().includes('Failed to inject axe-core')) { originalWarn(...args); } };
                const accessibilityResult = await new AxePuppeteer(page).analyze();
                console.warn = originalWarn;
                analysisData.accessibility = { violations: accessibilityResult.violations };
            }

            if (runSeo) {
                console.log('Running SEO analysis...');
                const robotsTxtUrl = new URL('/robots.txt', url).href;
                const robotsTxt = await axios.get(robotsTxtUrl, { timeout: 5000 }).then(res => res.data).catch(() => null);
                const wordCount = $('body').text().split(/\s+/).filter(Boolean).length;
                let seoScannerResult = {};
                try {
                    seoScannerResult = await analyzeSEO({ $, baseUrl: url, robotsTxtText: robotsTxt });
                } catch (err) {
                    seoScannerResult = { error: err.message };
                }

                const seo = {
                    description: analysisData.description,
                    descriptionLength: analysisData.description ? analysisData.description.length : 0,
                    hasH1: !!analysisData.h1,
                    wordCount,
                    robotsTxtStatus: robotsTxt ? 'found' : 'not_found',
                };
                
                if (seoScannerResult && typeof seoScannerResult === 'object') {
                    for (const [key, value] of Object.entries(seoScannerResult)) {
                        seo[key] = (key === 'sitemap' && value && typeof value === 'object') ? JSON.stringify(value) : value;
                    }
                }
                analysisData.seo = seo;
            }
        }

        analysisData.status = 'completed';
        await analysis.updateOne(analysisData);
        
        // Save recent result for "Recent Results" view
        await RecentResult.create({
            url,
            analysisId: analysis._id,
            status: 'completed',
            title: analysisData.title,
            description: analysisData.description,
            technologies: analysisData.technologies?.slice(0, 5).map(t => ({ name: t.name, confidence: t.confidence })) || [],
            performanceScore: analysisData.performance?.score || null,
            accessibilityScore: analysisData.accessibility ? (100 - (analysisData.accessibility.violations?.length || 0)) : null,
            seoScore: analysisData.seo ? Math.round((Object.values(analysisData.seo).filter(v => v).length / 7) * 100) : null, // 7 is a magic number of current seo checks
        });
        
        console.log(`Analysis completed for ID: ${analysisId}`);

    } catch (err) {
        console.error(`Analysis failed for ID: ${analysisId}`, err.message);
        await analysis.updateOne({ status: 'failed' });
        
        await RecentResult.create({ url, analysisId: analysis._id, status: 'failed', error: err.message });
    } finally {
        if (page) {
            await page.close();
        }
    }
};

export { processAnalysisJob };
