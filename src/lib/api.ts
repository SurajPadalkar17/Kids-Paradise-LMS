// Handle both development and production environments
const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:4001'  // Use local server in development
  : (import.meta.env.VITE_API_BASE || '/api');  // Use /api in production (will be rewritten by Vercel)

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
