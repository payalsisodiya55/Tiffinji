import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodItem } from '../models/food.model.js';
import { FoodCategory } from '../models/category.model.js';

/**
 * Parse uploaded CSV or XLSX buffer → array of row objects.
 */
function parseFile(buffer, mimetype, originalname) {
    const ext = String(originalname || '').split('.').pop().toLowerCase();
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    return rows;
}

/**
 * Normalize the food type field from CSV to 'Veg' | 'Non-Veg'.
 */
function normalizeFoodType(raw) {
    const v = String(raw || '').trim().toLowerCase();
    if (v.includes('veg') && !v.includes('non')) return 'Veg';
    return 'Non-Veg';
}

/**
 * Parse variants string: "Half:180, Full:350" → [{name, price}]
 */
function parseVariants(raw) {
    if (!raw || !String(raw).trim()) return [];
    return String(raw).split(',').map(s => s.trim()).filter(Boolean).map(entry => {
        const parts = entry.split(':');
        return { name: (parts[0] || '').trim(), price: parseFloat(parts[1]) || 0 };
    }).filter(v => v.name);
}

/**
 * Find or create a category by name for a restaurant/admin context.
 * Admin-created items are auto-approved and global.
 */
async function findOrCreateCategory(name, restaurantId, zoneId) {
    if (!name) return { id: null, name: '' };

    // Look for existing global approved category with same name (case-insensitive)
    let cat = await FoodCategory.findOne({
        name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        isActive: true,
        approvalStatus: 'approved'
    }).lean();

    if (cat) return { id: cat._id, name: cat.name };

    // Create a new approved category
    const newCat = await FoodCategory.create({
        name: name.trim(),
        restaurantId,
        image: '',
        type: '',
        foodTypeScope: 'Both',
        isActive: true,
        isGlobal: false,
        approvalStatus: 'approved',
        approvedAt: new Date(),
        zoneId: zoneId || null,
        sortOrder: 0
    });

    return { id: newCat._id, name: newCat.name };
}

/**
 * Main bulk upload function.
 * Returns { menu, insertedCount }
 */
export async function processBulkMenuUpload(restaurantId, buffer, mimetype, originalname) {
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        throw new Error('Invalid restaurant ID');
    }

    const restaurant = await FoodRestaurant.findById(restaurantId).select('restaurantName zoneId status').lean();
    if (!restaurant) throw new Error('Restaurant not found');

    const rows = parseFile(buffer, mimetype, originalname);
    if (!rows.length) throw new Error('File is empty or could not be parsed. Please use the downloaded template.');

    // Group rows by category name
    const categoryMap = new Map(); // categoryName → [{item}]

    for (const row of rows) {
        const name = String(row['Name'] || row['name'] || '').trim();
        const description = String(row['Description'] || row['description'] || '').trim();
        const price = parseFloat(row['Price'] || row['price'] || 0);
        const categoryName = String(row['Category Name'] || row['category_name'] || row['Category'] || row['category'] || 'General').trim();
        const foodType = normalizeFoodType(row['Food Type (Veg/Non-Veg)'] || row['food_type'] || row['Food Type'] || 'Non-Veg');
        const preparationTime = String(row['Preparation Time'] || row['preparation_time'] || '').trim();
        const isAvailableRaw = String(row['Is Available (TRUE/FALSE)'] || row['is_available'] || 'TRUE').trim().toUpperCase();
        const isAvailable = isAvailableRaw !== 'FALSE';
        const variantsRaw = row['Variants (Name:Price, ...)'] || row['variants'] || '';
        const variants = parseVariants(variantsRaw);

        if (!name || isNaN(price)) continue; // Skip malformed rows

        if (!categoryMap.has(categoryName)) categoryMap.set(categoryName, []);
        categoryMap.get(categoryName).push({ name, description, price, foodType, preparationTime, isAvailable, variants });
    }

    if (!categoryMap.size) throw new Error('No valid rows found. Make sure Name and Price columns are filled.');

    const menuSections = [];
    const docsToInsert = [];

    for (const [catName, items] of categoryMap) {
        const { id: categoryId, name: resolvedCatName } = await findOrCreateCategory(catName, restaurantId, restaurant.zoneId);

        const sectionItems = [];
        for (const item of items) {
            const tempId = new mongoose.Types.ObjectId();
            docsToInsert.push({
                _id: tempId,
                restaurantId,
                categoryId,
                categoryName: resolvedCatName || catName,
                name: item.name,
                description: item.description,
                price: item.price,
                foodType: item.foodType,
                preparationTime: item.preparationTime,
                isAvailable: item.isAvailable,
                variants: item.variants,
                image: '',
                approvalStatus: 'approved',
                approvedAt: new Date()
            });

            sectionItems.push({
                id: tempId.toString(),
                name: item.name,
                description: item.description,
                price: item.price,
                type: item.foodType === 'Veg' ? 'veg' : 'non-veg',
                preparationTime: item.preparationTime,
                isAvailable: item.isAvailable,
                variants: item.variants,
                image: ''  // No AI image generation — kept simple
            });
        }

        menuSections.push({ name: catName, items: sectionItems });
    }

    // Bulk insert all food items
    if (docsToInsert.length) {
        await FoodItem.insertMany(docsToInsert, { ordered: false });
    }

    return {
        menu: menuSections,
        insertedCount: docsToInsert.length,
        restaurantName: restaurant.restaurantName
    };
}

/**
 * Get items status (image URLs) for polling.
 * Since we don't do AI image generation, returns empty map.
 */
export async function getMenuItemsStatus(restaurantId) {
    const items = await FoodItem.find({ restaurantId, image: { $ne: '' } })
        .select('_id image').lean();
    const map = {};
    for (const item of items) {
        map[item._id.toString()] = item.image;
    }
    return map;
}
