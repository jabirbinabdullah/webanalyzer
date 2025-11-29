import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAnalysesForUrl } from '../services/api';

export default function History() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [error, setError] = useState(null);

  const url = searchParams.get('url');

  useEffect(() => {
    if (!url) return;

    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const res = await getAnalysesForUrl(url);
        setAnalyses(res);
      } catch (err) {
        setError(err.message || 'Failed to fetch history');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [url]);

  if (!url) {
    return <div>No URL specified. Please go back and analyze a URL to see its history.</div>;
  }

  return (
    <div className="history">
      <h2>Analysis History for {url}</h2>

      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}

      {analyses.length > 0 ? (
        <div className="history-list">
          {analyses.map((analysis) => (
            <div key={analysis._id} className="history-item">
              <h3>{new Date(analysis.createdAt).toLocaleString()}</h3>
              <p><strong>Title:</strong> {analysis.title || '-'}</p>
              <p><strong>Technologies:</strong> {analysis.technologies.map(t => t.name).join(', ') || 'None detected'}</p>
            </div>
          ))}
        </div>
      ) : (
        !loading && <div>No history found for this URL.</div>
      )}
    </div>
  );
}
