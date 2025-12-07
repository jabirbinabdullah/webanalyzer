/**
 * Advanced technology detection using config-driven rules
 * Supports pattern matching, global variables, and HTML indicators
 */
import { load } from 'cheerio';
import { TECHNOLOGY_RULES, DETECTION_WEIGHTS } from './config/technologies.js';

/**
 * Detects technologies used on a website
 * @param {{ html: string, headers: Object, $?: CheerioAPI, detectedGlobals?: Object }} opts
 * @returns {Array} Array of detected technologies with confidence scores
 */
export function detectTechnologies({ html, headers = {}, $ = null, detectedGlobals = {} }) {
  try {
    if (!$) $ = load(html || '');

    const technologies = [];
    const htmlText = $.root().html() || '';
    const scripts = $('script[src]').map((i, el) => $(el).attr('src')).get().join(' ');
    const stylesheets = $('link[rel="stylesheet"]').map((i, el) => $(el).attr('href')).get().join(' ');
    const allText = htmlText + scripts + stylesheets;

    // Detect based on config rules
    for (const [name, rules] of Object.entries(TECHNOLOGY_RULES)) {
      let confidence = 0;
      const evidences = [];

      // Check patterns
      if (rules.patterns && Array.isArray(rules.patterns) && rules.patterns.some(p => p.test(allText))) {
        confidence += DETECTION_WEIGHTS.pattern * rules.confidence;
        evidences.push('Script/CSS pattern detected');
      }

      // Check global variables
      if (rules.globalVars && Array.isArray(rules.globalVars)) {
        if (rules.globalVars.some(v => {
          const regex = new RegExp(`\\b${v}\\b`, 'i');
          return regex.test(htmlText);
        })) {
          confidence += DETECTION_WEIGHTS.globalVar * rules.confidence;
          evidences.push('Global variable detected');
        }
      }

      // Check HTML indicators
      if (rules.indicators && Array.isArray(rules.indicators) && rules.indicators.some(ind => ind.test(htmlText))) {
        confidence += DETECTION_WEIGHTS.indicator * rules.confidence;
        evidences.push('HTML indicator detected');
      }

      // Add if confidence threshold met
      if (confidence > 0.2) {
        technologies.push({
          name,
          confidence: Math.min(1, parseFloat(confidence.toFixed(2))),
          evidence: evidences.join('; '),
        });
      }
    }

    // Server header detection
    const serverHeader = headers['server'] || headers['Server'];
    if (serverHeader) {
      technologies.push({
        name: `Server: ${serverHeader}`,
        confidence: 0.7,
        evidence: `HTTP header: Server: ${serverHeader}`,
      });
    }

    // X-Powered-By header
    const xPoweredBy = headers['x-powered-by'] || headers['X-Powered-By'];
    if (xPoweredBy) {
      technologies.push({
        name: `X-Powered-By: ${xPoweredBy}`,
        confidence: 0.6,
        evidence: 'HTTP X-Powered-By header',
      });
    }

    // Performance metrics
    const imgCount = $('img').length;
    if (imgCount > 50) {
      technologies.push({
        name: 'Heavy image usage',
        confidence: 0.4,
        evidence: `${imgCount} <img> tags detected`,
      });
    }

    // Dynamic globals from Puppeteer
    if (detectedGlobals.hasChartJs) {
      technologies.push({
        name: 'Chart.js',
        confidence: 0.9,
        evidence: 'window.Chart global variable',
      });
    }

    // Sort by confidence descending
    return technologies.sort((a, b) => b.confidence - a.confidence);
  } catch (err) {
    console.error('Technology detection error:', err.message);
    return [];
  }
}
