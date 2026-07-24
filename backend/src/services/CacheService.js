import redisClient from '../config/redis.js';

export class CacheService {
  constructor() {
    this.client = redisClient;
  }

  async get(key) {
    try {
      if (!this.client.isOpen) return null;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error(`Redis GET error for key ${key}:`, err);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      if (!this.client.isOpen) return false;
      const strVal = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, strVal);
      } else {
        await this.client.set(key, strVal);
      }
      return true;
    } catch (err) {
      console.error(`Redis SET error for key ${key}:`, err);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.client.isOpen) return false;
      await this.client.del(key);
      return true;
    } catch (err) {
      console.error(`Redis DEL error for key ${key}:`, err);
      return false;
    }
  }

  // Delete all keys matching a pattern (e.g. "search:*")
  async delPattern(pattern) {
    try {
      if (!this.client.isOpen) return false;
      const keys = await this.client.keys(pattern);
      if (keys && keys.length > 0) {
        await this.client.del(keys);
        console.log(`Cleared Redis keys for pattern "${pattern}":`, keys);
      }
      return true;
    } catch (err) {
      console.error(`Redis delPattern error for pattern ${pattern}:`, err);
      return false;
    }
  }

  // Helper to purge related event caches
  async invalidateEventCaches(eventId = null) {
    await this.del('events:all');
    await this.del('events:trending');
    await this.delPattern('search:*');
    
    if (eventId) {
      await this.del(`event:${eventId}`);
    }
  }

  // Helper to invalidate organizer dashboard cache
  async invalidateOrganizerDashboard(organizerId) {
    if (organizerId) {
      await this.del(`dashboard:${organizerId}`);
    }
  }
}

export default new CacheService();
