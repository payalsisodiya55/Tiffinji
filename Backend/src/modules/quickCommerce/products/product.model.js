import mongoose from 'mongoose';

const quickCommerceProductSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        category: { type: String },
        price: { type: Number, required: true },
        stock: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

export const QuickCommerceProduct = mongoose.models.QuickCommerceProduct || mongoose.model('QuickCommerceProduct', quickCommerceProductSchema);
