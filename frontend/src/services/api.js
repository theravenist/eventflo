import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle Refresh Tokens on 401/403
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401/403 and has not been retried yet
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        console.log('Access token expired, attempting to refresh...');
        const res = await axios.post('http://localhost:5000/api/auth/refresh', {}, {
          withCredentials: true // send cookies
        });
        
        const { accessToken } = res.data;
        localStorage.setItem('accessToken', accessToken);
        
        // Re-run original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token expired or invalid. Logging out.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        
        // Trigger page redirect to login if appropriate
        if (window.location.pathname !== '/login' && window.location.pathname !== '/' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (data) => api.post('/auth/register', data);
export const logout = () => api.post('/auth/logout');
export const getProfile = () => api.get('/users/profile');

export const getEvents = (params) => api.get('/events', { params });
export const getEventById = (id) => api.get(`/events/${id}`);
export const createEvent = (formData) => api.post('/events', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateEvent = (id, formData) => api.put(`/events/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteEvent = (id) => api.delete(`/events/${id}`);

export const getOrganizerDashboard = () => api.get('/organizer/dashboard');
export const getOrganizerEvents = () => api.get('/organizer/events');

export const createBooking = (eventId, ticketQuantity) => api.post('/bookings', { eventId, ticketQuantity });
export const getBookings = () => api.get('/bookings');
export const cancelBooking = (id) => api.delete(`/bookings/${id}`);

export const getEventAttendees = (eventId) => api.get(`/bookings/event/${eventId}/attendees`);
export const scanQrCode = (qrCode) => api.post('/bookings/scan', { qrCode });

export const getAdminDashboard = () => api.get('/admin/dashboard');
export const getAdminUsers = () => api.get('/admin/users');
export const updateAdminUserRole = (userId, role) => api.put(`/admin/users/${userId}/role`, { role });
export const removeAdminEvent = (id) => api.delete(`/admin/events/${id}`);

export const requestPasswordReset = (email) => api.post('/auth/request-password-reset', { email });
export const resetPassword = (token, newPassword) => api.post('/auth/reset-password', { token, newPassword });
