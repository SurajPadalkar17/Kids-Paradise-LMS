// Use relative path for Vercel deployment
// If VITE_API_BASE is '/api', use empty string to avoid duplicate /api in the URL
const API_BASE = import.meta.env.VITE_API_BASE === '/api' ? '' : (import.meta.env.VITE_API_BASE || '');

export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  },

  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  },

  put: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  },

  delete: async (endpoint: string) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  },
};

// Student API
export const studentApi = {
  getAll: () => api.get('/api/students'),
  create: (data: any) => api.post('/api/students', data),
  update: (id: string, data: any) => api.put(`/api/students/${id}`, data),
  delete: (id: string) => api.delete(`/api/students/${id}`),
};

// Book API
export const bookApi = {
  getAll: () => api.get('/api/books'),
  create: (data: any) => api.post('/api/books', data),
  update: (id: string, data: any) => api.put(`/api/books/${id}`, data),
  delete: (id: string) => api.delete(`/api/books/${id}`),
};
