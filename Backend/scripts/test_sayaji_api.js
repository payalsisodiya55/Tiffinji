import 'dotenv/config';
import mongoose from 'mongoose';
import { listApprovedRestaurants, getApprovedRestaurantByIdOrSlug } from '../src/modules/food/restaurant/services/restaurant.service.js';
import { FoodRestaurantOutletTimings } from '../src/modules/food/restaurant/models/outletTimings.model.js';
import { config } from '../src/config/env.js';

async function testSayajiApi() {
  try {
    const mongoUri = config.mongoUri || process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Call service function for lists
    const listResult = await listApprovedRestaurants({});
    const sayajiInList = listResult.restaurants.find(r => r.restaurantName === 'Sayaji');

    console.log('\n================ LIST APPROVED RESTAURANTS API RESPONSE ================');
    if (sayajiInList) {
      console.log({
        id: sayajiInList.id,
        name: sayajiInList.name,
        isOpen: sayajiInList.isOpen,
        closedReason: sayajiInList.closedReason,
        isAcceptingOrders: sayajiInList.isAcceptingOrders,
        openingTime: sayajiInList.openingTime,
        closingTime: sayajiInList.closingTime
      });
    } else {
      console.log('Sayaji not found in approved list');
    }

    // Call detail service function
    const detailResult = await getApprovedRestaurantByIdOrSlug('sayaji');
    console.log('\n================ DETAIL API RESPONSE ================');
    if (detailResult) {
      console.log({
        _id: detailResult._id,
        restaurantName: detailResult.restaurantName,
        isOpen: detailResult.isOpen,
        closedReason: detailResult.closedReason,
        isAcceptingOrders: detailResult.isAcceptingOrders,
        openingTime: detailResult.openingTime,
        closingTime: detailResult.closingTime
      });
    } else {
      console.log('Sayaji detail not found');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testSayajiApi();
