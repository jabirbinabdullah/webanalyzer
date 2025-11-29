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
    expect(technologies).toContainEqual({
      name: 'React',
      confidence: 0.8,
      evidence: 'script src or devtools hook',
    });
  });

  it('should detect React from devtools hook', () => {
    const html = '<html><body><script>var __REACT_DEVTOOLS_GLOBAL_HOOK__ = {};</script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual({
      name: 'React',
      confidence: 0.8,
      evidence: 'script src or devtools hook',
    });
  });

  it('should detect Angular from script tags', () => {
    const html = '<html><body><script src="angular.js"></script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual({
      name: 'Angular',
      confidence: 0.8,
      evidence: 'script src or ng- attributes',
    });
  });

  it('should detect Angular from ng- attributes', () => {
    const html = '<html><body><div ng-app></div></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual({
      name: 'Angular',
      confidence: 0.8,
      evidence: 'script src or ng- attributes',
    });
  });

  it('should detect Vue.js from script tags', () => {
    const html = '<html><body><script src="vue.min.js"></script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual({
      name: 'Vue.js',
      confidence: 0.8,
      evidence: 'script src or devtools hook',
    });
  });

  it('should detect Vue.js from devtools hook', () => {
    const html = '<html><body><script>var __VUE_DEVTOOLS_GLOBAL_HOOK__ = {};</script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual({
      name: 'Vue.js',
      confidence: 0.8,
      evidence: 'script src or devtools hook',
    });
  });

  it('should detect jQuery from script tags', () => {
    const html = '<html><head></head><body><script src="jquery.js"></script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual({
      name: 'jQuery',
      confidence: 0.7,
      evidence: 'script src or jQuery usage',
    });
  });

  it('should detect jQuery from inline usage', () => {
    const html = '<html><body><script>jQuery(document).ready()</script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual({
      name: 'jQuery',
      confidence: 0.7,
      evidence: 'script src or jQuery usage',
    });
  });

  it('should detect WordPress from wp-content path', () => {
    const html = '<html><head></head><body><link rel="stylesheet" href="/wp-content/themes/my-theme/style.css"></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual({
      name: 'WordPress',
      confidence: 0.9,
      evidence: 'wp-content or wp-includes in HTML',
    });
  });

  it('should detect Drupal from patterns in HTML', () => {
    const html = '<html><body><script>Drupal.settings = {};</script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual({
      name: 'Drupal',
      confidence: 0.8,
      evidence: 'Drupal patterns in HTML',
    });
  });

  it('should detect Google Analytics/Tag Manager', () => {
    const html = '<html><body><script src="https://www.googletagmanager.com/gtm.js"></script></body></html>';
    const technologies = detectTechnologies({ html });
    expect(technologies).toContainEqual({
      name: 'Google Analytics/Tag Manager',
      confidence: 0.8,
      evidence: 'GA/GTM patterns',
    });
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
    expect(technologies).toContainEqual({
      name: 'Many images',
      confidence: 0.4,
      evidence: '51 <img> tags',
    });
  });

  it('should detect Chart.js if detectedGlobals.hasChartJs is true', () => {
    const detectedGlobals = { hasChartJs: true };
    const technologies = detectTechnologies({ html: '', detectedGlobals });
    expect(technologies).toContainEqual({
      name: 'Chart.js',
      confidence: 0.9,
      evidence: 'window.Chart global variable',
    });
  });

  it('should detect multiple technologies', () => {
    const html = '<html><head><script src="jquery.js"></script></head><body><div id="root"></div><script src="react.js"></script></body></html>';
    const headers = { 'x-powered-by': 'Express' };
    const technologies = detectTechnologies({ html, headers });
    expect(technologies).toHaveLength(3);
    expect(technologies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'React' }),
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