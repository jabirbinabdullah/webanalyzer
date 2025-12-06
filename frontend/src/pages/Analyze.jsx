import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { analyzeUrl, getAnalysis, getAnalysisStatus, exportPdf, addPortfolioItem } from '../services/api';
import AuthContext from '../context/AuthContext';
import { useEffect } from 'react';

export default function Analyze() {
  const [url, setUrl] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [analysisId, setAnalysisId] = useState(null);
  const [status, setStatus] = useState(null);
  const { user } = useContext(AuthContext) || {};

  useEffect(() => {
    let interval;
    if (analysisId && (status === 'pending' || status === 'in-progress')) {
      interval = setInterval(async () => {
        try {
          const { status: newStatus } = await getAnalysisStatus(analysisId);
          setStatus(newStatus);
          if (newStatus === 'completed') {
            const finalResult = await getAnalysis(analysisId);
            setResult(finalResult);
            setLoading(false);
            setAnalysisId(null);
          } else if (newStatus === 'failed') {
            setError('Analysis failed.');
            setLoading(false);
            setAnalysisId(null);
          }
        } catch (err) {
          setError(err.message || 'Failed to get analysis status');
          setLoading(false);
          setAnalysisId(null);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [analysisId, status]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    setShowScreenshot(false);
    setStatus('pending');
    try {
      const initialResult = await analyzeUrl(url);
      setAnalysisId(initialResult._id);
    } catch (err) {
      setError(err.message || 'Request failed');
      setLoading(false);
    }
  }

  function downloadJson() {
    try {
      const filenameHost = (() => { try { return new URL(result.url).hostname.replace(/[:\\/\\\\]/g, '-'); } catch { return 'analysis'; } })();
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
  }

  function exportCsv() {
    try {
      const escapeCsv = (v) => {
        if (v == null) return '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      };
      const headers = ['url','title','description','h1','metaDescriptionLength','wordCount','robotsTxtStatus','canonical','technologies','taskDuration_ms','fcp_ms','load_ms','accessibility_violations','sitemap_urlcount'];
      const row = [
        result.url,
        result.title,
        result.description,
        result.h1,
        result.seo?.descriptionLength ?? '',
        result.seo?.wordCount ?? '',
        result.seo?.robotsTxtStatus ?? '',
        result.seo?.canonical?.resolved ?? '',
        (result.technologies || []).map(t=>t.name).join('; '),
        result.metrics?.taskDuration ?? '',
        result.metrics?.fcp ?? '',
        result.metrics?.load ?? '',
        (result.accessibility?.violations || []).length,
        result.seo?.sitemap?.urlCount ?? ''
      ];
      const csv = headers.join(',') + '\n' + row.map(escapeCsv).join(',');
      const blob = new Blob([csv], { type: 'text/csv' });
      const filenameHost = (() => { try { return new URL(result.url).hostname.replace(/[:\\/\\\\]/g, '-'); } catch { return 'analysis'; } })();
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
      setExportMenuOpen(false);
    }
  }

  async function handleExportPdf() {
    if (!result?._id) return;
    setExportingPdf(true);
    try {
      await exportPdf(result._id);
      alert('PDF export requested');
    } catch (e) {
      console.error('PDF export failed', e);
      alert('PDF export failed');
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="analyze">
      <form onSubmit={onSubmit} className="form">
        <input aria-label="url-input" value={url} onChange={(e) => setUrl(e.target.value)} className="input" />
        <button type="submit" disabled={loading} className="btn">{loading ? `Scanning... (${status})` : 'Analyze'}</button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2>Results for {result.url}</h2>
            <div>
              {user && (
                <button
                  onClick={async () => {
                    const name = prompt('Enter a name for this portfolio item:');
                    if (name) {
                      try {
                        await addPortfolioItem(result.url, name);
                        alert('Added to portfolio!');
                      } catch (err) {
                        alert('Failed to add to portfolio. ' + (err.response?.data?.error || err.message));
                      }
                    }
                  }}
                  className="btn"
                  style={{ marginRight: 8 }}
                >
                  Add to Portfolio
                </button>
              )}
              <Link to={`/history?url=${encodeURIComponent(result.url)}`} className="btn" style={{ marginRight: 8 }}>View History</Link>
              <button className="btn" onClick={downloadJson} style={{ marginRight: 8 }}>Download JSON</button>
              <button className="btn" onClick={() => setExportMenuOpen(!exportMenuOpen)}>Export ▾</button>
              {exportMenuOpen && (
                <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ddd', padding: 8 }}>
                  <button className="btn" onClick={exportCsv}>Export CSV</button>
                  <button className="btn" onClick={handleExportPdf} disabled={exportingPdf} style={{ marginLeft: 8 }}>Export PDF</button>
                </div>
              )}
            </div>
          </div>

          <p><strong>Title:</strong> {result.title || '-'}</p>
          <p><strong>Description:</strong> {result.description || '-'}</p>

          <h3>Technologies</h3>
          <ul>
            {(result.technologies && result.technologies.length > 0) ? result.technologies.map((t,i) => (
              <li key={i}>{t.name} {t.confidence ? `— ${Math.round(t.confidence*100)}%` : ''}</li>
            )) : <li>No technologies detected</li>}
          </ul>

          {result.seo && (
            <div className="seo-container">
              <h3>SEO Checks</h3>
              <ul>
                <li><strong>Meta Description Length:</strong> {result.seo.descriptionLength ?? '-'}</li>
                <li><strong>Has H1 Tag:</strong> {result.seo.hasH1 ? 'Yes' : 'No'}</li>
                <li><strong>Word Count:</strong> {result.seo.wordCount ?? '-'}</li>
              </ul>

              <div>
                <h4>Structured Data (JSON-LD)</h4>
                <p>Scripts: {result.seo.jsonLd?.count ?? 0}</p>
                {result.seo.jsonLd?.parsed && result.seo.jsonLd.parsed.length > 0 && (
                  <div>
                    <p><strong>Sample parsed JSON-LD (first):</strong></p>
                    <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f7f7f7', padding: 8 }}>{JSON.stringify(result.seo.jsonLd.parsed[0], null, 2)}</pre>
                  </div>
                )}

                {result.seo.jsonLd?.errors && result.seo.jsonLd.errors.length > 0 && (
                  <div>
                    <p style={{ color: 'crimson' }}><strong>JSON-LD Parse Errors:</strong></p>
                    <ul>
                      {result.seo.jsonLd.errors.map((err, i) => (
                        <li key={i}>{err.message} {err.raw ? <code> {err.raw}</code> : null}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.seo.jsonLd?.schemaValidation && result.seo.jsonLd.schemaValidation.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p><strong>JSON-LD Schema Validation</strong></p>
                    <ul>
                      {result.seo.jsonLd.schemaValidation.map((entry, i) => (
                        <li key={i} style={{ marginBottom: 8 }}>
                          <div><strong>Block #{entry.index}</strong></div>
                          {entry.matches && entry.matches.length > 0 && (
                            <div>Types: {entry.matches.join(', ')}</div>
                          )}
                          {entry.errors && entry.errors.length > 0 && (
                            <div style={{ color: 'crimson' }}>
                              <div><strong>Validation Errors:</strong></div>
                              <ul>
                                {entry.errors.map((e, j) => (
                                  <li key={j} style={{ marginBottom: 6 }}>
                                    {e.type ? <div>{`Type: ${e.type}`}</div> : null}
                                    {e.errors && e.errors.length > 0 ? (
                                      <ul>
                                        {e.errors.map((ae, k) => (
                                          <li key={k}><code>{ae.instancePath ? `path: ${ae.instancePath} — ` : ''}{ae.message}{ae.keyword ? ` — keyword: ${ae.keyword}` : ''}</code></li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <div><code>No AJV details</code></div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </li>
                      ))}
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
                          <li key={j}><code>{node.html}</code></li>
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
