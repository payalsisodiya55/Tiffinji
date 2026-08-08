import { sendResponse } from '../../../../utils/response.js';
import { validateUserProfileUpdateDto } from '../../../../dtos/food/userProfileUpdate.dto.js';
import {
    getCurrentUserProfile,
    updateCurrentUserProfile,
    uploadCurrentUserProfileImage
} from '../services/userProfile.service.js';

export const getCurrentUserProfileController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const result = await getCurrentUserProfile(userId);
        return sendResponse(res, 200, 'Profile retrieved successfully', result);
    } catch (error) {
        next(error);
    }
};

export const updateCurrentUserProfileController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const body = validateUserProfileUpdateDto(req.body);
        const result = await updateCurrentUserProfile(userId, body);
        return sendResponse(res, 200, 'Profile updated successfully', result);
    } catch (error) {
        next(error);
    }
};

import { FoodUser } from '../../../../core/users/user.model.js';
import { AuthError } from '../../../../core/auth/errors.js';

export const uploadCurrentUserProfileImageController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const result = await uploadCurrentUserProfileImage(userId, req.file);
        return sendResponse(res, 200, 'Profile image uploaded successfully', result);
    } catch (error) {
        next(error);
    }
};

export const getUserLocationController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const user = await FoodUser.findById(userId).select('liveLocation').lean();
        if (!user) throw new AuthError('Profile not found');
        return sendResponse(res, 200, 'User location retrieved successfully', { location: user.liveLocation || null });
    } catch (error) {
        next(error);
    }
};

export const updateUserLocationController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const { latitude, longitude, formattedAddress, city, area, accuracy, street, streetNumber } = req.body;
        
        const user = await FoodUser.findById(userId);
        if (!user) throw new AuthError('Profile not found');
        
        const lat = Number(latitude);
        const lng = Number(longitude);
        
        user.liveLocation = {
            type: 'Point',
            coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : undefined,
            formattedAddress: formattedAddress || '',
            city: city || '',
            area: area || '',
            accuracy: Number(accuracy) || 0,
            street: street || '',
            streetNumber: streetNumber || ''
        };
        
        await user.save();
        return sendResponse(res, 200, 'User location updated successfully', { location: user.liveLocation });
    } catch (error) {
        next(error);
    }
};

