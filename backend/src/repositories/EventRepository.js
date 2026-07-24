import pool from '../config/db.js';
import { Event } from '../models/Event.js';

export class EventRepository {
  static mapRowToEvent(row) {
    if (!row) return null;
    return new Event({
      id: row.id,
      title: row.title,
      description: row.description,
      bannerUrl: row.banner_url,
      venue: row.venue,
      dateTime: row.date_time,
      ticketPrice: row.ticket_price,
      maxCapacity: row.max_capacity,
      remainingSeats: row.remaining_seats,
      category: row.category,
      registrationDeadline: row.registration_deadline,
      status: row.status,
      createdBy: row.created_by,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async findById(id) {
    const res = await pool.query('SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL', [id]);
    return EventRepository.mapRowToEvent(res.rows[0]);
  }

  async findByIdIncludeDeleted(id) {
    const res = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    return EventRepository.mapRowToEvent(res.rows[0]);
  }

  async findAll({
    search = '',
    category = '',
    dateFilter = '', // 'upcoming', 'past', 'today'
    sort = 'newest', // 'newest', 'price_asc', 'price_desc', 'popularity'
    limit = 10,
    offset = 0,
    organizerId = null
  } = {}) {
    let queryText = `
      SELECT e.*, COUNT(b.id) as booking_count, u.name as organizer_name 
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id AND b.status = 'confirmed'
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.deleted_at IS NULL
    `;
    const queryParams = [];
    let paramIndex = 1;

    // Filters
    if (search) {
      queryText += ` AND (e.title ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex} OR e.venue ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      queryText += ` AND e.category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (organizerId) {
      queryText += ` AND e.created_by = $${paramIndex}`;
      queryParams.push(organizerId);
      paramIndex++;
    }

    const now = new Date().toISOString();
    if (dateFilter === 'upcoming') {
      queryText += ` AND e.date_time >= $${paramIndex}`;
      queryParams.push(now);
      paramIndex++;
    } else if (dateFilter === 'past') {
      queryText += ` AND e.date_time < $${paramIndex}`;
      queryParams.push(now);
      paramIndex++;
    } else if (dateFilter === 'today') {
      queryText += ` AND e.date_time::date = CURRENT_DATE`;
    }

    queryText += ` GROUP BY e.id, u.name`;

    // Sorting
    if (sort === 'price_asc') {
      queryText += ` ORDER BY e.ticket_price ASC, e.date_time ASC`;
    } else if (sort === 'price_desc') {
      queryText += ` ORDER BY e.ticket_price DESC, e.date_time ASC`;
    } else if (sort === 'popularity') {
      queryText += ` ORDER BY booking_count DESC, e.date_time ASC`;
    } else {
      // Default to newest
      queryText += ` ORDER BY e.created_at DESC`;
    }

    // Pagination
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const res = await pool.query(queryText, queryParams);
    return res.rows.map(row => {
      const event = EventRepository.mapRowToEvent(row);
      return {
        ...event,
        organizerName: row.organizer_name,
        bookingCount: parseInt(row.booking_count, 10)
      };
    });
  }

  async countAll({
    search = '',
    category = '',
    dateFilter = '',
    organizerId = null
  } = {}) {
    let queryText = `SELECT COUNT(*) FROM events WHERE deleted_at IS NULL`;
    const queryParams = [];
    let paramIndex = 1;

    if (search) {
      queryText += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR venue ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      queryText += ` AND category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (organizerId) {
      queryText += ` AND created_by = $${paramIndex}`;
      queryParams.push(organizerId);
      paramIndex++;
    }

    const now = new Date().toISOString();
    if (dateFilter === 'upcoming') {
      queryText += ` AND date_time >= $${paramIndex}`;
      queryParams.push(now);
      paramIndex++;
    } else if (dateFilter === 'past') {
      queryText += ` AND date_time < $${paramIndex}`;
      queryParams.push(now);
      paramIndex++;
    } else if (dateFilter === 'today') {
      queryText += ` AND date_time::date = CURRENT_DATE`;
    }

    const res = await pool.query(queryText, queryParams);
    return parseInt(res.rows[0].count, 10);
  }

  async create({
    title,
    description,
    bannerUrl,
    venue,
    dateTime,
    ticketPrice,
    maxCapacity,
    category,
    registrationDeadline,
    createdBy
  }) {
    const res = await pool.query(
      `INSERT INTO events (title, description, banner_url, venue, date_time, ticket_price, max_capacity, remaining_seats, category, registration_deadline, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10)
       RETURNING *`,
      [title, description, bannerUrl, venue, dateTime, ticketPrice, maxCapacity, category, registrationDeadline, createdBy]
    );
    return EventRepository.mapRowToEvent(res.rows[0]);
  }

  async update(id, {
    title,
    description,
    bannerUrl,
    venue,
    dateTime,
    ticketPrice,
    maxCapacity,
    category,
    registrationDeadline,
    status
  }) {
    // Note: If capacity is updated, we adjust remaining seats carefully
    // To keep it simple, we fetch current remaining seats and adjust
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const currentRes = await client.query('SELECT max_capacity, remaining_seats FROM events WHERE id = $1 FOR UPDATE', [id]);
      if (currentRes.rows.length === 0) {
        throw new Error('Event not found');
      }
      const current = currentRes.rows[0];
      const capacityDiff = maxCapacity - current.max_capacity;
      const newRemaining = Math.max(0, current.remaining_seats + capacityDiff);

      const updateRes = await client.query(
        `UPDATE events 
         SET title = $1, description = $2, banner_url = COALESCE($3, banner_url), venue = $4, 
             date_time = $5, ticket_price = $6, max_capacity = $7, remaining_seats = $8, 
             category = $9, registration_deadline = $10, status = $11, updated_at = NOW()
         WHERE id = $12
         RETURNING *`,
        [title, description, bannerUrl, venue, dateTime, ticketPrice, maxCapacity, newRemaining, category, registrationDeadline, status, id]
      );
      await client.query('COMMIT');
      return EventRepository.mapRowToEvent(updateRes.rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async softDelete(id) {
    const res = await pool.query(
      'UPDATE events SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return EventRepository.mapRowToEvent(res.rows[0]);
  }

  // Dashboard calculations for an organizer
  async getOrganizerDashboardStats(organizerUserId) {
    // 1. Get events details
    const eventsRes = await pool.query(
      `SELECT 
         COUNT(*) as total_events,
         COALESCE(SUM(max_capacity), 0) as total_capacity,
         COALESCE(SUM(remaining_seats), 0) as total_remaining
       FROM events 
       WHERE created_by = $1 AND deleted_at IS NULL`,
      [organizerUserId]
    );

    // 2. Tickets sold and total revenue
    const bookingRes = await pool.query(
      `SELECT 
         COALESCE(SUM(b.ticket_quantity), 0) as tickets_sold,
         COALESCE(SUM(b.total_price), 0) as total_revenue
       FROM bookings b
       JOIN events e ON b.event_id = e.id
       WHERE e.created_by = $1 AND b.status = 'confirmed' AND e.deleted_at IS NULL`,
      [organizerUserId]
    );

    // 3. Most popular event (by confirmed booking count)
    const popularRes = await pool.query(
      `SELECT e.id, e.title, COUNT(b.id) as bookings_count
       FROM events e
       LEFT JOIN bookings b ON e.id = b.event_id AND b.status = 'confirmed'
       WHERE e.created_by = $1 AND e.deleted_at IS NULL
       GROUP BY e.id
       ORDER BY bookings_count DESC
       LIMIT 1`,
      [organizerUserId]
    );

    // 4. Booking trends (last 7 days bookings)
    const trendsRes = await pool.query(
      `SELECT 
         b.created_at::date as booking_date,
         SUM(b.ticket_quantity) as quantity
       FROM bookings b
       JOIN events e ON b.event_id = e.id
       WHERE e.created_by = $1 AND b.status = 'confirmed' 
         AND b.created_at >= NOW() - INTERVAL '7 days'
         AND e.deleted_at IS NULL
       GROUP BY b.created_at::date
       ORDER BY booking_date ASC`,
      [organizerUserId]
    );

    const stats = eventsRes.rows[0];
    const bookings = bookingRes.rows[0];
    const popular = popularRes.rows[0];

    return {
      totalEvents: parseInt(stats.total_events, 10),
      ticketsSold: parseInt(bookings.tickets_sold, 10),
      revenue: parseFloat(bookings.total_revenue),
      remainingSeats: parseInt(stats.total_remaining, 10),
      mostPopularEvent: popular ? { id: popular.id, title: popular.title, bookingsCount: parseInt(popular.bookings_count, 10) } : null,
      bookingTrends: trendsRes.rows.map(row => ({
        date: row.booking_date.toISOString().split('T')[0],
        quantity: parseInt(row.quantity, 10)
      }))
    };
  }

  // Dashboard calculations for global admin
  async getAdminDashboardStats() {
    // 1. Total users by role
    const usersRes = await pool.query(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role`
    );

    // 2. Total active events
    const eventsRes = await pool.query(
      `SELECT COUNT(*) as count FROM events WHERE deleted_at IS NULL`
    );

    // 3. Platform financial stats
    const financesRes = await pool.query(
      `SELECT 
         COALESCE(SUM(total_price), 0) as total_revenue,
         COUNT(*) as total_bookings
       FROM bookings 
       WHERE status = 'confirmed'`
    );

    // 4. Growth trend (users joined in past 30 days grouped by week)
    const growthRes = await pool.query(
      `SELECT 
         DATE_TRUNC('week', created_at) as week_start,
         COUNT(*) as new_users
       FROM users
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY week_start
       ORDER BY week_start ASC`
    );

    const rolesMap = { visitor: 0, customer: 0, organizer: 0, admin: 0 };
    usersRes.rows.forEach(r => {
      rolesMap[r.role] = parseInt(r.count, 10);
    });

    return {
      usersCount: rolesMap,
      totalEvents: parseInt(eventsRes.rows[0].count, 10),
      totalRevenue: parseFloat(financesRes.rows[0].total_revenue),
      totalBookings: parseInt(financesRes.rows[0].total_bookings),
      growthTrends: growthRes.rows.map(row => ({
        week: row.week_start.toISOString().split('T')[0],
        newUsers: parseInt(row.new_users, 10)
      }))
    };
  }
}
