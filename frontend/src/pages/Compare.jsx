import React, { useState } from 'react';
import { analyzeUrl, getAnalysis, getAnalysisStatus } from '../services/api';
import '../styles/compare.css';

export default function Compare() {
  const [urls, setUrls] = useState(['https://example.com', 'https://example.org']);
  const [results, setResults] = useState([null, null]);
  const [loading, setLoading] = useState([false, false]);
  const [errors, setErrors] = useState([null, null]);
  const [analysisIds, setAnalysisIds] = useState([null, null]);
  const [statuses, setStatuses] = useState([null, null]);

  // Poll for analysis completion
  React.useEffect(() => {
    let intervals = [];
    
    analysisIds.forEach((id, idx) => {
      if (id && (statuses[idx] === 'pending' || statuses[idx] === 'in-progress')) {
        const interval = setInterval(async () => {
          try {
            const { status: newStatus } = await getAnalysisStatus(id);
            const newStatuses = [...statuses];
            newStatuses[idx] = newStatus;
            setStatuses(newStatuses);

            if (newStatus === 'completed') {
              const result = await getAnalysis(id);
              const newResults = [...results];
              newResults[idx] = result;
              setResults(newResults);

              const newLoading = [...loading];
              newLoading[idx] = false;
              setLoading(newLoading);

              const newIds = [...analysisIds];
              newIds[idx] = null;
              setAnalysisIds(newIds);
            } else if (newStatus === 'failed') {
              const newErrors = [...errors];
              newErrors[idx] = 'Analysis failed';
              setErrors(newErrors);

              const newLoading = [...loading];
              newLoading[idx] = false;
              setLoading(newLoading);

              const newIds = [...analysisIds];
              newIds[idx] = null;
              setAnalysisIds(newIds);
            }
          } catch (err) {
            const newErrors = [...errors];
            newErrors[idx] = err.message || 'Failed to get status';
            setErrors(newErrors);

            const newLoading = [...loading];
            newLoading[idx] = false;
            setLoading(newLoading);
          }
        }, 3000);

        intervals.push(interval);
      }
    });

    return () => intervals.forEach(i => clearInterval(i));
  }, [analysisIds, statuses]);

  async function analyzeIndex(idx) {
    if (!urls[idx].trim()) {
      const newErrors = [...errors];
      newErrors[idx] = 'Please enter a URL';
      setErrors(newErrors);
      return;
    }

    const newErrors = [...errors];
    newErrors[idx] = null;
    setErrors(newErrors);

    const newLoading = [...loading];
    newLoading[idx] = true;
    setLoading(newLoading);

    const newStatuses = [...statuses];
    newStatuses[idx] = 'pending';
    setStatuses(newStatuses);

    try {
      const result = await analyzeUrl(urls[idx]);
      const newIds = [...analysisIds];
      newIds[idx] = result._id;
      setAnalysisIds(newIds);
    } catch (err) {
      newErrors[idx] = err.message || 'Request failed';
      setErrors(newErrors);

      newLoading[idx] = false;
      setLoading(newLoading);
    }
  }

  function updateUrl(idx, value) {
    const newUrls = [...urls];
    newUrls[idx] = value;
    setUrls(newUrls);
  }

  return (
    <div className="compare-container">
      <h2>Compare Websites</h2>
      <p className="compare-subtitle">Analyze and compare up to 2 websites side-by-side</p>

      <div className="compare-grid">
        {[0, 1].map((idx) => (
          <div key={idx} className="compare-panel">
            <div className="compare-input-group">
              <input
                type="text"
                value={urls[idx]}
                onChange={(e) => updateUrl(idx, e.target.value)}
                placeholder="Enter URL to analyze"
                disabled={loading[idx]}
                className="compare-input"
              />
              <button
                onClick={() => analyzeIndex(idx)}
                disabled={loading[idx]}
                className="btn-primary"
              >
                {loading[idx] ? `${statuses[idx] === 'pending' ? 'Queued' : 'Analyzing'}...` : 'Analyze'}
              </button>
            </div>

            {errors[idx] && (
              <div className="error-message">{errors[idx]}</div>
            )}

            {loading[idx] && (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>{statuses[idx] === 'pending' ? 'Queued for analysis...' : 'Analyzing website...'}</p>
              </div>
            )}

            {results[idx] && (
              <div className="comparison-result">
                <h3>{results[idx].title || 'Untitled'}</h3>
                
                {/* Lighthouse Scores */}
                <div className="scores-grid">
                  <div className="score-card">
                    <div className="score-label">Performance</div>
                    <div className={`score-value score-${results[idx].lighthouse?.performance ?? 'error'}`}>
                      {results[idx].lighthouse?.performance ?? 'N/A'}
                    </div>
                  </div>
                  <div className="score-card">
                    <div className="score-label">Accessibility</div>
                    <div className={`score-value score-${results[idx].lighthouse?.accessibility ?? 'error'}`}>
                      {results[idx].lighthouse?.accessibility ?? 'N/A'}
                    </div>
                  </div>
                  <div className="score-card">
                    <div className="score-label">Best Practices</div>
                    <div className={`score-value score-${results[idx].lighthouse?.bestPractices ?? 'error'}`}>
                      {results[idx].lighthouse?.bestPractices ?? 'N/A'}
                    </div>
                  </div>
                  <div className="score-card">
                    <div className="score-label">SEO</div>
                    <div className={`score-value score-${results[idx].lighthouse?.seo ?? 'error'}`}>
                      {results[idx].lighthouse?.seo ?? 'N/A'}
                    </div>
                  </div>
                </div>

                {/* SEO Metrics */}
                <div className="metrics-section">
                  <h4>SEO Metrics</h4>
                  <div className="metrics-list">
                    <div className="metric-item">
                      <span className="metric-label">H1 Tags:</span>
                      <span className="metric-value">{results[idx].h1 || 'None'}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Meta Description:</span>
                      <span className="metric-value">{results[idx].description || 'Missing'}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Word Count:</span>
                      <span className="metric-value">{results[idx].seo?.wordCount ?? 'N/A'}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Robots.txt:</span>
                      <span className="metric-value">{results[idx].seo?.robotsTxtStatus || 'Not found'}</span>
                    </div>
                  </div>
                </div>

                {/* Technologies */}
                <div className="technologies-section">
                  <h4>Technologies ({results[idx].technologies?.length || 0})</h4>
                  <div className="tech-tags">
                    {(results[idx].technologies || []).slice(0, 8).map((tech, i) => (
                      <span key={i} className="tech-tag">
                        {tech.name} <span className="confidence">{tech.confidence}%</span>
                      </span>
                    ))}
                    {results[idx].technologies?.length > 8 && (
                      <span className="tech-tag more">+{results[idx].technologies.length - 8} more</span>
                    )}
                  </div>
                </div>

                {/* Accessibility */}
                <div className="accessibility-section">
                  <h4>Accessibility Issues ({results[idx].accessibility?.violations?.length || 0})</h4>
                  {(results[idx].accessibility?.violations || []).length > 0 ? (
                    <div className="violations-summary">
                      {['critical', 'serious', 'moderate', 'minor'].map(level => {
                        const count = (results[idx].accessibility?.violations || [])
                          .filter(v => v.impact === level).length;
                        return count > 0 ? (
                          <div key={level} className={`violation-level violation-${level}`}>
                            <span className="level-name">{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                            <span className="level-count">{count}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="no-violations">No accessibility violations found!</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {results[0] && results[1] && (
        <div className="comparison-summary">
          <h3>Quick Comparison</h3>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>{results[0].title || 'Site 1'}</th>
                <th>{results[1].title || 'Site 2'}</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Performance Score</td>
                <td className={`score-${results[0].lighthouse?.performance}`}>
                  {results[0].lighthouse?.performance ?? 'N/A'}
                </td>
                <td className={`score-${results[1].lighthouse?.performance}`}>
                  {results[1].lighthouse?.performance ?? 'N/A'}
                </td>
                <td className={getDifference(results[0].lighthouse?.performance, results[1].lighthouse?.performance) > 0 ? 'winner' : 'loser'}>
                  {Math.abs(getDifference(results[0].lighthouse?.performance, results[1].lighthouse?.performance))}
                </td>
              </tr>
              <tr>
                <td>Accessibility Score</td>
                <td className={`score-${results[0].lighthouse?.accessibility}`}>
                  {results[0].lighthouse?.accessibility ?? 'N/A'}
                </td>
                <td className={`score-${results[1].lighthouse?.accessibility}`}>
                  {results[1].lighthouse?.accessibility ?? 'N/A'}
                </td>
                <td className={getDifference(results[0].lighthouse?.accessibility, results[1].lighthouse?.accessibility) > 0 ? 'winner' : 'loser'}>
                  {Math.abs(getDifference(results[0].lighthouse?.accessibility, results[1].lighthouse?.accessibility))}
                </td>
              </tr>
              <tr>
                <td>Technologies Used</td>
                <td>{results[0].technologies?.length || 0}</td>
                <td>{results[1].technologies?.length || 0}</td>
                <td>{results[0].technologies?.length > results[1].technologies?.length ? '⬆️' : results[1].technologies?.length > results[0].technologies?.length ? '⬇️' : '='}</td>
              </tr>
              <tr>
                <td>Accessibility Violations</td>
                <td>{results[0].accessibility?.violations?.length || 0}</td>
                <td>{results[1].accessibility?.violations?.length || 0}</td>
                <td className={results[0].accessibility?.violations?.length < results[1].accessibility?.violations?.length ? 'winner' : 'loser'}>
                  {Math.abs((results[0].accessibility?.violations?.length || 0) - (results[1].accessibility?.violations?.length || 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getDifference(val1, val2) {
  if (val1 === undefined || val2 === undefined || val1 === null || val2 === null) return 0;
  return val1 - val2;
}
