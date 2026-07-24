import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository.js';
import cacheService from './CacheService.js';
import emailService from './EmailService.js';
import dotenv from 'dotenv';

dotenv.config();

const userRepo = new UserRepository();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_access_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_2026';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const REFRESH_TOKEN_EXPIRY_SEC = 7 * 24 * 60 * 60; // 7 days in sec

export class AuthenticationService {
  generateTokens(user) {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  async register({ email, password, name, role, companyName, bio, website }) {
    const existing = await userRepo.findByEmail(email);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepo.create({ email, passwordHash, name, role });

    // If role is organizer, create organizer profile
    if (role === 'organizer') {
      const actualCompanyName = companyName || `${name} Ltd`;
      await userRepo.createOrganizerProfile(user.id, actualCompanyName, bio, website);
    }

    // Send confirmation email
    await emailService.sendRegistrationEmail(user.email, user.name);

    return user;
  }

  async login(email, password) {
    const user = await userRepo.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const tokens = this.generateTokens(user);

    // Save refresh token to Redis for revocation checking
    await cacheService.set(`refresh_token:${user.id}`, tokens.refreshToken, REFRESH_TOKEN_EXPIRY_SEC);

    let organizerProfile = null;
    if (user.role === 'organizer') {
      organizerProfile = await userRepo.findOrganizerProfile(user.id);
    }

    return {
      user: user.toJSON(),
      organizerProfile,
      tokens
    };
  }

  async refresh(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      const userId = decoded.id;

      // Verify token exists in Redis
      const savedToken = await cacheService.get(`refresh_token:${userId}`);
      if (!savedToken || savedToken !== refreshToken) {
        throw new Error('Refresh token revoked or invalid');
      }

      const user = await userRepo.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const tokens = this.generateTokens(user);

      // Rotate refresh token: Update in Redis
      await cacheService.set(`refresh_token:${user.id}`, tokens.refreshToken, REFRESH_TOKEN_EXPIRY_SEC);

      return tokens;
    } catch (err) {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(userId) {
    // Revoke refresh token in Redis
    await cacheService.del(`refresh_token:${userId}`);
    return true;
  }

  async requestPasswordReset(email) {
    const user = await userRepo.findByEmail(email);
    if (!user) {
      // Return true to avoid email harvesting vulnerability
      return true;
    }

    // Generate random 6-character token or random string
    const resetToken = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Save to Redis (expires in 1 hour)
    await cacheService.set(`password_reset:${resetToken}`, user.id, 3600);

    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    await emailService.sendPasswordResetEmail(user.email, user.name, resetLink);
    return true;
  }

  async resetPassword(resetToken, newPassword) {
    const userId = await cacheService.get(`password_reset:${resetToken}`);
    if (!userId) {
      throw new Error('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Direct DB update (using pool)
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);

    // Clean up reset token and any active sessions
    await cacheService.del(`password_reset:${resetToken}`);
    await cacheService.del(`refresh_token:${userId}`);
    
    return true;
  }
}

// Ensure the db pool helper is available
import pool from '../config/db.js';

export default new AuthenticationService();
