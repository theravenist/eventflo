import app from './app.js';
import dotenv from 'dotenv';
import pool from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Verify Database connection
(async () => {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();
  } catch (err) {
    console.error('Fatal: Database connection failed on startup!', err);
    process.exit(1);
  }
})();

const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`EventFlo Backend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
});

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('Database pool connections closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during pool shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
