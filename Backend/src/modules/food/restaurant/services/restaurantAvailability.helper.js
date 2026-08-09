import { logger } from '../../../../utils/logger.js';

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Normalizes day names to title case full day names.
 */
export const normalizeDay = (value) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  const match = DAY_NAMES.find((day) => day.toLowerCase() === trimmed);
  if (match) return match;
  const abbreviatedMatch = DAY_NAMES.find((day) =>
    day.toLowerCase().startsWith(trimmed.slice(0, 3))
  );
  return abbreviatedMatch || null;
};

/**
 * Parses "HH:mm" (24h) or "hh:mm am/pm" (12h) to minutes since midnight.
 */
export const parseTimeToMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== "string") return null;
  const raw = timeValue.trim();
  if (!raw) return null;

  const normalized = raw.toLowerCase();
  const meridiemMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/);
  if (meridiemMatch) {
    let hour = Number(meridiemMatch[1]);
    const minute = Number(meridiemMatch[2]);
    const period = meridiemMatch[3];

    if (Number.isNaN(hour) || Number.isNaN(minute) || minute < 0 || minute > 59) return null;

    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    if (hour < 0 || hour > 23) return null;
    return hour * 60 + minute;
  }

  const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFourHourMatch) return null;

  const hour = Number(twentyFourHourMatch[1]);
  const minute = Number(twentyFourHourMatch[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
};

/**
 * Extract timings for a specific day from outletTimings or legacy values.
 */
const getTimingForDay = (restaurant, outletTimings, dayName) => {
  let timingsSource = outletTimings;
  if (!timingsSource && restaurant) {
    timingsSource = restaurant.outletTimings;
  }

  if (timingsSource) {
    // Format 1: timingsSource has timings array (e.g. FoodRestaurantOutletTimings document structure)
    if (timingsSource.timings && Array.isArray(timingsSource.timings)) {
      const match = timingsSource.timings.find(t => normalizeDay(t.day) === dayName);
      if (match) {
        return {
          source: 'outletTimings',
          isOpen: match.isOpen !== false,
          openingTime: match.openingTime || null,
          closingTime: match.closingTime || null
        };
      }
    }
    // Format 2: flat array
    if (Array.isArray(timingsSource)) {
      const match = timingsSource.find(t => normalizeDay(t.day) === dayName);
      if (match) {
        return {
          source: 'outletTimings',
          isOpen: match.isOpen !== false,
          openingTime: match.openingTime || null,
          closingTime: match.closingTime || null
        };
      }
    }
    // Format 3: object keyed by day
    if (typeof timingsSource === 'object' && !Array.isArray(timingsSource)) {
      const match = timingsSource[dayName];
      if (match && typeof match === 'object') {
        return {
          source: 'outletTimings',
          isOpen: match.isOpen !== false,
          openingTime: match.openingTime || null,
          closingTime: match.closingTime || null
        };
      }
    }
  }

  // Fallback to legacy timings
  if (restaurant) {
    const openDays = Array.isArray(restaurant.openDays) ? restaurant.openDays : [];
    const normalizedOpenDays = new Set(openDays.map(d => normalizeDay(d)).filter(Boolean));
    const hasLegacyConfig = normalizedOpenDays.size > 0 || restaurant.openingTime || restaurant.closingTime;

    if (hasLegacyConfig) {
      const isDayOpen = normalizedOpenDays.size === 0 || normalizedOpenDays.has(dayName);
      return {
        source: 'legacy',
        isOpen: isDayOpen,
        openingTime: restaurant.openingTime || null,
        closingTime: restaurant.closingTime || null
      };
    }
  }

  return null;
};

/**
 * Computes whether a restaurant is open or closed, based on approvals, manual toggles,
 * and day-based/overnight schedules in Asia/Kolkata timezone.
 */
export const computeRestaurantAvailability = (restaurant, outletTimings, nowIST) => {
  if (!restaurant) {
    return { isOpen: false, reason: 'missing-restaurant' };
  }

  // 1. Admin approval status
  if (restaurant.status !== 'approved') {
    return { isOpen: false, reason: 'not-approved' };
  }

  // 2. Manual toggle (always takes priority)
  if (restaurant.isAcceptingOrders === false) {
    return { isOpen: false, reason: 'manual-close' };
  }

  // Determine current day and time in Asia/Kolkata
  let now = nowIST;
  if (!now) {
    now = new Date();
  }

  // Safely extract day, hour and minute in IST
  const partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  const formattedParts = partsFormatter.formatToParts(now);
  let dayName = '';
  let hour = 0;
  let minute = 0;
  for (const part of formattedParts) {
    if (part.type === 'weekday') dayName = part.value;
    if (part.type === 'hour') hour = parseInt(part.value, 10);
    if (part.type === 'minute') minute = parseInt(part.value, 10);
  }

  if (hour === 24) hour = 0;

  const nowMinutes = hour * 60 + minute;
  const dayNameNormalized = normalizeDay(dayName);

  const todayIdx = DAY_NAMES.indexOf(dayNameNormalized);
  const yesterdayDayName = DAY_NAMES[(todayIdx - 1 + 7) % 7];

  const todayTiming = getTimingForDay(restaurant, outletTimings, dayNameNormalized);
  const yesterdayTiming = getTimingForDay(restaurant, outletTimings, yesterdayDayName);

  // If no timings have ever been configured
  if (!todayTiming && !yesterdayTiming) {
    return { isOpen: true, reason: 'no-timings-configured' };
  }

  const parseWindow = (timing, rId) => {
    if (!timing) return null;
    const { isOpen, openingTime, closingTime } = timing;
    if (!isOpen) return { isOpen: false };

    const openMin = parseTimeToMinutes(openingTime);
    const closeMin = parseTimeToMinutes(closingTime);

    // If a time string is present but malformed
    if ((openingTime && openMin === null) || (closingTime && closeMin === null)) {
      logger.warn(`[RestaurantAvailability] Invalid timings for restaurant ${rId}: openingTime="${openingTime}", closingTime="${closingTime}"`);
      return { isOpen: true, isMalformed: true };
    }

    return {
      isOpen: true,
      openMin: openMin ?? null,
      closeMin: closeMin ?? null,
      openingTime,
      closingTime
    };
  };

  const todayParsed = parseWindow(todayTiming, restaurant._id);
  const yesterdayParsed = parseWindow(yesterdayTiming, restaurant._id);

  if ((todayParsed && todayParsed.isMalformed) || (yesterdayParsed && yesterdayParsed.isMalformed)) {
    return { isOpen: false, reason: 'invalid-timings' };
  }

  // A. Check if open by yesterday's overnight window
  let openByYesterdayOvernight = false;
  if (yesterdayParsed && yesterdayParsed.isOpen) {
    const { openMin, closeMin } = yesterdayParsed;
    if (openMin !== null && closeMin !== null) {
      if (closeMin <= openMin) {
        // Overnight window: runs from openMin to 24:00 and from 00:00 to closeMin (exclusive boundary)
        if (nowMinutes < closeMin) {
          openByYesterdayOvernight = true;
        }
      }
    }
  }

  if (openByYesterdayOvernight) {
    return { isOpen: true, reason: 'open' };
  }

  // B. Check today's window
  if (todayParsed && todayParsed.isOpen) {
    const { openMin, closeMin } = todayParsed;
    if (openMin === null && closeMin === null) {
      return { isOpen: true, reason: 'open' };
    }

    if (openMin !== null && closeMin !== null) {
      if (openMin < closeMin) {
        // Normal day window (e.g. 09:00 to 22:00)
        // openingTime is inclusive; closingTime is exclusive.
        if (nowMinutes >= openMin && nowMinutes < closeMin) {
          return { isOpen: true, reason: 'open' };
        }
      } else {
        // Today's overnight window (e.g. 20:00 to 02:00)
        // Today it runs from openMin to 24:00.
        // The morning portion of this overnight window will run tomorrow.
        if (nowMinutes >= openMin) {
          return { isOpen: true, reason: 'open' };
        }
      }
    }
  }

  // If we reach here, it is closed. Determine matching reason code
  if (todayTiming && todayTiming.isOpen === false) {
    return { isOpen: false, reason: 'day-closed' };
  }

  return { isOpen: false, reason: 'outside-hours' };
};
