import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export function createApiClient(getAccessToken) {
  const client = axios.create({ baseURL: BASE_URL });

  client.interceptors.request.use(async (config) => {
    try {
      const token = await getAccessToken({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE }
      });
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.warn('Could not get access token', err);
    }
    return config;
  });

  return client;
}

// CV API calls
export const cvApi = {
  upload: (client, formData, onUploadProgress) =>
    client.post('/api/cv/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    }),

  getHistory: (client) => client.get('/api/cv/history'),

  getOne: (client, id) => client.get(`/api/cv/${id}`),

  getStats: (client) => client.get('/api/cv/stats'),

  deleteOne: (client, id) => client.delete(`/api/cv/${id}`)
};
