import React, { useState } from 'react';
import '../styles/security.css';

export default function SecurityAnalysis({ result }) {
  const [expandedSection, setExpandedSection] = useState('overview');

  if (!result) {
    return <div className="security-container">No security data available</div>;
  }

  const getSecurityColor = (score) => {
    if (score === null || score === undefined) return 'unknown';
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'warning';
    return 'critical';
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="security-container">
      <div className="security-header">
        <h3>🔒 Security Analysis</h3>
      </div>

      {/* Overall Score */}
      {result.securityScore !== undefined && (
        <div className="security-score-card">
          <div className="score-display">
            <div
              className={`score-circle ${getSecurityColor(result.securityScore)}`}
            >
              <div className="score-value">{result.securityScore}</div>
            </div>
            <div className="score-label">Overall Security Score</div>
          </div>
        </div>
      )}

      {/* HTTPS Status */}
      <div
        className={`status-card ${result.isHTTPS ? 'https-enabled' : 'https-missing'}`}
      >
        <div className="status-icon">{result.isHTTPS ? '✅' : '⚠️'}</div>
        <div className="status-info">
          <div className="status-title">HTTPS/TLS Encryption</div>
          <div className="status-value">
            {result.isHTTPS ? 'Enabled' : 'Not Enabled'}
          </div>
        </div>
      </div>

      {/* JavaScript Vulnerabilities */}
      {result.vulnerabilities && (
        <div className="section-card">
          <div
            className="section-header"
            onClick={() => toggleSection('vulnerabilities')}
          >
            <h4>🚨 JavaScript Vulnerabilities</h4>
            <span
              className={`vulnerability-count ${result.vulnerabilities.length > 0 ? 'vulnerable' : 'secure'}`}
            >
              {result.vulnerabilities.length} found
            </span>
            <span className="toggle-icon">
              {expandedSection === 'vulnerabilities' ? '▼' : '▶'}
            </span>
          </div>
          {expandedSection === 'vulnerabilities' && (
            <div className="section-content">
              {result.vulnerabilities.length > 0 ? (
                <div className="vulnerabilities-grid">
                  {result.vulnerabilities.map((vuln, index) => (
                    <div
                      key={index}
                      className={`vulnerability-item severity-${vuln.severity || 'info'}`}
                    >
                      <div className="vulnerability-header">
                        <span className="component-name">{vuln.component}</span>
                        <span className="version">v{vuln.version}</span>
                      </div>
                      <div className="vulnerability-details">
                        {vuln.vulnerabilities.map((v, i) => (
                          <div key={i} className="vulnerability-info">
                            <p>
                              <strong>Severity:</strong> {v.severity}
                            </p>
                            <p>{v.info.join(' ')}</p>
                            <a
                              href={v.info[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              More info
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>✅ No known JavaScript vulnerabilities detected.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Security Headers */}
      <div className="section-card">
        <div
          className="section-header"
          onClick={() => toggleSection('headers')}
        >
          <h4>🛡️ Security Headers</h4>
          <span className="toggle-icon">
            {expandedSection === 'headers' ? '▼' : '▶'}
          </span>
        </div>
        {expandedSection === 'headers' && (
          <div className="section-content">
            <div className="headers-grid">
              {result.headers &&
                Object.entries(result.headers).map(
                  ([headerName, headerValue]) => (
                    <div
                      key={headerName}
                      className={`header-item ${headerValue === 'Missing' ? 'missing' : 'present'}`}
                    >
                      <div className="header-name">{headerName}</div>
                      <div
                        className="header-value"
                        title={
                          typeof headerValue === 'string' ? headerValue : ''
                        }
                      >
                        {typeof headerValue === 'string' &&
                        headerValue.length > 50
                          ? headerValue.substring(0, 50) + '...'
                          : headerValue}
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        )}
      </div>

      {/* Information Leakage */}
      {result.leakageHeaders && (
        <div className="section-card">
          <div
            className="section-header"
            onClick={() => toggleSection('leakage')}
          >
            <h4>📡 Information Disclosure</h4>
            <span className="toggle-icon">
              {expandedSection === 'leakage' ? '▼' : '▶'}
            </span>
          </div>
          {expandedSection === 'leakage' && (
            <div className="section-content">
              <div className="leakage-grid">
                {Object.entries(result.leakageHeaders).map(
                  ([headerName, status]) => (
                    <div
                      key={headerName}
                      className={`leakage-item ${status === 'Exposed' ? 'exposed' : 'hidden'}`}
                    >
                      <div className="leakage-icon">
                        {status === 'Exposed' ? '⚠️' : '✅'}
                      </div>
                      <div className="leakage-name">{headerName}</div>
                      <div className="leakage-status">{status}</div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SSL/TLS Certificate */}
      {result.ssl && result.ssl.status === 'success' && (
        <div className="section-card">
          <div className="section-header" onClick={() => toggleSection('ssl')}>
            <h4>🔐 SSL/TLS Certificate</h4>
            {result.ssl.score && (
              <span
                className={`ssl-score ${getSecurityColor(result.ssl.score)}`}
              >
                Score: {result.ssl.score}
              </span>
            )}
            <span className="toggle-icon">
              {expandedSection === 'ssl' ? '▼' : '▶'}
            </span>
          </div>
          {expandedSection === 'ssl' && (
            <div className="section-content">
              <div className="ssl-details">
                <div className="detail-row">
                  <span className="label">Subject:</span>
                  <span className="value">
                    {result.ssl.certificate?.subject}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Issuer:</span>
                  <span className="value">
                    {result.ssl.certificate?.issuer}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Valid Until:</span>
                  <span
                    className={`value ${result.ssl.certificate?.isExpired ? 'expired' : ''}`}
                  >
                    {new Date(
                      result.ssl.certificate?.validUntil
                    ).toLocaleDateString()}
                    {result.ssl.certificate?.daysUntilExpiry && (
                      <span className="expiry-info">
                        ({result.ssl.certificate.daysUntilExpiry} days
                        remaining)
                      </span>
                    )}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Key Strength:</span>
                  <span className="value">{result.ssl.keyInfo?.strength}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CORS Status */}
      {result.corsStatus && (
        <div className="status-card">
          <div className="status-icon">
            {result.corsStatus.includes('Misconfigured') ? '⚠️' : '✅'}
          </div>
          <div className="status-info">
            <div className="status-title">CORS Configuration</div>
            <div className="status-value">{result.corsStatus}</div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>🎯 Security Recommendations</h4>
          <ul className="recommendations-list">
            {result.recommendations.map((rec, idx) => (
              <li key={idx} className="recommendation-item">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SSL Recommendations */}
      {result.ssl?.recommendations && result.ssl.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>🔐 SSL/TLS Recommendations</h4>
          <ul className="recommendations-list">
            {result.ssl.recommendations.map((rec, idx) => (
              <li key={idx} className="recommendation-item">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
