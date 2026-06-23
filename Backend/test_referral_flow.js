import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FoodUser } from './src/core/users/user.model.js';
import { FoodUserWallet } from './src/modules/food/user/models/userWallet.model.js';
import { FoodDeliveryPartner } from './src/modules/food/delivery/models/deliveryPartner.model.js';
import { DeliveryBonusTransaction } from './src/modules/food/admin/models/deliveryBonusTransaction.model.js';
import { FoodReferralSettings } from './src/modules/food/admin/models/referralSettings.model.js';
import { FoodReferralLog } from './src/modules/food/admin/models/referralLog.model.js';
import { verifyUserOtpAndLogin } from './src/core/auth/auth.service.js';
import { approveDeliveryPartner } from './src/modules/food/admin/services/admin.service.js';

dotenv.config();

function assert(condition, message) {
  if (!condition) {
    throw new Error('ASSERTION FAILED: ' + message);
  }
  console.log('✅ PASS:', message);
}

async function runTests() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodelo';
  console.log('Connecting to MongoDB:', uri);
  await mongoose.connect(uri);

  let originalSettings = null;
  let referrerUser = null;
  let refereeUser = null;
  let referrerPartner = null;
  let refereePartner = null;
  const refereePhone = '+918888888888';

  try {
    // 1. Backup original settings
    originalSettings = await FoodReferralSettings.findOne({ isActive: true }).sort({ createdAt: -1 }).lean();
    console.log('Backed up original settings.');

    // 2. Set up test settings
    await FoodReferralSettings.deleteMany({});
    const testSettings = await FoodReferralSettings.create({
      user: {
        referrerReward: 100,
        refereeReward: 50,
        limit: 5
      },
      delivery: {
        referrerReward: 200,
        refereeReward: 75,
        limit: 5
      },
      isActive: true
    });
    console.log('Created test referral settings.');

    // --- TEST 1: User Referral Flow ---
    console.log('\n--- Running Test 1: User Referral Flow ---');
    
    // Create Referrer User
    referrerUser = await FoodUser.create({
      phone: '+919999999999',
      name: 'Referrer User',
      isVerified: true
    });
    // Ensure referralCode is populated (this mimics what the server does)
    referrerUser.referralCode = String(referrerUser._id);
    await referrerUser.save();
    console.log('Created Referrer User with referral code:', referrerUser.referralCode);

    // Set up a fake OTP for our test referee phone
    const otpCode = '1234';
    await mongoose.connection.db.collection('food_otps').deleteOne({ phone: refereePhone });
    await mongoose.connection.db.collection('food_otps').insertOne({
      phone: refereePhone,
      otp: otpCode,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });
    console.log('Inserted OTP for referee user:', refereePhone);

    // Call verifyUserOtpAndLogin to register B under A's referral code
    console.log('Simulating OTP verification for referee signup...');
    const result = await verifyUserOtpAndLogin(
      refereePhone,
      otpCode,
      referrerUser.referralCode,
      null, // fcmToken
      'web', // platform
      'Referee User' // name
    );

    refereeUser = result.user;
    console.log('Returned referee user:', refereeUser);
    
    assert(refereeUser !== null, 'Referee user should be created');
    assert(String(refereeUser.referredBy) === String(referrerUser._id), 'Referee referredBy should match referrer ID');

    // Fetch updated referrer details
    const updatedReferrer = await FoodUser.findById(referrerUser._id).lean();
    assert(updatedReferrer.referralCount === 1, 'Referrer referralCount should be incremented to 1');

    // Verify Wallets
    const referrerWallet = await FoodUserWallet.findOne({ userId: referrerUser._id }).lean();
    const refereeWallet = await FoodUserWallet.findOne({ userId: refereeUser._id }).lean();

    assert(referrerWallet !== null, 'Referrer wallet should exist');
    assert(referrerWallet.balance === 100, `Referrer wallet balance should be 100, got ${referrerWallet?.balance}`);
    assert(referrerWallet.referralEarnings === 100, `Referrer referralEarnings should be 100, got ${referrerWallet?.referralEarnings}`);
    assert(referrerWallet.transactions.length === 1, 'Referrer wallet should have 1 transaction');
    assert(referrerWallet.transactions[0].metadata?.type === 'referrer_reward', 'Referrer transaction type should be referrer_reward');

    assert(refereeWallet !== null, 'Referee wallet should exist');
    assert(refereeWallet.balance === 50, `Referee wallet balance should be 50, got ${refereeWallet?.balance}`);
    assert(refereeWallet.referralEarnings === 50, `Referee referralEarnings should be 50, got ${refereeWallet?.referralEarnings}`);
    assert(refereeWallet.transactions.length === 1, 'Referee wallet should have 1 transaction');
    assert(refereeWallet.transactions[0].metadata?.type === 'referee_reward', 'Referee transaction type should be referee_reward');

    // Verify Referral Log
    const userLog = await FoodReferralLog.findOne({ refereeId: refereeUser._id, role: 'USER' }).lean();
    assert(userLog !== null, 'Referral log for USER should exist');
    assert(userLog.status === 'credited', 'Referral log status should be credited');
    assert(userLog.rewardAmount === 100, `Referral log rewardAmount should be 100, got ${userLog.rewardAmount}`);
    assert(userLog.referrerRewardAmount === 100, `Referral log referrerRewardAmount should be 100, got ${userLog.referrerRewardAmount}`);
    assert(userLog.refereeRewardAmount === 50, `Referral log refereeRewardAmount should be 50, got ${userLog.refereeRewardAmount}`);


    // --- TEST 2: Delivery Partner Referral Flow ---
    console.log('\n--- Running Test 2: Delivery Partner Referral Flow ---');

    // Create Referrer Partner (must be approved)
    referrerPartner = await FoodDeliveryPartner.create({
      phone: '+919999999991',
      name: 'Referrer Partner',
      status: 'approved'
    });

    // Create Referee Partner (pending, referredBy Referrer)
    refereePartner = await FoodDeliveryPartner.create({
      phone: '+918888888881',
      name: 'Referee Partner',
      status: 'pending',
      referredBy: referrerPartner._id
    });

    console.log('Approving Referee Partner...');
    await approveDeliveryPartner(refereePartner._id);

    // Verify status updated
    const updatedRefereePartner = await FoodDeliveryPartner.findById(refereePartner._id).lean();
    assert(updatedRefereePartner.status === 'approved', 'Referee partner status should be approved');

    // Fetch updated referrer partner details
    const updatedReferrerPartner = await FoodDeliveryPartner.findById(referrerPartner._id).lean();
    assert(updatedReferrerPartner.referralCount === 1, 'Referrer partner referralCount should be incremented to 1');

    // Verify Delivery Bonus Transactions
    const bonusTxReferrer = await DeliveryBonusTransaction.findOne({ deliveryPartnerId: referrerPartner._id }).lean();
    const bonusTxReferee = await DeliveryBonusTransaction.findOne({ deliveryPartnerId: refereePartner._id }).lean();

    assert(bonusTxReferrer !== null, 'Referrer partner bonus transaction should exist');
    assert(bonusTxReferrer.amount === 200, `Referrer partner bonus amount should be 200, got ${bonusTxReferrer?.amount}`);
    assert(bonusTxReferrer.reference.includes('Referral bonus'), 'Referrer partner reference should contain Referral bonus');

    assert(bonusTxReferee !== null, 'Referee partner bonus transaction should exist');
    assert(bonusTxReferee.amount === 75, `Referee partner bonus amount should be 75, got ${bonusTxReferee?.amount}`);
    assert(bonusTxReferee.reference.includes('Sign-up referral bonus'), 'Referee partner reference should contain Sign-up referral bonus');

    // Verify Referral Log for Delivery Partner
    const deliveryLog = await FoodReferralLog.findOne({ refereeId: refereePartner._id, role: 'DELIVERY_PARTNER' }).lean();
    assert(deliveryLog !== null, 'Referral log for DELIVERY_PARTNER should exist');
    assert(deliveryLog.status === 'credited', 'Referral log status should be credited');
    assert(deliveryLog.rewardAmount === 200, `Referral log rewardAmount should be 200, got ${deliveryLog.rewardAmount}`);
    assert(deliveryLog.referrerRewardAmount === 200, `Referral log referrerRewardAmount should be 200, got ${deliveryLog.referrerRewardAmount}`);
    assert(deliveryLog.refereeRewardAmount === 75, `Referral log refereeRewardAmount should be 75, got ${deliveryLog.refereeRewardAmount}`);

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');

  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err);
  } finally {
    console.log('\nCleaning up test records...');

    // Delete test users & wallets & OTPs & logs
    if (referrerUser) {
      await FoodUser.deleteOne({ _id: referrerUser._id });
      await FoodUserWallet.deleteOne({ userId: referrerUser._id });
    }
    if (refereeUser) {
      await FoodUser.deleteOne({ _id: refereeUser._id });
      await FoodUserWallet.deleteOne({ userId: refereeUser._id });
      await FoodReferralLog.deleteOne({ refereeId: refereeUser._id, role: 'USER' });
    }
    await mongoose.connection.db.collection('food_otps').deleteOne({ phone: refereePhone });

    // Delete test partners & bonus transactions & logs
    if (referrerPartner) {
      await FoodDeliveryPartner.deleteOne({ _id: referrerPartner._id });
      await DeliveryBonusTransaction.deleteOne({ deliveryPartnerId: referrerPartner._id });
    }
    if (refereePartner) {
      await FoodDeliveryPartner.deleteOne({ _id: refereePartner._id });
      await DeliveryBonusTransaction.deleteOne({ deliveryPartnerId: refereePartner._id });
      await FoodReferralLog.deleteOne({ refereeId: refereePartner._id, role: 'DELIVERY_PARTNER' });
    }

    // Restore settings
    await FoodReferralSettings.deleteMany({});
    if (originalSettings) {
      // remove _v
      delete originalSettings.__v;
      await FoodReferralSettings.create(originalSettings);
      console.log('Restored original referral settings.');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTests();
