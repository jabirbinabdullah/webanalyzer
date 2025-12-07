/**
 * Custom React Hook for website analysis
 * Manages analysis state, status polling, and results
 */

import { useState, useCallback, useEffect } from 'react';
import { analyzeUrl, getAnalysisStatus, getAnalysis } from '../services/api';

export function useAnalysis() {
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);

  // Poll for status updates
  useEffect(() => {
    let interval = null;

    if (analysisId && (status === 'pending' || status === 'in-progress')) {
      interval = setInterval(async () => {
        try {
          const { status: newStatus } = await getAnalysisStatus(analysisId);
          setStatus(newStatus);

          if (newStatus === 'completed') {
            const finalResult = await getAnalysis(analysisId);
            setResult(finalResult);
            setLoading(false);
            setAnalysisId(null);
          } else if (newStatus === 'failed') {
            setError('Analysis failed. Please try again.');
            setLoading(false);
            setAnalysisId(null);
          }
        } catch (err) {
          setError(err.message || 'Failed to get analysis status');
          setLoading(false);
          setAnalysisId(null);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [analysisId, status]);

  /**
   * Submit a URL for analysis
   */
  const submitAnalysis = useCallback(async (url) => {
    try {
      setError(null);
      setResult(null);
      setLoading(true);
      setStatus('pending');

      const initialResult = await analyzeUrl(url);
      setAnalysisId(initialResult._id);
    } catch (err) {
      setError(err.message || 'Request failed');
      setLoading(false);
    }
  }, []);

  /**
   * Reset analysis state
   */
  const reset = useCallback(() => {
    setStatus(null);
    setResult(null);
    setLoading(false);
    setError(null);
    setAnalysisId(null);
  }, []);

  return {
    status,
    result,
    loading,
    error,
    analysisId,
    submitAnalysis,
    reset,
  };
}

export default useAnalysis;
