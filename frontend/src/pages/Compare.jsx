import React, { useState, useEffect } from 'react';
import { analyzeUrl, getAnalysis } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import '../styles/compare.css';

function getDifference(a, b) {
  const valA = Number(a) || 0;
  const valB = Number(b) || 0;
  return valA - valB;
}

function getWinner(a, b, lowerIsBetter = false) {
  const diff = getDifference(a, b);
  if (diff === 0) return 'tie';
  return (diff > 0 && !lowerIsBetter) || (diff < 0 && lowerIsBetter)
    ? 'a'
    : 'b';
}

function ComparisonRow({ label, valA, valB, lowerIsBetter = false }) {
  const winner = getWinner(valA, valB, lowerIsBetter);
  const diff = Math.abs(getDifference(valA, valB));

  return (
    <tr>
      <td>{label}</td>
      <td className={winner === 'a' ? 'winner' : winner === 'b' ? 'loser' : ''}>
        {valA ?? 'N/A'}
      </td>
      <td className={winner === 'b' ? 'winner' : winner === 'a' ? 'loser' : ''}>
        {valB ?? 'N/A'}
      </td>
      <td>
        {winner !== 'tie' ? (
          <span className={`diff ${winner === 'a' ? 'positive' : 'negative'}`}>
            {winner === 'a' ? '▲' : '▼'} {diff}
          </span>
        ) : (
          '='
        )}
      </td>
    </tr>
  );
}

function TechComparison({ techsA, techsB }) {
  const setA = new Set(techsA.map((t) => t.name));
  const setB = new Set(techsB.map((t) => t.name));
  const common = [...setA].filter((t) => setB.has(t));
  const uniqueA = [...setA].filter((t) => !setB.has(t));
  const uniqueB = [...setB].filter((t) => !setA.has(t));

  return (
    <div className="tech-comparison">
      <h4>Technology Stacks</h4>
      <div className="tech-columns">
        <div>
          <h5>{uniqueA.length} Unique to Site A</h5>
          <ul>
            {uniqueA.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <h5>{uniqueB.length} Unique to Site B</h5>
          <ul>
            {uniqueB.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
      <h5>{common.length} Common Technologies</h5>
      <ul className="common-techs">
        {common.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Compare() {
  const [urls, setUrls] = useState([
    'https://example.com',
    'https://example.org',
  ]);
  const [results, setResults] = useState([null, null]);
  const [loading, setLoading] = useState([false, false]);
  const [errors, setErrors] = useState([null, null]);
  const [analysisIds, setAnalysisIds] = useState([null, null]);
  const [statuses, setStatuses] = useState([null, null]);

  const socket = useSocket();

  // Socket Listener Effect
  useEffect(() => {
    if (!socket) return;

    // We can't easily remove specific listeners for dynamic IDs if we don't track them carefully.
    // Instead, we listen to ALL events and check if they match our current analyzing IDs.

    const handleComplete = (data) => {
      // Find which index (0 or 1) this analysis ID belongs to
      const index = analysisIds.indexOf(data._id);
      if (index !== -1) {
        const newResults = [...results];
        newResults[index] = data.result;
        setResults(newResults);

        const newLoading = [...loading];
        newLoading[index] = false;
        setLoading(newLoading);

        const newStatuses = [...statuses];
        newStatuses[index] = 'completed';
        setStatuses(newStatuses);

        // We don't clear ID yet so we can keep associating, 
        // but effectively we are done.
      }
    };

    const handleFailed = (data) => {
      const index = analysisIds.indexOf(data._id);
      if (index !== -1) {
        const newErrors = [...errors];
        newErrors[index] = data.error || 'Analysis failed';
        setErrors(newErrors);

        const newLoading = [...loading];
        newLoading[index] = false;
        setLoading(newLoading);

        const newStatuses = [...statuses];
        newStatuses[index] = 'failed';
        setStatuses(newStatuses);
      }
    };

    socket.on('analysisCompleted', handleComplete);
    socket.on('analysisFailed', handleFailed);

    return () => {
      socket.off('analysisCompleted', handleComplete);
      socket.off('analysisFailed', handleFailed);
    };
  }, [socket, analysisIds, results, loading, statuses, errors]);


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

    // Clear previous result for this slot
    const newResults = [...results];
    newResults[idx] = null;
    setResults(newResults);

    try {
      // No extra types for now, just default (all)
      const result = await analyzeUrl(urls[idx]);
      const newIds = [...analysisIds];
      newIds[idx] = result._id;
      setAnalysisIds(newIds);

      // Emit join room immediately
      if (socket) {
        socket.emit('join_analysis', result._id);
      }
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

  const [resA, resB] = results;

  // Prepare data for Radar Chart
  const radarData = [
    { subject: 'Performance', A: resA?.lighthouse?.categories?.performance?.score * 100 || 0, B: resB?.lighthouse?.categories?.performance?.score * 100 || 0, fullMark: 100 },
    { subject: 'Accessibility', A: resA?.lighthouse?.categories?.accessibility?.score * 100 || 0, B: resB?.lighthouse?.categories?.accessibility?.score * 100 || 0, fullMark: 100 },
    { subject: 'Best Practices', A: resA?.lighthouse?.categories?.['best-practices']?.score * 100 || 0, B: resB?.lighthouse?.categories?.['best-practices']?.score * 100 || 0, fullMark: 100 },
    { subject: 'SEO', A: resA?.lighthouse?.categories?.seo?.score * 100 || 0, B: resB?.lighthouse?.categories?.seo?.score * 100 || 0, fullMark: 100 },
  ];

  return (
    <div className="compare-container">
      <h2>Compare Websites</h2>
      <p className="compare-subtitle">
        Analyze and compare up to 2 websites side-by-side
      </p>

      {/* Comparison Inputs */}
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
                {loading[idx]
                  ? `${statuses[idx] === 'pending' ? 'Queued' : 'Analyzing'}...`
                  : 'Analyze'}
              </button>
            </div>

            {errors[idx] && <div className="error-message">{errors[idx]}</div>}

            {loading[idx] && (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>
                  {statuses[idx] === 'pending'
                    ? 'Queued for analysis...'
                    : 'Analyzing website...'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Visual Comparison Section (Radar Chart) */}
      {resA && resB && (
        <div className="card" style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginBottom: '32px', marginTop: '24px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Visual Comparison</h3>
          <div style={{ height: '400px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name={resA.title || "Site A"} dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Radar name={resB.title || "Site B"} dataKey="B" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Side-by-Side Results */}
      <div className="compare-grid" style={{ alignItems: 'start' }}>
        {results.map((res, idx) => res && (
          <div key={`res-${idx}`} className="compare-panel" style={{ border: '1px solid #eee', padding: '16px' }}>
            <h3>{res.title || 'Untitled'}</h3>
            <div className="technologies-section">
              <h4>Technologies ({res.technologies?.length || 0})</h4>
              <div className="tech-tags">
                {(res.technologies || []).slice(0, 5).map((t, i) => (
                  <span key={i} className="tech-tag">{t.name}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {resA && resB && (
        <div className="comparison-summary">
          <h3>Detailed Metrics Comparison</h3>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>{resA.title || 'Site A'}</th>
                <th>{resB.title || 'Site B'}</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow
                label="Performance"
                valA={resA.lighthouse?.categories?.performance?.score * 100}
                valB={resB.lighthouse?.categories?.performance?.score * 100}
              />
              <ComparisonRow
                label="Accessibility"
                valA={resA.lighthouse?.categories?.accessibility?.score * 100}
                valB={resB.lighthouse?.categories?.accessibility?.score * 100}
              />
              <ComparisonRow
                label="Best Practices"
                valA={
                  resA.lighthouse?.categories?.['best-practices']?.score * 100
                }
                valB={
                  resB.lighthouse?.categories?.['best-practices']?.score * 100
                }
              />
              <ComparisonRow
                label="SEO Score"
                valA={resA.lighthouse?.categories?.seo?.score * 100}
                valB={resB.lighthouse?.categories?.seo?.score * 100}
              />
              <ComparisonRow
                label="Word Count"
                valA={resA.seo?.wordCount}
                valB={resB.seo?.wordCount}
              />
              <ComparisonRow
                label="Tech Count"
                valA={resA.technologies?.length}
                valB={resB.technologies?.length}
              />
              <ComparisonRow
                label="Accessibility Violations"
                valA={resA.accessibility?.violations?.length}
                valB={resB.accessibility?.violations?.length}
                lowerIsBetter={true}
              />
            </tbody>
          </table>
          <TechComparison
            techsA={resA.technologies}
            techsB={resB.technologies}
          />
        </div>
      )}
    </div>
  );
}
