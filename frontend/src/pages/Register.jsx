import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');

  // Organizer details
  const [companyName, setCompanyName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');

  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      addToast('Please fill in all standard fields', 'warning');
      return;
    }

    if (role === 'organizer' && !companyName) {
      addToast('Company Name is required for event organizers', 'warning');
      return;
    }

    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        role,
        companyName,
        bio,
        website
      });
      addToast('Registration successful! Check console log mock emails.', 'success');
      navigate('/login');
    } catch (err) {
      console.error(err);
      addToast(err || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-card organic-card-2" style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.subtitle}>Join EventFlo as a customer to browse & buy, or as an organizer to list events.</p>

        <form onSubmit={handleRegister} style={{ marginTop: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              placeholder="John Doe" 
              className="form-input" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
            <label className="form-label">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="form-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role Type</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input 
                  type="radio" 
                  name="role" 
                  value="customer" 
                  checked={role === 'customer'}
                  onChange={() => setRole('customer')}
                  style={{ marginRight: '6px' }}
                />
                Customer
              </label>
              <label style={styles.radioLabel}>
                <input 
                  type="radio" 
                  name="role" 
                  value="organizer" 
                  checked={role === 'organizer'}
                  onChange={() => setRole('organizer')}
                  style={{ marginRight: '6px' }}
                />
                Organizer
              </label>
            </div>
          </div>

          {/* Organizer specific inputs */}
          {role === 'organizer' && (
            <div style={styles.organizerSection}>
              <h4 style={styles.sectionHeader}>Organizer Information</h4>
              
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input 
                  type="text" 
                  placeholder="Apex Events Ltd" 
                  className="form-input" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company Bio</label>
                <textarea 
                  placeholder="Brief description of your events profile..." 
                  className="form-input" 
                  rows="3"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Website</label>
                <input 
                  type="url" 
                  placeholder="https://apexevents.com" 
                  className="form-input" 
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1.5rem' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div style={styles.footerText}>
          Already have an account? <Link to="/login" style={styles.loginLink}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '75vh',
    padding: '2.5rem 0',
  },
  card: {
    width: '100%',
    maxWidth: '500px',
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
  radioGroup: {
    display: 'flex',
    gap: '2rem',
    marginTop: '0.5rem',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.9rem',
    cursor: 'pointer',
    color: 'var(--foreground)',
    fontWeight: 600,
  },
  organizerSection: {
    borderTop: '1px solid var(--border)',
    paddingTop: '1.25rem',
    marginTop: '1.5rem',
  },
  sectionHeader: {
    fontSize: '0.9rem',
    color: 'var(--secondary)',
    marginBottom: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  footerText: {
    textAlign: 'center',
    marginTop: '1.5rem',
    fontSize: '0.85rem',
    color: 'var(--muted-foreground)',
  },
  loginLink: {
    color: 'var(--primary)',
    textDecoration: 'none',
    fontWeight: 700,
  }
};
