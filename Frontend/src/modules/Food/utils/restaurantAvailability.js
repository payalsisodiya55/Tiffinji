const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

const normalizeDay = (value) => {
  if (!value || typeof value !== "string") return null
  const trimmed = value.trim().toLowerCase()
  const match = DAY_NAMES.find((day) => day.toLowerCase() === trimmed)
  if (match) return match

  const abbreviatedMatch = DAY_NAMES.find((day) =>
    day.toLowerCase().startsWith(trimmed.slice(0, 3))
  )
  return abbreviatedMatch || null
}

const parseTimeToMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== "string") return null
  const raw = timeValue.trim()
  if (!raw) return null

  const normalized = raw.toLowerCase()
  const meridiemMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/)
  if (meridiemMatch) {
    let hour = Number(meridiemMatch[1])
    const minute = Number(meridiemMatch[2])
    const period = meridiemMatch[3]

    if (Number.isNaN(hour) || Number.isNaN(minute) || minute < 0 || minute > 59) return null

    if (period === "pm" && hour < 12) hour += 12
    if (period === "am" && hour === 12) hour = 0
    if (hour < 0 || hour > 23) return null
    return hour * 60 + minute
  }

  const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/)
  if (!twentyFourHourMatch) return null

  const hour = Number(twentyFourHourMatch[1])
  const minute = Number(twentyFourHourMatch[2])
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }

  return hour * 60 + minute
}

const getTodayTiming = (restaurant, dayName) => {
  // Format 1: Nested timings array (from separate API call: { outletTimings: { timings: [...] } })
  const outletTimingsArray = restaurant?.outletTimings?.timings
  if (Array.isArray(outletTimingsArray)) {
    const exact = outletTimingsArray.find((entry) => normalizeDay(entry?.day) === dayName)
    if (exact) return exact
  }

  // Format 2: Direct flat array from backend $lookup (outletTimings: [{day, isOpen, openingTime, closingTime}, ...])
  if (Array.isArray(restaurant?.outletTimings)) {
    const exact = restaurant.outletTimings.find((entry) => normalizeDay(entry?.day) === dayName)
    if (exact) return exact
  }

  // Format 3: Object keyed by day name ({ Monday: { isOpen, openingTime, closingTime }, ... })
  const outletTimingsObject = restaurant?.outletTimings
  if (outletTimingsObject && typeof outletTimingsObject === "object" && !Array.isArray(outletTimingsObject)) {
    const direct = outletTimingsObject[dayName]
    if (direct && typeof direct === "object") return direct
  }

  return null
}

const isWithinTimeWindow = (nowMinutes, openingMinutes, closingMinutes) => {
  if (openingMinutes === null || closingMinutes === null) return true
  if (openingMinutes === closingMinutes) return true

  if (closingMinutes > openingMinutes) {
    return nowMinutes >= openingMinutes && nowMinutes <= closingMinutes
  }

  return nowMinutes >= openingMinutes || nowMinutes <= closingMinutes
}

const getMinutesUntilClosing = (nowMinutes, openingMinutes, closingMinutes) => {
  if (openingMinutes === null || closingMinutes === null) return null
  if (!isWithinTimeWindow(nowMinutes, openingMinutes, closingMinutes)) return null

  if (closingMinutes > openingMinutes) {
    return closingMinutes - nowMinutes
  }

  if (nowMinutes <= closingMinutes) {
    return closingMinutes - nowMinutes
  }

  return (24 * 60 - nowMinutes) + closingMinutes
}

const formatTimeLabel = (timeValue) => {
  const totalMinutes = parseTimeToMinutes(timeValue)
  if (totalMinutes === null) return timeValue || null

  const hours24 = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const period = hours24 >= 12 ? "PM" : "AM"
  const hours12 = hours24 % 12 || 12

  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`
}

const formatClosingCountdown = (minutesUntilClose, closingTime) => {
  if (minutesUntilClose === null || minutesUntilClose === undefined) return null
  if (minutesUntilClose > 120) return null // Hide if more than 2 hours remaining

  if (minutesUntilClose <= 0) {
    const closingLabel = formatTimeLabel(closingTime)
    return closingLabel ? `Closes at ${closingLabel}` : null
  }

  if (minutesUntilClose < 60) {
    return `Closes in ${minutesUntilClose} min`
  }

  const hours = Math.floor(minutesUntilClose / 60)
  const minutes = minutesUntilClose % 60

  if (minutes === 0) {
    return `Closes in ${hours}h`
  }

  return `Closes in ${hours}h ${minutes}m`
}

export const getRestaurantAvailabilityStatus = (restaurant, now = new Date(), options = {}) => {
  if (!restaurant) {
    return {
      isOpen: false,
      isActive: false,
      isAcceptingOrders: false,
      isWithinTimings: false,
      reason: "missing-restaurant",
    }
  }

  const ignoreOperationalStatus = options?.ignoreOperationalStatus === true;
  const isActive = restaurant.status === "approved" || restaurant.isActive !== false;
  const isAcceptingOrders = restaurant.isAcceptingOrders !== false;

  if (!ignoreOperationalStatus && !isActive) {
    return {
      isOpen: false,
      isActive,
      isAcceptingOrders,
      isWithinTimings: false,
      reason: "inactive",
    }
  }

  if (!ignoreOperationalStatus && !isAcceptingOrders) {
    return {
      isOpen: false,
      isActive,
      isAcceptingOrders,
      isWithinTimings: false,
      reason: "not-accepting-orders",
    }
  }

  const hasBackendIsOpen = typeof restaurant.isOpen === "boolean";
  const backendIsOpen = restaurant.isOpen;

  const todayIdx = now.getDay();
  const yesterdayIdx = (todayIdx - 1 + 7) % 7;
  const dayName = DAY_NAMES[todayIdx];
  const yesterdayDayName = DAY_NAMES[yesterdayIdx];

  const getWindow = (timing) => {
    if (!timing) return null;
    const { isOpen, openingTime, closingTime } = timing;
    if (isOpen === false) return { isOpen: false };

    if (!timing.source && Array.isArray(restaurant.openDays)) {
      const normalizedOpenDays = new Set(restaurant.openDays.map(d => normalizeDay(d)).filter(Boolean));
      if (normalizedOpenDays.size > 0 && !normalizedOpenDays.has(timing.day || dayName)) {
        return { isOpen: false };
      }
    }

    const openMin = parseTimeToMinutes(openingTime);
    const closeMin = parseTimeToMinutes(closingTime);
    if ((openingTime && openMin === null) || (closingTime && closeMin === null)) {
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

  const getDayDetails = (dayVal) => {
    const timing = getTodayTiming(restaurant, dayVal);
    if (timing) {
      return {
        day: dayVal,
        isOpen: timing.isOpen !== false,
        openingTime: timing.openingTime || null,
        closingTime: timing.closingTime || null,
        source: 'outletTimings'
      };
    }
    const openDays = Array.isArray(restaurant.openDays) ? restaurant.openDays : [];
    const normalizedOpenDays = new Set(openDays.map(d => normalizeDay(d)).filter(Boolean));
    const hasLegacyConfig = normalizedOpenDays.size > 0 || restaurant.openingTime || restaurant.closingTime;
    if (hasLegacyConfig) {
      const isDayOpen = normalizedOpenDays.size === 0 || normalizedOpenDays.has(dayVal);
      return {
        day: dayVal,
        isOpen: isDayOpen,
        openingTime: restaurant.openingTime || null,
        closingTime: restaurant.closingTime || null,
        source: 'legacy'
      };
    }
    return null;
  };

  const todayDetails = getDayDetails(dayName);
  const yesterdayDetails = getDayDetails(yesterdayDayName);

  if (!todayDetails && !yesterdayDetails) {
    const isOpen = hasBackendIsOpen ? backendIsOpen : true;
    return {
      isOpen,
      isActive,
      isAcceptingOrders,
      isWithinTimings: isOpen,
      openingTime: null,
      closingTime: null,
      minutesUntilClose: null,
      closingCountdownLabel: null,
      reason: restaurant.closedReason || "no-timings",
    };
  }

  const todayParsed = getWindow(todayDetails);
  const yesterdayParsed = getWindow(yesterdayDetails);

  if ((todayParsed && todayParsed.isMalformed) || (yesterdayParsed && yesterdayParsed.isMalformed)) {
    const isOpen = hasBackendIsOpen ? backendIsOpen : false;
    return {
      isOpen,
      isActive,
      isAcceptingOrders,
      isWithinTimings: isOpen,
      openingTime: null,
      closingTime: null,
      minutesUntilClose: null,
      closingCountdownLabel: null,
      reason: "invalid-timings",
    };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let openByYesterdayOvernight = false;
  let yesterdayClosingTime = null;
  let minutesUntilYesterdayClose = null;

  if (yesterdayParsed && yesterdayParsed.isOpen) {
    const { openMin, closeMin, closingTime } = yesterdayParsed;
    if (openMin !== null && closeMin !== null) {
      if (closeMin <= openMin) {
        if (nowMinutes < closeMin) {
          openByYesterdayOvernight = true;
          yesterdayClosingTime = closingTime;
          minutesUntilYesterdayClose = closeMin - nowMinutes;
        }
      }
    }
  }

  let openByToday = false;
  let todayOpeningTime = null;
  let todayClosingTime = null;
  let minutesUntilTodayClose = null;

  if (todayParsed && todayParsed.isOpen) {
    const { openMin, closeMin, openingTime, closingTime } = todayParsed;
    if (openMin === null && closeMin === null) {
      openByToday = true;
    } else if (openMin !== null && closeMin !== null) {
      if (openMin < closeMin) {
        if (nowMinutes >= openMin && nowMinutes < closeMin) {
          openByToday = true;
          todayOpeningTime = openingTime;
          todayClosingTime = closingTime;
          minutesUntilTodayClose = closeMin - nowMinutes;
        }
      } else {
        if (nowMinutes >= openMin) {
          openByToday = true;
          todayOpeningTime = openingTime;
          todayClosingTime = closingTime;
          minutesUntilTodayClose = (24 * 60 - nowMinutes) + closeMin;
        }
      }
    }
  }

  const clientIsOpen = openByYesterdayOvernight || openByToday;
  const isOpen = hasBackendIsOpen ? backendIsOpen : clientIsOpen;

  let activeClosingTime = null;
  let minutesUntilClose = null;

  if (isOpen) {
    if (openByYesterdayOvernight) {
      activeClosingTime = yesterdayClosingTime;
      minutesUntilClose = minutesUntilYesterdayClose;
    } else if (openByToday) {
      activeClosingTime = todayClosingTime;
      minutesUntilClose = minutesUntilTodayClose;
    } else {
      activeClosingTime = todayParsed?.closingTime || null;
      if (activeClosingTime) {
        const closeMin = parseTimeToMinutes(activeClosingTime);
        if (closeMin !== null) {
          minutesUntilClose = closeMin > nowMinutes ? closeMin - nowMinutes : null;
        }
      }
    }
  }

  const reason = isOpen 
    ? "open" 
    : (todayDetails && todayDetails.isOpen === false ? "day-closed" : "outside-hours");

  return {
    isOpen,
    isActive,
    isAcceptingOrders,
    isWithinTimings: isOpen,
    openingTime: todayParsed?.openingTime || null,
    closingTime: activeClosingTime || todayParsed?.closingTime || null,
    minutesUntilClose,
    closingCountdownLabel: isOpen && minutesUntilClose !== null && activeClosingTime
      ? formatClosingCountdown(minutesUntilClose, activeClosingTime)
      : null,
    reason: restaurant.closedReason || reason,
  };
}
