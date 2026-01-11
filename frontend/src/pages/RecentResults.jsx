import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

export default function RecentResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecentResults();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRecentResults, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecentResults = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/recent-results?limit=50`
      );
      setResults(response.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load recent results');
      console.error('Error fetching recent results:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const getHostname = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const getStatusBadge = (status) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
    };
    const statusStyle =
      status === 'completed'
        ? { background: '#10b981', color: 'white' }
        : { background: '#ef4444', color: 'white' };

    return (
      <span style={{ ...baseStyle, ...statusStyle }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading recent results...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0' }}>Recent Results</h1>
        <p style={{ color: '#666', margin: '0', fontSize: '16px' }}>
          Latest website analyses (auto-refreshing every 30 seconds)
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '6px',
            marginBottom: '20px',
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      )}

      {results.length === 0 ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            background: 'white',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
          }}
        >
          <p style={{ color: '#666', fontSize: '16px' }}>
            No recent results yet
          </p>
          <Link
            to="/"
            style={{
              color: '#0b5fff',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            Start analyzing a website
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {results.map((result) => (
            <Link
              key={result._id}
              to={`/`}
              onClick={() => {
                // You could pass state here to auto-fill the URL
                window.scrollTo(0, 0);
              }}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid #e5e7eb',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Header with status and date */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: '0 0 4px 0',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111',
                      }}
                    >
                      {getHostname(result.url)}
                    </h3>
                    <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                      {formatDate(result.createdAt)}
                    </p>
                  </div>
                  {getStatusBadge(result.status)}
                </div>

                {/* Title */}
                {result.title && (
                  <p
                    style={{
                      margin: '8px 0',
                      fontSize: '13px',
                      color: '#333',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {result.title}
                  </p>
                )}

                {/* Description */}
                {result.description && (
                  <p
                    style={{
                      margin: '8px 0',
                      fontSize: '12px',
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {result.description}
                  </p>
                )}

                {/* Technologies */}
                {result.technologies && result.technologies.length > 0 && (
                  <div
                    style={{
                      margin: '12px 0',
                      paddingTop: '12px',
                      borderTop: '1px solid #f3f4f6',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#666',
                        textTransform: 'uppercase',
                      }}
                    >
                      Technologies
                    </p>
                    <div
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
                    >
                      {result.technologies.slice(0, 3).map((tech, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '11px',
                            padding: '4px 8px',
                            background: '#f0f9ff',
                            color: '#0369a1',
                            borderRadius: '3px',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          {tech.name}
                        </span>
                      ))}
                      {result.technologies.length > 3 && (
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '4px 8px',
                            color: '#666',
                          }}
                        >
                          +{result.technologies.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Lighthouse Scores */}
                {(result.performanceScore !== null ||
                  result.accessibilityScore !== null ||
                  result.seoScore !== null) && (
                  <div
                    style={{
                      margin: '12px 0',
                      paddingTop: '12px',
                      borderTop: '1px solid #f3f4f6',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#666',
                        textTransform: 'uppercase',
                      }}
                    >
                      Lighthouse Scores
                    </p>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        fontSize: '12px',
                      }}
                    >
                      {result.performanceScore !== null && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ fontWeight: '600' }}>Perf:</span>
                          <span
                            style={{
                              color:
                                result.performanceScore >= 50
                                  ? '#10b981'
                                  : '#ef4444',
                            }}
                          >
                            {result.performanceScore.toFixed(0)}
                          </span>
                        </div>
                      )}
                      {result.accessibilityScore !== null && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ fontWeight: '600' }}>A11y:</span>
                          <span
                            style={{
                              color:
                                result.accessibilityScore >= 50
                                  ? '#10b981'
                                  : '#ef4444',
                            }}
                          >
                            {result.accessibilityScore.toFixed(0)}
                          </span>
                        </div>
                      )}
                      {result.seoScore !== null && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ fontWeight: '600' }}>SEO:</span>
                          <span
                            style={{
                              color:
                                result.seoScore >= 50 ? '#10b981' : '#ef4444',
                            }}
                          >
                            {result.seoScore.toFixed(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error message if failed */}
                {result.status === 'failed' && result.error && (
                  <div
                    style={{
                      margin: '12px 0',
                      padding: '8px',
                      background: '#fee2e2',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#7f1d1d',
                    }}
                  >
                    Error: {result.error}
                  </div>
                )}

                {/* View Full Result Link */}
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f3f4f6',
                  }}
                >
                  <Link
                    to={`/analysis/${result.analysisId}`}
                    style={{
                      fontSize: '12px',
                      color: '#0b5fff',
                      textDecoration: 'none',
                      fontWeight: '500',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Full Result →
                  </Link>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
