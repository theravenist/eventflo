import pool from '../config/db.js';
import { Booking } from '../models/Booking.js';

export class BookingRepository {
  static mapRowToBooking(row) {
    if (!row) return null;
    return new Booking({
      id: row.id,
      userId: row.user_id,
      eventId: row.event_id,
      ticketQuantity: row.ticket_quantity,
      totalPrice: row.total_price,
      qrCode: row.qr_code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  async findById(id) {
    const res = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    return BookingRepository.mapRowToBooking(res.rows[0]);
  }

  async findByQrCode(qrCode) {
    const res = await pool.query('SELECT * FROM bookings WHERE qr_code = $1', [qrCode]);
    return BookingRepository.mapRowToBooking(res.rows[0]);
  }

  async findByUserId(userId) {
    const res = await pool.query(
      `SELECT b.*, e.title as event_title, e.date_time as event_date, e.venue as event_venue, e.banner_url as event_banner
       FROM bookings b
       JOIN events e ON b.event_id = e.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return res.rows.map(row => ({
      booking: BookingRepository.mapRowToBooking(row),
      event: {
        title: row.event_title,
        date: row.event_date,
        venue: row.event_venue,
        bannerUrl: row.event_banner
      }
    }));
  }

  async findAttendeesByEvent(eventId) {
    const res = await pool.query(
      `SELECT b.*, u.name as user_name, u.email as user_email, c.scanned_at
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN checkins c ON b.id = c.booking_id
       WHERE b.event_id = $1 AND b.status = 'confirmed'
       ORDER BY b.created_at DESC`,
      [eventId]
    );
    return res.rows;
  }

  // PREVENT OVERBOOKING: Main Transaction using FOR UPDATE row locking
  async createBookingWithLock(userId, eventId, ticketQuantity, totalPrice, qrCode) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock the event row
      const eventRes = await client.query(
        `SELECT remaining_seats, ticket_price, registration_deadline, status, max_capacity 
         FROM events 
         WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [eventId]
      );

      if (eventRes.rows.length === 0) {
        throw new Error('Event not found or has been deleted');
      }

      const event = eventRes.rows[0];

      // 2. Business validations
      if (event.status !== 'active') {
        throw new Error('This event is no longer active');
      }

      if (new Date() > new Date(event.registration_deadline)) {
        throw new Error('The registration deadline for this event has passed');
      }

      if (parseInt(event.remaining_seats, 10) < ticketQuantity) {
        throw new Error(`Not enough tickets available. Remaining tickets: ${event.remaining_seats}`);
      }

      // 3. Deduct seats from event
      await client.query(
        `UPDATE events 
         SET remaining_seats = remaining_seats - $1, updated_at = NOW() 
         WHERE id = $2`,
        [ticketQuantity, eventId]
      );

      // 4. Create the booking record
      const bookingRes = await client.query(
        `INSERT INTO bookings (user_id, event_id, ticket_quantity, total_price, qr_code, status) 
         VALUES ($1, $2, $3, $4, $5, 'confirmed') 
         RETURNING *`,
        [userId, eventId, ticketQuantity, totalPrice, qrCode]
      );

      const booking = bookingRes.rows[0];

      // 5. Create a payment record (automatic success simulation for this assignment)
      await client.query(
        `INSERT INTO payments (booking_id, amount, payment_method, status, transaction_id) 
         VALUES ($1, $2, 'Credit Card', 'completed', $3)`,
        [booking.id, totalPrice, 'txn_' + Math.random().toString(36).substring(2, 15)]
      );

      await client.query('COMMIT');
      return BookingRepository.mapRowToBooking(booking);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // CANCEL BOOKING: Release Seats Transaction
  async cancelBookingWithLock(bookingId, userId, isAdmin = false) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch and Lock the booking row
      const bookingRes = await client.query(
        'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
        [bookingId]
      );

      if (bookingRes.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingRes.rows[0];

      if (booking.status === 'cancelled') {
        throw new Error('Booking is already cancelled');
      }

      // Authorization check (only owner or administrator can cancel)
      if (!isAdmin && booking.user_id !== userId) {
        throw new Error('You are not authorized to cancel this booking');
      }

      // 2. Fetch and Lock the event row
      const eventRes = await client.query(
        'SELECT id, registration_deadline, remaining_seats, max_capacity FROM events WHERE id = $1 FOR UPDATE',
        [booking.event_id]
      );

      if (eventRes.rows.length === 0) {
        throw new Error('Associated event not found');
      }

      const event = eventRes.rows[0];

      // Verify cancellation deadline (cannot cancel after registration deadline)
      if (!isAdmin && new Date() > new Date(event.registration_deadline)) {
        throw new Error('Cancellation deadline (registration deadline) has passed');
      }

      // 3. Update booking status
      await client.query(
        "UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
        [bookingId]
      );

      // 4. Update payment status to refunded/failed
      await client.query(
        "UPDATE payments SET status = 'failed' WHERE booking_id = $1",
        [bookingId]
      );

      // 5. Release seats back to event
      await client.query(
        `UPDATE events 
         SET remaining_seats = LEAST(max_capacity, remaining_seats + $1), updated_at = NOW() 
         WHERE id = $2`,
        [booking.ticket_quantity, booking.event_id]
      );

      await client.query('COMMIT');
      return BookingRepository.mapRowToBooking({
        ...booking,
        status: 'cancelled'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // QR CHECK-IN SCANNING
  async checkInBooking(bookingId, scannedByUserId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify if already checked in
      const checkinRes = await client.query(
        'SELECT * FROM checkins WHERE booking_id = $1',
        [bookingId]
      );

      if (checkinRes.rows.length > 0) {
        throw new Error('Ticket has already been scanned and used');
      }

      // 2. Log checkin
      const insertRes = await client.query(
        `INSERT INTO checkins (booking_id, scanned_by) 
         VALUES ($1, $2) 
         RETURNING *`,
        [bookingId, scannedByUserId]
      );

      await client.query('COMMIT');
      return insertRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
