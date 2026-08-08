import {
    listHeroBanners,
    createHeroBannersFromFiles,
    deleteHeroBanner,
    updateHeroBannerOrder,
    toggleHeroBannerStatus,
    linkRestaurantsToBanner
} from '../services/heroBanner.service.js';
import { sendResponse } from '../../../../utils/response.js';
import { ValidationError } from '../../../../core/auth/errors.js';

export const listHeroBannersController = async (req, res, next) => {
    try {
        const banners = await listHeroBanners();
        return sendResponse(res, 200, 'Hero banners fetched successfully', { banners });
    } catch (error) {
        next(error);
    }
};

export const uploadHeroBannersController = async (req, res, next) => {
    try {
        if (!req.files || !req.files.length) {
            throw new ValidationError('No files uploaded');
        }
        const results = await createHeroBannersFromFiles(req.files, req.body);
        return sendResponse(res, 201, 'Hero banners processed', { results });
    } catch (error) {
        next(error);
    }
};

export const deleteHeroBannerController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await deleteHeroBanner(id);
        if (!result.deleted) {
            return sendResponse(res, 404, 'Hero banner not found');
        }
        return sendResponse(res, 200, 'Hero banner deleted successfully');
    } catch (error) {
        next(error);
    }
};

export const updateHeroBannerOrderController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { sortOrder } = req.body;
        const updated = await updateHeroBannerOrder(id, sortOrder);
        return sendResponse(res, 200, 'Hero banner order updated successfully', updated);
    } catch (error) {
        next(error);
    }
};

export const toggleHeroBannerStatusController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const updated = await toggleHeroBannerStatus(id, isActive);
        return sendResponse(res, 200, 'Hero banner status updated successfully', updated);
    } catch (error) {
        next(error);
    }
};

export const linkRestaurantsToBannerController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { restaurantIds } = req.body;
        if (!id || !Array.isArray(restaurantIds)) {
            throw new ValidationError('id and restaurantIds array are required');
        }
        const updated = await linkRestaurantsToBanner(id, restaurantIds);
        return sendResponse(res, 200, 'Restaurants linked to banner successfully', updated);
    } catch (error) {
        next(error);
    }
};
