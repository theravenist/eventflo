import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as apiService from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dateFilter, setDateFilter] = useState('upcoming');
  const [sort, setSort] = useState('newest');
  const [totalCount, setTotalCount] = useState(0);
  const { addToast } = useToast();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await apiService.getEvents({
        search,
        category,
        dateFilter,
        sort,
        limit: 12,
        offset: 0
      });
      setEvents(res.data.events);
      setTotalCount(res.data.count);
    } catch (err) {
      console.error(err);
      addToast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchEvents();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search, category, dateFilter, sort]);

  const categories = ['Technology', 'Music', 'Design', 'Business', 'Arts', 'Sports'];

  return (
    <div style={{ position: 'relative' }}>
      <div className="ambient-blob-1"></div>
      <div className="ambient-blob-2"></div>
      {/* Hero Header */}
      <header style={styles.hero}>
        <h1 style={styles.heroTitle}>
          Discover & Experience <span className="gradient-brand-text">Incredible Events</span>
        </h1>
        <p style={styles.heroSubtitle}>
          Reserve your spot at the most exclusive tech summits, neon music festivals, and elite design workshops.
        </p>

        {/* Dynamic Search & Filters Row */}
        <div className="glass-card" style={styles.searchCard}>
          <div style={styles.searchGrid}>
            <div style={{ flex: 2 }}>
              <label className="form-label">Search Events</label>
              <input 
                type="text" 
                placeholder="Search title, venue, or details..." 
                className="form-input" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <label className="form-label">Category</label>
              <select 
                className="form-input" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ appearance: 'auto' }}
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label className="form-label">Date</label>
              <select 
                className="form-input" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ appearance: 'auto' }}
              >
                <option value="upcoming">Upcoming Events</option>
                <option value="today">Happening Today</option>
                <option value="past">Past Events</option>
                <option value="">All Dates</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label className="form-label">Sort By</label>
              <select 
                className="form-input" 
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{ appearance: 'auto' }}
              >
                <option value="newest">Newest Added</option>
                <option value="popularity">Most Popular</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Section */}
      <main style={{ marginTop: '2rem' }}>
        <div style={styles.sectionHeader}>
          <h2>{search || category ? 'Search Results' : 'Trending & Upcoming'}</h2>
          <span style={styles.countText}>{totalCount} events found</span>
        </div>

        {loading ? (
          <div className="grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card" style={{ height: '350px' }}>
                <div className="skeleton" style={{ height: '180px', marginBottom: '1rem' }}></div>
                <div className="skeleton" style={{ height: '24px', width: '70%', marginBottom: '0.75rem' }}></div>
                <div className="skeleton" style={{ height: '16px', width: '40%', marginBottom: '1rem' }}></div>
                <div className="skeleton" style={{ height: '36px', width: '100%' }}></div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="glass-card" style={styles.emptyCard}>
            <h3>No Events Found</h3>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Try clearing your search terms or choosing a different filter.</p>
            <button 
              className="btn btn-primary" 
              onClick={() => { setSearch(''); setCategory(''); setDateFilter('upcoming'); }}
              style={{ marginTop: '1.25rem' }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid-cols-3">
            {events.map((event, index) => {
              const remaining = parseInt(event.remainingSeats, 10);
              const price = parseFloat(event.ticketPrice);
              const isPast = new Date(event.dateTime) < new Date();
              const cardClass = `organic-card-${(index % 4) + 1}`;
              
              return (
                <div key={event.id} className={`glass-card ${cardClass}`} style={styles.eventCard}>
                  <div style={styles.cardBannerContainer}>
                    <img 
                      src={event.bannerUrl.startsWith('http') ? event.bannerUrl : `http://localhost:5000${event.bannerUrl}`} 
                      alt={event.title} 
                      style={styles.cardBanner}
                      onError={(e) => {
                        e.target.src = 'https://picsum.photos/seed/placeholder/800/400';
                      }}
                    />
                    <span style={styles.categoryBadge}>{event.category}</span>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.cardMeta}>
                      <span style={styles.cardDate}>
                        {new Date(event.dateTime).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <span style={price === 0 ? styles.freeBadge : styles.priceTag}>
                        {price === 0 ? 'FREE' : `₹${price.toFixed(2)}`}
                      </span>
                    </div>

                    <h3 style={styles.cardTitle}>{event.title}</h3>
                    <p style={styles.cardVenue}>📍 {event.venue}</p>

                    <div style={styles.cardFooter}>
                      {remaining === 0 ? (
                        <span className="badge badge-danger">Sold Out</span>
                      ) : isPast ? (
                        <span className="badge badge-warning">Event Ended</span>
                      ) : (
                        <span className="badge badge-success">{remaining} Seats Left</span>
                      )}
                      
                      <Link to={`/events/${event.id}`} className="btn btn-primary" style={styles.bookBtn}>
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  hero: {
    textAlign: 'center',
    padding: '3.5rem 1rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: '2.75rem',
    fontWeight: 800,
    lineHeight: 1.2,
    marginBottom: '1rem',
    maxWidth: '800px',
  },
  heroSubtitle: {
    color: 'var(--muted-foreground)',
    fontSize: '1.05rem',
    maxWidth: '640px',
    marginBottom: '3rem',
    lineHeight: 1.6,
  },
  searchCard: {
    width: '100%',
    maxWidth: '960px',
    padding: '1.5rem',
  },
  searchGrid: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--border)',
  },
  countText: {
    color: '#64748b',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  emptyCard: {
    textAlign: 'center',
    padding: '4rem 2rem',
  },
  eventCard: {
    padding: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  cardBannerContainer: {
    position: 'relative',
    height: '180px',
    width: '100%',
    overflow: 'hidden',
  },
  cardBanner: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.5s ease',
  },
  categoryBadge: {
    position: 'absolute',
    top: '1rem',
    left: '1rem',
    background: 'rgba(253, 252, 248, 0.9)',
    backdropFilter: 'blur(4px)',
    border: '1px solid var(--border)',
    color: 'var(--primary)',
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    borderRadius: '6px',
    textTransform: 'uppercase',
  },
  cardBody: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  cardDate: {
    color: 'var(--primary)',
    fontWeight: 700,
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  priceTag: {
    fontSize: '1rem',
    fontWeight: 800,
    color: 'var(--foreground)',
  },
  freeBadge: {
    fontSize: '0.85rem',
    fontWeight: 800,
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  cardTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    lineHeight: 1.3,
    marginBottom: '0.5rem',
    color: 'var(--foreground)',
  },
  cardVenue: {
    color: 'var(--muted-foreground)',
    fontSize: '0.825rem',
    marginBottom: '1.25rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    borderTop: '1px solid var(--border)',
    paddingTop: '0.75rem',
  },
  bookBtn: {
    padding: '0.45rem 1rem',
    fontSize: '0.8rem',
  }
};
