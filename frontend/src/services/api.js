import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

export async function analyzeUrl(url) {
  const res = await axios.get(`${API_BASE}/api/analyze`, { params: { url } });
  return res.data;
}

export async function getAnalysesForUrl(url) {
  const res = await axios.get(`${API_BASE}/api/analyses`, { params: { url } });
  return res.data;
}
