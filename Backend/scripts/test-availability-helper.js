import { computeRestaurantAvailability } from '../src/modules/food/restaurant/services/restaurantAvailability.helper.js';

// Setup mock logger for helper
const mockLogger = {
  warn: () => {},
  error: () => {}
};

console.log('--- Starting Restaurant Availability Helper Tests ---');

// Mock helper to create mock dates in Asia/Kolkata timezone
// We will construct UTC dates that map to the target day and time in IST.
// Since IST is UTC+5:30:
// Target: Monday 19:59 IST -> UTC: Monday 14:29 UTC
const createISTDate = (dayStr, hour, minute) => {
  const dayOffsets = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };
  // Base date: Sunday Aug 10, 2026 00:00:00 UTC
  // Wait, let's choose a base date that is Sunday. Aug 10, 2025 is Sunday!
  // Let's use 2025-08-10 (Sunday).
  // Day offset for dayStr:
  const offset = dayOffsets[dayStr];
  // Calculate the target time in UTC:
  // target_IST_minutes = hour * 60 + minute
  // target_UTC_minutes = target_IST_minutes - 330
  // Let's construct a Date using UTC time.
  const date = new Date(Date.UTC(2025, 7, 10 + offset, hour, minute - 330));
  return date;
};

// Test Suite
const runTests = () => {
  let passed = 0;
  let failed = 0;

  const assert = (testName, expected, actual) => {
    if (JSON.stringify(expected) === JSON.stringify(actual)) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      console.error(`   Expected:`, expected);
      console.error(`   Actual:  `, actual);
      failed++;
    }
  };

  // Mock Restaurant Base
  const baseRestaurant = {
    _id: '64a123456789abcdef012345',
    status: 'approved',
    isAcceptingOrders: true
  };

  // Mock timings for overnight: Monday 20:00 to 02:00
  const timingsOvernight = {
    timings: [
      { day: 'Monday', isOpen: true, openingTime: '20:00', closingTime: '02:00' },
      { day: 'Tuesday', isOpen: false }
    ]
  };

  // 1. Monday 19:59 -> Closed
  const d1 = createISTDate('Monday', 19, 59);
  assert(
    'Monday 19:59 (Overnight schedule 20:00-02:00) should be Closed',
    { isOpen: false, reason: 'outside-hours' },
    computeRestaurantAvailability(baseRestaurant, timingsOvernight, d1)
  );

  // 2. Monday 20:00 -> Open
  const d2 = createISTDate('Monday', 20, 0);
  assert(
    'Monday 20:00 (Overnight schedule 20:00-02:00) should be Open',
    { isOpen: true, reason: 'open' },
    computeRestaurantAvailability(baseRestaurant, timingsOvernight, d2)
  );

  // 3. Tuesday 01:00 -> Open (Morning portion of Monday's overnight)
  const d3 = createISTDate('Tuesday', 1, 0);
  assert(
    'Tuesday 01:00 (Morning portion of Monday overnight 20:00-02:00) should be Open',
    { isOpen: true, reason: 'open' },
    computeRestaurantAvailability(baseRestaurant, timingsOvernight, d3)
  );

  // 4. Tuesday 01:59 -> Open
  const d4 = createISTDate('Tuesday', 1, 59);
  assert(
    'Tuesday 01:59 (Morning portion of Monday overnight 20:00-02:00) should be Open',
    { isOpen: true, reason: 'open' },
    computeRestaurantAvailability(baseRestaurant, timingsOvernight, d4)
  );

  // 5. Tuesday 02:00 -> Closed
  const d5 = createISTDate('Tuesday', 2, 0);
  assert(
    'Tuesday 02:00 (Morning portion of Monday overnight ended at 02:00) should be Closed',
    { isOpen: false, reason: 'day-closed' }, // since Tuesday isOpen is false
    computeRestaurantAvailability(baseRestaurant, timingsOvernight, d5)
  );

  // 6. Manual toggle isAcceptingOrders === false override
  const rClosed = { ...baseRestaurant, isAcceptingOrders: false };
  assert(
    'Manual toggle isAcceptingOrders=false overrides everything',
    { isOpen: false, reason: 'manual-close' },
    computeRestaurantAvailability(rClosed, timingsOvernight, d2)
  );

  // 7. Admin Status !== approved override
  const rUnapproved = { ...baseRestaurant, status: 'pending' };
  assert(
    'Unapproved status overrides everything',
    { isOpen: false, reason: 'not-approved' },
    computeRestaurantAvailability(rUnapproved, timingsOvernight, d2)
  );

  // 8. Missing Timings Default -> Open (no-timings-configured)
  assert(
    'Missing timings defaults to Open',
    { isOpen: true, reason: 'no-timings-configured' },
    computeRestaurantAvailability(baseRestaurant, null, d2)
  );

  // 9. Legacy fallbacks
  const legacyRestaurant = {
    ...baseRestaurant,
    openDays: ['Monday', 'Wednesday'],
    openingTime: '09:00',
    closingTime: '17:00'
  };
  const dLegacyMondayOpen = createISTDate('Monday', 10, 0);
  assert(
    'Legacy timings fallback - Monday 10:00 (inside 09:00-17:00) should be Open',
    { isOpen: true, reason: 'open' },
    computeRestaurantAvailability(legacyRestaurant, null, dLegacyMondayOpen)
  );

  const dLegacyMondayClosed = createISTDate('Monday', 18, 0);
  assert(
    'Legacy timings fallback - Monday 18:00 (outside 09:00-17:00) should be Closed',
    { isOpen: false, reason: 'outside-hours' },
    computeRestaurantAvailability(legacyRestaurant, null, dLegacyMondayClosed)
  );

  const dLegacyTuesdayClosed = createISTDate('Tuesday', 10, 0);
  assert(
    'Legacy timings fallback - Tuesday (not in openDays) should be Closed',
    { isOpen: false, reason: 'day-closed' },
    computeRestaurantAvailability(legacyRestaurant, null, dLegacyTuesdayClosed)
  );

  // 10. Malformed timings
  const timingsMalformed = {
    timings: [
      { day: 'Monday', isOpen: true, openingTime: 'invalid-time', closingTime: '17:00' }
    ]
  };
  assert(
    'Malformed opening time should fail closed with invalid-timings',
    { isOpen: false, reason: 'invalid-timings' },
    computeRestaurantAvailability(baseRestaurant, timingsMalformed, dLegacyMondayOpen)
  );

  console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runTests();
