import { detectTechnologies } from './techScanner.js';
import { load } from 'cheerio';

describe('detectTechnologies', () => {
  it('should return an empty array if no technologies are detected', () => {
    const html = '<html><head></head><body></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toEqual([]);
  });

  it('should detect React from script tags', () => {
    const html = '<html><head></head><body><script src="react.min.js"></script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual(
      expect.objectContaining({
        name: 'React',
        confidence: expect.any(Number),
        evidence: expect.stringContaining('Script/CSS pattern'),
      })
    );
  });

  it('should detect React from devtools hook', () => {
    const html = '<html><body><script>var __REACT_DEVTOOLS_GLOBAL_HOOK__ = {};</script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual(
      expect.objectContaining({
        name: 'React',
        confidence: expect.any(Number),
        evidence: expect.stringContaining('Global variable'),
      })
    );
  });

  it('should detect Angular from script tags', () => {
    const html = '<html><body><script src="angular.js"></script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual(
      expect.objectContaining({
        name: 'Angular',
        confidence: expect.any(Number),
      })
    );
  });

  it('should detect Angular from ng- attributes', () => {
    const html = '<html><body><div ng-app></div></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual(
      expect.objectContaining({
        name: 'Angular',
        confidence: expect.any(Number),
        evidence: expect.stringContaining('HTML indicator'),
      })
    );
  });

  it('should detect Vue.js from script tags', () => {
    const html = '<html><body><script src="vue.min.js"></script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual(
      expect.objectContaining({
        name: 'Vue.js',
        confidence: expect.any(Number),
        evidence: expect.stringContaining('Script/CSS pattern'),
      })
    );
  });

  it('should detect Vue.js from devtools hook', () => {
    const html = '<html><body><script>var __VUE_DEVTOOLS_GLOBAL_HOOK__ = {};</script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual(
      expect.objectContaining({
        name: 'Vue.js',
        confidence: expect.any(Number),
        evidence: expect.stringContaining('Global variable'),
      })
    );
  });

  it('should detect jQuery from script tags', () => {
    const html = '<html><head></head><body><script src="jquery.js"></script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual(
      expect.objectContaining({
        name: 'jQuery',
        confidence: expect.any(Number),
      })
    );
  });

  it('should detect jQuery from inline usage', () => {
    const html = '<html><body><script>jQuery(document).ready()</script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual(
      expect.objectContaining({
        name: 'jQuery',
        confidence: expect.any(Number),
        evidence: expect.stringContaining('HTML indicator'),
      })
    );
  });

  it('should detect WordPress from wp-content path', () => {
    const html = '<html><head></head><body><link rel="stylesheet" href="/wp-content/themes/my-theme/style.css"></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual(
      expect.objectContaining({
        name: 'WordPress',
        confidence: expect.any(Number),
      })
    );
  });

  it('should detect Drupal from patterns in HTML', () => {
    const html = '<html><body><script>Drupal.settings = {};</script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual(
      expect.objectContaining({
        name: 'Drupal',
        confidence: expect.any(Number),
      })
    );
  });

  it('should detect Google Analytics/Tag Manager', () => {
    const html = '<html><body><script src="https://www.googletagmanager.com/gtm.js"></script></body></html>';
    const technologies = detectTechnologies({ html });
    // GTM.js can match either Google Analytics or Google Tag Manager due to pattern overlap
    expect(technologies.some(t => 
      (t.name === 'Google Analytics' || t.name === 'Google Tag Manager') && t.confidence > 0
    )).toBe(true);
  });

  it('should detect server from headers', () => {
    const headers = { server: 'nginx/1.18.0' };
    const technologies = detectTechnologies({ html: '', headers });
    expect(technologies).toContainEqual({
      name: 'Server: nginx/1.18.0',
      confidence: 0.7,
      evidence: 'HTTP header: Server: nginx/1.18.0',
    });
  });

  it('should detect X-Powered-By header', () => {
    const headers = { 'x-powered-by': 'Express' };
    const technologies = detectTechnologies({ html: '', headers });
    expect(technologies).toContainEqual({
      name: 'X-Powered-By: Express',
      confidence: 0.6,
      evidence: 'HTTP X-Powered-By header',
    });
  });

  it('should detect many images if img count > 50', () => {
    const imgTags = Array(51).fill('<img src="test.jpg" />').join('');
    const html = `<html><body>${imgTags}</body></html>`;
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual(
      expect.objectContaining({
        name: 'Heavy image usage',
        confidence: 0.4,
        evidence: expect.stringContaining('51'),
      })
    );
  });

  it('should detect Chart.js if detectedGlobals.hasChartJs is true', () => {
    const detectedGlobals = { hasChartJs: true };
    const technologies = detectTechnologies({ html: '', detectedGlobals });
    expect(technologies).toContainEqual(
      expect.objectContaining({
        name: 'Chart.js',
        confidence: expect.any(Number),
      })
    );
  });

  it('should detect multiple technologies', () => {
    const html = '<html><head><script src="jquery.js"></script></head><body><div id="root"></div><script src="react.js"></script></body></html>';
    const headers = { 'x-powered-by': 'Express' };
    const technologies = detectTechnologies({ html, headers });
    expect(technologies.length).toBeGreaterThanOrEqual(2);
    expect(technologies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'jQuery' }),
        expect.objectContaining({ name: 'X-Powered-By: Express' }),
      ])
    );
  });

  it('should handle empty HTML input', () => {
    const technologies = detectTechnologies({ html: '' });
    expect(technologies).toEqual([]);
  });

    it('should handle null HTML input', () => {
    const technologies = detectTechnologies({ html: null });
    expect(technologies).toEqual([]);
  });


});