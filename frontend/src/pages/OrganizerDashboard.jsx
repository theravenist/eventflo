import React, { useState, useEffect } from 'react';
import * as apiService from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function OrganizerDashboard() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'create', 'scan'

  // Attendees list state
  const [selectedEventAttendees, setSelectedEventAttendees] = useState(null);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  // Scanner state
  const [scanResult, setScanResult] = useState(null);
  const [scanningCode, setScanningCode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);

  // Edit Event state
  const [editingEvent, setEditingEvent] = useState(null);

  // Create Event state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [ticketPrice, setTicketPrice] = useState('0');
  const [maxCapacity, setMaxCapacity] = useState('100');
  const [category, setCategory] = useState('Technology');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const { addToast } = useToast();
  const categories = ['Technology', 'Music', 'Design', 'Business', 'Arts', 'Sports'];

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsRes = await apiService.getOrganizerDashboard();
      const eventsRes = await apiService.getOrganizerEvents();
      
      setStats(statsRes.data);
      setEvents(eventsRes.data.events);
    } catch (err) {
      console.error(err);
      addToast('Failed to fetch organizer data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title || !description || !venue || !dateTime || !maxCapacity || !registrationDeadline) {
      addToast('Please fill in all required fields', 'warning');
      return;
    }

    if (new Date(registrationDeadline) >= new Date(dateTime)) {
      addToast('Registration deadline must be before event start time', 'warning');
      return;
    }

    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('venue', venue);
      formData.append('dateTime', dateTime);
      formData.append('ticketPrice', ticketPrice);
      formData.append('maxCapacity', maxCapacity);
      formData.append('category', category);
      formData.append('registrationDeadline', registrationDeadline);
      if (bannerFile) {
        formData.append('banner', bannerFile);
      }

      await apiService.createEvent(formData);
      addToast('Event created successfully!', 'success');
      
      // Reset Form
      setTitle('');
      setDescription('');
      setVenue('');
      setDateTime('');
      setTicketPrice('0');
      setMaxCapacity('100');
      setCategory('Technology');
      setRegistrationDeadline('');
      setBannerFile(null);
      
      // Refresh & Redirect
      fetchDashboardData();
      setActiveTab('overview');
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.error || 'Failed to create event', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', editingEvent.title);
      formData.append('description', editingEvent.description);
      formData.append('venue', editingEvent.venue);
      formData.append('dateTime', editingEvent.dateTime);
      formData.append('ticketPrice', editingEvent.ticketPrice);
      formData.append('maxCapacity', editingEvent.maxCapacity);
      formData.append('category', editingEvent.category);
      formData.append('registrationDeadline', editingEvent.registrationDeadline);
      formData.append('status', editingEvent.status);
      if (editingEvent.bannerFile) {
        formData.append('banner', editingEvent.bannerFile);
      }

      await apiService.updateEvent(editingEvent.id, formData);
      addToast('Event updated successfully', 'success');
      setEditingEvent(null);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.error || 'Failed to update event', 'error');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event? This performs a soft-delete.')) {
      return;
    }

    try {
      await apiService.deleteEvent(id);
      addToast('Event deleted successfully', 'success');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete event', 'error');
    }
  };

  const handleCloseRegistration = async (event) => {
    if (!window.confirm('Close registrations for this event? Status will become completed.')) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('status', 'completed');
      await apiService.updateEvent(event.id, formData);
      addToast('Registrations closed successfully', 'success');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      addToast('Failed to close registrations', 'error');
    }
  };

  const handleViewAttendees = async (eventId) => {
    setAttendeesLoading(true);
    try {
      const res = await apiService.getEventAttendees(eventId);
      setSelectedEventAttendees({
        eventId,
        list: res.data,
        eventTitle: events.find(e => e.id === eventId)?.title
      });
    } catch (err) {
      addToast('Failed to load attendee list', 'error');
    } finally {
      setAttendeesLoading(false);
    }
  };

  const handleScanTicket = async (e) => {
    e.preventDefault();
    if (!scanningCode) return;

    setScanLoading(true);
    setScanResult(null);
    try {
      const res = await apiService.scanQrCode(scanningCode);
      setScanResult({
        success: true,
        message: res.data.message,
        eventTitle: res.data.eventTitle,
        customerName: res.data.customerName
      });
      addToast('Check-in successful!', 'success');
      setScanningCode('');
    } catch (err) {
      console.error(err);
      setScanResult({
        success: false,
        error: err.response?.data?.error || 'Validation failed'
      });
      addToast(err.response?.data?.error || 'Ticket invalid', 'error');
    } finally {
      setScanLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: '2rem' }}>Organizer Panel</h2>
        <div className="skeleton" style={{ height: '120px', width: '100%', marginBottom: '2rem' }}></div>
        <div className="skeleton" style={{ height: '300px', width: '100%' }}></div>
      </div>
    );
  }

  // Draw custom SVG Line chart for trends
  const renderSVGChart = () => {
    if (!stats || !stats.bookingTrends || stats.bookingTrends.length === 0) {
      return <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '2rem' }}>No ticket sales trends recorded in the last 7 days.</p>;
    }

    const trends = stats.bookingTrends;
    const height = 180;
    const width = 500;
    const padding = 30;

    const maxVal = Math.max(...trends.map(t => t.quantity), 5);
    const minVal = 0;

    // Map trends points to SVG coords
    const points = trends.map((t, index) => {
      const x = padding + (index * (width - 2 * padding)) / (trends.length - 1 || 1);
      const y = height - padding - ((t.quantity - minVal) * (height - 2 * padding)) / (maxVal - minVal);
      return { x, y, label: t.date.slice(5), qty: t.quantity };
    });

    const dPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div style={{ textAlign: 'center' }}>
        <h4 style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1rem' }}>Ticket Booking Trends (Last 7 Days)</h4>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxHeight: '200px' }}>
          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(222, 216, 207, 0.3)" strokeWidth="1" />

          {/* Line Path */}
          <path d={dPath} fill="none" stroke="url(#chartGrad)" strokeWidth="3.5" strokeLinecap="round" />

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
            <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--secondary)" />
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
        <h2>Organizer Console</h2>
        <div style={styles.tabContainer}>
          <button 
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveTab('overview');
              fetchDashboardData();
            }}
            style={styles.tabBtn}
          >
            Dashboard
          </button>
          <button 
            className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('create')}
            style={styles.tabBtn}
          >
            Create Event
          </button>
          <button 
            className={`btn ${activeTab === 'scan' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveTab('scan');
              fetchDashboardData();
            }}
            style={styles.tabBtn}
          >
            Gate Check-in
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div>
          {/* Key Metrics cards */}
          <div style={styles.metricsGrid}>
            <div className="glass-card organic-card-1" style={styles.metricCard}>
              <span style={styles.metricLabel}>Total Events</span>
              <span style={styles.metricValue}>{stats?.totalEvents}</span>
            </div>
            <div className="glass-card organic-card-2" style={styles.metricCard}>
              <span style={styles.metricLabel}>Tickets Sold</span>
              <span style={styles.metricValue} style={{color: 'var(--secondary)'}}>{stats?.ticketsSold}</span>
            </div>
            <div className="glass-card organic-card-3" style={styles.metricCard}>
              <span style={styles.metricLabel}>Total Revenue</span>
              <span style={{ ...styles.metricValue, color: 'var(--primary)' }}>₹{stats?.revenue.toFixed(2)}</span>
            </div>
            <div className="glass-card organic-card-4" style={styles.metricCard}>
              <span style={styles.metricLabel}>Remaining Seats</span>
              <span style={styles.metricValue}>{stats?.remainingSeats}</span>
            </div>
          </div>

          <div style={styles.dashboardSplit}>
            {/* Left Column: Events Manager */}
            <div style={{ flex: 2, minWidth: '320px' }}>
              <div className="glass-card organic-card-1">
                <h3 style={{ marginBottom: '1.25rem' }}>Active Listings</h3>
                {events.length === 0 ? (
                  <p style={{ color: 'var(--muted-foreground)' }}>No events hosted yet. Click "Create Event" to launch one.</p>
                ) : (
                  <div style={styles.eventsList}>
                    {events.map((event) => (
                      <div key={event.id} style={styles.eventRow}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ color: 'var(--foreground)' }}>{event.title}</h4>
                          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
                            📅 {new Date(event.dateTime).toLocaleDateString()} | 🎟️ {event.remainingSeats} left
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={styles.actionBtn}
                            onClick={() => handleViewAttendees(event.id)}
                          >
                            Attendees
                          </button>
                          
                          {event.status === 'active' && (
                            <button 
                              className="btn btn-secondary" 
                              style={{...styles.actionBtn, color: '#f59e0b'}}
                              onClick={() => handleCloseRegistration(event)}
                            >
                              Close
                            </button>
                          )}

                          <button 
                            className="btn btn-secondary" 
                            style={styles.actionBtn}
                            onClick={() => setEditingEvent(event)}
                          >
                            Edit
                          </button>

                          <button 
                            className="btn btn-danger" 
                            style={styles.actionBtn}
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Dynamic SVG Trends chart */}
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div className="glass-card organic-card-2">
                {renderSVGChart()}
                
                {stats?.mostPopularEvent && (
                  <div style={styles.popularCard}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase' }}>Best Seller</span>
                    <h4 style={{ color: 'var(--foreground)', marginTop: '2px' }}>{stats.mostPopularEvent.title}</h4>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>Bookings count: {stats.mostPopularEvent.bookingsCount}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="glass-card organic-card-1" style={styles.formCard}>
          <h3>Launch New Event</h3>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Fill in details to release tickets instantly.</p>

          <form onSubmit={handleCreateEvent}>
            <div style={styles.formRow}>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Event Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Corporate Blockchain Forum" 
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Category</label>
                <select 
                  className="form-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ appearance: 'auto' }}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea 
                placeholder="Write detailed agenda, target audience, schedule, etc..." 
                className="form-input"
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div style={styles.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Venue Location</label>
                <input 
                  type="text" 
                  placeholder="e.g. Auditorium C, Tech Hub center" 
                  className="form-input"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Banner Image (Optional)</label>
                <input 
                  type="file" 
                  className="form-input" 
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files[0])}
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Event Date & Time</label>
                <input 
                  type="datetime-local" 
                  className="form-input"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Registration Deadline</label>
                <input 
                  type="datetime-local" 
                  className="form-input"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Ticket Price (₹)</label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  className="form-input"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Max Seating Capacity</label>
                <input 
                  type="number" 
                  min="1" 
                  className="form-input"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={submitLoading}
            >
              {submitLoading ? 'Releasing Event...' : 'Release Tickets'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'scan' && (
        <div style={styles.dashboardSplit}>
          {/* Scan Tool */}
          <div style={{ flex: 1 }}>
            <div className="glass-card organic-card-1">
              <h3>Simulate Gate QR Scanning</h3>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Paste the ticket string or scanned QR code content below to validate and check-in guests.
              </p>

              <form onSubmit={handleScanTicket}>
                <div className="form-group">
                  <label className="form-label">Ticket QR Code String</label>
                  <input 
                    type="text" 
                    placeholder="e.g. EVENTHUB-E1C20600-..." 
                    className="form-input"
                    value={scanningCode}
                    onChange={(e) => setScanningCode(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={scanLoading}>
                  {scanLoading ? 'Checking...' : 'Check-In Passenger'}
                </button>
              </form>

              {scanResult && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  borderRadius: '8px',
                  background: scanResult.success ? 'rgba(93, 112, 82, 0.08)' : 'rgba(168, 84, 72, 0.08)',
                  border: `1px solid ${scanResult.success ? 'rgba(93, 112, 82, 0.2)' : 'rgba(168, 84, 72, 0.2)'}`
                }}>
                  {scanResult.success ? (
                    <div>
                      <h4 style={{ color: 'var(--primary)' }}>✅ Valid Pass</h4>
                      <p style={{ color: 'var(--foreground)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{scanResult.message}</p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginTop: '2px' }}>
                        Passenger: <strong>{scanResult.customerName}</strong> | Event: {scanResult.eventTitle}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h4 style={{ color: 'var(--destructive)' }}>❌ Invalid Pass</h4>
                      <p style={{ color: 'var(--foreground)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{scanResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick instructions panel */}
          <div style={{ flex: 1 }}>
            <div className="glass-card organic-card-2">
              <h3>Quick Testing Instructions</h3>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '0.75rem' }}>
                To test the Ticket Scanner check-in workflow:
              </p>
              <ul style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', paddingLeft: '1.25rem', marginTop: '0.5rem', lineHeight: 1.6 }}>
                <li>Log in as a Customer.</li>
                <li>Book tickets for the "Global Tech Summit 2026".</li>
                <li>Go to your dashboard, click "View QR", and copy the **Ticket QR Code Content** (e.g. <code>EVENTHUB-e1c20600-c4c20600-...</code>).</li>
                <li>Switch back to the Organizer dashboard scanning tab, paste the code, and scan.</li>
                <li>Attempting to scan the same code a second time will throw a duplicate scan error!</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal popup */}
      {editingEvent && (
        <div style={styles.modalOverlay} onClick={() => setEditingEvent(null)}>
          <div className="glass-card" style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Edit Event</h3>
            
            <form onSubmit={handleUpdateEvent} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Event Title</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input"
                  rows="3"
                  value={editingEvent.description}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Venue Location</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={editingEvent.venue}
                  onChange={(e) => setEditingEvent({ ...editingEvent, venue: e.target.value })}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Price (₹)</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={editingEvent.ticketPrice}
                    onChange={(e) => setEditingEvent({ ...editingEvent, ticketPrice: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Capacity</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={editingEvent.maxCapacity}
                    onChange={(e) => setEditingEvent({ ...editingEvent, maxCapacity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Status</label>
                  <select 
                    className="form-input"
                    value={editingEvent.status}
                    onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value })}
                    style={{ appearance: 'auto' }}
                  >
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Category</label>
                  <select 
                    className="form-input"
                    value={editingEvent.category}
                    onChange={(e) => setEditingEvent({ ...editingEvent, category: e.target.value })}
                    style={{ appearance: 'auto' }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingEvent(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendees list drawer/modal */}
      {selectedEventAttendees && (
        <div style={styles.modalOverlay} onClick={() => setSelectedEventAttendees(null)}>
          <div className="glass-card organic-card-1" style={{ ...styles.modalContent, maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <h3>Attendees List: {selectedEventAttendees.eventTitle}</h3>
              <button onClick={() => setSelectedEventAttendees(null)} style={styles.closeModalBtn}>✕</button>
            </div>

            {selectedEventAttendees.list.length === 0 ? (
              <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '2rem' }}>No tickets booked for this event yet.</p>
            ) : (
              <div style={styles.attendeesList}>
                {selectedEventAttendees.list.map((attendee) => (
                  <div key={attendee.id} style={styles.attendeeRow}>
                    <div>
                      <strong style={{ color: 'var(--foreground)' }}>{attendee.user_name}</strong>
                      <div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{attendee.user_email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>Quantity: {attendee.ticket_quantity}</div>
                      <div style={{ fontSize: '0.75rem' }}>
                        {attendee.scanned_at ? (
                          <span style={{ color: 'var(--primary)' }}>✓ Scanned ({new Date(attendee.scanned_at).toLocaleTimeString()})</span>
                        ) : (
                          <span style={{ color: 'var(--muted-foreground)' }}>Pending Entry</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => setSelectedEventAttendees(null)}>
              Dismiss
            </button>
          </div>
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2.5rem',
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
  dashboardSplit: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap',
    marginTop: '2rem',
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  eventRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  actionBtn: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.75rem',
  },
  popularCard: {
    marginTop: '1.5rem',
    background: 'rgba(93, 112, 82, 0.08)',
    border: '1px solid rgba(93, 112, 82, 0.2)',
    borderRadius: '8px',
    padding: '1rem',
  },
  formCard: {
    maxWidth: '750px',
    margin: '0 auto',
  },
  formRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(44, 44, 36, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: '1.5rem',
  },
  modalContent: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  closeModalBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--muted-foreground)',
    fontSize: '1.1rem',
    cursor: 'pointer',
  },
  attendeesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  attendeeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid var(--border)',
  }
};
