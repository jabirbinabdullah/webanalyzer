import React from 'react';

const analysisOptions = [
  { key: 'tech', label: 'Tech Stack' },
  { key: 'seo', label: 'SEO' },
  { key: 'performance', label: 'Performance' },
  { key: 'accessibility', label: 'Accessibility' },
  { key: 'security', label: 'Security' },
];

export default function AnalysisForm({
  url,
  setUrl,
  loading,
  status,
  analysisTypes,
  handleAnalysisTypeChange,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="form">
      <input
        aria-label="url-input"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="input"
        placeholder="https://example.com"
      />

      <div
        style={{
          margin: '16px 0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'center',
        }}
      >
        {analysisOptions.map((option) => (
          <label
            key={option.key}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              name={option.key}
              checked={analysisTypes[option.key]}
              onChange={handleAnalysisTypeChange}
              style={{ marginRight: '8px' }}
            />
            {option.label}
          </label>
        ))}
      </div>

      <button type="submit" disabled={loading} className="btn">
        {loading ? `Scanning... (${status})` : 'Analyze'}
      </button>
    </form>
  );
}
