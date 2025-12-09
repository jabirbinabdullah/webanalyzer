import axios from 'axios';
import https from 'https';
import { URL } from 'url';

/**
 * Analyze website security headers and SSL/TLS configuration
 * @param {string} url - URL to analyze
 * @returns {Promise<Object>} Security analysis results including headers and SSL status
 */
export const analyzeSecurity = async (url) => {
  console.log(`Analyzing security headers for: ${url}`);
  try {
    const urlObj = new URL(url);
    
    // Check security headers
    const response = await axios.head(url, {
      validateStatus: (status) => true,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      }
    });

    const headers = response.headers;
    const securityHeaders = {};
    const missingHeaders = [];

    // Check common security headers
    const headerChecks = {
      'Content-Security-Policy': 'content-security-policy',
      'Strict-Transport-Security': 'strict-transport-security',
      'X-Frame-Options': 'x-frame-options',
      'X-Content-Type-Options': 'x-content-type-options',
      'X-XSS-Protection': 'x-xss-protection',
      'Referrer-Policy': 'referrer-policy',
      'Permissions-Policy': 'permissions-policy',
      'X-Permitted-Cross-Domain-Policies': 'x-permitted-cross-domain-policies',
    };

    Object.entries(headerChecks).forEach(([headerName, headerKey]) => {
      const isPresent = !!headers[headerKey];
      securityHeaders[headerName] = isPresent ? headers[headerKey] : 'Missing';
      if (!isPresent) missingHeaders.push(headerName);
    });

    // Check HTTPS
    const isHTTPS = urlObj.protocol === 'https:';

    // Check for information leakage
    const leakageHeaders = {
      'Server': headers['server'] ? 'Exposed' : 'Hidden',
      'X-Powered-By': headers['x-powered-by'] ? 'Exposed' : 'Hidden',
      'X-AspNet-Version': headers['x-aspnet-version'] ? 'Exposed' : 'Hidden',
    };

    // Check for CORS misconfiguration
    const corsStatus = headers['access-control-allow-origin'] 
      ? headers['access-control-allow-origin'] === '*' 
        ? 'Potentially Misconfigured (*)' 
        : 'Configured: ' + headers['access-control-allow-origin']
      : 'Not Set';

    // Check for redirect chains (up to 3 hops)
    let finalUrl = url;
    let redirectCount = 0;
    try {
      const headResponse = await axios.head(url, {
        maxRedirects: 3,
        validateStatus: (status) => true,
        timeout: 10000,
      });
      finalUrl = headResponse.request?.res?.responseUrl || url;
      redirectCount = headResponse.request?.path?.split('/').length - 1 || 0;
    } catch (e) {
      // Ignore redirect errors
    }

    // Calculate security score
    const securityScore = calculateSecurityScore(
      isHTTPS,
      missingHeaders.length,
      Object.keys(securityHeaders).length,
      leakageHeaders
    );

    console.log(`Security analysis for ${url} completed.`);
    return {
      status: 'success',
      headers: securityHeaders,
      leakageHeaders,
      corsStatus,
      isHTTPS,
      redirectCount,
      securityScore,
      recommendations: generateSecurityRecommendations(
        missingHeaders,
        isHTTPS,
        leakageHeaders,
        corsStatus
      ),
    };
  } catch (error) {
    console.error(`Error analyzing security for ${url}:`, error.message);
    return {
      status: 'error',
      message: error.message,
      headers: {},
      securityScore: 0,
      recommendations: ['Unable to complete security analysis. Please check if URL is valid and accessible.'],
    };
  }
};

/**
 * Calculate security score based on headers and HTTPS status
 * @param {boolean} isHTTPS - Whether URL uses HTTPS
 * @param {number} missingHeaderCount - Number of missing security headers
 * @param {number} totalHeaderCount - Total security headers checked
 * @param {Object} leakageHeaders - Server information leakage status
 * @returns {number} Security score (0-100)
 */
function calculateSecurityScore(isHTTPS, missingHeaderCount, totalHeaderCount, leakageHeaders) {
  let score = 100;

  // HTTPS is critical
  if (!isHTTPS) score -= 30;

  // Deduct for missing headers (each header worth ~6 points)
  score -= missingHeaderCount * 6;

  // Deduct for information leakage
  const leakageCount = Object.values(leakageHeaders).filter(v => v === 'Exposed').length;
  score -= leakageCount * 10;

  return Math.max(0, Math.round(score));
}

/**
 * Generate security recommendations based on analysis
 * @param {Array} missingHeaders - List of missing security headers
 * @param {boolean} isHTTPS - HTTPS status
 * @param {Object} leakageHeaders - Information leakage status
 * @param {string} corsStatus - CORS configuration status
 * @returns {Array} Array of recommendations
 */
function generateSecurityRecommendations(missingHeaders, isHTTPS, leakageHeaders, corsStatus) {
  const recommendations = [];

  if (!isHTTPS) {
    recommendations.push('⚠️ CRITICAL: Enable HTTPS/TLS encryption (HTTP is insecure)');
  }

  if (missingHeaders.includes('Strict-Transport-Security')) {
    recommendations.push('⚠️ Add HSTS header to force HTTPS and prevent downgrade attacks');
  }

  if (missingHeaders.includes('Content-Security-Policy')) {
    recommendations.push('📋 Implement Content-Security-Policy to prevent XSS attacks');
  }

  if (missingHeaders.includes('X-Frame-Options')) {
    recommendations.push('🛡️ Set X-Frame-Options to prevent clickjacking attacks');
  }

  if (leakageHeaders['Server'] === 'Exposed') {
    recommendations.push('🔒 Hide Server header to prevent version enumeration');
  }

  if (leakageHeaders['X-Powered-By'] === 'Exposed') {
    recommendations.push('🔒 Remove X-Powered-By header to reduce information disclosure');
  }

  if (corsStatus.includes('*')) {
    recommendations.push('⚠️ CORS misconfiguration: Avoid using wildcard (*) for Access-Control-Allow-Origin');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Good security practices detected. Continue monitoring.');
  }

  return recommendations;
}
