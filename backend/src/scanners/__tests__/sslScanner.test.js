import https from 'https';
import { analyzeSSL } from '../sslScanner';

// Mock the https module
jest.mock('https');

describe('analyzeSSL', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return not-https for non-https URLs', async () => {
    const result = await analyzeSSL('http://example.com');
    expect(result.status).toBe('not-https');
    expect(result.score).toBe(0);
  });

  it('should return success for a valid certificate', async () => {
    const mockCert = {
      subject: { CN: 'example.com' },
      issuer: { O: 'Test Issuer' },
      valid_from: new Date(new Date().getTime() - 10000).toISOString(),
      valid_to: new Date(
        new Date().getTime() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      subjectaltname: 'DNS:example.com',
      bits: 2048,
      pubkey: { type: 'RSA' },
    };

    const mockRes = {
      socket: {
        getPeerCertificate: () => mockCert,
      },
      on: jest.fn(),
      end: jest.fn(),
    };

    const mockReq = {
      on: jest.fn(),
      setTimeout: jest.fn(),
      end: jest.fn(),
    };

    https.request.mockImplementation((options, callback) => {
      callback(mockRes);
      return mockReq;
    });

    const result = await analyzeSSL('https://example.com');

    expect(result.status).toBe('success');
    expect(result.isValid).toBe(true);
    expect(result.certificate.isExpired).toBe(false);
    expect(result.score).toBeGreaterThan(80);
  });

  it('should return success with expired status for an expired certificate', async () => {
    const mockCert = {
      subject: { CN: 'example.com' },
      issuer: { O: 'Test Issuer' },
      valid_from: new Date('2020-01-01').toISOString(),
      valid_to: new Date('2021-01-01').toISOString(),
      subjectaltname: 'DNS:example.com',
      bits: 2048,
      pubkey: { type: 'RSA' },
    };

    const mockRes = {
      socket: {
        getPeerCertificate: () => mockCert,
      },
    };

    const mockReq = {
      on: jest.fn(),
      setTimeout: jest.fn(),
      end: jest.fn(),
    };

    https.request.mockImplementation((options, callback) => {
      callback(mockRes);
      return mockReq;
    });

    const result = await analyzeSSL('https://example.com');

    expect(result.status).toBe('success');
    expect(result.isValid).toBe(false);
    expect(result.certificate.isExpired).toBe(true);
    expect(result.score).toBeLessThan(60);
  });

  it('should handle request errors', async () => {
    const errorMessage = 'Connection timed out';
    https.request.mockImplementation((options, callback) => {
      const req = {
        on: (event, cb) => {
          if (event === 'error') {
            cb(new Error(errorMessage));
          }
        },
        setTimeout: jest.fn(),
        end: jest.fn(),
      };
      return req;
    });

    await expect(analyzeSSL('https://example.com')).rejects.toThrow(
      errorMessage
    );
  });

  it('should return an error status for malformed URL', async () => {
    const result = await analyzeSSL('not-a-valid-url');
    expect(result.status).toBe('error');
    expect(result.message).toContain('Invalid URL');
    expect(result.isValid).toBe(false);
    expect(result.score).toBe(0);
  });

  it('should return error when no certificate is retrieved', async () => {
    const mockRes = {
      socket: {
        getPeerCertificate: () => ({}),
      },
    };

    const mockReq = {
      on: jest.fn(),
      setTimeout: jest.fn(),
      end: jest.fn(),
    };

    https.request.mockImplementation((options, callback) => {
      callback(mockRes);
      return mockReq;
    });

    const result = await analyzeSSL('https://example.com');
    expect(result.status).toBe('error');
    expect(result.message).toBe('Unable to retrieve certificate');
  });

  it('should calculate a lower score for weak key strength', async () => {
    const mockCert = {
      subject: { CN: 'example.com' },
      issuer: { O: 'Test Issuer' },
      valid_from: new Date(new Date().getTime() - 10000).toISOString(),
      valid_to: new Date(
        new Date().getTime() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      subjectaltname: 'DNS:example.com',
      bits: 1024, // Weak key
      pubkey: { type: 'RSA' },
    };

    const mockRes = {
      socket: {
        getPeerCertificate: () => mockCert,
      },
    };

    const mockReq = {
      on: jest.fn(),
      setTimeout: jest.fn(),
      end: jest.fn(),
    };

    https.request.mockImplementation((options, callback) => {
      callback(mockRes);
      return mockReq;
    });

    const result = await analyzeSSL('https://example.com');
    expect(result.keyInfo.strength).toContain('Weak');
    expect(result.score).toBeLessThan(85);
  });

  it('should identify hostname mismatch', async () => {
    const mockCert = {
      subject: { CN: 'another-site.com' },
      issuer: { O: 'Test Issuer' },
      valid_from: new Date(new Date().getTime() - 10000).toISOString(),
      valid_to: new Date(
        new Date().getTime() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      subjectaltname: 'DNS:another-site.com',
      bits: 2048,
      pubkey: { type: 'RSA' },
    };

    const mockRes = {
      socket: {
        getPeerCertificate: () => mockCert,
      },
    };

    const mockReq = {
      on: jest.fn(),
      setTimeout: jest.fn(),
      end: jest.fn(),
    };

    https.request.mockImplementation((options, callback) => {
      callback(mockRes);
      return mockReq;
    });

    const result = await analyzeSSL('https://example.com');
    expect(result.hostname.isValid).toBe(false);
    expect(result.score).toBeLessThan(80);
    expect(result.recommendations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Certificate hostname does not match'),
      ])
    );
  });
});
