import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
});

// Add a request interceptor to include the token in headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});


export async function analyzeUrl(url) {
  const res = await api.get(`/api/analyze`, { params: { url } });
  return res.data;
}

export async function getAnalysesForUrl(url) {
  const res = await api.get(`/api/analyses`, { params: { url } });
  return res.data;
}

export async function getAnalysisStatus(analysisId) {
  const res = await api.get(`/api/analysis/${analysisId}/status`);
  return res.data;
}

export async function getAnalysis(analysisId) {
    const res = await api.get(`/api/analysis/${analysisId}`);
    return res.data;
}

export async function exportPdf(analysisId) {
  const response = await api.post(`/api/report`,
    { analysisId },
    { responseType: 'blob' }
  );
  const blob = new Blob([response.data], { type: 'application/pdf' });

  // Extract filename from content-disposition header
  let filename = 'report.pdf';
  const contentDisposition = response.headers['content-disposition'];
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="([^"]+)"/);
    if (match) {
      filename = match[1];
    }
  }

  // Create a link and trigger the download
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
}

export async function register(name, email, password) {
  const res = await api.post(`/api/auth/register`, { name, email, password });
  return res.data;
}

export async function login(email, password) {
  const res = await api.post(`/api/auth/login`, { email, password });
  return res.data;
}

export async function getPortfolio() {
  const res = await api.get('/api/portfolio');
  return res.data;
}

export async function addPortfolioItem(url, name) {
  const res = await api.post('/api/portfolio', { url, name });
  return res.data;
}

export async function deletePortfolioItem(itemId) {
  const res = await api.delete(`/api/portfolio/${itemId}`);
  return res.data;
}

