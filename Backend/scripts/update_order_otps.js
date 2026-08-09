import 'dotenv/config';
import mongoose from 'mongoose';
import { FoodOrder } from '../src/modules/food/orders/models/order.model.js';
import { generateFourDigitDeliveryOtp } from '../src/modules/food/orders/services/order.helpers.js';
import { config } from '../src/config/env.js';

async function updateExistingOrderOtps() {
  try {
    const mongoUri = config.mongoUri || process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is missing');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const orders = await FoodOrder.find({
      $or: [
        { pickupOtp: { $exists: false } },
        { pickupOtp: null },
        { pickupOtp: '' },
        { pickupOtp: '1234' }
      ]
    }).select('_id order_id');

    console.log(`Found ${orders.length} orders needing OTP update`);

    for (const order of orders) {
      const newOtp = generateFourDigitDeliveryOtp();
      await FoodOrder.updateOne(
        { _id: order._id },
        { $set: { pickupOtp: newOtp, deliveryOtp: newOtp } }
      );
      console.log(`Updated Order ${order.order_id || order._id} -> OTP: ${newOtp}`);
    }

    console.log('All order OTPs updated successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error updating order OTPs:', err);
    process.exit(1);
  }
}

updateExistingOrderOtps();
