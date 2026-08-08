import mongoose from 'mongoose';

const appConfigSchema = new mongoose.Schema({
    appName: {
        type: String,
        required: true,
        unique: true
    },
    primaryColor: {
        type: String,
        default: '#e11d48'
    },
    secondaryColor: {
        type: String,
        default: '#be123c'
    },
    logoUrl: {
        type: String,
        default: ''
    },
    fontFamily: {
        type: String,
        default: "'Poppins', sans-serif"
    }
}, {
    timestamps: true
});

export const FoodAppConfig = mongoose.model('FoodAppConfig', appConfigSchema, 'food_app_configs');
