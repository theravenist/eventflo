export class User {
  constructor({ id, email, passwordHash, name, role, createdAt, updatedAt }) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.name = name;
    this.role = role || 'customer';
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isAdmin() {
    return this.role === 'admin';
  }

  isOrganizer() {
    return this.role === 'organizer';
  }

  isCustomer() {
    return this.role === 'customer';
  }

  isVisitor() {
    return this.role === 'visitor';
  }

  // Sanitize for JSON responses (do not expose password hash)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
