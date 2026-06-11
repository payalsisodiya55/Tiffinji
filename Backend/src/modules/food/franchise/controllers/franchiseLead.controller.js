import FranchiseLead from '../models/franchiseLead.model.js';
import FranchiseSettings from '../models/franchiseSettings.model.js';
import { validateFranchiseApplication } from '../validators/franchise.validator.js';
import { notifyAdminNewLead, notifyApplicantAcknowledgement } from '../services/franchiseNotification.service.js';

/**
 * POST /api/v1/food/franchise/apply
 * Submit a new franchise lead application (public).
 */
export async function submitApplication(req, res) {
  try {
    const { valid, errors } = validateFranchiseApplication(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, message: errors.join(' '), errors });
    }

    const { name, phone, email, city, state, preferredLocation, budget, occupation, experience, message } = req.body;

    // Check for duplicate submission (same phone or email within 24 hours)
    const recentDuplicate = await FranchiseLead.findOne({
      $or: [{ phone: phone.trim() }, { email: email.trim().toLowerCase() }],
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (recentDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted an application recently. Our team will contact you soon.',
      });
    }

    const lead = await FranchiseLead.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      city: city.trim(),
      state: state.trim(),
      preferredLocation: preferredLocation.trim(),
      budget,
      occupation: (occupation || '').trim(),
      experience: (experience || '').trim(),
      message: (message || '').trim(),
    });

    // Trigger notifications (non-blocking)
    const settings = await FranchiseSettings.findOne();
    notifyAdminNewLead(lead, settings).catch(() => {});
    notifyApplicantAcknowledgement(lead).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'Your franchise application has been submitted successfully! Our team will contact you soon.',
      data: { id: lead._id },
    });
  } catch (error) {
    console.error('[Franchise] submitApplication error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
}

/**
 * GET /api/v1/food/admin/franchise
 * List all franchise leads with search, filter, pagination.
 */
export async function getAllLeads(req, res) {
  try {
    const { page = 1, limit = 20, status, search, city, sort = '-createdAt' } = req.query;
    const filter = {};

    if (status && status !== 'ALL') filter.status = status;
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [leads, total] = await Promise.all([
      FranchiseLead.find(filter).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      FranchiseLead.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[Franchise] getAllLeads error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch leads.' });
  }
}

/**
 * GET /api/v1/food/admin/franchise/stats
 * Dashboard statistics by status.
 */
export async function getLeadStats(req, res) {
  try {
    const [total, statusCounts] = await Promise.all([
      FranchiseLead.countDocuments(),
      FranchiseLead.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const stats = { total };
    const statusMap = {
      NEW: 'new', CONTACTED: 'contacted', FOLLOW_UP: 'followUp',
      MEETING_SCHEDULED: 'meetingScheduled', PAYMENT_PENDING: 'paymentPending',
      APPROVED: 'approved', REJECTED: 'rejected',
    };

    Object.values(statusMap).forEach(key => { stats[key] = 0; });
    statusCounts.forEach(item => {
      const key = statusMap[item._id];
      if (key) stats[key] = item.count;
    });

    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('[Franchise] getLeadStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
}

/**
 * GET /api/v1/food/admin/franchise/:id
 */
export async function getLeadById(req, res) {
  try {
    const lead = await FranchiseLead.findById(req.params.id).lean();
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });
    return res.status(200).json({ success: true, data: lead });
  } catch (error) {
    console.error('[Franchise] getLeadById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch lead.' });
  }
}

/**
 * PATCH /api/v1/food/admin/franchise/:id
 */
export async function updateLead(req, res) {
  try {
    const { status, remarks, assignedAdmin } = req.body;
    const update = {};

    if (status) {
      const validStatuses = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'MEETING_SCHEDULED', 'PAYMENT_PENDING', 'APPROVED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value.' });
      }
      update.status = status;
    }
    if (remarks !== undefined) update.remarks = remarks;
    if (assignedAdmin !== undefined) update.assignedAdmin = assignedAdmin || null;

    const lead = await FranchiseLead.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });

    return res.status(200).json({ success: true, message: 'Lead updated.', data: lead });
  } catch (error) {
    console.error('[Franchise] updateLead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update lead.' });
  }
}

/**
 * DELETE /api/v1/food/admin/franchise/:id
 */
export async function deleteLead(req, res) {
  try {
    const lead = await FranchiseLead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });
    return res.status(200).json({ success: true, message: 'Lead deleted.' });
  } catch (error) {
    console.error('[Franchise] deleteLead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete lead.' });
  }
}
