import React, { useState, useEffect } from 'react';
import * as apiService from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function CustomerDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQrBooking, setActiveQrBooking] = useState(null);
  const { addToast } = useToast();

  const fetchBookings = async () => {
    try {
      const res = await apiService.getBookings();
      setBookings(res.data);
    } catch (err) {
      console.error(err);
      addToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This will refund your payment and release your seats.')) {
      return;
    }

    try {
      await apiService.cancelBooking(bookingId);
      addToast('Booking successfully cancelled and seats released.', 'success');
      fetchBookings(); // refresh list
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.error || 'Failed to cancel booking', 'error');
    }
  };

  const handleDownloadQr = (qrCodeDataUrl, eventTitle) => {
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `ticket-${eventTitle.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('QR ticket downloaded successfully', 'success');
  };

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: '1.5rem' }}>My Bookings</h2>
        <div className="skeleton" style={{ height: '80px', width: '100%', marginBottom: '1rem' }}></div>
        <div className="skeleton" style={{ height: '80px', width: '100%', marginBottom: '1rem' }}></div>
        <div className="skeleton" style={{ height: '80px', width: '100%', marginBottom: '1rem' }}></div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="ambient-blob-1"></div>
      <div className="ambient-blob-2"></div>
      <h2 style={{ marginBottom: '1.5rem' }}>My Bookings</h2>

      {bookings.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No Bookings Found</h3>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>You haven't booked any event tickets yet.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {bookings.map(({ booking, event }, index) => {
            const isConfirmed = booking.status === 'confirmed';
            const eventDate = new Date(event.date);
            const isPast = eventDate < new Date();
            const cardClass = index % 2 === 0 ? 'organic-card-1' : 'organic-card-2';
            
            return (
              <div key={booking.id} className={`glass-card ${cardClass}`} style={styles.bookingRow}>
                {/* Event Thumbnail */}
                <img 
                  src={event.bannerUrl.startsWith('http') ? event.bannerUrl : `http://localhost:5000${event.bannerUrl}`} 
                  alt={event.title} 
                  style={styles.bannerImage}
                  onError={(e) => {
                    e.target.src = 'https://picsum.photos/seed/placeholder/800/400';
                  }}
                />

                <div style={styles.detailsBlock}>
                  <span style={styles.eventCategory}>
                    {eventDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <h3 style={styles.eventTitle}>{event.title}</h3>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>📍 {event.venue}</p>
                </div>

                <div style={styles.statsBlock}>
                  <div style={styles.statGroup}>
                    <span style={styles.statLabel}>Tickets</span>
                    <strong style={{ color: 'var(--foreground)' }}>{booking.ticketQuantity}</strong>
                  </div>
                  <div style={styles.statGroup}>
                    <span style={styles.statLabel}>Total Paid</span>
                    <strong style={{ color: 'var(--foreground)' }}>₹{parseFloat(booking.totalPrice).toFixed(2)}</strong>
                  </div>
                </div>

                <div style={styles.actionsBlock}>
                  {/* Status Badge */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', justifyContent: 'flex-end' }}>
                    {isConfirmed ? (
                      isPast ? (
                        <span className="badge badge-info">Ended</span>
                      ) : (
                        <span className="badge badge-success">Confirmed</span>
                      )
                    ) : (
                      <span className="badge badge-danger">Cancelled</span>
                    )}
                  </div>

                  {/* Booking Action buttons */}
                  {isConfirmed && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => setActiveQrBooking(booking)} 
                        className="btn btn-secondary" 
                        style={styles.actionBtn}
                      >
                        🎟️ View QR
                      </button>
                      
                      {!isPast && (
                        <button 
                          onClick={() => handleCancel(booking.id)} 
                          className="btn btn-danger" 
                          style={styles.actionBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Ticket Popup Modal */}
      {activeQrBooking && (
        <div style={styles.modalOverlay} onClick={() => setActiveQrBooking(null)}>
          <div className="glass-card organic-card-1" style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <h3>Ticket Entry QR Pass</h3>
              <button onClick={() => setActiveQrBooking(null)} style={styles.closeModalBtn}>✕</button>
            </div>
            
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>
              Present this code at the venue gate. The organizer will scan it to check you in.
            </p>

            <div style={styles.qrContainer}>
              <img src={activeQrBooking.qrCode} alt="Entry Pass QR Code" style={styles.qrImage} />
            </div>

            <p style={styles.qrText}>
              Quantity: <strong>{activeQrBooking.ticketQuantity} ticket(s)</strong>
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={() => {
                  const matchingBooking = bookings.find(b => b.booking.id === activeQrBooking.id);
                  handleDownloadQr(activeQrBooking.qrCode, matchingBooking?.event.title || 'ticket');
                }}
              >
                Download PNG
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setActiveQrBooking(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  bookingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap',
    padding: '1.25rem',
  },
  bannerImage: {
    width: '120px',
    height: '75px',
    objectFit: 'cover',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  detailsBlock: {
    flex: 2,
    minWidth: '200px',
  },
  eventCategory: {
    fontSize: '0.75rem',
    color: 'var(--primary)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '2px',
    display: 'block',
  },
  eventTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--foreground)',
    marginBottom: '2px',
  },
  statsBlock: {
    display: 'flex',
    gap: '2.5rem',
    flex: 1,
    justifyContent: 'center',
    minWidth: '150px',
  },
  statGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--muted-foreground)',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  actionsBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    minWidth: '180px',
  },
  actionBtn: {
    padding: '0.4rem 0.9rem',
    fontSize: '0.75rem',
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
    padding: '1rem',
  },
  modalContent: {
    width: '100%',
    maxWidth: '400px',
  },
  closeModalBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    fontSize: '1.1rem',
    cursor: 'pointer',
  },
  qrContainer: {
    background: '#fff',
    padding: '1rem',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1.25rem auto',
    width: '220px',
    height: '220px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrText: {
    textAlign: 'center',
    fontSize: '0.9rem',
    color: '#94a3b8',
  }
};
