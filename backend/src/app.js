import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Middlewares
import errorHandler from './middlewares/ErrorHandler.js';
import { authenticateJWT, authorizeRoles } from './middlewares/AuthMiddleware.js';
import { apiLimiter, authLimiter } from './middlewares/RateLimiter.js';

// Import Controllers
import authController from './controllers/AuthController.js';
import eventController from './controllers/EventController.js';
import bookingController from './controllers/BookingController.js';
import userController from './controllers/UserController.js';
import adminController from './controllers/AdminController.js';

// Import S3 upload middleware helper
import { upload } from './config/s3.js';

const app = express();

// Path helper for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Apply Security Headers & CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Body Parsers & Cookie Parser Micro-Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.cookies = {};
  const rawCookies = req.headers.cookie;
  if (rawCookies) {
    rawCookies.split(';').forEach(c => {
      const parts = c.split('=');
      const name = parts[0].trim();
      const val = parts.slice(1).join('=');
      req.cookies[name] = decodeURIComponent(val);
    });
  }
  next();
});

// Serve local static uploaded banners
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// 3. API Routes

// --- Authentication ---
app.post('/api/auth/register', authLimiter, (req, res, next) => authController.register(req, res, next));
app.post('/api/auth/login', authLimiter, (req, res, next) => authController.login(req, res, next));
app.post('/api/auth/logout', authenticateJWT, (req, res, next) => authController.logout(req, res, next));
app.post('/api/auth/refresh', (req, res, next) => authController.refresh(req, res, next));
app.post('/api/auth/request-password-reset', authLimiter, (req, res, next) => authController.requestPasswordReset(req, res, next));
app.post('/api/auth/reset-password', authLimiter, (req, res, next) => authController.resetPassword(req, res, next));

// --- Events Discovery (Public/Visitor) ---
app.get('/api/events', apiLimiter, (req, res, next) => eventController.getEvents(req, res, next));
app.get('/api/events/:id', apiLimiter, (req, res, next) => eventController.getEvent(req, res, next));

// --- Events Management (Organizer/Admin) ---
app.post(
  '/api/events', 
  authenticateJWT, 
  authorizeRoles('organizer', 'admin'), 
  upload.single('banner'), 
  (req, res, next) => eventController.createEvent(req, res, next)
);

app.put(
  '/api/events/:id', 
  authenticateJWT, 
  authorizeRoles('organizer', 'admin'), 
  upload.single('banner'), 
  (req, res, next) => eventController.updateEvent(req, res, next)
);

app.delete(
  '/api/events/:id', 
  authenticateJWT, 
  authorizeRoles('organizer', 'admin'), 
  (req, res, next) => eventController.deleteEvent(req, res, next)
);

// Organizer Dashboards
app.get(
  '/api/organizer/dashboard', 
  authenticateJWT, 
  authorizeRoles('organizer', 'admin'), 
  (req, res, next) => eventController.getOrganizerDashboard(req, res, next)
);

app.get(
  '/api/organizer/events', 
  authenticateJWT, 
  authorizeRoles('organizer', 'admin'), 
  (req, res, next) => eventController.getOrganizerEvents(req, res, next)
);

// --- Bookings (Customer/Organizer/Admin) ---
app.post(
  '/api/bookings', 
  authenticateJWT, 
  authorizeRoles('customer', 'admin'), 
  (req, res, next) => bookingController.createBooking(req, res, next)
);

app.get(
  '/api/bookings', 
  authenticateJWT, 
  (req, res, next) => bookingController.getBookings(req, res, next)
);

app.delete(
  '/api/bookings/:id', 
  authenticateJWT, 
  (req, res, next) => bookingController.cancelBooking(req, res, next)
);

// Organizer View Attendees & Scan Tickets
app.get(
  '/api/bookings/event/:eventId/attendees', 
  authenticateJWT, 
  authorizeRoles('organizer', 'admin'), 
  (req, res, next) => bookingController.getAttendees(req, res, next)
);

app.post(
  '/api/bookings/scan', 
  authenticateJWT, 
  authorizeRoles('organizer', 'admin'), 
  (req, res, next) => bookingController.scanQrCode(req, res, next)
);

// --- Profiles ---
app.get('/api/users/profile', authenticateJWT, (req, res, next) => userController.getProfile(req, res, next));

// --- Admin Endpoints ---
app.get(
  '/api/admin/dashboard', 
  authenticateJWT, 
  authorizeRoles('admin'), 
  (req, res, next) => adminController.getDashboard(req, res, next)
);

app.get(
  '/api/admin/users', 
  authenticateJWT, 
  authorizeRoles('admin'), 
  (req, res, next) => adminController.getUsers(req, res, next)
);

app.put(
  '/api/admin/users/:userId/role', 
  authenticateJWT, 
  authorizeRoles('admin'), 
  (req, res, next) => adminController.updateUserRole(req, res, next)
);

app.delete(
  '/api/admin/events/:id', 
  authenticateJWT, 
  authorizeRoles('admin'), 
  (req, res, next) => adminController.removeEvent(req, res, next)
);

// 4. Global Error Handler
app.use(errorHandler);

export default app;
