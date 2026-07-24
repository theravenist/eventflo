import bookingService from '../services/BookingService.js';

export class BookingController {
  async createBooking(req, res, next) {
    try {
      const { eventId, ticketQuantity } = req.body;
      const userId = req.user.id;

      if (!eventId || !ticketQuantity) {
        return res.status(400).json({ error: 'Event ID and ticket quantity are required' });
      }

      const booking = await bookingService.createBooking(userId, { eventId, ticketQuantity });
      return res.status(201).json({
        message: 'Booking completed successfully',
        booking
      });
    } catch (error) {
      // Send proper conflict errors for seat shortages
      if (error.message.includes('Not enough tickets') || error.message.includes('seats')) {
        return res.status(409).json({ error: error.message });
      }
      next(error);
    }
  }

  async getBookings(req, res, next) {
    try {
      const userId = req.user.id;
      const bookings = await bookingService.getBookingsByUser(userId);
      return res.json(bookings);
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const booking = await bookingService.cancelBooking(id, userId, userRole);
      return res.json({
        message: 'Booking cancelled successfully',
        booking
      });
    } catch (error) {
      next(error);
    }
  }

  async getAttendees(req, res, next) {
    try {
      const { eventId } = req.params;
      const organizerUserId = req.user.id;
      const userRole = req.user.role;

      const attendees = await bookingService.getEventAttendees(eventId, organizerUserId, userRole);
      return res.json(attendees);
    } catch (error) {
      next(error);
    }
  }

  async scanQrCode(req, res, next) {
    try {
      const { qrCode } = req.body;
      const organizerUserId = req.user.id;
      const userRole = req.user.role;

      if (!qrCode) {
        return res.status(400).json({ error: 'QR Code content is required' });
      }

      const result = await bookingService.scanQrTicket(qrCode, organizerUserId, userRole);
      return res.json({
        message: 'Check-in successful! Ticket validated.',
        eventTitle: result.event.title,
        customerName: result.customerName,
        checkin: result.checkin
      });
    } catch (error) {
      if (error.message.includes('already been scanned') || error.message.includes('Invalid ticket')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
}

export default new BookingController();
