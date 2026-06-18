import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import { FoodDiningRequest } from './src/modules/food/dining/models/diningRequest.model.js';
import { FoodRestaurant } from './src/modules/food/restaurant/models/restaurant.model.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodelo');
    const requests = await FoodDiningRequest.find({}).sort({ createdAt: -1 }).limit(5).lean();
    const restaurants = await FoodRestaurant.find({ restaurantNameNormalized: 'raddison' }).select('restaurantName diningSettings').lean();
    const data = {
      requests,
      restaurants
    };
    fs.writeFileSync('diagnose_result.txt', JSON.stringify(data, null, 2));
    await mongoose.disconnect();
    console.log("Diagnostics completed successfully!");
  } catch (err) {
    console.error(err);
  }
}
run();
