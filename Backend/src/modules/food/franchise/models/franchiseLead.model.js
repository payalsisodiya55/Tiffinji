import mongoose from 'mongoose';

const franchiseLeadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  preferredLocation: { type: String, required: true, trim: true },
  budget: { type: String, required: true },
  occupation: { type: String, default: '' },
  experience: { type: String, default: '' },
  message: { type: String, default: '' },
  status: {
    type: String,
    enum: ['NEW', 'CONTACTED', 'FOLLOW_UP', 'MEETING_SCHEDULED', 'PAYMENT_PENDING', 'APPROVED', 'REJECTED'],
    default: 'NEW',
  },
  remarks: { type: String, default: '' },
  assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
  timestamps: true,
  collection: 'franchiseleads',
});

franchiseLeadSchema.index({ phone: 1 });
franchiseLeadSchema.index({ email: 1 });
franchiseLeadSchema.index({ status: 1 });
franchiseLeadSchema.index({ createdAt: -1 });

const FranchiseLead = mongoose.model('FranchiseLead', franchiseLeadSchema);

export default FranchiseLead;
