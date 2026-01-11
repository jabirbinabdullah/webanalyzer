import React from 'react';
import '../styles/performance.css';

export default function PerformanceAnalysis({ result }) {
  if (!result) {
    return (
      <div className="performance-container">No performance data available</div>
    );
  }

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return 'unknown';
    if (score >= 90) return 'excellent';
    if (score >= 50) return 'moderate';
    return 'poor';
  };

  return (
    <div className="performance-container">
      <div className="performance-header">
        <h3>⚡ Performance Analysis</h3>
        {result.fromCache && <span className="cache-badge">Cached</span>}
      </div>

      {/* Overall Score */}
      <div className="performance-score-card">
        <div className="score-display">
          <div className={`score-circle ${getScoreColor(result.score)}`}>
            <div className="score-value">
              {result.score !== null ? Math.round(result.score) : 'N/A'}
            </div>
          </div>
          <div className="score-label">Overall Performance Score</div>
        </div>
      </div>

      {/* Web Vitals */}
      <div className="web-vitals-section">
        <h4>Core Web Vitals</h4>
        <div className="vitals-grid">
          <div className="vital-card">
            <div className="vital-name">Largest Contentful Paint</div>
            <div className="vital-value">
              {result.metrics?.largestContentfulPaint || 'N/A'}
            </div>
            <div className="vital-hint">Slower than 4s = poor</div>
          </div>
          <div className="vital-card">
            <div className="vital-name">Cumulative Layout Shift</div>
            <div className="vital-value">
              {result.metrics?.cumulativeLayoutShift || 'N/A'}
            </div>
            <div className="vital-hint">Higher than 0.25 = poor</div>
          </div>
          <div className="vital-card">
            <div className="vital-name">First Input Delay</div>
            <div className="vital-value">
              {result.metrics?.totalBlockingTime || 'N/A'}
            </div>
            <div className="vital-hint">Slower than 100ms = poor</div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="metrics-section">
        <h4>Additional Performance Metrics</h4>
        <div className="metrics-list">
          <div className="metric-row">
            <span className="metric-name">First Contentful Paint</span>
            <span className="metric-value">
              {result.metrics?.firstContentfulPaint || 'N/A'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-name">Speed Index</span>
            <span className="metric-value">
              {result.metrics?.speedIndex || 'N/A'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-name">Time to Interactive</span>
            <span className="metric-value">
              {result.metrics?.interactive || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>📋 Improvement Recommendations</h4>
          <ul className="recommendations-list">
            {result.recommendations.slice(0, 5).map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
            {result.recommendations.length > 5 && (
              <li className="more-items">
                +{result.recommendations.length - 5} more recommendations
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
