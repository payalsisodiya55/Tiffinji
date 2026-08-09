import 'dotenv/config';
import mongoose from 'mongoose';
import { FoodRestaurant } from '../src/modules/food/restaurant/models/restaurant.model.js';
import { FoodRestaurantOutletTimings } from '../src/modules/food/restaurant/models/outletTimings.model.js';
import { computeRestaurantAvailability } from '../src/modules/food/restaurant/services/restaurantAvailability.helper.js';
import { config } from '../src/config/env.js';

async function inspectSayaji() {
  try {
    const mongoUri = config.mongoUri || process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is missing');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully');

    // Find restaurant with name matching "Sayaji" or slug matching "sayaji"
    const restaurant = await FoodRestaurant.findOne({
      $or: [
        { restaurantName: /sayaji/i },
        { restaurantNameNormalized: /sayaji/i }
      ]
    }).lean();

    if (!restaurant) {
      console.error('Sayaji restaurant not found in database');
      process.exit(1);
    }

    console.log('\n================ SAYAJI RESTAURANT DOCUMENT ================');
    console.log({
      _id: restaurant._id,
      restaurantName: restaurant.restaurantName,
      restaurantNameNormalized: restaurant.restaurantNameNormalized,
      status: restaurant.status,
      isAcceptingOrders: restaurant.isAcceptingOrders,
      openingTime: restaurant.openingTime,
      closingTime: restaurant.closingTime,
      openDays: restaurant.openDays,
      city: restaurant.city,
      location: restaurant.location,
      isActive: restaurant.isActive
    });

    // Find timings
    const timingDoc = await FoodRestaurantOutletTimings.findOne({
      $or: [
        { restaurantId: restaurant._id },
        { restaurantId: String(restaurant._id) }
      ]
    }).lean();

    console.log('\n================ OUTLET TIMINGS DOCUMENT ================');
    if (!timingDoc) {
      console.log('No OutletTimings document found for Sayaji');
    } else {
      console.log({
        _id: timingDoc._id,
        restaurantId: timingDoc.restaurantId,
        restaurantIdMatches: String(timingDoc.restaurantId) === String(restaurant._id),
        timingsCount: timingDoc.timings?.length || 0,
        timings: timingDoc.timings
      });
    }

    console.log('\n================ RUNNING AVAILABILITY HELPER ================');
    const result = computeRestaurantAvailability(restaurant, timingDoc);
    console.log('Helper Result:', result);

    process.exit(0);
  } catch (err) {
    console.error('Error during inspection:', err);
    process.exit(1);
  }
}

inspectSayaji();
