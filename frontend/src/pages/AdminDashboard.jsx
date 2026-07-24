import React, { useState, useEffect } from 'react';
import * as apiService from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'users', 'events'
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await apiService.getAdminDashboard();
      const usersRes = await apiService.getAdminUsers();
      const eventsRes = await apiService.getEvents({ limit: 100 }); // fetch active events

      setStats(statsRes.data);
      setUsersList(usersRes.data.users);
      setEventsList(eventsRes.data.events);
    } catch (err) {
      console.error(err);
      addToast('Failed to fetch admin dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await apiService.updateAdminUserRole(userId, newRole);
      addToast('User role updated successfully', 'success');
      fetchData(); // refresh
    } catch (err) {
      console.error(err);
      addToast('Failed to update user role', 'error');
    }
  };

  const handleRemoveEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to remove this event as an Administrator? The event will be soft-deleted.')) {
      return;
    }

    try {
      await apiService.removeAdminEvent(eventId);
      addToast('Event removed successfully', 'success');
      fetchData(); // refresh
    } catch (err) {
      console.error(err);
      addToast('Failed to remove event', 'error');
    }
  };

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: '2rem' }}>Admin Console</h2>
        <div className="skeleton" style={{ height: '120px', width: '100%', marginBottom: '2rem' }}></div>
        <div className="skeleton" style={{ height: '300px', width: '100%' }}></div>
      </div>
    );
  }

  const renderSVGGrowthChart = () => {
    if (!stats || !stats.growthTrends || stats.growthTrends.length === 0) {
      return <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>No registration growth trends recorded in the last 30 days.</p>;
    }

    const trends = stats.growthTrends;
    const height = 180;
    const width = 500;
    const padding = 40;

    const maxVal = Math.max(...trends.map(t => t.newUsers), 5);
    const minVal = 0;

    const points = trends.map((t, index) => {
      const x = padding + (index * (width - 2 * padding)) / (trends.length - 1 || 1);
      const y = height - padding - ((t.newUsers - minVal) * (height - 2 * padding)) / (maxVal - minVal);
      return { x, y, label: t.week.slice(5, 10), qty: t.newUsers };
    });

    const dPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div style={{ textAlign: 'center' }}>
        <h4 style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Platform Growth (New Users Joined Weekly)</h4>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxHeight: '180px' }}>
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(222, 216, 207, 0.3)" strokeWidth="1" />

          {/* Area fill */}
          <path d={`${dPath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`} fill="url(#areaGrad)" />

          {/* Line Path */}
          <path d={dPath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />

          {/* Dots & Labels */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="5" fill="var(--secondary)" stroke="var(--bg-dark)" strokeWidth="2" />
              <text x={p.x} y={height - padding + 18} fill="var(--muted-foreground)" fontSize="9" textAnchor="middle">{p.label}</text>
              <text x={p.x} y={p.y - 8} fill="var(--foreground)" fontSize="9" fontWeight="700" textAnchor="middle">{p.qty}</text>
            </g>
          ))}

          {/* Gradients */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(93, 112, 82, 0.3)" />
              <stop offset="100%" stopColor="rgba(93, 112, 82, 0.0)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="ambient-blob-1"></div>
      <div className="ambient-blob-2"></div>
      <div style={styles.header}>
        <h2>Admin Operations Dashboard</h2>
        <div style={styles.tabContainer}>
          <button 
            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveTab('analytics');
              fetchData();
            }}
            style={styles.tabBtn}
          >
            Analytics
          </button>
          <button 
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveTab('users');
              fetchData();
            }}
            style={styles.tabBtn}
          >
            Manage Users ({usersList.length})
          </button>
          <button 
            className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveTab('events');
              fetchData();
            }}
            style={styles.tabBtn}
          >
            Remove Events ({eventsList.length})
          </button>
        </div>
      </div>

      {activeTab === 'analytics' && (
        <div>
          {/* Key metrics cards */}
          <div style={styles.metricsGrid}>
            <div className="glass-card organic-card-1" style={styles.metricCard}>
              <span style={styles.metricLabel}>Total Registered Users</span>
              <span style={styles.metricValue}>{stats?.totalUsers}</span>
            </div>
            <div className="glass-card organic-card-2" style={styles.metricCard}>
              <span style={styles.metricLabel}>Active Events Listed</span>
              <span style={styles.metricValue} style={{color: 'var(--primary)'}}>{stats?.totalEvents}</span>
            </div>
            <div className="glass-card organic-card-3" style={styles.metricCard}>
              <span style={styles.metricLabel}>Total Platform Revenue</span>
              <span style={{ ...styles.metricValue, color: 'var(--primary)' }}>₹{stats?.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="glass-card organic-card-4" style={styles.metricCard}>
              <span style={styles.metricLabel}>Registered Organizers</span>
              <span style={styles.metricValue} style={{color: 'var(--secondary)'}}>{stats?.activeOrganizers}</span>
            </div>
          </div>

          <div style={{ maxWidth: '640px', margin: '2rem auto 0' }} className="glass-card organic-card-1">
            {renderSVGGrowthChart()}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-card organic-card-1">
          <h3 style={{ marginBottom: '1.25rem' }}>Platform Users Registry</h3>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Full Name</th>
                  <th style={styles.th}>Email Address</th>
                  <th style={styles.th}>Current Role</th>
                  <th style={styles.th}>Permissions Action</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(({ user, organizerProfile }) => (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{user.name}</strong>
                      {organizerProfile && (
                        <div style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                          Company: {organizerProfile.company_name}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>
                      <span className={`badge ${
                        user.role === 'admin' ? 'badge-danger' : 
                        user.role === 'organizer' ? 'badge-info' : 'badge-success'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <select 
                        value={user.role}
                        className="form-input"
                        style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem', appearance: 'auto' }}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                      >
                        <option value="customer">Promote/Demote: Customer</option>
                        <option value="organizer">Promote/Demote: Organizer</option>
                        <option value="admin">Promote/Demote: Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="glass-card organic-card-2">
          <h3 style={{ marginBottom: '1.25rem' }}>Inappropriate Events Revocation Console</h3>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            As an Administrator, you can cancel and remove any listing that breaches platform guidelines.
          </p>

          {eventsList.length === 0 ? (
            <p style={{ color: '#64748b' }}>No active events found.</p>
          ) : (
            <div style={styles.adminEventsList}>
              {eventsList.map((event) => (
                <div key={event.id} style={styles.adminEventRow}>
                  <div>
                    <h4 style={{ color: 'var(--foreground)' }}>{event.title}</h4>
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
                      Category: {event.category} | Created By Organizer: <strong>{event.organizerName || 'Apex Corp'}</strong>
                    </span>
                  </div>
                  <button 
                    onClick={() => handleRemoveEvent(event.id)} 
                    className="btn btn-danger"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                  >
                    Delete Listing
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  tabContainer: {
    display: 'flex',
    gap: '0.5rem',
  },
  tabBtn: {
    padding: '0.5rem 1.25rem',
    fontSize: '0.85rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1rem',
  },
  metricCard: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: '0.75rem',
    color: 'var(--muted-foreground)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  },
  metricValue: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--foreground)',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '2px solid var(--border)',
  },
  th: {
    padding: '0.75rem 1rem',
    color: 'var(--muted-foreground)',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.2s ease',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: 'var(--foreground)',
  },
  adminEventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  adminEventRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--border)',
    gap: '1rem',
  }
};
