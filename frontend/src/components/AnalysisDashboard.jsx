import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Radar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement
);

/**
 * A dashboard component to visualize the key metrics of a website analysis.
 * @param {object} props
 * @param {object} props.analysis - The full analysis result object.
 */
export default function AnalysisDashboard({ analysis }) {
  if (!analysis) {
    return (
      <div className="analysis-dashboard-placeholder">
        <p>Awaiting analysis data for visualization...</p>
      </div>
    );
  }

  const { lighthouse, accessibility, performance, security } = analysis;

  // --- Data for Radar Chart (Lighthouse) ---
  const radarChartData = {
    labels: ['Performance', 'Accessibility', 'Best Practices', 'SEO'],
    datasets: [
      {
        label: 'Lighthouse Score',
        data: [
          lighthouse?.performance || 0,
          lighthouse?.accessibility || 0,
          lighthouse?.bestPractices || 0,
          lighthouse?.seo || 0,
        ],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
      },
    ],
  };

  const radarChartOptions = {
    scales: {
      r: {
        angleLines: {
          display: true,
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: {
          stepSize: 20,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
    maintainAspectRatio: false,
  };

  // --- Data for Doughnut Chart (Accessibility Violations) ---
  const violationCounts = (accessibility?.violations || []).reduce(
    (acc, violation) => {
      acc[violation.impact] = (acc[violation.impact] || 0) + 1;
      return acc;
    },
    {}
  );

  const totalViolations = (accessibility?.violations || []).length;

  const doughnutChartData = {
    labels: ['Critical', 'Serious', 'Moderate', 'Minor'],
    datasets: [
      {
        label: 'Violations by Impact',
        data: [
          violationCounts.critical || 0,
          violationCounts.serious || 0,
          violationCounts.moderate || 0,
          violationCounts.minor || 0,
        ],
        backgroundColor: [
          '#ef4444', // Red for Critical
          '#f97316', // Orange for Serious
          '#f59e0b', // Yellow for Moderate
          '#84cc16', // Lime for Minor
        ],
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: `Total Violations: ${totalViolations}`,
        position: 'top',
        font: {
          size: 16,
        },
      },
    },
  };

  return (
    <div
      className="analysis-dashboard"
      style={{
        padding: '20px',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Lighthouse Overview & Accessibility Issues */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          alignItems: 'center',
        }}
      >
        {lighthouse && (
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>
              Lighthouse Overview
            </h3>
            <div style={{ position: 'relative', height: '300px' }}>
              <Radar data={radarChartData} options={radarChartOptions} />
            </div>
          </div>
        )}
        {accessibility && (
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>
              Accessibility Issues
            </h3>
            <div style={{ position: 'relative', height: '300px' }}>
              <Doughnut
                data={doughnutChartData}
                options={doughnutChartOptions}
              />
            </div>
          </div>
        )}
      </div>

      {/* Lighthouse Score Cards */}
      {lighthouse && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '20px',
            marginTop: '30px',
            borderTop: '1px solid #f0f0f0',
            paddingTop: '30px',
          }}
        >
          <ScoreCard
            label="Lighthouse Performance"
            score={lighthouse.performance}
          />
          <ScoreCard
            label="Lighthouse Accessibility"
            score={lighthouse.accessibility}
          />
          <ScoreCard
            label="Lighthouse Best Practices"
            score={lighthouse.bestPractices}
          />
          <ScoreCard label="Lighthouse SEO" score={lighthouse.seo} />
        </div>
      )}

      {/* New Performance Metrics */}
      {performance && (
        <div
          style={{
            marginTop: '30px',
            borderTop: '1px solid #f0f0f0',
            paddingTop: '30px',
          }}
        >
          <h3 style={{ marginBottom: '15px' }}>
            Detailed Performance Analysis
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
            }}
          >
            <ScoreCard
              label="Overall Performance Score"
              score={performance.score}
            />
            {performance.metrics?.largestContentfulPaint && (
              <MetricCard
                label="Largest Contentful Paint (LCP)"
                value={performance.metrics.largestContentfulPaint}
              />
            )}
            {performance.metrics?.cumulativeLayoutShift && (
              <MetricCard
                label="Cumulative Layout Shift (CLS)"
                value={performance.metrics.cumulativeLayoutShift}
              />
            )}
            {performance.metrics?.totalBlockingTime && (
              <MetricCard
                label="Total Blocking Time (TBT)"
                value={performance.metrics.totalBlockingTime}
              />
            )}
            {performance.metrics?.firstContentfulPaint && (
              <MetricCard
                label="First Contentful Paint (FCP)"
                value={performance.metrics.firstContentfulPaint}
              />
            )}
            {performance.metrics?.speedIndex && (
              <MetricCard
                label="Speed Index"
                value={performance.metrics.speedIndex}
              />
            )}
            {performance.metrics?.interactive && (
              <MetricCard
                label="Time to Interactive (TTI)"
                value={performance.metrics.interactive}
              />
            )}
          </div>
          {performance.recommendations &&
            performance.recommendations.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4>Performance Recommendations:</h4>
                <ul style={{ listStyleType: 'disc', marginLeft: '20px' }}>
                  {performance.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* New Security Headers */}
      {security && (
        <div
          style={{
            marginTop: '30px',
            borderTop: '1px solid #f0f0f0',
            paddingTop: '30px',
          }}
        >
          <h3 style={{ marginBottom: '15px' }}>Security Headers Analysis</h3>
          {security.status === 'error' ? (
            <p style={{ color: '#ef4444' }}>
              Error during security analysis: {security.message}
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
              }}
            >
              {Object.entries(security.headers || {}).map(
                ([header, status]) => (
                  <div
                    key={header}
                    style={{
                      padding: '10px',
                      border: '1px solid #eee',
                      borderRadius: '5px',
                      background: status === 'Present' ? '#d4edda' : '#f8d7da',
                      color: status === 'Present' ? '#155724' : '#721c24',
                    }}
                  >
                    <strong>{header}:</strong> {status}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A small component to display a single score card.
 * @param {object} props
 * @param {string} props.label
 * @param {number} props.score
 */
function ScoreCard({ label, score = 0 }) {
  const getScoreColor = (value) => {
    if (value >= 90) return '#10b981'; // Green
    if (value >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const color = getScoreColor(score);

  return (
    <div
      style={{
        border: `2px solid ${color}`,
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: color }}>
        {Math.round(score)}
      </div>
      <div style={{ marginTop: '10px', fontSize: '1rem', color: '#333' }}>
        {label}
      </div>
    </div>
  );
}

/**
 * A small component to display a single metric.
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.value
 */
function MetricCard({ label, value }) {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        textAlign: 'center',
        background: '#f9f9f9',
      }}
    >
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
        {value}
      </div>
      <div style={{ marginTop: '5px', fontSize: '0.9rem', color: '#555' }}>
        {label}
      </div>
    </div>
  );
}
