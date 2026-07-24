import eventService from '../services/EventService.js';

export class EventController {
  async getEvents(req, res, next) {
    try {
      const { search, category, dateFilter, sort, limit = 10, offset = 0 } = req.query;
      
      const result = await eventService.getAllEvents({
        search,
        category,
        dateFilter,
        sort,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getEvent(req, res, next) {
    try {
      const { id } = req.params;
      const event = await eventService.getEventById(id);
      return res.json(event);
    } catch (error) {
      next(error);
    }
  }

  async createEvent(req, res, next) {
    try {
      const { title, description, venue, dateTime, ticketPrice, maxCapacity, category, registrationDeadline } = req.body;
      
      // Request validation
      if (!title || !description || !venue || !dateTime || maxCapacity === undefined || !category || !registrationDeadline) {
        return res.status(400).json({ error: 'Missing required event fields' });
      }

      const eventData = {
        title,
        description,
        venue,
        dateTime,
        ticketPrice: parseFloat(ticketPrice || 0),
        maxCapacity: parseInt(maxCapacity, 10),
        category,
        registrationDeadline
      };

      const event = await eventService.createEvent(eventData, req.file, req.user.id);
      return res.status(201).json({ message: 'Event created successfully', event });
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req, res, next) {
    try {
      const { id } = req.params;
      const { title, description, venue, dateTime, ticketPrice, maxCapacity, category, registrationDeadline, status } = req.body;
      
      const eventData = {
        title,
        description,
        venue,
        dateTime,
        ticketPrice: ticketPrice ? parseFloat(ticketPrice) : undefined,
        maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : undefined,
        category,
        registrationDeadline,
        status
      };

      const event = await eventService.updateEvent(id, eventData, req.file, req.user.id, req.user.role);
      return res.json({ message: 'Event updated successfully', event });
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req, res, next) {
    try {
      const { id } = req.params;
      await eventService.deleteEvent(id, req.user.id, req.user.role);
      return res.json({ message: 'Event deleted successfully (soft delete)' });
    } catch (error) {
      next(error);
    }
  }

  async getOrganizerDashboard(req, res, next) {
    try {
      if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied: organizers only' });
      }

      // Check if organizer profile is requested
      const stats = await eventService.getOrganizerDashboard(req.user.id);
      return res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getOrganizerEvents(req, res, next) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const result = await eventService.getAllEvents({
        organizerId: req.user.id,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new EventController();
