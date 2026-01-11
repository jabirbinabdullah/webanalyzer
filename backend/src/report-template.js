export function getReportHTML(analysis) {
  const {
    url,
    title,
    description,
    h1,
    technologies,
    metrics,
    screenshot,
    accessibility,
    seo,
    lighthouse,
    createdAt,
  } = analysis;

  const formatDate = (date) => new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getScoreColor = (score) => {
    if (score >= 90) return '#00cc66'; // Green
    if (score >= 50) return '#ffa500'; // Orange
    return '#ff3333'; // Red
  };

  const renderGauge = (label, score, max = 100) => {
    const percentage = (score / max) * 100;
    const color = getScoreColor(percentage);
    // CSS Conic Gradient for gauge
    return `
      <div class="gauge-container">
        <div class="gauge" style="background: conic-gradient(${color} ${percentage}%, #eee 0%);">
          <div class="gauge-inner">
            <span class="gauge-score" style="color: ${color}">${Math.round(score)}</span>
          </div>
        </div>
        <div class="gauge-label">${label}</div>
      </div>
    `;
  };

  // Lighthouse Scores
  const lhScores = lighthouse?.categories ? {
    perf: lighthouse.categories.performance?.score * 100 || 0,
    acc: lighthouse.categories.accessibility?.score * 100 || 0,
    bp: lighthouse.categories['best-practices']?.score * 100 || 0,
    seo: lighthouse.categories.seo?.score * 100 || 0,
  } : null;

  const techList = technologies.length > 0
    ? technologies.map(t =>
      `<span class="tag">${t.name} <small>${Math.round(t.confidence * 100)}%</small></span>`
    ).join('')
    : '<span class="text-muted">No technologies detected</span>';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>WebAnalyzer Report</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
          
          :root {
            --primary: #2563eb;
            --secondary: #64748b;
            --light: #f8fafc;
            --border: #e2e8f0;
          }

          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }

          /* Page Layout */
          .page {
            padding: 40px;
            position: relative;
            background: white;
            page-break-after: always;
            min-height: 1000px; /* Force full page height approx */
          }
          .page:last-child {
            page-break-after: auto;
          }

          /* Typography */
          h1 { font-size: 32px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
          h2 { font-size: 24px; font-weight: 600; color: #334155; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-top: 40px; }
          h3 { font-size: 18px; font-weight: 600; color: #475569; margin-bottom: 10px; }
          p { line-height: 1.6; color: #475569; }
          
          /* Cover Page */
          .cover {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            height: 90vh;
          }
          .cover-logo { font-size: 48px; font-weight: 800; color: var(--primary); margin-bottom: 20px; }
          .cover-url { font-size: 24px; color: var(--secondary); margin-bottom: 60px; word-break: break-all; }
          .cover-date { font-size: 16px; color: #94a3b8; }
          
          .cover-scores {
            display: flex;
            gap: 40px;
            margin: 40px 0;
          }

          /* Gauges */
          .gauge-container {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .gauge {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .gauge-inner {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .gauge-score {
            font-size: 24px;
            font-weight: 700;
          }
          .gauge-label {
            margin-top: 10px;
            font-weight: 600;
            color: var(--secondary);
          }

          /* Screenshot */
          .screenshot-container {
            margin: 20px 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            border: 1px solid var(--border);
          }
          .screenshot-container img {
            width: 100%;
            display: block;
          }

          /* Tables & Grids */
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
          .card {
            background: var(--light);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--border);
          }
          
          .metric-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .metric-row:last-child { border-bottom: none; }
          .metric-label { font-weight: 500; }
          .metric-value { font-family: monospace; }

          /* Tags */
          .tag {
            display: inline-block;
            background: white;
            border: 1px solid var(--border);
            padding: 4px 10px;
            border-radius: 15px;
            margin-right: 8px;
            margin-bottom: 8px;
            font-size: 14px;
            color: var(--secondary);
          }
          .tag small { color: #94a3b8; margin-left: 4px; }

          /* Footer */
          .footer {
            position: fixed;
            bottom: 20px;
            left: 40px;
            right: 40px;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #cbd5e1;
            border-top: 1px solid #f1f5f9;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>

        <!-- Page 1: Cover -->
        <div class="page cover-page">
           <div class="cover">
              <div class="cover-logo">WebAnalyzer</div>
              <h1>Audit Report</h1>
              <div class="cover-url">${url}</div>
              
              ${lhScores ? `
              <div class="cover-scores">
                 ${renderGauge('Performance', lhScores.perf)}
                 ${renderGauge('Accessibility', lhScores.acc)}
                 ${renderGauge('SEO', lhScores.seo)}
                 ${renderGauge('Best Practices', lhScores.bp)}
              </div>
              ` : '<p>Lighthouse scores unavailable</p>'}

              <div class="cover-date">${formatDate(createdAt)}</div>
           </div>
           
           <div class="footer">
              <span>WebAnalyzer Automated Report</span>
              <span>Page 1</span>
           </div>
        </div>

        <!-- Page 2: Summary & Tech -->
        <div class="page">
           <h2>Executive Summary</h2>
           <div class="grid-2">
              <div class="card">
                 <h3>Metadata</h3>
                 <div class="metric-row"><span class="metric-label">Title</span> <span class="metric-value">${(title || '').substring(0, 30)}...</span></div>
                 <div class="metric-row"><span class="metric-label">Description</span> <span class="metric-value">${(description || '').substring(0, 30)}...</span></div>
                 <div class="metric-row"><span class="metric-label">Response Time</span> <span class="metric-value">${metrics.load || 0} ms</span></div>
              </div>
              <div class="card">
                 <h3>Tech Stack</h3>
                 <div>${techList}</div>
              </div>
           </div>

           ${screenshot ? `
           <h3>Visual Preview</h3>
           <div class="screenshot-container">
              <img src="data:image/jpeg;base64,${screenshot}" />
           </div>
           ` : ''}

           <div class="footer">
              <span>WebAnalyzer Automated Report</span>
              <span>Page 2</span>
           </div>
        </div>

        <!-- Page 3: Detailed Metrics -->
        <div class="page">
           <h2>Detailed Metrics</h2>
           
           <div class="grid-2">
              <div>
                 <h3>SEO Health</h3>
                 <div class="card">
                    <div class="metric-row"><span class="metric-label">H1 Tag</span> <span class="metric-value">${h1 ? '✅ Present' : '❌ Missing'}</span></div>
                    <div class="metric-row"><span class="metric-label">Meta Desc Length</span> <span class="metric-value">${seo.descriptionLength || 0} chars</span></div>
                    <div class="metric-row"><span class="metric-label">Word Count</span> <span class="metric-value">${seo.wordCount || 0}</span></div>
                    <div class="metric-row"><span class="metric-label">Robots.txt</span> <span class="metric-value">${seo.robotsTxtStatus}</span></div>
                    <div class="metric-row"><span class="metric-label">Canonical</span> <span class="metric-value">${seo.canonical?.resolved ? '✅ Valid' : '⚠️ Issue'}</span></div>
                 </div>
              </div>

              <div>
                 <h3>Accessibility Issues</h3>
                 <div class="card">
                    ${accessibility.violations.length === 0
      ? '<p style="color: green">✅ No violations found</p>'
      : `
                        <div style="color: #ef4444; font-weight: bold; margin-bottom: 10px;">${accessibility.violations.length} Violations Found</div>
                        <ul style="padding-left: 20px; margin: 0;">
                           ${accessibility.violations.slice(0, 5).map(v =>
        `<li style="margin-bottom: 5px; font-size: 14px;"><b>${v.impact}</b>: ${v.description}</li>`
      ).join('')}
                           ${accessibility.violations.length > 5 ? '<li>...and more</li>' : ''}
                        </ul>
                      `
    }
                 </div>
              </div>
           </div>

           <div class="footer">
              <span>WebAnalyzer Automated Report</span>
              <span>Page 3</span>
           </div>
        </div>

      </body>
    </html>
  `;
}
