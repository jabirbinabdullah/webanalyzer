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
  if (!analysis || !analysis.lighthouse || !analysis.accessibility) {
    return (
      <div className="analysis-dashboard-placeholder">
        <p>Awaiting analysis data for visualization...</p>
      </div>
    );
  }

  const { lighthouse, accessibility } = analysis;

  // --- Data for Radar Chart ---
  const radarChartData = {
    labels: ['Performance', 'Accessibility', 'Best Practices', 'SEO'],
    datasets: [
      {
        label: 'Lighthouse Score',
        data: [
          lighthouse.performance || 0,
          lighthouse.accessibility || 0,
          lighthouse.bestPractices || 0,
          lighthouse.seo || 0,
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

  // --- Data for Doughnut Chart ---
  const violationCounts = (accessibility.violations || []).reduce((acc, violation) => {
    acc[violation.impact] = (acc[violation.impact] || 0) + 1;
    return acc;
  }, {});

  const totalViolations = (accessibility.violations || []).length;

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
    <div className="analysis-dashboard" style={{ padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', alignItems: 'center' }}>
        <div>
          <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Lighthouse Overview</h3>
          <div style={{ position: 'relative', height: '300px' }}>
            <Radar data={radarChartData} options={radarChartOptions} />
          </div>
        </div>
        <div>
          <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Accessibility Issues</h3>
          <div style={{ position: 'relative', height: '300px' }}>
            <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginTop: '30px', borderTop: '1px solid #f0f0f0', paddingTop: '30px' }}>
        <ScoreCard label="Performance" score={lighthouse.performance} />
        <ScoreCard label="Accessibility" score={lighthouse.accessibility} />
        <ScoreCard label="Best Practices" score={lighthouse.bestPractices} />
        <ScoreCard label="SEO" score={lighthouse.seo} />
      </div>
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
    <div style={{ border: `2px solid ${color}`, borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: color }}>
        {Math.round(score)}
      </div>
      <div style={{ marginTop: '10px', fontSize: '1rem', color: '#333' }}>
        {label}
      </div>
    </div>
  );
}
