import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  analyzeUrl,
  getAnalysis,
  getAnalysisStatus,
  exportReport,
} from '../services/api';
import AnalysisForm from '../components/AnalysisForm';
import AnalysisResults from '../components/AnalysisResults';
import { triggerFileDownload, generateFilename } from '../utils/downloadUtils';
import '../styles/performance.css';
import '../styles/security.css';

export default function Analyze() {
  const [url, setUrl] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [analysisId, setAnalysisId] = useState(null);
  const [status, setStatus] = useState(null);
  const [analysisTypes, setAnalysisTypes] = useState({
    tech: true,
    seo: true,
    performance: true,
    accessibility: true,
    security: true,
  });

  const handleAnalysisTypeChange = (event) => {
    const { name, checked } = event.target;
    setAnalysisTypes((prev) => ({ ...prev, [name]: checked }));
  };

  /* Socket.IO hook */
  const socket = useSocket();

  useEffect(() => {
    if (!analysisId || !socket) return;

    // Join the analysis room
    socket.emit('join_analysis', analysisId);

    // Define listeners
    const handleComplete = (data) => {
      // data.result contains the full object from worker
      if (data && data._id === analysisId) {
        setResult(data.result);
        setLoading(false);
        setStatus('completed');
        setAnalysisId(null);
      }
    };

    const handleFailed = (data) => {
      if (data && data._id === analysisId) {
        setError(data.error || 'Analysis failed');
        setLoading(false);
        setStatus('failed');
        setAnalysisId(null);
      }
    };

    socket.on('analysisCompleted', handleComplete);
    socket.on('analysisFailed', handleFailed);

    return () => {
      socket.off('analysisCompleted', handleComplete);
      socket.off('analysisFailed', handleFailed);
    };
  }, [analysisId, socket]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    setShowScreenshot(false);
    setStatus('pending');
    try {
      const selectedTypes = Object.keys(analysisTypes).filter(
        (key) => analysisTypes[key]
      );
      const initialResult = await analyzeUrl(url, selectedTypes);
      setAnalysisId(initialResult._id);
    } catch (err) {
      setError(err.message || 'Request failed');
      setLoading(false);
    }
  }

  function downloadJson() {
    try {
      const filename = generateFilename(result.url, 'analysis', 'json');
      triggerFileDownload(
        JSON.stringify(result, null, 2),
        filename,
        'application/json'
      );
    } catch (e) {
      console.error('Download failed', e);
      alert('Failed to download JSON');
    }
  }

  function exportCsv() {
    try {
      const escapeCsv = (v) => {
        if (v == null) return '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      };
      const headers = [
        'url',
        'title',
        'description',
        'h1',
        'metaDescriptionLength',
        'wordCount',
        'robotsTxtStatus',
        'canonical',
        'technologies',
        'tbt_ms',
        'fcp_ms',
        'tti_ms',
        'accessibility_violations',
        'sitemap_urlcount',
      ]; // Updated headers
      const row = [
        result.url,
        result.title,
        result.description,
        result.h1,
        result.seo?.descriptionLength ?? '',
        result.seo?.wordCount ?? '',
        result.seo?.robotsTxtStatus ?? '',
        result.seo?.canonical?.resolved ?? '',
        (result.technologies || []).map((t) => t.name).join('; '),
        result.performance?.metrics?.numeric?.tbt ?? '', // Corrected data access
        result.performance?.metrics?.numeric?.fcp ?? '', // Corrected data access
        result.performance?.metrics?.numeric?.tti ?? '', // Corrected data access
        (result.accessibility?.violations || []).length,
        result.seo?.sitemap?.urlCount ?? '',
      ];
      const csv = headers.join(',') + '\n' + row.map(escapeCsv).join(',');
      const filename = generateFilename(result.url, 'analysis', 'csv');
      triggerFileDownload(csv, filename, 'text/csv');
    } catch (e) {
      console.error('CSV export failed', e);
      alert('CSV export failed');
    } finally {
      setExportMenuOpen(false);
    }
  }

  async function handleExport(format) {
    if (!result?._id) return;
    setExporting(true);
    try {
      await exportReport(result._id, format);
      alert(`${format.toUpperCase()} export requested`);
    } catch (e) {
      console.error(`${format.toUpperCase()} export failed`, e);
      alert(`${format.toUpperCase()} export failed`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="analyze">
      <div style={{ marginBottom: '24px' }}>
        <h1>Website Analyzer</h1>
        <p style={{ color: '#666', marginBottom: '16px' }}>
          Analyze any website to detect technologies, SEO metrics, accessibility
          issues, and performance scores
        </p>
      </div>

      <AnalysisForm
        url={url}
        setUrl={setUrl}
        loading={loading}
        status={status}
        analysisTypes={analysisTypes}
        handleAnalysisTypeChange={handleAnalysisTypeChange}
        onSubmit={onSubmit}
      />

      {error && <div className="error">{error}</div>}

      {result && (
        <AnalysisResults
          result={result}
          exporting={exporting}
          handleExport={handleExport}
          downloadJson={downloadJson}
          exportCsv={exportCsv}
          exportMenuOpen={exportMenuOpen}
          setExportMenuOpen={setExportMenuOpen}
          showScreenshot={showScreenshot}
          setShowScreenshot={setShowScreenshot}
        />
      )}
    </div>
  );
}
