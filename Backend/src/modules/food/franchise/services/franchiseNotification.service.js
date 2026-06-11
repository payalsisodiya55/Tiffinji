/**
 * Franchise notification service.
 * Sends email/WhatsApp alerts when a new franchise lead is submitted.
 * This is a placeholder — integrate with your existing email service as needed.
 */

/**
 * Notify admin about a new franchise lead.
 * @param {Object} lead - The franchise lead document.
 * @param {Object} settings - The franchise settings document (for contact info).
 */
export async function notifyAdminNewLead(lead, settings) {
  try {
    // Log for now — replace with actual email/WhatsApp integration
    console.log(`[Franchise] New lead received: ${lead.name} (${lead.phone}) from ${lead.city}`);

    // Future: Send email to settings.contactEmail
    // Future: Send WhatsApp to settings.whatsappNumber
  } catch (error) {
    console.error('[Franchise] Failed to send admin notification:', error.message);
  }
}

/**
 * Send acknowledgement to the applicant.
 * @param {Object} lead - The franchise lead document.
 */
export async function notifyApplicantAcknowledgement(lead) {
  try {
    console.log(`[Franchise] Acknowledgement sent to: ${lead.email}`);

    // Future: Send "Thank you for your interest" email to lead.email
  } catch (error) {
    console.error('[Franchise] Failed to send applicant notification:', error.message);
  }
}
