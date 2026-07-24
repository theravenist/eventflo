import { EventRepository } from '../repositories/EventRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import cacheService from './CacheService.js';

const eventRepo = new EventRepository();
const userRepo = new UserRepository();

export class AdminService {
  async getAdminDashboard() {
    // Can optionally cache this, e.g., key 'admin:dashboard'
    const cacheKey = 'admin:dashboard';
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log('Cache hit for Admin dashboard stats');
      return cached;
    }

    const stats = await eventRepo.getAdminDashboardStats();

    // Fetch total organizers count from users table
    const organizersCount = stats.usersCount.organizer || 0;

    const formattedStats = {
      ...stats,
      activeOrganizers: organizersCount,
      totalUsers: Object.values(stats.usersCount).reduce((a, b) => a + b, 0)
    };

    // Cache for 1 minute
    await cacheService.set(cacheKey, formattedStats, 60);

    return formattedStats;
  }

  async listUsers(filters) {
    const users = await userRepo.findAll(filters);
    const total = await userRepo.countAll();
    return { users, total };
  }

  async updateUserRole(userId, role) {
    const updated = await userRepo.updateRole(userId, role);
    
    // Clear admin dashboard cache
    await cacheService.del('admin:dashboard');
    
    return updated;
  }

  async removeEvent(eventId) {
    // Admin soft delete
    const deleted = await eventRepo.softDelete(eventId);
    
    // Invalidate event caches
    await cacheService.invalidateEventCaches(eventId);
    await cacheService.del('admin:dashboard');
    
    return deleted;
  }
}

export default new AdminService();
