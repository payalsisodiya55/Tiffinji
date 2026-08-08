import { FoodAppConfig } from '../models/appConfig.model.js';

export const getAllConfigs = async (req, res, next) => {
    try {
        const configs = await FoodAppConfig.find({}).lean();
        return res.status(200).json({
            success: true,
            data: configs
        });
    } catch (error) {
        next(error);
    }
};

export const getConfigByAppName = async (req, res, next) => {
    try {
        const { appName } = req.params;
        let config = await FoodAppConfig.findOne({ appName }).lean();
        if (!config) {
            config = {
                appName,
                primaryColor: appName === 'restaurant_app' ? '#B80B3D' : appName === 'delivery_app' ? '#0ea5e9' : appName === 'admin_app' ? '#2563eb' : '#e11d48',
                secondaryColor: appName === 'restaurant_app' ? '#66001D' : appName === 'delivery_app' ? '#0284c7' : appName === 'admin_app' ? '#1d4ed8' : '#be123c',
                logoUrl: '',
                fontFamily: "'Poppins', sans-serif"
            };
        }
        return res.status(200).json({
            success: true,
            data: config
        });
    } catch (error) {
        next(error);
    }
};

export const updateConfig = async (req, res, next) => {
    try {
        const { appName } = req.params;
        const { primaryColor, secondaryColor, logoUrl, fontFamily } = req.body;
        
        const config = await FoodAppConfig.findOneAndUpdate(
            { appName },
            { primaryColor, secondaryColor, logoUrl, fontFamily },
            { new: true, upsert: true }
        );
        
        return res.status(200).json({
            success: true,
            message: 'App configuration updated successfully',
            data: config
        });
    } catch (error) {
        next(error);
    }
};
