import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as apiService from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      addToast('Reset token is missing from URL', 'error');
      return;
    }

    if (password.length < 6) {
      addToast('Password must be at least 6 characters', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      addToast('Passwords do not match', 'warning');
      return;
    }

    setLoading(true);
    try {
      await apiService.resetPassword(token, password);
      addToast('Password reset successful! You can now log in.', 'success');
      navigate('/login');
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.error || 'Failed to reset password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-card" style={styles.card}>
        <h2 style={styles.title}>Reset Password</h2>
        <p style={styles.subtitle}>Choose a new secure password for your EventFlo account.</p>

        {!token ? (
          <div style={{ marginTop: '1.5rem', color: '#f43f5e', textAlign: 'center', fontSize: '0.9rem' }}>
            Invalid reset link. The reset token is missing. Please check your email or request a new link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input 
                type="password" 
                placeholder="At least 6 characters" 
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input 
                type="password" 
                placeholder="Confirm password" 
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1.5rem' }}
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '2.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 800,
    textAlign: 'center',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    textAlign: 'center',
    lineHeight: 1.5,
  }
};
