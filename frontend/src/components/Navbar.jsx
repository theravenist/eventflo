import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      addToast('Logged out successfully', 'success');
      navigate('/');
    } catch (err) {
      addToast('Failed to logout', 'error');
    }
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <Link to="/" style={styles.logoLink}>
          <span style={styles.logoText}>Event<span style={styles.logoHighlight}>Flo</span></span>
        </Link>

        <div style={styles.linksContainer}>
          <Link to="/" style={styles.link}>Browse Events</Link>
          
          {user && (
            <>
              {(user.role === 'customer' || user.role === 'admin') && (
                <Link to="/customer/dashboard" style={styles.link}>My Tickets</Link>
              )}
              {user.role === 'organizer' && (
                <Link to="/organizer/dashboard" style={styles.link}>Organizer Panel</Link>
              )}
              {user.role === 'admin' && (
                <>
                  <Link to="/organizer/dashboard" style={styles.link}>Organizer Panel</Link>
                  <Link to="/admin/dashboard" style={styles.link}>Admin Console</Link>
                </>
              )}
            </>
          )}
        </div>

        <div style={styles.authActions}>
          {user ? (
            <div style={styles.profileBox}>
              <span style={styles.userInfo}>
                Hi, <strong style={{color: 'var(--foreground)'}}>{user.name}</strong> 
                <span style={styles.roleBadge}>{user.role}</span>
              </span>
              <button onClick={handleLogout} className="btn btn-secondary" style={styles.logoutBtn}>
                Logout
              </button>
            </div>
          ) : (
            <div style={styles.authButtons}>
              <Link to="/login" style={styles.loginBtn}>Sign In</Link>
              <Link to="/register" className="btn btn-primary" style={styles.registerBtn}>Get Started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(222, 216, 207, 0.6)',
    position: 'sticky',
    top: '1rem',
    zIndex: 1000,
    maxWidth: '1160px',
    margin: '1rem auto 0',
    borderRadius: '9999px',
    boxShadow: '0 4px 20px -2px rgba(93, 112, 82, 0.12)',
    transition: 'all 0.3s ease',
  },
  container: {
    padding: '0.6rem 1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoLink: {
    textDecoration: 'none',
  },
  logoText: {
    fontSize: '1.4rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: '#2C2C24',
    fontFamily: "'Fraunces', Georgia, serif"
  },
  logoHighlight: {
    color: '#5D7052',
  },
  linksContainer: {
    display: 'flex',
    gap: '2rem',
    marginLeft: '3rem',
    flex: 1,
  },
  link: {
    color: '#78786C',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 700,
    transition: 'color 0.2s ease',
  },
  authActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  profileBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userInfo: {
    fontSize: '0.85rem',
    color: '#78786C',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  roleBadge: {
    background: 'rgba(93, 112, 82, 0.1)',
    color: '#5D7052',
    border: '1px solid rgba(93, 112, 82, 0.25)',
    fontSize: '0.65rem',
    padding: '1px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    fontWeight: 800,
  },
  authButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  loginBtn: {
    color: '#2C2C24',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 700,
  },
  registerBtn: {
    padding: '0.5rem 1.25rem',
    fontSize: '0.85rem',
  },
  logoutBtn: {
    padding: '0.45rem 1rem',
    fontSize: '0.8rem',
  }
};
