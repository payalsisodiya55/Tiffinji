import express from 'express';
import { submitApplication } from '../controllers/franchiseLead.controller.js';
import { getPublicSettings } from '../controllers/franchiseSettings.controller.js';

const router = express.Router();

// Public: Fetch franchise page CMS content
router.get('/settings/public', getPublicSettings);

// Public: Submit franchise lead application
router.post('/apply', submitApplication);

export default router;
