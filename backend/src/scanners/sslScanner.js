import https from 'https';
import { URL } from 'url';

/**
 * Check SSL/TLS certificate details and validity
 * @param {string} url - URL to check
 * @returns {Promise<Object>} SSL certificate details
 */
export const analyzeSSL = async (url) => {
  console.log(`Analyzing SSL/TLS for: ${url}`);
  
  try {
    const urlObj = new URL(url);
    
    if (urlObj.protocol !== 'https:') {
      return {
        status: 'not-https',
        message: 'Website does not use HTTPS',
        isValid: false,
        score: 0,
      };
    }

    return new Promise((resolve, reject) => {
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        method: 'HEAD',
        rejectUnauthorized: false, // Allow checking expired/self-signed certs
      };

      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate();
        const details = analyzeCertificate(cert, urlObj.hostname);
        resolve(details);
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000);
      req.end();
    });
  } catch (error) {
    console.error(`Error analyzing SSL for ${url}:`, error.message);
    return {
      status: 'error',
      message: error.message,
      isValid: false,
      score: 0,
    };
  }
};

/**
 * Analyze certificate details
 * @param {Object} cert - Certificate object from Node.js
 * @param {string} hostname - Hostname to verify
 * @returns {Object} Certificate analysis
 */
function analyzeCertificate(cert, hostname) {
  if (!cert || Object.keys(cert).length === 0) {
    return {
      status: 'error',
      message: 'Unable to retrieve certificate',
      isValid: false,
      score: 0,
    };
  }

  const now = new Date();
  const validFrom = new Date(cert.valid_from);
  const validTo = new Date(cert.valid_until);
  const isExpired = now > validTo;
  const daysUntilExpiry = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));
  const issuer = cert.issuer?.O || cert.issuer?.CN || 'Unknown';

  // Check Subject Alternative Names (SAN)
  let subjectAltNames = [];
  if (cert.subjectaltname) {
    subjectAltNames = cert.subjectaltname
      .split(', ')
      .map(san => san.replace('DNS:', '').trim());
  }

  // Verify hostname matches certificate
  const hasValidSAN = subjectAltNames.some(san => 
    wildcardMatch(san, hostname)
  );

  const commonName = cert.subject?.CN || '';
  const commonNameMatch = wildcardMatch(commonName, hostname);
  const hostnameValid = hasValidSAN || commonNameMatch;

  // Check certificate strength
  const keySize = cert.bits || 0;
  const algorithm = cert.pubkey?.type || 'unknown';
  const strength = getKeyStrength(keySize, algorithm);

  // Calculate SSL score
  const score = calculateSSLScore(
    isExpired,
    daysUntilExpiry,
    hostnameValid,
    strength,
    issuer
  );

  return {
    status: 'success',
    isValid: !isExpired && hostnameValid,
    certificate: {
      subject: cert.subject?.CN || 'Unknown',
      issuer,
      validFrom: validFrom.toISOString(),
      validUntil: validTo.toISOString(),
      daysUntilExpiry,
      isExpired,
      expiryWarning: daysUntilExpiry < 30,
    },
    hostname: {
      requested: hostname,
      commonName,
      subjectAltNames,
      isValid: hostnameValid,
    },
    keyInfo: {
      size: keySize,
      algorithm,
      strength,
    },
    score,
    recommendations: generateSSLRecommendations(
      isExpired,
      daysUntilExpiry,
      hostnameValid,
      strength,
      keySize
    ),
  };
}

/**
 * Wildcard matching for certificate common names
 * @param {string} pattern - Pattern (may contain *)
 * @param {string} hostname - Hostname to match
 * @returns {boolean} Whether hostname matches pattern
 */
function wildcardMatch(pattern, hostname) {
  if (!pattern || !hostname) return false;
  
  // Convert wildcard pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '[^.]+');
  
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(hostname);
}

/**
 * Determine key strength rating
 * @param {number} keySize - Key size in bits
 * @param {string} algorithm - Algorithm type
 * @returns {string} Strength rating
 */
function getKeyStrength(keySize, algorithm) {
  if (keySize >= 4096) return 'Excellent (4096+ bits)';
  if (keySize >= 2048) return 'Good (2048 bits)';
  if (keySize >= 1024) return 'Weak (1024 bits)';
  return 'Critical (< 1024 bits)';
}

/**
 * Calculate SSL/TLS security score
 * @param {boolean} isExpired - Whether certificate is expired
 * @param {number} daysUntilExpiry - Days until expiry
 * @param {boolean} hostnameValid - Whether hostname is valid
 * @param {string} strength - Key strength rating
 * @param {string} issuer - Certificate issuer
 * @returns {number} Score 0-100
 */
function calculateSSLScore(isExpired, daysUntilExpiry, hostnameValid, strength, issuer) {
  let score = 100;

  if (isExpired) score -= 50;
  else if (daysUntilExpiry < 7) score -= 30;
  else if (daysUntilExpiry < 30) score -= 15;

  if (!hostnameValid) score -= 25;

  if (!strength.includes('Good') && !strength.includes('Excellent')) {
    score -= 20;
  }

  // Self-signed certificates lose points
  if (issuer.toLowerCase().includes('self')) {
    score -= 20;
  }

  return Math.max(0, score);
}

/**
 * Generate SSL recommendations
 * @param {boolean} isExpired - Certificate expired status
 * @param {number} daysUntilExpiry - Days until expiry
 * @param {boolean} hostnameValid - Hostname valid status
 * @param {string} strength - Key strength
 * @param {number} keySize - Key size
 * @returns {Array} Array of recommendations
 */
function generateSSLRecommendations(isExpired, daysUntilExpiry, hostnameValid, strength, keySize) {
  const recommendations = [];

  if (isExpired) {
    recommendations.push('⚠️ CRITICAL: SSL certificate has expired. Renew immediately.');
  } else if (daysUntilExpiry < 7) {
    recommendations.push(`⚠️ CRITICAL: SSL certificate expires in ${daysUntilExpiry} days. Renew immediately.`);
  } else if (daysUntilExpiry < 30) {
    recommendations.push(`⚠️ WARNING: SSL certificate expires in ${daysUntilExpiry} days. Plan renewal soon.`);
  }

  if (!hostnameValid) {
    recommendations.push('⚠️ WARNING: Certificate hostname does not match requested domain.');
  }

  if (keySize < 2048) {
    recommendations.push('⚠️ WARNING: Use RSA 2048-bit or stronger encryption keys.');
  }

  if (!strength.includes('Good') && !strength.includes('Excellent')) {
    recommendations.push(`📋 Consider upgrading to stronger encryption. Current: ${strength}`);
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ SSL/TLS configuration looks good.');
  }

  return recommendations;
}
