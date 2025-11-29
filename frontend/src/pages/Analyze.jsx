import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeUrl } from '../services/api';

export default function Analyze() {
  // ... (state declarations remain the same)
  const [url, setUrl] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showScreenshot, setShowScreenshot] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    setShowScreenshot(false);
    try {
      const res = await analyzeUrl(url);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="analyze">
      <form onSubmit={onSubmit} className="form">
        <input value={url} onChange={(e) => setUrl(e.target.value)} className="input" />
        <button disabled={loading} className="btn">{loading ? 'Scanning...' : 'Analyze'}</button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Results for {result.url}</h2>
            <div>
              <Link to={`/history?url=${encodeURIComponent(result.url)}`} className="btn" style={{ marginRight: '10px' }}>
                View History
              </Link>
              <div style={{ display: 'inline-flex', gap: 8 }}>
                <button onClick={() => window.print()} className="btn" style={{ marginRight: '8px' }}>Print Report</button>
                <button
                  onClick={() => {
                    try {
                      const filenameHost = (() => {
                        try { return new URL(result.url).hostname.replace(/[:\/\\]/g, '-'); } catch { return 'analysis'; }
                      })();
                      const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
                      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `analysis-${filenameHost}-${ts}.json`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      URL.revokeObjectURL(link.href);
                    } catch (e) {
                      console.error('Download failed', e);
                      alert('Failed to download JSON');
                    }
                  }}
                  className="btn btn-secondary"
                >
                  Download JSON
                </button>

                {/* Export menu: CSV and PDF */}
                <div style={{ position: 'relative' }}>
                  <button className="btn" id="export-menu-btn">Export ▾</button>
                  <div id="export-menu" style={{ position: 'absolute', right: 0, marginTop: 6, background: '#fff', border: '1px solid #ddd', padding: 8, display: 'none', zIndex: 50 }}>
                    <button
                      className="btn"
                      onClick={() => {
                        // CSV export
                        try {
                          const escapeCsv = (v) => {
                            if (v == null) return '';
                            const s = String(v).replace(/"/g, '""');
                            return `"${s}"`;
                          };
                          const techs = (result.technologies || []).map(t => t.name).join('; ');
                          const headers = [
                            'url','title','description','h1','metaDescriptionLength','wordCount','robotsTxtStatus','canonical','technologies','taskDuration_ms','fcp_ms','load_ms','accessibility_violations','sitemap_urlcount'
                          ];
                          const row = [
                            result.url,
                            result.title,
                            result.description,
                            result.h1,
                            result.seo?.descriptionLength ?? '',
                            result.seo?.wordCount ?? '',
                            result.seo?.robotsTxtStatus ?? '',
                            result.seo?.canonical?.resolved ?? '',
                            techs,
                            result.metrics?.taskDuration ?? '',
                            result.metrics?.fcp ?? '',
                            result.metrics?.load ?? '',
                            (result.accessibility?.violations || []).length,
                            result.seo?.sitemap?.urlCount ?? ''
                          ];
                          const csv = headers.join(',') + '\n' + row.map(escapeCsv).join(',');
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const filenameHost = (() => { try { return new URL(result.url).hostname.replace(/[:\/\\]/g, '-'); } catch { return 'analysis'; } })();
                          const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(blob);
                          link.download = `analysis-${filenameHost}-${ts}.csv`;
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          URL.revokeObjectURL(link.href);
                        } catch (e) {
                          console.error('CSV export failed', e);
                          alert('CSV export failed');
                        } finally {
                          // hide menu
                          document.getElementById('export-menu').style.display = 'none';
                        }
                      }}
                      style={{ display: 'block', width: '100%', marginBottom: 6 }}
                    >
                      Export CSV
                    </button>

                    <button
                      className="btn"
                      onClick={() => {
                        try {
                          // Create a printable window with a summary and trigger print (user can save as PDF)
                          const printWindow = window.open('', '_blank');
                          const html = `
                            <html>
                              <head>
                                <title>Analysis Report</title>
                                <style> body { font-family: Arial, sans-serif; padding: 20px; } img { max-width: 100%; border: 1px solid #ccc; } pre { background:#f7f7f7; padding:10px; }</style>
                              </head>
                              <body>
                                <h1>Analysis for ${result.url}</h1>
                                <h2>Summary</h2>
                                <ul>
                                  <li><strong>Title:</strong> ${result.title || ''}</li>
                                  <li><strong>Description:</strong> ${result.description || ''}</li>
                                  <li><strong>H1:</strong> ${result.h1 || ''}</li>
                                  <li><strong>Word Count:</strong> ${result.seo?.wordCount ?? ''}</li>
                                  <li><strong>robots.txt:</strong> ${result.seo?.robotsTxtStatus ?? ''}</li>
                                  <li><strong>Canonical:</strong> ${result.seo?.canonical?.resolved ?? ''}</li>
                                </ul>
                                <h2>Technologies</h2>
                                <p>${(result.technologies || []).map(t => t.name).join(', ')}</p>
                                <h2>Metrics</h2>
                                <ul>
                                  <li>Task Duration: ${result.metrics?.taskDuration ?? ''} ms</li>
                                  <li>FCP: ${result.metrics?.fcp ?? ''} ms</li>
                                  <li>Load: ${result.metrics?.load ?? ''} ms</li>
                                </ul>
                                ${result.screenshot ? `<h2>Screenshot</h2><img src="data:image/jpeg;base64,${result.screenshot}" alt="screenshot" />` : ''}
                                <h2>SEO Details</h2>
                                <pre>${JSON.stringify(result.seo, null, 2)}</pre>
                                <h2>Accessibility Violations</h2>
                                <pre>${JSON.stringify(result.accessibility?.violations || [], null, 2)}</pre>
                              </body>
                            </html>`;
                          printWindow.document.open();
                          printWindow.document.write(html);
                          printWindow.document.close();
                          // give the window a moment to render
                          setTimeout(() => { printWindow.print(); }, 500);
                        } catch (e) {
                          console.error('PDF export failed', e);
                          alert('PDF export failed');
                        } finally {
                          document.getElementById('export-menu').style.display = 'none';
                        }
                      }}
                      style={{ display: 'block', width: '100%' }}
                    >
                      Export PDF
                    </button>
                  </div>
                </div>
                <script dangerouslySetInnerHTML={{ __html: `
                  (function(){
                    const btn = document.getElementById('export-menu-btn');
                    const menu = document.getElementById('export-menu');
                    if (!btn || !menu) return;
                    btn.addEventListener('click', (e) => { e.preventDefault(); menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; });
                    document.addEventListener('click', (ev) => { if (!btn.contains(ev.target) && !menu.contains(ev.target)) menu.style.display = 'none'; });
                  })();
                ` }} />
              </div>
            </div>
          </div>
          <p><strong>Title:</strong> {result.title || '-'} </p>
          <p><strong>Description:</strong> {result.description || '-'} </p>
          <p><strong>H1:</strong> {result.h1 || '-'} </p>

          <h3>Technologies</h3>
          <ul>
            {result.technologies && result.technologies.length > 0 ? (
              result.technologies.map((t, i) => (
                <li key={i}>{t.name} — {Math.round((t.confidence || 0) * 100)}% — <em>{t.evidence}</em></li>
              ))
            ) : (
              <li>No technologies detected</li>
            )}
          </ul>

          {result.metrics && (
            <>
              <h3>Performance Metrics</h3>
              <ul>
                <li>Task Duration: {result.metrics.taskDuration} ms</li>
                <li>First Contentful Paint: {result.metrics.fcp} ms</li>
                <li>Page Load Time: {result.metrics.load} ms</li>
              </ul>
            </>
          )}

          {result.seo && (
            <div className="seo-container" style={{ marginTop: '20px' }}>
              <h3>SEO Checks</h3>
              <ul>
                <li><strong>Meta Description Length:</strong> {result.seo.descriptionLength ?? '-'} </li>
                <li><strong>Has H1 Tag:</strong> {result.seo.hasH1 ? 'Yes' : 'No'}</li>
                <li><strong>Word Count:</strong> {result.seo.wordCount ?? '-'}</li>
                <li><strong>robots.txt Status:</strong> {result.seo.robotsTxtStatus || 'unknown'}</li>
              </ul>

              <div style={{ marginTop: 10 }}>
                <h4>Canonical</h4>
                {result.seo.canonical ? (
                  <ul>
                    <li><strong>Raw:</strong> {result.seo.canonical.raw || '-'}</li>
                    <li><strong>Resolved:</strong> {result.seo.canonical.resolved || '-'}</li>
                    <li><strong>Same Host:</strong> {result.seo.canonical.sameHost == null ? '-' : result.seo.canonical.sameHost ? 'Yes' : 'No'}</li>
                  </ul>
                ) : (
                  <p>Canonical not found.</p>
                )}
              </div>

              <div style={{ marginTop: 10 }}>
                <h4>Structured Data (JSON-LD)</h4>
                <p>Scripts: {result.seo.jsonLd?.count ?? 0}</p>
                {result.seo.jsonLd && result.seo.jsonLd.parsed && result.seo.jsonLd.parsed.length > 0 && (
                  <div>
                    <p><strong>Sample parsed JSON-LD (first):</strong></p>
                    <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f7f7f7', padding: 8 }}>{JSON.stringify(result.seo.jsonLd.parsed[0], null, 2)}</pre>
                  </div>
                )}
                {result.seo.jsonLd && result.seo.jsonLd.errors && result.seo.jsonLd.errors.length > 0 && (
                  <div>
                    <p style={{ color: 'crimson' }}><strong>JSON-LD Parse Errors:</strong></p>
                    <ul>
                      {result.seo.jsonLd.errors.map((err, i) => (
                        <li key={i}>{err.message} {err.raw ? <code> {err.raw}</code> : null}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 10 }}>
                <h4>Hreflang</h4>
                <p>Total: {result.seo.hreflang?.total ?? 0}</p>
                {result.seo.hreflang?.duplicates && result.seo.hreflang.duplicates.length > 0 ? (
                  <p style={{ color: 'crimson' }}>Duplicates: {result.seo.hreflang.duplicates.join(', ')}</p>
                ) : (
                  <p>No duplicate hreflang values detected.</p>
                )}
              </div>

              <div style={{ marginTop: 10 }}>
                <h4>Sitemap</h4>
                <p><strong>URL:</strong> {result.seo.sitemap?.url || '-'}</p>
                <p><strong>Parsed:</strong> {result.seo.sitemap?.parsed ? 'Yes' : 'No'}</p>
                <p><strong>URL Count:</strong> {result.seo.sitemap?.urlCount ?? 0}</p>
                {result.seo.sitemap?.errors && result.seo.sitemap.errors.length > 0 && (
                  <div>
                    <p style={{ color: 'crimson' }}><strong>Sitemap errors:</strong></p>
                    <ul>
                      {result.seo.sitemap.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.lighthouse && (
            <div className="lighthouse-container" style={{ marginTop: '20px' }}>
              <h3>Lighthouse Scores</h3>
              {result.lighthouse.error ? (
                <p className="error">Lighthouse audit failed: {result.lighthouse.error}</p>
              ) : (
                <ul>
                  <li>Performance: {result.lighthouse.performance}</li>
                  <li>Accessibility: {result.lighthouse.accessibility}</li>
                  <li>Best Practices: {result.lighthouse.bestPractices}</li>
                  <li>SEO: {result.lighthouse.seo}</li>
                  <li>PWA: {result.lighthouse.pwa}</li>
                </ul>
              )}
            </div>
          )}

          {result.screenshot && (
            <div className="screenshot-container" style={{ marginTop: '20px' }}>
              <button onClick={() => setShowScreenshot(!showScreenshot)} className="btn btn-secondary">
                {showScreenshot ? 'Hide Screenshot' : 'Show Screenshot'}
              </button>
              {showScreenshot && (
                <img
                  src={`data:image/jpeg;base64,${result.screenshot}`}
                  alt={`Screenshot of ${result.url}`}
                  style={{ marginTop: '10px', maxWidth: '100%', border: '1px solid #ccc' }}
                />
              )}
            </div>
          )}

          {result.accessibility && result.accessibility.violations && (
            <div className="accessibility-container" style={{ marginTop: '20px' }}>
              <h3>Accessibility Violations ({result.accessibility.violations.length})</h3>
              {result.accessibility.violations.length > 0 ? (
                <ul>
                  {result.accessibility.violations.map((violation, i) => (
                    <li key={i}>
                      <strong>{violation.id}</strong> ({violation.impact}): {violation.description}
                      <ul>
                        {violation.nodes.map((node, j) => (
                          <li key={j}>
                            <code>{node.html}</code>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No accessibility violations found.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
