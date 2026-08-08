import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/env.js';

const cloudName = config.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = config.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY;
const apiSecret = config.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
    });
}

export const uploadBufferToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) return reject(error);
            return resolve(result);
        });
        stream.end(buffer);
    });
};

export const uploadImageBuffer = async (buffer, folder = 'tiffinji/uploads') => {
    if (!buffer) return null;
    const result = await uploadBufferToCloudinary(buffer, {
        folder,
        resource_type: 'image'
    });
    return result?.secure_url || result?.url || null;
};

export const uploadImageBufferDetailed = async (buffer, folder = 'tiffinji/uploads') => {
    if (!buffer) return null;
    const result = await uploadBufferToCloudinary(buffer, {
        folder,
        resource_type: 'image'
    });
    return {
        url: result?.secure_url || result?.url || '',
        publicId: result?.public_id || ''
    };
};

export const uploadFileBuffer = async (buffer, folder = 'tiffinji/docs', resourceType = 'auto') => {
    if (!buffer) return null;
    const result = await uploadBufferToCloudinary(buffer, {
        folder,
        resource_type: resourceType
    });
    return result?.secure_url || result?.url || null;
};

export const uploadVideoBuffer = async (buffer, folder = 'tiffinji/videos') => {
    if (!buffer) return null;
    const result = await uploadBufferToCloudinary(buffer, {
        folder,
        resource_type: 'video'
    });
    return result?.secure_url || result?.url || null;
};

export const buildRawDownloadUrlFromFileUrl = (fileUrl, options = {}) => {
    if (!fileUrl) return '';
    if (typeof fileUrl === 'string' && fileUrl.startsWith('http')) {
        return fileUrl;
    }
    return fileUrl;
};
