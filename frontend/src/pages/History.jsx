import React, { useState, useEffect } from 'react';
import { getAnalyses } from '../services/api';

export default function History() {
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const res = await getAnalyses();
        setAnalyses(res);
      } catch (err) {
        setError(err.message || 'Failed to fetch history');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  return (
    <div className="history">
      <h2>Your Analysis History</h2>

      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}

      {analyses.length > 0 ? (
        <div className="history-list">
          {analyses.map((analysis) => (
            <div key={analysis._id} className="history-item">
              <h3>{analysis.url}</h3>
              <p>
                <strong>Analyzed on:</strong>{' '}
                {new Date(analysis.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Title:</strong> {analysis.title || '-'}
              </p>
              <p>
                <strong>Technologies:</strong>{' '}
                {analysis.technologies.map((t) => t.name).join(', ') ||
                  'None detected'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        !loading && <div>You have no analysis history.</div>
      )}
    </div>
  );
}
