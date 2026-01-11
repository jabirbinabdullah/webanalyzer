import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
});

// Add request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to standardize error handling
api.interceptors.response.use(
  (response) => response, // Directly return successful responses
  (error) => {
    // Extract a meaningful error message from the backend response
    const message =
      error.response?.data?.error?.message || // Backend's structured error
      error.response?.data?.error || // Sometimes just a string
      error.message; // Fallback to the default error message

    // Reject a new promise with the simplified message
    return Promise.reject(new Error(message));
  }
);

export async function analyzeUrl(url, types = []) {
  const res = await api.get(`/api/analyze`, {
    params: {
      url,
      types, // Axios will serialize the array into multiple `types=` query params
    },
    // To handle arrays in query parameters correctly if needed
    paramsSerializer: (params) => {
      const searchParams = new URLSearchParams();
      for (const key in params) {
        if (Array.isArray(params[key])) {
          for (const val of params[key]) {
            searchParams.append(key, val);
          }
        } else {
          searchParams.append(key, params[key]);
        }
      }
      return searchParams.toString();
    },
  });
  return res.data;
}

export async function getAnalyses() {
  const res = await api.get(`/api/analyses`);
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

export async function exportReport(analysisId, format = 'pdf') {
  const response = await api.post(
    `/api/report`,
    { analysisId, format },
    { responseType: 'blob' }
  );

  const contentType = response.headers['content-type'];
  const blob = new Blob([response.data], { type: contentType });

  // Extract filename from content-disposition header
  let filename = `report.${format}`; // Default filename
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

export async function getProfile() {
  const res = await api.get('/api/auth/me');
  return res.data;
}

export async function updateProfile(profileData) {
  const res = await api.put('/api/auth/me', profileData);
  return res.data;
}

export async function getApiKeys() {
  const res = await api.get('/api/keys');
  return res.data;
}

export async function generateApiKey() {
  const res = await api.post('/api/keys');
  return res.data;
}

export async function deleteApiKey(keyId) {
  const res = await api.delete(`/api/keys/${keyId}`);
  return res.data;
}
export async function getDashboardStats() {
  const res = await api.get('/api/dashboard/stats');
  return res.data;
}
