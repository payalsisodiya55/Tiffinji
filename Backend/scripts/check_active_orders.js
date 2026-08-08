import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';

const run = async () => {
  await connectDB();

  // Find all orders for the user
  const userId = "69c39f5feae6e12480a16661";
  const orders = await mongoose.connection.db.collection('food_orders')
    .find({ userId: new mongoose.Types.ObjectId(userId) })
    .toArray();

  console.log(`Found ${orders.length} orders for user ${userId}:`);
  orders.forEach(o => {
    console.log({
      _id: o._id,
      orderId: o.orderId,
      status: o.orderStatus || o.status,
      phase: o.deliveryState?.currentPhase,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt
    });
  });

  // Find recent orders for ANY user in case the userId is different
  const recentOrders = await mongoose.connection.db.collection('food_orders')
    .find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
  console.log("\nRecent orders for ANY user:");
  recentOrders.forEach(o => {
    console.log({
      _id: o._id,
      userId: o.userId,
      orderId: o.orderId,
      status: o.orderStatus || o.status,
      phase: o.deliveryState?.currentPhase,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt
    });
  });

  await disconnectDB();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
