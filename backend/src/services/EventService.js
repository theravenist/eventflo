import { EventRepository } from '../repositories/EventRepository.js';
import cacheService from './CacheService.js';
import { uploadToStorage } from '../config/s3.js';

const eventRepo = new EventRepository();

export class EventService {
  async getEventById(id) {
    const cacheKey = `event:${id}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for event details: ${id}`);
      return cached;
    }

    const event = await eventRepo.findById(id);
    if (!event) {
      throw new Error('Event not found');
    }

    // Cache for 5 minutes
    await cacheService.set(cacheKey, event, 300);
    return event;
  }

  async getAllEvents(filters = {}) {
    // Check if caching is applicable (only default queries with no search keywords)
    const isDefaultQuery = !filters.search && !filters.category && !filters.dateFilter && !filters.organizerId && filters.sort === 'newest' && parseInt(filters.limit) === 10 && parseInt(filters.offset) === 0;

    const cacheKey = isDefaultQuery ? 'events:all' : `search:${JSON.stringify(filters)}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for events list: ${cacheKey}`);
      return cached;
    }

    const events = await eventRepo.findAll(filters);
    const count = await eventRepo.countAll(filters);
    
    const result = { events, count };

    // Cache query output
    const ttl = isDefaultQuery ? 300 : 120; // 5 min default, 2 min search
    await cacheService.set(cacheKey, result, ttl);

    return result;
  }

  async createEvent(eventData, file, creatorId) {
    // Basic business validation
    if (new Date(eventData.registrationDeadline) >= new Date(eventData.dateTime)) {
      throw new Error('Registration deadline must be before the event date and time');
    }

    // Upload banner image
    let bannerUrl = 'https://picsum.photos/seed/event/800/400';
    if (file) {
      bannerUrl = await uploadToStorage(file);
    }

    const event = await eventRepo.create({
      ...eventData,
      bannerUrl,
      createdBy: creatorId
    });

    // Invalidate Redis caches
    await cacheService.invalidateEventCaches();
    await cacheService.invalidateOrganizerDashboard(creatorId);

    return event;
  }

  async updateEvent(id, eventData, file, userId, userRole) {
    const existing = await eventRepo.findById(id);
    if (!existing) {
      throw new Error('Event not found');
    }

    // Authorization: only event creator or admin can update
    if (userRole !== 'admin' && existing.createdBy !== userId) {
      throw new Error('You are not authorized to update this event');
    }

    if (new Date(eventData.registrationDeadline) >= new Date(eventData.dateTime)) {
      throw new Error('Registration deadline must be before the event date and time');
    }

    // Handle new banner image
    let bannerUrl = null;
    if (file) {
      bannerUrl = await uploadToStorage(file);
    }

    const updatedEvent = await eventRepo.update(id, {
      ...eventData,
      bannerUrl,
    });

    // Invalidate caches
    await cacheService.invalidateEventCaches(id);
    await cacheService.invalidateOrganizerDashboard(existing.createdBy);

    return updatedEvent;
  }

  async deleteEvent(id, userId, userRole) {
    const existing = await eventRepo.findById(id);
    if (!existing) {
      throw new Error('Event not found');
    }

    // Authorization
    if (userRole !== 'admin' && existing.createdBy !== userId) {
      throw new Error('You are not authorized to delete this event');
    }

    const deleted = await eventRepo.softDelete(id);

    // Invalidate caches
    await cacheService.invalidateEventCaches(id);
    await cacheService.invalidateOrganizerDashboard(existing.createdBy);

    return deleted;
  }

  async getOrganizerDashboard(organizerUserId) {
    const cacheKey = `dashboard:${organizerUserId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for organizer dashboard: ${organizerUserId}`);
      return cached;
    }

    const stats = await eventRepo.getOrganizerDashboardStats(organizerUserId);
    
    // Cache for 1 minute
    await cacheService.set(cacheKey, stats, 60);
    return stats;
  }
}

export default new EventService();
