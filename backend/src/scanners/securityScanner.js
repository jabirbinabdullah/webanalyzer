import { analyzeHeaders } from './headerScanner.js';
import { analyzeVulnerabilities } from './vulnerabilityScanner.js';
import { URL } from 'url';

/**
 * Analyze website security
 * @param {string} url - URL to analyze
 * @returns {Promise<Object>} Security analysis results
 */
export const analyzeSecurity = async (url) => {
  console.log(`Analyzing security for: ${url}`);
  try {
    const urlObj = new URL(url);
    const isHTTPS = urlObj.protocol === 'https:';

    const { securityHeaders, missingHeaders, leakageHeaders, corsStatus } =
      await analyzeHeaders(url);

    const vulnerabilities = await analyzeVulnerabilities(url);

    const securityScore = calculateSecurityScore(
      isHTTPS,
      missingHeaders.length,
      Object.keys(securityHeaders).length,
      leakageHeaders,
      vulnerabilities.length
    );

    console.log(`Security analysis for ${url} completed.`);
    return {
      status: 'success',
      headers: securityHeaders,
      leakageHeaders,
      corsStatus,
      isHTTPS,
      vulnerabilities,
      securityScore,
      recommendations: generateSecurityRecommendations(
        missingHeaders,
        isHTTPS,
        leakageHeaders,
        corsStatus,
        vulnerabilities.length
      ),
    };
  } catch (error) {
    console.error(`Error analyzing security for ${url}:`, error.message);
    return {
      status: 'error',
      message: error.message,
      headers: {},
      securityScore: 0,
      recommendations: [
        'Unable to complete security analysis. Please check if URL is valid and accessible.',
      ],
    };
  }
};

/**
 * Calculate security score based on headers and HTTPS status
 * @param {boolean} isHTTPS - Whether URL uses HTTPS
 * @param {number} missingHeaderCount - Number of missing security headers
 * @param {number} totalHeaderCount - Total security headers checked
 * @param {Object} leakageHeaders - Server information leakage status
 * @param {number} vulnerabilityCount - Number of vulnerabilities found
 * @returns {number} Security score (0-100)
 */
function calculateSecurityScore(
  isHTTPS,
  missingHeaderCount,
  totalHeaderCount,
  leakageHeaders,
  vulnerabilityCount
) {
  let score = 100;

  // HTTPS is critical
  if (!isHTTPS) score -= 30;

  // Deduct for missing headers (each header worth ~6 points)
  score -= missingHeaderCount * 6;

  // Deduct for information leakage
  const leakageCount = Object.values(leakageHeaders).filter(
    (v) => v === 'Exposed'
  ).length;
  score -= leakageCount * 10;

  // Deduct for vulnerabilities
  score -= vulnerabilityCount * 5;

  return Math.max(0, Math.round(score));
}

/**
 * Generate security recommendations based on analysis
 * @param {Array} missingHeaders - List of missing security headers
 * @param {boolean} isHTTPS - HTTPS status
 * @param {Object} leakageHeaders - Information leakage status
 * @param {string} corsStatus - CORS configuration status
 * @param {number} vulnerabilityCount - Number of vulnerabilities found
 * @returns {Array} Array of recommendations
 */
function generateSecurityRecommendations(
  missingHeaders,
  isHTTPS,
  leakageHeaders,
  corsStatus,
  vulnerabilityCount
) {
  const recommendations = [];

  if (!isHTTPS) {
    recommendations.push(
      '⚠️ CRITICAL: Enable HTTPS/TLS encryption (HTTP is insecure)'
    );
  }

  if (vulnerabilityCount > 0) {
    recommendations.push(
      `🚨 ${vulnerabilityCount} vulnerable JavaScript libraries found. Update them to the latest version.`
    );
  }

  if (missingHeaders.includes('Strict-Transport-Security')) {
    recommendations.push(
      '⚠️ Add HSTS header to force HTTPS and prevent downgrade attacks'
    );
  }

  if (missingHeaders.includes('Content-Security-Policy')) {
    recommendations.push(
      '📋 Implement Content-Security-Policy to prevent XSS attacks'
    );
  }

  if (missingHeaders.includes('X-Frame-Options')) {
    recommendations.push(
      '🛡️ Set X-Frame-Options to prevent clickjacking attacks'
    );
  }

  if (leakageHeaders['Server'] === 'Exposed') {
    recommendations.push(
      '🔒 Hide Server header to prevent version enumeration'
    );
  }

  if (leakageHeaders['X-Powered-By'] === 'Exposed') {
    recommendations.push(
      '🔒 Remove X-Powered-By header to reduce information disclosure'
    );
  }

  if (corsStatus.includes('*')) {
    recommendations.push(
      '⚠️ CORS misconfiguration: Avoid using wildcard (*) for Access-Control-Allow-Origin'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      '✅ Good security practices detected. Continue monitoring.'
    );
  }

  return recommendations;
}
