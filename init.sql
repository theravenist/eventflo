-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean runs)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS checkins CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS organizers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop Enums if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

-- Custom types/enums
CREATE TYPE user_role AS ENUM ('visitor', 'customer', 'organizer', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'customer' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Organizers Table (normalized extension of users)
CREATE TABLE organizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    bio TEXT,
    website VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    banner_url VARCHAR(1000),
    venue VARCHAR(255) NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    ticket_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_capacity INTEGER NOT NULL CHECK (max_capacity > 0),
    remaining_seats INTEGER NOT NULL CHECK (remaining_seats >= 0),
    category VARCHAR(100) NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' NOT NULL, -- 'active', 'cancelled', 'completed'
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_seats_capacity CHECK (remaining_seats <= max_capacity)
);

-- 4. Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ticket_quantity INTEGER NOT NULL CHECK (ticket_quantity > 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    qr_code TEXT UNIQUE NOT NULL,
    status booking_status DEFAULT 'confirmed' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(100) NOT NULL,
    status payment_status DEFAULT 'pending' NOT NULL,
    transaction_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Checkins Table (scanned tickets check-in log)
CREATE TABLE checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scanned_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Reviews Table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, event_id)
);

-- 8. Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for search/filtering performance
CREATE INDEX idx_events_category ON events(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_date_time ON events(date_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_event ON bookings(event_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_reviews_event ON reviews(event_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

-- Initial Seed Data
-- Seed Users (Passwords are bcrypted hashes of 'password123')
-- Admin User
INSERT INTO users (id, email, password_hash, name, role) VALUES 
('a2c20600-b6e9-4e00-9df1-2e6b206774a0', 'admin@eventhub.com', '$2a$10$xtKjQ8hfp/ImpNvlgSvTUeK./bZhgV3XURBZdD3owpXRL8aXleE/i', 'Platform Admin', 'admin');

-- Organizer User & Profile
INSERT INTO users (id, email, password_hash, name, role) VALUES 
('03c20600-b6e9-4e00-9df1-2e6b206774b0', 'organizer@eventhub.com', '$2a$10$xtKjQ8hfp/ImpNvlgSvTUeK./bZhgV3XURBZdD3owpXRL8aXleE/i', 'Apex Events Corp', 'organizer');

INSERT INTO organizers (id, user_id, company_name, bio, website) VALUES
('b4c20600-b6e9-4e00-9df1-2e6b206774b1', '03c20600-b6e9-4e00-9df1-2e6b206774b0', 'Apex Events Corp', 'Premium corporate and entertainment event organizers.', 'https://apexevents.com');

-- Customer User
INSERT INTO users (id, email, password_hash, name, role) VALUES 
('c4c20600-b6e9-4e00-9df1-2e6b206774c0', 'customer@eventhub.com', '$2a$10$xtKjQ8hfp/ImpNvlgSvTUeK./bZhgV3XURBZdD3owpXRL8aXleE/i', 'John Doe', 'customer');

-- Seed Events
INSERT INTO events (id, title, description, banner_url, venue, date_time, ticket_price, max_capacity, remaining_seats, category, registration_deadline, status, created_by) VALUES
('e1c20600-b6e9-4e00-9df1-2e6b206774d0', 'Global Tech Summit 2026', 'Join tech leaders worldwide for discussions on AI, Cloud, and Web3 development.', 'https://picsum.photos/seed/tech/800/400', 'San Francisco Convention Center', '2026-10-15T09:00:00Z', 150.00, 100, 99, 'Technology', '2026-10-14T18:00:00Z', 'active', '03c20600-b6e9-4e00-9df1-2e6b206774b0'),
('e1c20600-b6e9-4e00-9df1-2e6b206774d1', 'Neon Lights Music Festival', 'The biggest electronic music event of the year featuring top DJs worldwide.', 'https://picsum.photos/seed/music/800/400', 'Central Outdoor Arena', '2026-08-20T17:00:00Z', 75.00, 200, 200, 'Music', '2026-08-19T23:59:59Z', 'active', '03c20600-b6e9-4e00-9df1-2e6b206774b0'),
('e1c20600-b6e9-4e00-9df1-2e6b206774d2', 'Masterclass: UX/UI Design Principles', 'An intensive masterclass on modern design trends, accessibility, and typography.', 'https://picsum.photos/seed/design/800/400', 'Virtual Zoom Meeting', '2026-09-05T14:00:00Z', 0.00, 500, 500, 'Design', '2026-09-04T12:00:00Z', 'active', '03c20600-b6e9-4e00-9df1-2e6b206774b0');

-- Seed Booking & Payment
INSERT INTO bookings (id, user_id, event_id, ticket_quantity, total_price, qr_code, status) VALUES
('b1c20600-b6e9-4e00-9df1-2e6b206774e0', 'c4c20600-b6e9-4e00-9df1-2e6b206774c0', 'e1c20600-b6e9-4e00-9df1-2e6b206774d0', 1, 150.00, 'TICKET-e1c20600-b6e9-4e00-9df1-2e6b206774d0-c4c20600', 'confirmed');

INSERT INTO payments (id, booking_id, amount, payment_method, status, transaction_id) VALUES
('p1c20600-b6e9-4e00-9df1-2e6b206774e0', 'b1c20600-b6e9-4e00-9df1-2e6b206774e0', 150.00, 'Credit Card', 'completed', 'txn_initial_seed_123');
