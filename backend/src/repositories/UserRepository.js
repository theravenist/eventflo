import pool from '../config/db.js';
import { User } from '../models/User.js';

export class UserRepository {
  static mapRowToUser(row) {
    if (!row) return null;
    return new User({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async findById(id) {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return UserRepository.mapRowToUser(res.rows[0]);
  }

  async findByEmail(email) {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return UserRepository.mapRowToUser(res.rows[0]);
  }

  async create({ email, passwordHash, name, role }) {
    const res = await pool.query(
      `INSERT INTO users (email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [email.toLowerCase(), passwordHash, name, role || 'customer']
    );
    return UserRepository.mapRowToUser(res.rows[0]);
  }

  async findOrganizerProfile(userId) {
    const res = await pool.query('SELECT * FROM organizers WHERE user_id = $1', [userId]);
    return res.rows[0] || null;
  }

  async createOrganizerProfile(userId, companyName, bio = '', website = '') {
    const res = await pool.query(
      `INSERT INTO organizers (user_id, company_name, bio, website) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, companyName, bio, website]
    );
    return res.rows[0];
  }

  async findAll({ limit = 10, offset = 0 } = {}) {
    const res = await pool.query(
      `SELECT u.*, o.company_name FROM users u 
       LEFT JOIN organizers o ON u.id = o.user_id 
       ORDER BY u.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.rows.map(row => ({
      user: UserRepository.mapRowToUser(row).toJSON(),
      organizerProfile: row.company_name ? { company_name: row.company_name } : null
    }));
  }

  async countAll() {
    const res = await pool.query('SELECT COUNT(*) FROM users');
    return parseInt(res.rows[0].count, 10);
  }

  async updateRole(userId, role) {
    const res = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [role, userId]
    );
    return UserRepository.mapRowToUser(res.rows[0]);
  }
}
