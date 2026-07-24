import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as apiService from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function EventDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);

  const fetchEventDetails = async () => {
    try {
      const res = await apiService.getEventById(id);
      setEvent(res.data);
    } catch (err) {
      addToast('Event not found', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      addToast('Please login to purchase tickets', 'info');
      navigate('/login');
      return;
    }

    if (user.role === 'visitor') {
      addToast('Visitors are not permitted to buy tickets. Please request role promotion.', 'warning');
      return;
    }

    setBookingLoading(true);
    try {
      await apiService.createBooking(event.id, quantity);
      addToast('Tickets booked successfully! Confirmation email dispatched.', 'success');
      navigate('/customer/dashboard');
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.error || 'Failed to complete booking', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="skeleton" style={{ height: '300px', width: '100%', borderRadius: '12px', marginBottom: '2rem' }}></div>
        <div className="skeleton" style={{ height: '40px', width: '60%', marginBottom: '1rem' }}></div>
        <div className="skeleton" style={{ height: '20px', width: '30%', marginBottom: '2rem' }}></div>
        <div className="skeleton" style={{ height: '100px', width: '100%' }}></div>
      </div>
    );
  }

  if (!event) return null;

  const isPast = new Date(event.dateTime) < new Date();
  const isDeadlinePassed = new Date(event.registrationDeadline) < new Date();
  const remaining = parseInt(event.remainingSeats, 10);
  const price = parseFloat(event.ticketPrice);
  const canBook = remaining > 0 && !isPast && !isDeadlinePassed && (!user || user.role !== 'visitor');

  return (
    <div style={{ ...styles.container, position: 'relative' }}>
      <div className="ambient-blob-1"></div>
      <div className="ambient-blob-2"></div>
      <Link to="/" style={styles.backBtn}>← Back to Events</Link>

      <div style={styles.grid}>
        {/* Left Side: Event Poster & Description */}
        <div style={{ flex: 2 }}>
          <div className="glass-card organic-card-1" style={styles.posterCard}>
            <img 
              src={event.bannerUrl.startsWith('http') ? event.bannerUrl : `http://localhost:5000${event.bannerUrl}`} 
              alt={event.title} 
              style={styles.bannerImage}
              onError={(e) => {
                e.target.src = 'https://picsum.photos/seed/placeholder/800/400';
              }}
            />
            <div style={styles.eventInfoSection}>
              <span className="badge badge-info" style={{ marginBottom: '1rem' }}>{event.category}</span>
              <h1 style={styles.title}>{event.title}</h1>
              
              <div style={styles.metaRow}>
                <span style={styles.metaItem}>📅 {new Date(event.dateTime).toLocaleString(undefined, {
                  weekday: 'short',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
                <span style={styles.metaItem}>📍 {event.venue}</span>
              </div>

              <h2 style={styles.sectionTitle}>About this Event</h2>
              <p style={styles.description}>{event.description}</p>
            </div>
          </div>
        </div>

        {/* Right Side: Booking Panel */}
        <div style={{ flex: 1 }}>
          <div className="glass-card organic-card-2" style={styles.bookingCard}>
            <h3 style={{ marginBottom: '1.25rem' }}>Ticket Registry</h3>
            
            <div style={styles.priceRow}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Price per ticket</span>
              <span style={styles.priceValue}>
                {price === 0 ? 'FREE' : `₹${price.toFixed(2)}`}
              </span>
            </div>

            <div style={styles.detailsList}>
              <div style={styles.detailItem}>
                <span>Tickets remaining:</span>
                <strong style={remaining === 0 ? {color: '#f43f5e'} : {color: '#10b981'}}>
                  {remaining > 0 ? `${remaining} / ${event.maxCapacity}` : 'SOLD OUT'}
                </strong>
              </div>
              <div style={styles.detailItem}>
                <span>Registration Deadline:</span>
                <strong style={isDeadlinePassed ? {color: '#f43f5e'} : {color: '#f59e0b'}}>
                  {new Date(event.registrationDeadline).toLocaleDateString()}
                </strong>
              </div>
            </div>

            {canBook ? (
              <form onSubmit={handleBooking} style={{ marginTop: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="1"
                    max={remaining}
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val)) {
                        setQuantity('');
                      } else {
                        setQuantity(Math.max(1, Math.min(remaining, val)));
                      }
                    }}
                    required
                  />
                </div>

                <div style={styles.totalRow}>
                  <span>Total cost:</span>
                  <span style={styles.totalValue}>₹{(price * (quantity || 0)).toFixed(2)}</span>
                </div>

                {user ? (
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '1rem' }}
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? 'Processing Booking...' : 'Book Tickets Now'}
                  </button>
                ) : (
                  <Link 
                    to="/login" 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '1rem', textAlign: 'center' }}
                  >
                    Log In to Book
                  </Link>
                )}
              </form>
            ) : (
              <div style={styles.closedBanner}>
                {remaining === 0 ? (
                  <p style={{ color: '#ff859b', fontWeight: 600 }}>Registration closed: Event Sold Out</p>
                ) : isDeadlinePassed ? (
                  <p style={{ color: '#ff859b', fontWeight: 600 }}>Registration closed: Deadline passed</p>
                ) : isPast ? (
                  <p style={{ color: '#ff859b', fontWeight: 600 }}>Registration closed: Event ended</p>
                ) : user && user.role === 'visitor' ? (
                  <p style={{ color: '#ff859b', fontWeight: 600 }}>Visitors cannot book tickets. Contact an admin to update role.</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '1.5rem 0',
  },
  loadingContainer: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '3rem 0',
  },
  backBtn: {
    color: 'var(--primary)',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: '0.9rem',
    display: 'inline-block',
    marginBottom: '1.5rem',
  },
  grid: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  posterCard: {
    padding: 0,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    maxHeight: '380px',
    objectFit: 'cover',
    borderTopLeftRadius: '2rem',
    borderTopRightRadius: '4rem',
  },
  eventInfoSection: {
    padding: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    marginBottom: '1rem',
    color: 'var(--foreground)',
    lineHeight: 1.2,
  },
  metaRow: {
    display: 'flex',
    gap: '2rem',
    color: 'var(--muted-foreground)',
    fontSize: '0.9rem',
    fontWeight: 700,
    marginBottom: '2rem',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '1rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    marginBottom: '1rem',
    color: 'var(--foreground)',
  },
  description: {
    color: 'var(--foreground)',
    fontSize: '0.95rem',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
  bookingCard: {
    position: 'sticky',
    top: '100px',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '1rem',
    marginBottom: '1.25rem',
  },
  priceValue: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--secondary)',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    fontSize: '0.85rem',
    color: 'var(--muted-foreground)',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: '1.5rem',
    borderTop: '1px solid var(--border)',
    paddingTop: '1rem',
    color: 'var(--foreground)',
    fontWeight: 700,
  },
  totalValue: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: 'var(--foreground)',
  },
  closedBanner: {
    marginTop: '1.5rem',
    background: 'rgba(168, 84, 72, 0.08)',
    border: '1px solid rgba(168, 84, 72, 0.2)',
    padding: '1rem',
    borderRadius: '8px',
    textAlign: 'center',
  }
};
