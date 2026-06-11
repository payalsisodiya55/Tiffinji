import FranchiseSettings from '../models/franchiseSettings.model.js';

// Default seed data for initial settings
const DEFAULT_SETTINGS = {
  brandName: 'Daddy Pizza',
  tagline: 'Start Your Own Pizza Business',
  heroTitle: 'Franchise Opportunity',
  heroSubtitle: 'Start Your Own Pizza Business',
  heroCTAText: 'Apply Now',
  heroBgImageUrl: '/food/franchise/hero_bg.png',
  investmentPrice: '₹1,29,000',
  investmentBgImageUrl: '/food/franchise/investment_bg.png',
  whyChooseUs: [
    { title: 'Low Investment', description: 'Start with minimal capital and maximum returns', icon: 'TrendingDown', sortOrder: 1 },
    { title: 'High Profit Potential', description: 'Proven business model with attractive margins', icon: 'TrendingUp', sortOrder: 2 },
    { title: 'Complete Business Setup', description: 'We handle everything from equipment to branding', icon: 'Boxes', sortOrder: 3 },
    { title: 'Professional Training', description: 'Comprehensive training for you and your team', icon: 'GraduationCap', sortOrder: 4 },
    { title: 'Marketing Support', description: 'Digital and offline marketing assistance', icon: 'Megaphone', sortOrder: 5 },
    { title: 'Quick Setup', description: 'Get your outlet running in just 15-20 days', icon: 'Zap', sortOrder: 6 },
    { title: 'Beginner Friendly', description: 'No prior experience in food industry needed', icon: 'Heart', sortOrder: 7 },
    { title: 'Ongoing Support', description: 'Continuous business support and guidance', icon: 'Headphones', sortOrder: 8 },
  ],
  packages: [
    { categoryName: 'Equipment', icon: 'Cpu', items: ['Electric Oven', 'Commercial SS Body', 'Storage Containers'], sortOrder: 1 },
    { categoryName: 'Raw Material', icon: 'Leaf', items: ['Pizza Sauce', 'Cheese', 'Oregano', 'Chilli Flakes', 'Seasonings', 'Starter Stock'], sortOrder: 2 },
    { categoryName: 'Tools', icon: 'Wrench', items: ['Pizza Cutter', 'Pizza Tray', 'Cheese Grater', 'Kitchen Tools', 'Pizza Lifter'], sortOrder: 3 },
    { categoryName: 'Training', icon: 'GraduationCap', items: ['SOP Documentation', 'Pizza Making', 'Hygiene Standards', 'Costing & Pricing', 'Customer Management'], sortOrder: 4 },
    { categoryName: 'Packaging', icon: 'Package', items: ['Pizza Boxes', 'Delivery Bags', 'Napkins', 'Sauce Bottles'], sortOrder: 5 },
    { categoryName: 'Business Support', icon: 'Handshake', items: ['Supplier Network', 'Startup Guidance', 'Menu Pricing Help', 'WhatsApp Support'], sortOrder: 6 },
    { categoryName: 'Branding', icon: 'Palette', items: ['Menu Card Design', 'Posters', 'Digital Creatives'], sortOrder: 7 },
    { categoryName: 'Bonus', icon: 'Gift', items: ['Secret Recipes', 'Startup Files', 'Business Plan Template'], sortOrder: 8 },
  ],
  timelineSteps: [
    { title: 'Apply', description: 'Fill out the franchise application form', sortOrder: 1 },
    { title: 'Registration', description: 'Complete the registration process', sortOrder: 2 },
    { title: 'Training', description: 'Attend comprehensive training sessions', sortOrder: 3 },
    { title: 'Equipment Delivery', description: 'Receive all equipment and materials', sortOrder: 4 },
    { title: 'Outlet Setup', description: 'Set up your outlet with our guidance', sortOrder: 5 },
    { title: 'Business Launch', description: 'Grand opening and start serving!', sortOrder: 6 },
  ],
  investmentIncludes: ['Equipment', 'Starter Stock', 'Training', 'Branding', 'Business Support'],
  galleryImages: [
    { url: '/food/franchise/gallery_1.png', caption: 'Freshly Baked Pizza', sortOrder: 1 },
    { url: '/food/franchise/gallery_2.png', caption: 'Modern Pizza Outlet', sortOrder: 2 },
    { url: '/food/franchise/gallery_3.png', caption: 'Authentic Preparation', sortOrder: 3 }
  ],
  faqs: [
    { question: 'What is the franchise cost?', answer: 'The franchise investment starts from ₹1,29,000 which includes equipment, raw materials, training, branding, and business support.', sortOrder: 1 },
    { question: 'How much area is required?', answer: 'You need a minimum of 100-150 sq ft of space for the outlet setup.', sortOrder: 2 },
    { question: 'How many days for setup?', answer: 'The complete setup typically takes 15-20 days from registration to launch.', sortOrder: 3 },
    { question: 'Will I get training?', answer: 'Yes, we provide comprehensive training covering pizza making, hygiene standards, customer management, and business operations.', sortOrder: 4 },
    { question: 'Do you provide marketing support?', answer: 'Yes, we provide complete marketing support including digital creatives, social media strategies, and local marketing guidance.', sortOrder: 5 },
  ],
  formSettings: {
    buttonText: 'Become Franchise Partner',
    enabledFields: ['name', 'phone', 'email', 'city', 'state', 'preferredLocation', 'budget', 'occupation', 'experience', 'message'],
    requiredFields: ['name', 'phone', 'email', 'city', 'state', 'preferredLocation', 'budget'],
  },
};

/**
 * GET /api/v1/food/franchise/settings/public
 * Returns the franchise page CMS content (public, no auth).
 */
export async function getPublicSettings(req, res) {
  try {
    let settings = await FranchiseSettings.findOne().lean();
    if (!settings) {
      // Seed default settings on first access
      settings = await FranchiseSettings.create(DEFAULT_SETTINGS);
      settings = settings.toObject();
    } else if (!settings.heroBgImageUrl || !settings.galleryImages || settings.galleryImages.length === 0) {
      // Update existing document with new default images
      const updated = await FranchiseSettings.findOneAndUpdate(
        {},
        {
          $set: {
            heroBgImageUrl: DEFAULT_SETTINGS.heroBgImageUrl,
            galleryImages: DEFAULT_SETTINGS.galleryImages
          }
        },
        { new: true }
      ).lean();
      if (updated) settings = updated;
    }
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('[Franchise] getPublicSettings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch franchise settings.' });
  }
}

/**
 * GET /api/v1/food/admin/franchise/settings
 * Returns the full franchise settings for admin editing.
 */
export async function getSettings(req, res) {
  try {
    let settings = await FranchiseSettings.findOne().lean();
    if (!settings) {
      settings = await FranchiseSettings.create(DEFAULT_SETTINGS);
      settings = settings.toObject();
    } else if (!settings.heroBgImageUrl || !settings.galleryImages || settings.galleryImages.length === 0) {
      // Update existing document with new default images
      const updated = await FranchiseSettings.findOneAndUpdate(
        {},
        {
          $set: {
            heroBgImageUrl: DEFAULT_SETTINGS.heroBgImageUrl,
            galleryImages: DEFAULT_SETTINGS.galleryImages
          }
        },
        { new: true }
      ).lean();
      if (updated) settings = updated;
    }
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('[Franchise] getSettings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch franchise settings.' });
  }
}

/**
 * PATCH /api/v1/food/admin/franchise/settings
 * Update franchise settings (upsert).
 */
export async function updateSettings(req, res) {
  try {
    const updateData = { ...req.body, updatedAt: new Date() };

    // Remove _id and __v to prevent update errors
    delete updateData._id;
    delete updateData.__v;

    const settings = await FranchiseSettings.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, runValidators: true },
    ).lean();

    return res.status(200).json({ success: true, message: 'Franchise settings updated.', data: settings });
  } catch (error) {
    console.error('[Franchise] updateSettings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update franchise settings.' });
  }
}
