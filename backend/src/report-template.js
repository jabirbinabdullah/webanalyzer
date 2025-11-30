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

  const formatDate = (date) => new Date(date).toLocaleString();

  const techList = technologies.length > 0
    ? technologies.map(t => `<li>${t.name} (${Math.round(t.confidence * 100)}%)</li>`).join('')
    : '<li>No technologies detected</li>';

  const lighthouseScores = lighthouse && !lighthouse.error
    ? `
        <ul>
          <li>Performance: ${lighthouse.performance}</li>
          <li>Accessibility: ${lighthouse.accessibility}</li>
          <li>Best Practices: ${lighthouse.bestPractices}</li>
          <li>SEO: ${lighthouse.seo}</li>
          <li>PWA: ${lighthouse.pwa}</li>
        </ul>
      `
    : '<p>Lighthouse audit could not be run or failed.</p>';

  const accessibilityViolations = accessibility.violations.length > 0
    ? accessibility.violations.map(v => `<li><strong>${v.id}</strong> (${v.impact}): ${v.description}</li>`).join('')
    : '<li>No accessibility violations found.</li>';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>WebAnalyzer Report for ${url}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #333; }
          h1, h2, h3 { color: #1a237e; }
          h1 { font-size: 24px; }
          h2 { font-size: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; }
          .report-header { text-align: center; margin-bottom: 40px; }
          .report-header h1 { font-size: 32px; margin-bottom: 0; }
          .report-header p { font-size: 14px; color: #666; }
          .section { margin-bottom: 20px; }
          .screenshot { text-align: center; margin-top: 20px; }
          .screenshot img { max-width: 80%; border: 1px solid #ccc; }
          ul { list-style-type: disc; padding-left: 20px; }
          li { margin-bottom: 8px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .card { padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          .card h3 { margin-top: 0; }
          pre { background-color: #f7f7f7; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>WebAnalyzer Report</h1>
          <p>Analyzed on ${formatDate(createdAt)}</p>
        </div>

        <div class="section">
          <h2>Summary for ${url}</h2>
          <div class="card">
            <p><strong>Title:</strong> ${title || 'N/A'}</p>
            <p><strong>Description:</strong> ${description || 'N/A'}</p>
            <p><strong>H1:</strong> ${h1 || 'N/A'}</p>
          </div>
        </div>

        ${screenshot ? `
          <div class="section screenshot">
            <h2>Screenshot</h2>
            <img src="data:image/jpeg;base64,${screenshot}" alt="Screenshot of ${url}" />
          </div>
        ` : ''}

        <div class="grid">
          <div class="card">
            <h3>Performance Metrics</h3>
            <ul>
              <li>Task Duration: ${metrics.taskDuration} ms</li>
              <li>First Contentful Paint: ${metrics.fcp} ms</li>
              <li>Page Load Time: ${metrics.load} ms</li>
            </ul>
          </div>
          <div class="card">
            <h3>Technologies Detected</h3>
            <ul>${techList}</ul>
          </div>
        </div>

        <div class="section">
            <h2>Lighthouse Scores</h2>
            <div class="card">
                ${lighthouseScores}
            </div>
        </div>

        <div class="section">
          <h2>SEO Details</h2>
          <div class="card">
            <p><strong>Meta Description Length:</strong> ${seo.descriptionLength}</p>
            <p><strong>Word Count:</strong> ${seo.wordCount}</p>
            <p><strong>robots.txt Status:</strong> ${seo.robotsTxtStatus}</p>
            <p><strong>Canonical:</strong> ${seo.canonical ? seo.canonical.resolved : 'N/A'}</p>
          </div>
        </div>

        <div class="section">
          <h2>Accessibility Violations (${accessibility.violations.length})</h2>
          <div class="card">
            <ul>${accessibilityViolations}</ul>
          </div>
        </div>
      </body>
    </html>
  `;
}
