import mongoose from 'mongoose';

const franchiseSettingsSchema = new mongoose.Schema({
  // Branding
  brandName: { type: String, default: 'Daddy Pizza' },
  tagline: { type: String, default: 'Start Your Own Pizza Business' },
  logoUrl: { type: String, default: '' },
  secondaryLogoUrl: { type: String, default: '' },
  faviconUrl: { type: String, default: '' },

  // Hero Section
  heroTitle: { type: String, default: 'Franchise Opportunity' },
  heroSubtitle: { type: String, default: 'Start Your Own Pizza Business' },
  heroCTAText: { type: String, default: 'Apply Now' },
  heroBgImageUrl: { type: String, default: '' },

  // Investment
  investmentPrice: { type: String, default: '₹1,29,000' },
  investmentBgImageUrl: { type: String, default: '' },

  // Contact
  contactNumber: { type: String, default: '' },
  whatsappNumber: { type: String, default: '' },
  contactEmail: { type: String, default: '' },

  // Brochure
  brochureUrl: { type: String, default: '' },

  // Why Choose Us
  whyChooseUs: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'Star' },
    sortOrder: { type: Number, default: 0 },
  }],

  // Package Categories
  packages: [{
    categoryName: { type: String, required: true },
    icon: { type: String, default: 'Package' },
    items: [String],
    sortOrder: { type: Number, default: 0 },
  }],

  // Business Timeline Steps
  timelineSteps: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
  }],

  // Investment Inclusions
  investmentIncludes: [String],

  // Gallery Images
  galleryImages: [{
    url: { type: String, required: true },
    caption: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
  }],

  // FAQ
  faqs: [{
    question: { type: String, required: true },
    answer: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
  }],

  // Lead Form Settings
  formSettings: {
    buttonText: { type: String, default: 'Become Franchise Partner' },
    enabledFields: {
      type: [String],
      default: ['name', 'phone', 'email', 'city', 'state', 'preferredLocation', 'budget', 'occupation', 'experience', 'message'],
    },
    requiredFields: {
      type: [String],
      default: ['name', 'phone', 'email', 'city', 'state', 'preferredLocation', 'budget'],
    },
  },
}, {
  timestamps: true,
  collection: 'franchisesettings',
});

const FranchiseSettings = mongoose.model('FranchiseSettings', franchiseSettingsSchema);

export default FranchiseSettings;
