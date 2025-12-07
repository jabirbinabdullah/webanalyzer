/**
 * Technology detection rules configuration
 * Defines patterns, global variables, and indicators for various technologies
 */

export const TECHNOLOGY_RULES = {
  'React': {
    patterns: [/react(?:-dom)?(?:\.min)?\.js/i],
    globalVars: ['__REACT_DEVTOOLS_GLOBAL_HOOK__'],
    indicators: [/__reactInternalInstance/],
    confidence: 0.9,
  },
  'Vue.js': {
    patterns: [/vue(?:\.runtime)?(?:\.min)?\.js/i],
    globalVars: ['__VUE_DEVTOOLS_GLOBAL_HOOK__'],
    indicators: [/__vue__/],
    confidence: 0.9,
  },
  'Angular': {
    patterns: [/angular(?:\.min)?\.js|@angular/i],
    globalVars: ['angular'],
    indicators: [/ng-/],
    confidence: 0.8,
  },
  'Next.js': {
    patterns: [/__NEXT_DATA__|__NEXT_|nextjs/i],
    globalVars: ['__NEXT_DATA__'],
    indicators: [/_next\/static/],
    confidence: 0.95,
  },
  'Nuxt.js': {
    patterns: [/nuxt(?:\.min)?\.js|@nuxt/i],
    globalVars: ['$nuxt'],
    indicators: [/__NUXT__/],
    confidence: 0.9,
  },
  'jQuery': {
    patterns: [/jquery(?:\.min)?\.js/i],
    globalVars: ['jQuery', 'jQ'],
    indicators: [/jQuery\(/],
    confidence: 0.8,
  },
  'Bootstrap': {
    patterns: [/bootstrap(?:\.min)?\.css|bootstrap\.js/i],
    indicators: [/container-fluid|\.row|\.col-/],
    confidence: 0.85,
  },
  'Tailwind CSS': {
    patterns: [/tailwind|@tailwind/i],
    indicators: [/flex|mx-auto|grid-cols|padding-\d|text-\w+-\d/],
    confidence: 0.8,
  },
  'Material Design': {
    patterns: [/material-design|@material|mdl/i],
    indicators: [/mdl-|mdc-|mat-/],
    confidence: 0.8,
  },
  'WordPress': {
    patterns: [/wp-content|wp-includes|WordPress/i],
    indicators: [/wp-json|wordpress/],
    confidence: 0.95,
  },
  'Drupal': {
    patterns: [/Drupal\.settings|sites\/all\/modules/i],
    globalVars: ['Drupal'],
    confidence: 0.9,
  },
  'Shopify': {
    patterns: [/Shopify|shopify\.app/i],
    globalVars: ['Shopify'],
    indicators: [/\/cdn\/shop\/|Shopify\.theme/],
    confidence: 0.95,
  },
  'Wix': {
    patterns: [/wix\.com|Wix\.setPagePermissions/i],
    globalVars: ['Wix'],
    confidence: 0.9,
  },
  'TypeScript': {
    patterns: [/typescript|\.ts|tsconfig/i],
    indicators: [/interface\s+\w+|type\s+\w+=/],
    confidence: 0.7,
  },
  'Webpack': {
    patterns: [/webpack|__webpack_/i],
    globalVars: ['__webpack_require__'],
    confidence: 0.8,
  },
  'Google Analytics': {
    patterns: [/google-analytics|googletagmanager|gtag|ga\(/i],
    indicators: [/GoogleAnalyticsObject|_gaq/],
    confidence: 0.95,
  },
  'Google Tag Manager': {
    patterns: [/googletagmanager\.com\/gtm\.js/i],
    indicators: [/gtag\.js/],
    confidence: 0.95,
  },
  'Facebook Pixel': {
    patterns: [/facebook\.com\/en_US\/fbevents\.js|facebook\.com\/.*fbevents/i],
    indicators: [/fbq\(/],
    confidence: 0.9,
  },
  'Intercom': {
    patterns: [/intercom\.io\/messages\.js|intercom-frame/i],
    globalVars: ['Intercom'],
    confidence: 0.9,
  },
  'Hotjar': {
    patterns: [/hotjar\.com\/\?/i],
    globalVars: ['hj', 'hjSiteId'],
    confidence: 0.9,
  },
  'Sentry': {
    patterns: [/sentry\.io|Sentry\.init/i],
    globalVars: ['__SENTRY__'],
    confidence: 0.85,
  },
};

/**
 * Technology detection score calculation rules
 * Used to determine overall confidence based on multiple indicators
 */
export const DETECTION_WEIGHTS = {
  pattern: 0.4,      // Script/CSS detected via URL pattern
  globalVar: 0.4,    // Global variable or object detected
  indicator: 0.3,    // HTML indicator (class, attribute, etc.)
};
