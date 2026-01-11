import axios from 'axios';

export const analyzeHeaders = async (url) => {
  const response = await axios.head(url, {
    validateStatus: () => true,
    timeout: 10000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    },
  });

  const headers = response.headers;
  const securityHeaders = {};
  const missingHeaders = [];

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

  const leakageHeaders = {
    Server: headers['server'] ? 'Exposed' : 'Hidden',
    'X-Powered-By': headers['x-powered-by'] ? 'Exposed' : 'Hidden',
    'X-AspNet-Version': headers['x-aspnet-version'] ? 'Exposed' : 'Hidden',
  };

  const corsStatus = headers['access-control-allow-origin']
    ? headers['access-control-allow-origin'] === '*'
      ? 'Potentially Misconfigured (*)'
      : `Configured: ${headers['access-control-allow-origin']}`
    : 'Not Set';

  return {
    securityHeaders,
    missingHeaders,
    leakageHeaders,
    corsStatus,
  };
};
