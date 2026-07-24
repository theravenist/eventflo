import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../config/redis.js';

// Generic rate limiter builder
export const createLimiter = ({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' } = {}) => {
  const options = {
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
    message: { error: message }
  };

  // If Redis is connected, use RedisStore for distributed rate limiting
  if (redisClient.isOpen) {
    options.store = new RedisStore({
      // @ts-expect-error - Redis client v4 type discrepancy in rate-limit-redis
      sendCommand: (...args) => redisClient.sendCommand(args),
    });
    console.log('Rate limiter configured with Redis storage');
  } else {
    console.warn('Redis is not connected. Rate limiter falling back to in-memory storage');
  }

  return rateLimit(options);
};

// Strict limiter for authentication endpoints (login, register)
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per IP per 15 minutes
  message: 'Too many authentication attempts. Please try again after 15 minutes.'
});

// General API request limiter
export const apiLimiter = createLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many API requests. Rate limit exceeded.'
});
