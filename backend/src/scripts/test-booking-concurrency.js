import pool from '../config/db.js';
import bookingService from '../services/BookingService.js';
import bcrypt from 'bcryptjs';

async function runConcurrencyTest() {
  console.log('\n=============================================================');
  console.log('STARTING CONCURRENCY TEST: PREVENTING OVERBOOKING');
  console.log('=============================================================\n');

  const testEventId = '99999999-9999-9999-9999-999999999999';
  const organizerId = '88888888-8888-8888-8888-888888888888';
  const testUserIds = [];

  try {
    // 1. Create a clean test environment (Clean up any previous leftover runs)
    await pool.query('DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE event_id = $1)', [testEventId]);
    await pool.query('DELETE FROM checkins WHERE booking_id IN (SELECT id FROM bookings WHERE event_id = $1)', [testEventId]);
    await pool.query('DELETE FROM bookings WHERE event_id = $1', [testEventId]);
    await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['concurrency_customer_%@test.com']);
    await pool.query('DELETE FROM organizers WHERE user_id = $1', [organizerId]);
    await pool.query('DELETE FROM users WHERE id = $1', [organizerId]);

    console.log('1. Database cleaned.');

    // 2. Setup Organizer & Event
    const passwordHash = await bcrypt.hash('password123', 10);
    await pool.query(
      "INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, 'organizer')",
      [organizerId, 'concurrency_organizer@test.com', passwordHash, 'Test Concurrency Org']
    );
    await pool.query(
      "INSERT INTO organizers (user_id, company_name) VALUES ($1, $2)",
      [organizerId, 'Test Concurrency Org']
    );

    // Create event with max_capacity = 5 and remaining_seats = 5
    await pool.query(
      `INSERT INTO events (id, title, description, venue, date_time, ticket_price, max_capacity, remaining_seats, category, registration_deadline, created_by)
       VALUES ($1, 'Limited Seats Gala', 'A test event with 5 seats', 'Test Hall', NOW() + INTERVAL '10 days', 100.00, 5, 5, 'Testing', NOW() + INTERVAL '9 days', $2)`,
      [testEventId, organizerId]
    );
    console.log('2. Created test event with exactly 5 seats.');

    // 3. Create 10 different customer accounts to make bookings
    for (let i = 1; i <= 10; i++) {
      const uId = `77777777-7777-7777-7777-7777777770${i.toString().padStart(2, '0')}`;
      await pool.query(
        "INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, 'customer')",
        [uId, `concurrency_customer_${i}@test.com`, passwordHash, `Test Customer ${i}`]
      );
      testUserIds.push(uId);
    }
    console.log(`3. Created 10 concurrent test user profiles: customer_1 to customer_10`);

    // 4. Trigger 10 simultaneous bookings of 1 ticket each
    console.log('\n4. Dispatching 10 concurrent booking requests (1 seat each) concurrently...');
    const bookingPromises = testUserIds.map((userId, index) => {
      return bookingService.createBooking(userId, {
        eventId: testEventId,
        ticketQuantity: 1
      })
      .then(booking => {
        return { success: true, userId, bookingId: booking.id, error: null };
      })
      .catch(err => {
        return { success: false, userId, bookingId: null, error: err.message };
      });
    });

    const results = await Promise.all(bookingPromises);

    // 5. Audit Results
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    console.log('\nResults Summary:');
    console.log(`- Successes count: ${successes.length} (Expected: 5)`);
    console.log(`- Failures count: ${failures.length} (Expected: 5)`);

    failures.forEach((fail, idx) => {
      console.log(`  * Failure ${idx+1}: User ${fail.userId.slice(-3)} failed with error: "${fail.error}"`);
    });

    // 6. Verify seat status in DB
    const eventRes = await pool.query('SELECT remaining_seats FROM events WHERE id = $1', [testEventId]);
    const finalSeats = eventRes.rows[0].remaining_seats;
    console.log(`- Final remaining seats in database: ${finalSeats} (Expected: 0)`);

    // Validation asserts
    const passesTests = successes.length === 5 && failures.length === 5 && finalSeats === 0;

    if (passesTests) {
      console.log('\n=============================================================');
      console.log('✅ TEST PASSED: Row-locking prevented overbooking!');
      console.log('=============================================================\n');
    } else {
      console.error('\n=============================================================');
      console.error('❌ TEST FAILED: Overbooking occurred / seat mismatch!');
      console.error('=============================================================\n');
      process.exitCode = 1;
    }

  } catch (error) {
    console.error('Test execution failed with error:', error);
    process.exitCode = 1;
  } finally {
    // 7. Clean up database records
    console.log('5. Performing cleanup of test records...');
    await pool.query('DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE event_id = $1)', [testEventId]);
    await pool.query('DELETE FROM bookings WHERE event_id = $1', [testEventId]);
    await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['concurrency_customer_%@test.com']);
    await pool.query('DELETE FROM organizers WHERE user_id = $1', [organizerId]);
    await pool.query('DELETE FROM users WHERE id = $1', [organizerId]);
    console.log('Cleanup completed.');

    // End database pool
    await pool.end();
    console.log('Database pool connection closed.');
  }
}

runConcurrencyTest();
