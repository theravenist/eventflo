import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import * as apiService from '../services/api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot password states
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please fill in all fields', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      addToast(`Welcome back, ${res.user.name}!`, 'success');
      
      // Redirect based on role
      if (res.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (res.user.role === 'organizer') {
        navigate('/organizer/dashboard');
      } else {
        navigate('/customer/dashboard');
      }
    } catch (err) {
      console.error(err);
      addToast(err || 'Invalid email or password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      addToast('Please enter your email', 'warning');
      return;
    }

    setForgotLoading(true);
    try {
      await apiService.requestPasswordReset(forgotEmail);
      addToast('Password reset link sent! Check your inbox/terminal logs.', 'success');
      setForgotMode(false);
    } catch (err) {
      addToast('Failed to request reset', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-card organic-card-1" style={styles.card}>
        {!forgotMode ? (
          <>
            <h2 style={styles.title}>Sign In to <span className="gradient-brand-text">EventFlo</span></h2>
            <p style={styles.subtitle}>Enter your details below to access your tickets and dashboards.</p>

            <form onSubmit={handleLogin} style={{ marginTop: '2rem' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@company.com" 
                  className="form-input" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label className="form-label">Password</label>
                  <a href="#forgot" onClick={() => setForgotMode(true)} style={styles.forgotLink}>Forgot Password?</a>
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="form-input" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1.5rem' }}
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div style={styles.footerText}>
              Don't have an account? <Link to="/register" style={styles.registerLink}>Sign Up</Link>
            </div>
          </>
        ) : (
          <>
            <h2 style={styles.title}>Forgot Password?</h2>
            <p style={styles.subtitle}>Enter your registered email address, and we'll send you a password reset link.</p>

            <form onSubmit={handleForgotPassword} style={{ marginTop: '2rem' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@company.com" 
                  className="form-input" 
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1.5rem' }}
                disabled={forgotLoading}
              >
                {forgotLoading ? 'Sending Link...' : 'Request Reset Link'}
              </button>

              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: '0.75rem' }}
                onClick={() => setForgotMode(false)}
              >
                Back to Sign In
              </button>
            </form>
          </>
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
    minHeight: '70vh',
    padding: '2rem 0',
  },
  card: {
    width: '100%',
    maxWidth: '450px',
    padding: '2.5rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    textAlign: 'center',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--muted-foreground)',
    fontSize: '0.85rem',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  forgotLink: {
    color: 'var(--secondary)',
    fontSize: '0.75rem',
    textDecoration: 'none',
    fontWeight: 600,
  },
  footerText: {
    textAlign: 'center',
    marginTop: '1.5rem',
    fontSize: '0.85rem',
    color: 'var(--muted-foreground)',
  },
  registerLink: {
    color: 'var(--primary)',
    textDecoration: 'none',
    fontWeight: 700,
  }
};
