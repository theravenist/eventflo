import QRCode from 'qrcode';
import { BookingRepository } from '../repositories/BookingRepository.js';
import { EventRepository } from '../repositories/EventRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import cacheService from './CacheService.js';
import emailService from './EmailService.js';

const bookingRepo = new BookingRepository();
const eventRepo = new EventRepository();
const userRepo = new UserRepository();

export class BookingService {
  async getBookingsByUser(userId) {
    return await bookingRepo.findByUserId(userId);
  }

  async createBooking(userId, { eventId, ticketQuantity }) {
    // 1. Precheck event details (unlocked)
    const event = await eventRepo.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const qty = parseInt(ticketQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Invalid ticket quantity');
    }

    const totalPrice = event.ticketPrice * qty;
    
    // Generate unique code for the ticket
    const uniqueSalt = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ticketCode = `EVENTFLO-${eventId.substring(0,8)}-${userId.substring(0,8)}-${uniqueSalt}`;
    
    // Generate QR code data URI
    const qrCodeDataUrl = await QRCode.toDataURL(ticketCode);

    // 2. Perform concurrent transactional allocation
    const booking = await bookingRepo.createBookingWithLock(
      userId,
      eventId,
      qty,
      totalPrice,
      qrCodeDataUrl // Store the data url
    );

    // 3. Clear cache
    await cacheService.invalidateEventCaches(eventId);
    await cacheService.invalidateOrganizerDashboard(event.createdBy);

    // 4. Send Confirmation Email
    const user = await userRepo.findById(userId);
    if (user) {
      await emailService.sendBookingConfirmationEmail(user.email, user.name, {
        eventTitle: event.title,
        quantity: qty,
        totalPrice: totalPrice,
        qrCode: ticketCode
      });
    }

    return booking;
  }

  async cancelBooking(bookingId, userId, userRole) {
    const isAdmin = userRole === 'admin';
    
    // Perform cancel transaction (reverts seat counts)
    const booking = await bookingRepo.cancelBookingWithLock(bookingId, userId, isAdmin);

    // Get event detail to clear cache
    const event = await eventRepo.findByIdIncludeDeleted(booking.eventId);
    
    // Clear cache
    await cacheService.invalidateEventCaches(booking.eventId);
    if (event) {
      await cacheService.invalidateOrganizerDashboard(event.createdBy);
    }

    // Send email notification
    const user = await userRepo.findById(booking.userId);
    if (user && event) {
      await emailService.sendBookingCancellationEmail(user.email, user.name, {
        eventTitle: event.title,
        quantity: booking.ticketQuantity,
        refundedAmount: booking.totalPrice
      });
    }

    return booking;
  }

  async getEventAttendees(eventId, organizerUserId, userRole) {
    // Verify authority: event must belong to organizer, or user is admin
    const event = await eventRepo.findByIdIncludeDeleted(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (userRole !== 'admin' && event.createdBy !== organizerUserId) {
      throw new Error('You are not authorized to view attendees for this event');
    }

    return await bookingRepo.findAttendeesByEvent(eventId);
  }

  async scanQrTicket(qrCodeDataUrl, organizerUserId, userRole) {
    // 1. Fetch booking by matching the QR data URL
    const booking = await bookingRepo.findByQrCode(qrCodeDataUrl);
    if (!booking) {
      throw new Error('Invalid ticket: QR Code does not match any booking');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Invalid ticket: This booking has been cancelled');
    }

    // 2. Fetch associated event
    const event = await eventRepo.findByIdIncludeDeleted(booking.eventId);
    if (!event) {
      throw new Error('Associated event not found');
    }

    // 3. Verify scanner permission: Scanner must be the event organizer or admin
    if (userRole !== 'admin' && event.createdBy !== organizerUserId) {
      throw new Error('You are not authorized to scan tickets for this event');
    }

    // 4. Perform the check-in (atomic unique insert)
    const checkin = await bookingRepo.checkInBooking(booking.id, organizerUserId);
    
    const customer = await userRepo.findById(booking.userId);

    return {
      checkin,
      booking,
      event,
      customerName: customer ? customer.name : 'Unknown'
    };
  }
}

export default new BookingService();
