
const API_BASE = '/api';

const api = {
  token: localStorage.getItem('hc_token'),
  user: JSON.parse(localStorage.getItem('hc_user') || 'null'),

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('hc_token', token);
    localStorage.setItem('hc_user', JSON.stringify(user));
  },

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('hc_token');
    localStorage.removeItem('hc_user');
  },

  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (this.token) opts.headers['Authorization'] = `Bearer ${this.token}`;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error de servidor');
    return data;
  },

  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  put: (path, body) => api.request('PUT', path, body),
  delete: (path) => api.request('DELETE', path),

  // Auth
  login: (email, password) => api.post('/login', { email, password }),
  me: () => api.get('/me'),

  // Users
  getUsers: () => api.get('/users'),
  createUser: (data) => api.post('/users', data),
  deleteUser: (id) => api.delete(`/users/${id}`),

  // Drills
  getDrills: () => api.get('/drills'),
  createDrill: (data) => api.post('/drills', data),
  updateDrill: (id, data) => api.put(`/drills/${id}`, data),
  deleteDrill: (id) => api.delete(`/drills/${id}`),

  // Sessions
  getSessions: () => api.get('/sessions'),
  createSession: (data) => api.post('/sessions', data),
  updateSession: (id, data) => api.put(`/sessions/${id}`, data),
  deleteSession: (id) => api.delete(`/sessions/${id}`),
};
