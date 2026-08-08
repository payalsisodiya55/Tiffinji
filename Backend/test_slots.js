import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import { FoodRestaurant } from './src/modules/food/restaurant/models/restaurant.model.js';
import { FoodRestaurantOutletTimings } from './src/modules/food/restaurant/models/outletTimings.model.js';

dotenv.config();

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

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

    if (period === "pm" && hour < 12) hour += 12
    if (period === "am" && hour === 12) hour = 0
    return hour * 60 + minute
  }

  const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/)
  if (!twentyFourHourMatch) return null

  const hour = Number(twentyFourHourMatch[1])
  const minute = Number(twentyFourHourMatch[2])
  return hour * 60 + minute
}

const formatTimeValue = (value) => {
  if (!value) return null
  const date = new Date(`2000-01-01T${String(value).padStart(5, "0")}`)
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

const buildSlots = (timing) => {
  if (!timing || timing.isOpen === false) return []
  const opening = parseTimeToMinutes(timing.openingTime)
  let closing = parseTimeToMinutes(timing.closingTime)
  if (opening === null || closing === null) return []

  if (closing <= opening) {
    closing += 24 * 60
  }

  const slots = []
  let cursor = opening

  while (cursor <= closing) {
    const hours = Math.floor((cursor % (24 * 60)) / 60)
    const minutes = cursor % 60
    slots.push(formatTimeValue(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`))
    cursor += 30
  }

  return slots
}

const getMealPeriod = (slot) => {
  if (!slot) return "all"
  const normalized = String(slot).toUpperCase()
  const match = normalized.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/)
  if (!match) return "all"

  let hour = Number(match[1])
  const minute = Number(match[2])
  const meridiem = match[3]

  if (meridiem === "PM" && hour !== 12) hour += 12
  if (meridiem === "AM" && hour === 12) hour = 0

  const totalMinutes = hour * 60 + minute
  if (totalMinutes < 12 * 60) return "breakfast"
  if (totalMinutes < 17 * 60) return "lunch"
  return "dinner"
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Tiffinji');
    const restaurant = await FoodRestaurant.findOne({ restaurantNameNormalized: 'raddison' }).lean();
    const timings = await FoodRestaurantOutletTimings.findOne({ restaurantId: restaurant._id }).lean();

    const dayName = "Wednesday"; // Today
    const todayTiming = timings?.timings?.find(t => t.day === dayName) || { isOpen: true, openingTime: "09:00", closingTime: "22:00" };

    const slots = buildSlots(todayTiming);
    const analyzedSlots = slots.map(s => ({
      slot: s,
      mealPeriod: getMealPeriod(s)
    }));

    fs.writeFileSync('slots_result.txt', JSON.stringify({
      todayTiming,
      analyzedSlots
    }, null, 2));

    await mongoose.disconnect();
    console.log("Done");
  } catch (err) {
    console.error(err);
  }
}

run();
