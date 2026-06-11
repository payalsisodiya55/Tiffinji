import express from 'express';
import { getAllLeads, getLeadStats, getLeadById, updateLead, deleteLead } from '../controllers/franchiseLead.controller.js';
import { getSettings, updateSettings } from '../controllers/franchiseSettings.controller.js';

const router = express.Router();

// Franchise Settings (admin)
router.get('/settings', getSettings);
router.patch('/settings', updateSettings);

// Lead statistics
router.get('/stats', getLeadStats);

// Lead CRUD
router.get('/', getAllLeads);
router.get('/:id', getLeadById);
router.patch('/:id', updateLead);
router.delete('/:id', deleteLead);

export default router;
