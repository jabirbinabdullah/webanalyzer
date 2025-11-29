/**
 * Integration test for /api/analyze endpoint.
 * This test mocks Puppeteer, AxePuppeteer, axios and the Analysis model
 * so it can exercise the Express route without launching a real browser or DB.
 */
import request from 'supertest';

// Mock axios for robots.txt and sitemap fetches
import axios from 'axios';
jest.mock('axios');

// Mock the Analysis model to avoid DB operations
jest.mock('../../src/models/Analysis.js', () => {
  return class Analysis {
    constructor(data) { Object.assign(this, data); }
    save() { return Promise.resolve(this); }
    static find() { return Promise.resolve([]); }
  };
});

// Mock AxePuppeteer named export
jest.mock('axe-puppeteer', () => ({
  AxePuppeteer: class AxePuppeteer {
    constructor(page) { this.page = page; }
    analyze() { return Promise.resolve({ violations: [] }); }
  }
}));

// Mock puppeteer to provide a lightweight page we control
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockImplementation(() => {
    const page = {
      goto: jest.fn().mockResolvedValue({ headers: () => ({}) }),
      content: jest.fn().mockResolvedValue(
        `<!doctype html><html><head>
          <title>Test Page</title>
          <link rel="canonical" href="/canonical" />
          <script type="application/ld+json">{"@context":"https://schema.org"}</script>
          <link rel="alternate" hreflang="en" href="/en" />
        </head><body><h1>Heading</h1><p>hello world</p></body></html>`
      ),
      title: jest.fn().mockResolvedValue('Test Page'),
      $eval: jest.fn().mockImplementation((selector) => {
        if (selector === 'meta[name="description"]') return Promise.resolve('A description');
        if (selector === 'h1') return Promise.resolve('Heading');
        return Promise.reject(new Error('not found'));
      }),
      metrics: jest.fn().mockResolvedValue({ TaskDuration: 0.12 }),
      evaluate: jest.fn().mockResolvedValue(JSON.stringify({ navigationStart: 0, domContentLoadedEventEnd: 50, loadEventEnd: 100 })),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('fake').toString('base64')),
      close: jest.fn().mockResolvedValue(),
    };
    return Promise.resolve({ newPage: async () => page, close: async () => {} });
  })
}));

// Ensure server exports the app without listening when NODE_ENV === 'test'
import app from '../../server.js';

describe('GET /api/analyze', () => {
  beforeEach(() => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/robots.txt')) return Promise.resolve({ data: 'Sitemap: /sitemap.xml' });
      if (url.endsWith('/sitemap.xml')) return Promise.resolve({ data: '<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc></url></urlset>' });
      return Promise.resolve({ data: '' });
    });
  });

  test('returns analysis JSON for valid URL', async () => {
    const res = await request(app).get('/api/analyze').query({ url: 'http://example.test' }).timeout(10000);
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('http://example.test');
    expect(res.body.title).toBe('Test Page');
    expect(res.body.seo).toBeDefined();
    expect(res.body.seo.canonical).toBeDefined();
    expect(res.body.technologies).toBeDefined();
  });

  test('returns 400 when url parameter is missing', async () => {
    const res = await request(app).get('/api/analyze').timeout(5000);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 for invalid URL', async () => {
    const res = await request(app).get('/api/analyze').query({ url: 'notaurl' }).timeout(5000);
    expect(res.status).toBe(400);
  });

  test('handles missing robots.txt gracefully', async () => {
    // Make axios.get throw for robots.txt only
    axios.get.mockImplementationOnce((url) => {
      if (url.endsWith('/robots.txt')) return Promise.reject(new Error('not found'));
      if (url.endsWith('/sitemap.xml')) return Promise.resolve({ data: '<?xml version="1.0"?><urlset></urlset>' });
      return Promise.resolve({ data: '' });
    });
    const res = await request(app).get('/api/analyze').query({ url: 'http://example.test' }).timeout(10000);
    expect(res.status).toBe(200);
    expect(res.body.seo.robotsTxtStatus).toBe('not_found');
  });

  test('returns 500 when analysis runtime fails (puppeteer.launch throws)', async () => {
    // Temporarily make puppeteer.launch reject
    const puppeteer = require('puppeteer');
    puppeteer.launch.mockImplementationOnce(() => Promise.reject(new Error('launch failed')));
    const res = await request(app).get('/api/analyze').query({ url: 'http://example.test' }).timeout(10000);
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});


describe('SSRF rejection behavior', () => {
  let originalEnv;
  beforeAll(() => {
    originalEnv = process.env.NODE_ENV;
  });
  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('rejects hosts that resolve to private IPs', async () => {
    // Re-import server with mocked DNS and DB to simulate non-test env
    jest.resetModules();
    process.env.NODE_ENV = 'production';

    // Mock DB connect to noop so server import doesn't try to connect
    jest.doMock('../../src/config/db.js', () => jest.fn());

    // Mock dns lookup to return a private IP
    jest.doMock('dns', () => ({ promises: { lookup: jest.fn().mockResolvedValue([{ address: '192.168.0.5' }]) } }));

    // Reuse existing module mocks for puppeteer/axios/Analysis/AxePuppeteer
    const appProd = require('../../server.js').default;
    const res = await request(appProd).get('/api/analyze').query({ url: 'http://private.test' }).timeout(10000);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/private|disallowed/i);
  });
});
