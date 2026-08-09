import 'dotenv/config';
import mongoose from 'mongoose';
import { FoodRestaurantOutletTimings } from '../src/modules/food/restaurant/models/outletTimings.model.js';
import { FoodRestaurant } from '../src/modules/food/restaurant/models/restaurant.model.js';
import { config } from '../src/config/env.js';

async function checkAllTimings() {
  try {
    const mongoUri = config.mongoUri || process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const timings = await FoodRestaurantOutletTimings.find({}).lean();
    console.log(`Found ${timings.length} timings documents:`);

    for (const t of timings) {
      const rest = await FoodRestaurant.findById(t.restaurantId).select('restaurantName').lean();
      console.log(`\nRestaurant: ${rest?.restaurantName || t.restaurantId}`);
      t.timings.forEach(day => {
        if (day.isOpen) {
          console.log(`  - ${day.day}: ${day.openingTime} - ${day.closingTime}`);
        } else {
          console.log(`  - ${day.day}: CLOSED`);
        }
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAllTimings();
