import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { analyzeUrl, getAnalysis, getAnalysisStatus, exportToPdf, addToPortfolio } from '../services/api';
import AuthContext from '../context/AuthContext';
import AnalysisDashboard from '../components/AnalysisDashboard';
import PerformanceAnalysis from '../components/PerformanceAnalysis';
import SecurityAnalysis from '../components/SecurityAnalysis';
import { triggerFileDownload, generateFilename } from '../utils/downloadUtils'; // Import new utilities
import '../styles/performance.css';
import '../styles/security.css';

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
  const [analysisTypes, setAnalysisTypes] = useState({
    tech: true,
    seo: true,
    performance: true,
    accessibility: true,
    security: true,
  });
  const { user } = useContext(AuthContext) || {};

  const handleAnalysisTypeChange = (event) => {
    const { name, checked } = event.target;
    setAnalysisTypes(prev => ({ ...prev, [name]: checked }));
  };

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
      const selectedTypes = Object.keys(analysisTypes).filter(key => analysisTypes[key]);
      const initialResult = await analyzeUrl(url, selectedTypes);
      setAnalysisId(initialResult._id);
    } catch (err) {
      setError(err.message || 'Request failed');
      setLoading(false);
    }
  }

  function downloadJson() {
    try {
      const filename = generateFilename(result.url, 'analysis', 'json');
      triggerFileDownload(JSON.stringify(result, null, 2), filename, 'application/json');
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
      const headers = ['url','title','description','h1','metaDescriptionLength','wordCount','robotsTxtStatus','canonical','technologies','tbt_ms','fcp_ms','tti_ms','accessibility_violations','sitemap_urlcount']; // Updated headers
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
        result.performance?.metrics?.numeric?.tbt ?? '', // Corrected data access
        result.performance?.metrics?.numeric?.fcp ?? '', // Corrected data access
        result.performance?.metrics?.numeric?.tti ?? '', // Corrected data access
        (result.accessibility?.violations || []).length,
        result.seo?.sitemap?.urlCount ?? ''
      ];
      const csv = headers.join(',') + '\n' + row.map(escapeCsv).join(',');
      const filename = generateFilename(result.url, 'analysis', 'csv');
      triggerFileDownload(csv, filename, 'text/csv');
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

  const analysisOptions = [
    { key: 'tech', label: 'Tech Stack' },
    { key: 'seo', label: 'SEO' },
    { key: 'performance', label: 'Performance' },
    { key: 'accessibility', label: 'Accessibility' },
    { key: 'security', label: 'Security' },
  ];

  return (
    <div className="analyze">
      <div style={{ marginBottom: '24px' }}>
        <h1>Website Analyzer</h1>
        <p style={{ color: '#666', marginBottom: '16px' }}>Analyze any website to detect technologies, SEO metrics, accessibility issues, and performance scores</p>
      </div>
      
      <form onSubmit={onSubmit} className="form">
        <input 
          aria-label="url-input" 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
          className="input"
          placeholder="https://example.com"
        />

        <div style={{ margin: '16px 0', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
          {analysisOptions.map(option => (
            <label key={option.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name={option.key}
                checked={analysisTypes[option.key]}
                onChange={handleAnalysisTypeChange}
                style={{ marginRight: '8px' }}
              />
              {option.label}
            </label>
          ))}
        </div>

        <button type="submit" disabled={loading} className="btn">{loading ? `Scanning... (${status})` : 'Analyze'}</button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0' }}>Results for {result.url}</h2>
              <p style={{ margin: '0', color: '#999', fontSize: '14px' }}>Analyzed on {new Date().toLocaleDateString()}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {user && (
                <button
                  onClick={async () => {
                    const name = prompt('Enter a name for this portfolio item:');
                    if (name) {
                      try {
                        await addPortfolioItem(result.url, name);
                        alert('Added to portfolio!');
                      } catch (err) {
                        alert('Failed to add to portfolio. ' + err.message);
                      }
                    }
                  }}
                  className="btn"
                  style={{ marginRight: 0 }}
                >
                  Add to Portfolio
                </button>
              )}
              <Link to={`/history?url=${encodeURIComponent(result.url)}`} className="btn" style={{ marginRight: 0 }}>View History</Link>
              <button className="btn" onClick={downloadJson} style={{ marginRight: 0 }}>Download JSON</button>
              <button className="btn" onClick={() => setExportMenuOpen(!exportMenuOpen)}>Export ▾</button>
              {exportMenuOpen && (
                <div style={{ position: 'absolute', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 10 }}>
                  <button className="btn" onClick={exportCsv} style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}>Export CSV</button>
                  <button className="btn" onClick={handleExportPdf} disabled={exportingPdf} style={{ width: '100%' }}>Export PDF</button>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <AnalysisDashboard analysis={result} />
          </div>

          <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '16px' }}>
            <p style={{ margin: '0 0 8px 0' }}><strong>Title:</strong> {result.title || '-'}</p>
            <p style={{ margin: '0' }}><strong>Description:</strong> {result.description || '-'}</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginTop: '0' }}>Technologies Detected</h3>
            <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', listStyle: 'none', padding: 0 }}>
              {(result.technologies && result.technologies.length > 0) ? result.technologies.map((t,i) => (
                <li key={i} style={{ padding: '8px 12px', background: '#f0f9ff', borderRadius: '4px', border: '1px solid #bfdbfe', color: '#0369a1' }}>
                  <strong>{t.name}</strong> {t.confidence ? `${Math.round(t.confidence*100)}%` : ''}
                </li>
              )) : <li>No technologies detected</li>}
            </ul>
          </div>

          {result.seo && (
            <div className="seo-container" style={{ marginBottom: '24px' }}>
              <h3 style={{ marginTop: '0' }}>SEO Checks</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}><strong>Meta Description Length:</strong> {result.seo.descriptionLength ?? '-'}</li>
                <li style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}><strong>Has H1 Tag:</strong> <span style={{ color: result.seo.hasH1 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{result.seo.hasH1 ? '✓ Yes' : '✗ No'}</span></li>
                <li style={{ padding: '8px 0' }}><strong>Word Count:</strong> {result.seo.wordCount ?? '-'}</li>
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

          {result.screenshot && (
            <div className="screenshot-container" style={{ marginTop: '24px', marginBottom: '24px' }}>
              <button onClick={() => setShowScreenshot(!showScreenshot)} className="btn">
                {showScreenshot ? 'Hide Screenshot' : 'Show Screenshot'}
              </button>
              {showScreenshot && (
                <img
                  src={`data:image/jpeg;base64,${result.screenshot}`}
                  alt={`Screenshot of ${result.url}`}
                  style={{ marginTop: '16px', maxWidth: '100%', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                />
              )}
            </div>
          )}

          {result.accessibility && result.accessibility.violations && (
            <div className="accessibility-container" style={{ marginTop: '24px' }}>
              <h3 style={{ marginTop: '0' }}>Accessibility Violations ({result.accessibility.violations.length})</h3>
              {result.accessibility.violations.length > 0 ? (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {result.accessibility.violations.map((violation, i) => (
                    <div key={i} style={{ padding: '12px', background: violation.impact === 'critical' ? '#fee2e2' : violation.impact === 'serious' ? '#fef3c7' : '#f0fdf4', borderRadius: '6px', border: `1px solid ${violation.impact === 'critical' ? '#fecaca' : violation.impact === 'serious' ? '#fde68a' : '#bbf7d0'}` }}>
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ color: violation.impact === 'critical' ? '#7f1d1d' : violation.impact === 'serious' ? '#92400e' : '#065f46' }}>{violation.id}</strong>
                        <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>({violation.impact})</span>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{violation.description}</p>
                      {violation.nodes && violation.nodes.length > 0 && (
                        <div style={{ fontSize: '12px', background: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '4px', overflow: 'auto', maxHeight: '100px' }}>
                          {violation.nodes.slice(0, 2).map((node, j) => (
                            <div key={j} style={{ marginBottom: j < 1 ? '4px' : '0', fontFamily: 'monospace', color: '#666' }}>
                              {node.html?.substring(0, 100)}...
                            </div>
                          ))}
                          {violation.nodes.length > 2 && <div style={{ marginTop: '4px', color: '#999', fontSize: '11px' }}>+{violation.nodes.length - 2} more</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', color: '#065f46' }}>
                  ✓ No accessibility violations found.
                </div>
              )}
            </div>
          )}

          {/* Performance Analysis Component */}
          {result.performance && (
            <PerformanceAnalysis result={result.performance} />
          )}

          {/* Security Analysis Component */}
          {result.security && (
            <SecurityAnalysis result={result.security} />
          )}
        </div>
      )}
    </div>
  );
}
