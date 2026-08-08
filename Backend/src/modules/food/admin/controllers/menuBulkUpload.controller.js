import { upload } from '../../../../middleware/upload.js';
import { processBulkMenuUpload, getMenuItemsStatus } from '../services/menuBulkUpload.service.js';
import mongoose from 'mongoose';

/**
 * POST /food/admin/menu/bulk-upload
 * Body: multipart/form-data  { restaurantId, file }
 */
export const bulkUploadMenuController = [
    upload.single('file'),
    async (req, res, next) => {
        try {
            const restaurantId = req.body?.restaurantId;
            if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
                return res.status(400).json({ success: false, message: 'restaurantId is required' });
            }
            if (!req.file?.buffer) {
                return res.status(400).json({ success: false, message: 'No file provided' });
            }

            const { menu, insertedCount, restaurantName } = await processBulkMenuUpload(
                restaurantId,
                req.file.buffer,
                req.file.mimetype,
                req.file.originalname
            );

            return res.status(200).json({
                success: true,
                message: `✅ ${insertedCount} item(s) added to ${restaurantName}`,
                menu,
                queuedJobsCount: 0,  // No AI image generation
                insertedCount
            });
        } catch (err) {
            if (err.message && (err.message.includes('empty') || err.message.includes('Invalid') || err.message.includes('No valid'))) {
                return res.status(400).json({ success: false, message: err.message });
            }
            next(err);
        }
    }
];

/**
 * GET /food/admin/menu/items-status/:restaurantId
 * Poll for image URLs (no AI — always returns current images from DB)
 */
export const getMenuItemsStatusController = async (req, res, next) => {
    try {
        const { restaurantId } = req.params;
        if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({ success: false, message: 'Invalid restaurant ID' });
        }
        const data = await getMenuItemsStatus(restaurantId);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /food/admin/menu/regenerate-image
 * No-op stub (AI image generation not implemented)
 */
export const regenerateMenuItemImageController = async (req, res) => {
    return res.status(200).json({ success: true, message: 'Image regeneration is not available in this version.' });
};
