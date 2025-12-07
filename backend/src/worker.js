import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { load } from 'cheerio';
import axios from 'axios';
import { AxePuppeteer } from 'axe-puppeteer';
import { detectTechnologies } from './scanners/techScanner.js';
import analyzeSEO from './scanners/seoScanner.js';
import Analysis from './models/Analysis.js';
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
    try {
        puppeteer.use(StealthPlugin());
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
        const html = await page.content();
        const headers = response.headers();
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
        const robotsTxt = await axios.get(robotsTxtUrl).then(res => res.data).catch(() => null);

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
            ...seoScannerResult,
        };

        let lighthouseResult = null;
        try {
            const lighthouseModule = await import('lighthouse');
            const lighthouseFn = lighthouseModule && (lighthouseModule.default || lighthouseModule);

            if (typeof lighthouseFn === 'function') {
                const { lhr } = await lighthouseFn(url, {
                    port: (new URL(browser.wsEndpoint())).port,
                    output: 'json',
                    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
                }, undefined, page);

                lighthouseResult = {
                    performance: lhr.categories.performance.score * 100,
                    accessibility: lhr.categories.accessibility.score * 100,
                    bestPractices: lhr.categories['best-practices'].score * 100,
                    seo: lhr.categories.seo.score * 100,
                    pwa: lhr.categories.pwa.score * 100,
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
            status: 'completed',
        };

        await analysis.updateOne(analysisData);
        console.log(`Analysis completed for ID: ${analysisId}`);

    } catch (err) {
        console.error(`Analysis failed for ID: ${analysisId}`, err.message);
        await analysis.updateOne({ status: 'failed' });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

export { processAnalysisJob };
