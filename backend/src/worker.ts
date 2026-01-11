import { load } from 'cheerio';
import axios from 'axios';
import { AxePuppeteer } from 'axe-puppeteer';
import { detectTechnologies } from './scanners/techScanner.js';
import analyzeSEO from './scanners/seoScanner.js';
import { analyzeLighthouseReport } from './scanners/lighthouseScanner.js';
import { analyzeSecurity } from './scanners/securityScanner.js';
import { analyzeSSL } from './scanners/sslScanner.js';
import { getBrowser } from './utils/browserManager.js';
// Models
import Analysis from './models/Analysis.js';
import RecentResult from './models/RecentResult.js';
import User from './models/User.js';

import transporter from './config/mailer.js';
import { createClient } from 'redis';

const redisPublisher = createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

redisPublisher.on('error', (err) => console.error('Redis Publisher Error', err));
redisPublisher.connect().catch(console.error);

const processAnalysisJob = async (job: any) => {
    const { analysisId, types } = job;
    console.log(
        `Processing analysis for ID: ${analysisId} with types: ${JSON.stringify(types)}`
    );

    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
        console.error(`Analysis with ID ${analysisId} not found.`);
        return;
    }

    await analysis.updateOne({ status: 'in-progress' });
    const { url, user: userId } = analysis;

    // If types array is empty or undefined, run all analyses for backward compatibility.
    const runAll = !types || types.length === 0;
    const runTech = runAll || types.includes('tech');
    const runSeo = runAll || types.includes('seo');
    const runPerformance = runAll || types.includes('performance');
    const runAccessibility = runAll || types.includes('accessibility');
    const runSecurity = runAll || types.includes('security');

    let page = null;
    let analysisData: any = {};

    try {
        const browser = getBrowser();

        if (runPerformance) {
            try {
                const lighthouseResult = await analyzeLighthouseReport(url, browser);
                console.log(`Lighthouse analysis for ${url} completed.`);
                analysisData.lighthouse = lighthouseResult.lighthouse;
                analysisData.performance = lighthouseResult.performance;
            } catch (perfError: any) {
                console.error(`Error in Lighthouse analysis for ${url}:`, perfError);
                analysisData.lighthouse = {
                    performance: 0,
                    accessibility: 0,
                    bestPractices: 0,
                    seo: 0,
                };
                analysisData.performance = {
                    score: null,
                    metrics: {},
                    recommendations: [`Error: ${perfError.message}`],
                };
            }
        }

        if (runSecurity) {
            try {
                const securityResult = await analyzeSecurity(url);
                const sslResult = await analyzeSSL(url);
                securityResult.ssl = sslResult;
                console.log(`Security analysis for ${url} completed.`);
                analysisData.security = securityResult;
            } catch (secError: any) {
                console.error(`Error in security analysis for ${url}:`, secError);
                analysisData.security = {
                    status: 'error',
                    message: secError.message,
                    headers: {},
                    ssl: {
                        status: 'error',
                        message: secError.message,
                        isValid: false,
                        score: 0,
                    },
                };
            }
        }

        // The main browser-based analysis is needed for tech, seo, and accessibility
        if (runTech || runSeo || runAccessibility) {
            page = await browser.newPage();

            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            });

            const response = await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000,
            });
            const html = await page.content();
            const headers = response?.headers() || {};
            const $ = load(html);

            analysisData.title = await page.title();
            analysisData.description = await page
                .$eval('meta[name="description"]', (el: any) => el.content)
                .catch(() => null);
            analysisData.h1 = await page
                .$eval('h1', (el: any) => el.textContent)
                .catch(() => null);
            analysisData.screenshot = await page.screenshot({
                encoding: 'base64',
                type: 'jpeg',
                quality: 70,
            });

            if (runTech) {
                console.log('Running Tech analysis...');
                const detectedGlobals = {
                    hasChartJs: await page.evaluate(
                        () => typeof (window as any).Chart !== 'undefined'
                    ),
                };
                analysisData.technologies = detectTechnologies({
                    html,
                    headers,
                    $,
                    detectedGlobals,
                });
            }

            if (runAccessibility) {
                console.log('Running Accessibility analysis...');
                const originalWarn = console.warn;
                console.warn = (...args) => {
                    if (!args[0]?.toString().includes('Failed to inject axe-core')) {
                        originalWarn(...args);
                    }
                };
                const accessibilityResult = await new AxePuppeteer(page).analyze();
                console.warn = originalWarn;
                analysisData.accessibility = {
                    violations: accessibilityResult.violations,
                };
            }

            if (runSeo) {
                console.log('Running SEO analysis...');
                const robotsTxtUrl = new URL('/robots.txt', url).href;
                const robotsTxt: any = await axios
                    .get(robotsTxtUrl, { timeout: 5000 })
                    .then((res) => res.data)
                    .catch(() => null);
                const wordCount = $('body').text().split(/\s+/).filter(Boolean).length;
                let seoScannerResult: any = {};
                try {
                    seoScannerResult = await analyzeSEO({
                        $,
                        baseUrl: url,
                        robotsTxtText: robotsTxt,
                    });
                } catch (err: any) {
                    seoScannerResult = { error: err.message };
                }

                const seo: any = {
                    description: analysisData.description,
                    descriptionLength: analysisData.description
                        ? analysisData.description.length
                        : 0,
                    hasH1: !!analysisData.h1,
                    wordCount,
                    robotsTxtStatus: robotsTxt ? 'found' : 'not_found',
                };

                if (seoScannerResult && typeof seoScannerResult === 'object') {
                    for (const [key, value] of Object.entries(seoScannerResult)) {
                        seo[key] =
                            key === 'sitemap' && value && typeof value === 'object'
                                ? JSON.stringify(value)
                                : value;
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
            technologies:
                analysisData.technologies
                    ?.slice(0, 5)
                    .map((t: any) => ({ name: t.name, confidence: t.confidence })) || [],
            performanceScore: analysisData.performance?.score || null,
            accessibilityScore: analysisData.accessibility
                ? 100 - (analysisData.accessibility.violations?.length || 0)
                : null,
            seoScore: analysisData.seo
                ? Math.round(
                    (Object.values(analysisData.seo).filter((v) => v).length / 7) * 100
                )
                : null, // 7 is a magic number of current seo checks
        });

        // Send email notification if user has opted in
        if (userId) {
            const user = await User.findById(userId);
            if (user && user.emailNotifications) {
                const mailOptions = {
                    from: process.env.MAIL_FROM,
                    to: user.email,
                    subject: `Analysis complete for ${url}`,
                    html: `
                        <h1>Analysis Complete</h1>
                        <p>Your analysis for ${url} is complete.</p>
                        <p><a href="http://localhost:3000/analyze?analysisId=${analysisId}">View the results</a></p>
                    `,
                };
                await transporter.sendMail(mailOptions);
            }
        }

        // Publish event for real-time updates
        if (redisPublisher.isOpen) {
            await redisPublisher.publish('socket.io', JSON.stringify({
                type: 'analysisCompleted',
                data: {
                    analysisId,
                    status: 'completed',
                    result: analysisData // Send light data or just ID? Sending ID + Status is safer, let client fetch if needed.
                    // Actually, sending the result allows instant update without refetch.
                }
            }));

            // We also need to emit to specific rooms. 
            // The @socket.io/redis-adapter expects specific format if we want to emit to rooms from here.
            // However, a simpler pattern is: Worker publishes to a custom channel -> API subscribes -> API emits to Socket.
            // But @socket.io/redis-adapter allows "Emitter" pattern to emit directly to rooms from a non-socket.io process!
            // Let's use the Emitter pattern in a future step or just simple Pub/Sub for now.

            // Wait, I implemented a simple pub/sub in socket.ts but that was for Adapter internal usage.
            // To emit from Worker to API, we can use the Emitter, OR just rely on the API querying status.
            // BUT we promised "Real-Time".

            // Let's use the Emitter library if we installed it? We installed @socket.io/redis-adapter but not @socket.io/redis-emitter.
            // Alternative: Publish to a "notifications" channel that the API listens to.
            // In `socket.ts`, I only set up the Adapter. I did NOT set up a custom subscriber for "application events".

            // Let's FIX `socket.ts` later to listen to 'analysis-events' channel.
            await redisPublisher.publish('analysis-events', JSON.stringify({
                roomId: `analysis:${analysisId}`,
                event: 'analysisCompleted',
                payload: {
                    _id: analysisId,
                    status: 'completed',
                    result: analysisData
                }
            }));
        }

        console.log(`Analysis completed for ID: ${analysisId}`);
    } catch (err: any) {
        console.error(`Analysis failed for ID: ${analysisId}`, err.message);
        await analysis.updateOne({ status: 'failed' });

        await RecentResult.create({
            url,
            analysisId: analysis._id,
            status: 'failed',
            error: err.message,
        });

        if (redisPublisher.isOpen) {
            await redisPublisher.publish('analysis-events', JSON.stringify({
                roomId: `analysis:${analysisId}`,
                event: 'analysisFailed',
                payload: {
                    _id: analysisId,
                    status: 'failed',
                    error: err.message
                }
            }));
        }
    } finally {
        if (page) {
            await page.close();
        }
    }
};

export { processAnalysisJob };
