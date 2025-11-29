/**
 * Simple technology detection rules.
 * Exported function: detectTechnologies({ html, headers, $ }) -> Array of {name, confidence, evidence}
 */
import { load } from 'cheerio';

export function detectTechnologies({ html, headers = {}, $ = null, detectedGlobals = {} }) {
  try {
    if (!$) $ = load(html || '');

    const technologies = [];

    // Check Server header for server software
    const serverHeader = headers['server'] || headers['Server'];
    if (serverHeader) {
      technologies.push({ name: `Server: ${serverHeader}`, confidence: 0.7, evidence: `HTTP header: Server: ${serverHeader}` });
    }

    // Common JS frameworks via script src or inline
    const scripts = $('script[src]').map((i, el) => $(el).attr('src')).get();
    const htmlText = $.root().html() || '';

    if (/react(?:-dom)?(?:\.min)?\.js/i.test(scripts.join(' ')) || /__REACT_DEVTOOLS_GLOBAL_HOOK__/i.test(htmlText)) {
      technologies.push({ name: 'React', confidence: 0.8, evidence: 'script src or devtools hook' });
    }

    if (/angular/i.test(scripts.join(' ')) || /ng-/i.test(htmlText)) {
      technologies.push({ name: 'Angular', confidence: 0.8, evidence: 'script src or ng- attributes' });
    }

    if (/vue(?:\.runtime)?(?:\.min)?\.js/i.test(scripts.join(' ')) || /__VUE_DEVTOOLS_GLOBAL_HOOK__/i.test(htmlText)) {
      technologies.push({ name: 'Vue.js', confidence: 0.8, evidence: 'script src or devtools hook' });
    }

    // Detect jQuery
    if (/jquery(?:\.min)?\.js/i.test(scripts.join(' ')) || /jQuery\(/.test(htmlText)) {
      technologies.push({ name: 'jQuery', confidence: 0.7, evidence: 'script src or jQuery usage' });
    }

    // CMS detectors (simple)
    if (/wp-content|wp-includes|WordPress/i.test(htmlText)) {
      technologies.push({ name: 'WordPress', confidence: 0.9, evidence: 'wp-content or wp-includes in HTML' });
    }

    if (/Drupal.settings|sites\/all\/modules/i.test(htmlText)) {
      technologies.push({ name: 'Drupal', confidence: 0.8, evidence: 'Drupal patterns in HTML' });
    }

    // Google Analytics / Tag Manager
    if (/googletagmanager\.com\/gtm\.js|gtag\(|ga\(/i.test(htmlText)) {
      technologies.push({ name: 'Google Analytics/Tag Manager', confidence: 0.8, evidence: 'GA/GTM patterns' });
    }

    // Server-side language hints
    if (/x-powered-by/i.test(Object.keys(headers).join(' '))) {
      const xp = headers['x-powered-by'] || headers['X-Powered-By'];
      if (xp) technologies.push({ name: `X-Powered-By: ${xp}`, confidence: 0.6, evidence: 'HTTP X-Powered-By header' });
    }

    // Basic performance hints
    const imgCount = $('img').length;
    if (imgCount > 50) {
      technologies.push({ name: 'Many images', confidence: 0.4, evidence: `${imgCount} <img> tags` });
    }

    // Dynamic checks for libraries
    if (detectedGlobals.hasChartJs) {
      technologies.push({ name: 'Chart.js', confidence: 0.9, evidence: 'window.Chart global variable' });
    }

    return technologies;
  } catch (err) {
    return [{ name: 'detection_error', confidence: 0, evidence: err.message }];
  }
}
