import React, { createContext, useState, useEffect, useContext } from 'react';
import * as apiService from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organizerProfile, setOrganizerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await apiService.getProfile();
      setUser(res.data.user);
      setOrganizerProfile(res.data.organizerProfile);
    } catch (err) {
      console.error('Auto auth check failed:', err);
      // Clean up invalid local credentials
      localStorage.removeItem('accessToken');
      setUser(null);
      setOrganizerProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loginUser = async (email, password) => {
    setLoading(true);
    try {
      const res = await apiService.login(email, password);
      const { accessToken, user: userData, organizerProfile: orgProfile } = res.data;
      
      localStorage.setItem('accessToken', accessToken);
      setUser(userData);
      setOrganizerProfile(orgProfile);
      return { success: true, user: userData };
    } catch (err) {
      setUser(null);
      setOrganizerProfile(null);
      throw err.response?.data?.error || 'Invalid credentials';
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    try {
      await apiService.logout();
    } catch (err) {
      console.warn('Backend logout failed or session already expired:', err);
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
      setOrganizerProfile(null);
      setLoading(false);
    }
  };

  const registerUser = async (data) => {
    setLoading(true);
    try {
      const res = await apiService.register(data);
      return res.data;
    } catch (err) {
      throw err.response?.data?.error || 'Registration failed';
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, organizerProfile, loading, login: loginUser, logout: logoutUser, register: registerUser, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
