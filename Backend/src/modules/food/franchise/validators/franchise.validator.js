/**
 * Validate franchise lead application payload.
 */
export function validateFranchiseApplication(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 100) {
    errors.push('Name is required and must be 2-100 characters.');
  }

  if (!data.phone || typeof data.phone !== 'string' || !/^\d{10,15}$/.test(data.phone.trim().replace(/[\s\-\+]/g, ''))) {
    errors.push('A valid phone number (10-15 digits) is required.');
  }

  if (!data.email || typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!data.city || typeof data.city !== 'string' || data.city.trim().length < 1) {
    errors.push('City is required.');
  }

  if (!data.state || typeof data.state !== 'string' || data.state.trim().length < 1) {
    errors.push('State is required.');
  }

  if (!data.preferredLocation || typeof data.preferredLocation !== 'string' || data.preferredLocation.trim().length < 1) {
    errors.push('Preferred franchise location is required.');
  }

  const validBudgets = ['Under 1L', '1-2L', '2-5L', '5-10L', '10L+'];
  if (!data.budget || !validBudgets.includes(data.budget)) {
    errors.push(`Budget is required and must be one of: ${validBudgets.join(', ')}`);
  }

  if (data.occupation && (typeof data.occupation !== 'string' || data.occupation.length > 500)) {
    errors.push('Occupation must be under 500 characters.');
  }

  if (data.experience && (typeof data.experience !== 'string' || data.experience.length > 500)) {
    errors.push('Experience must be under 500 characters.');
  }

  if (data.message && (typeof data.message !== 'string' || data.message.length > 1000)) {
    errors.push('Message must be under 1000 characters.');
  }

  return { valid: errors.length === 0, errors };
}
