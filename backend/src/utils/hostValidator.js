/**
 * SSRF/Host validation utilities
 * Prevents Server-Side Request Forgery attacks
 */
import { promises as dnsPromises } from 'dns';
import net from 'net';

/**
 * Convert IPv4 address to integer for range checking
 */
function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return null;
  return (
    ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
  );
}

/**
 * Check if IPv4 address is private/reserved
 */
function isPrivateIPv4(ip) {
  const i = ipv4ToInt(ip);
  if (i === null) return false;

  const ranges = [
    { start: '10.0.0.0', end: '10.255.255.255' }, // 10.0.0.0/8
    { start: '172.16.0.0', end: '172.31.255.255' }, // 172.16.0.0/12
    { start: '192.168.0.0', end: '192.168.255.255' }, // 192.168.0.0/16
    { start: '127.0.0.0', end: '127.255.255.255' }, // 127.0.0.0/8 (loopback)
    { start: '169.254.0.0', end: '169.254.255.255' }, // 169.254.0.0/16 (link-local)
    { start: '0.0.0.0', end: '0.255.255.255' }, // 0.0.0.0/8
    { start: '224.0.0.0', end: '239.255.255.255' }, // 224.0.0.0/4 (multicast)
    { start: '240.0.0.0', end: '255.255.255.255' }, // 240.0.0.0/4 (reserved)
  ];

  return ranges.some((range) => {
    const rangeStart = ipv4ToInt(range.start);
    const rangeEnd = ipv4ToInt(range.end);
    return i >= rangeStart && i <= rangeEnd;
  });
}

/**
 * Check if IPv6 address is private/reserved
 */
function isPrivateIPv6(ip) {
  if (!ip) return false;
  const norm = ip.toLowerCase();

  return (
    norm === '::1' || // loopback
    norm.startsWith('fc') || // fc00::/7 (unique local)
    norm.startsWith('fd') || // fc00::/7 (unique local)
    norm.startsWith('fe80') || // fe80::/10 (link-local)
    norm === '::' || // unspecified
    norm.startsWith('ff') // ff00::/8 (multicast)
  );
}

/**
 * Validate if a hostname is allowed to be analyzed
 * Prevents SSRF attacks by blocking private/reserved IP ranges
 * @param {string} hostname - Hostname or IP to validate
 * @returns {Promise<boolean>} true if allowed, false otherwise
 */
export async function isHostAllowed(hostname) {
  try {
    // In test environment, allow everything
    if (process.env.NODE_ENV === 'test') return true;

    // Check if it's an IP literal
    const ipType = net.isIP(hostname);

    if (ipType === 4) {
      // IPv4
      return !isPrivateIPv4(hostname);
    } else if (ipType === 6) {
      // IPv6
      return !isPrivateIPv6(hostname);
    }

    // Resolve hostname via DNS
    try {
      const records = await dnsPromises.lookup(hostname, { all: true });

      for (const record of records) {
        const addr = record.address;

        if (net.isIP(addr) === 4) {
          if (isPrivateIPv4(addr)) return false;
        } else if (net.isIP(addr) === 6) {
          if (isPrivateIPv6(addr)) return false;
        }
      }

      return true;
    } catch (dnsErr) {
      // DNS resolution failed - be conservative and disallow
      console.warn(`DNS resolution failed for ${hostname}:`, dnsErr.message);
      return false;
    }
  } catch (err) {
    console.error('Host validation error:', err.message);
    return false;
  }
}

/**
 * Validate URL before analyzing
 * @param {string} url - URL to validate
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
export function validateUrl(url) {
  try {
    const urlObject = new URL(url);

    // Check protocol
    if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
      return {
        valid: false,
        error: 'Invalid protocol. Only http and https are allowed.',
      };
    }

    // Check length
    if (url.length > 2000) {
      return { valid: false, error: 'URL too long (max 2000 characters).' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: 'Invalid URL format.' };
  }
}

export default {
  isHostAllowed,
  validateUrl,
};
