import { QuickCommerceProduct } from './product.model.js';

export const getProductsController = async (req, res, next) => {
    try {
        const products = await QuickCommerceProduct.find({ isActive: true }).lean();
        return res.status(200).json({ success: true, data: products });
    } catch (error) {
        next(error);
    }
};
