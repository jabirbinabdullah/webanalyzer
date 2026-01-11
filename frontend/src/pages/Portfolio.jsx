import React, { useState, useEffect } from 'react';
import { getPortfolio, deletePortfolioItem } from '../services/api';

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const data = await getPortfolio();
        setPortfolio(data);
      } catch (err) {
        setError(
          err.response?.data?.error ||
            err.message ||
            'Failed to fetch portfolio'
        );
      } finally {
        setLoading(false);
      }
    }
    fetchPortfolio();
  }, []);

  const handleDelete = async (itemId) => {
    try {
      const updatedPortfolio = await deletePortfolioItem(itemId);
      setPortfolio(updatedPortfolio);
    } catch (err) {
      alert(
        'Failed to delete item. ' + (err.response?.data?.error || err.message)
      );
    }
  };

  if (loading) {
    return <div>Loading portfolio...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="portfolio-page">
      <h2>My Portfolio</h2>
      {portfolio && portfolio.items.length > 0 ? (
        <ul className="portfolio-list">
          {portfolio.items.map((item) => (
            <li key={item._id} className="portfolio-item">
              <div>
                <strong>{item.name}</strong>
                <p>{item.url}</p>
              </div>
              <button
                onClick={() => handleDelete(item._id)}
                className="btn btn-danger"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          Your portfolio is empty. Analyze a URL and add it to your portfolio.
        </p>
      )}
    </div>
  );
}
