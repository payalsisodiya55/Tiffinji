const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

/**
 * Delivery Notifications Utility Functions
 * Centralized management for delivery notifications
 */

const DELIVERY_NOTIFICATIONS_KEY = 'delivery_notifications'

/**
 * Get all notifications
 * @returns {Array} - Array of notifications from localStorage
 */
export const getDeliveryNotifications = () => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELIVERY_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    debugError('Failed to parse delivery notifications', err);
    return [];
  }
}

/**
 * Save notifications
 * @param {Array} notifications - Array of notifications to save
 */
export const saveDeliveryNotifications = (notifications) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DELIVERY_NOTIFICATIONS_KEY, JSON.stringify(notifications || []));
  } catch (err) {
    debugError('Failed to save delivery notifications', err);
  }
}

/**
 * Get unread notification count
 * @returns {number} - Count of unread notifications
 */
export const getUnreadDeliveryNotificationCount = () => {
  const list = getDeliveryNotifications();
  return list.filter(item => !item.read).length;
}

/**
 * Add a new notification
 * @param {Object} notification - Notification object
 */
export const addDeliveryNotification = (notification) => {
  try {
    const list = getDeliveryNotifications();
    const newNotif = {
      id: notification.id || `delivery-notification-${Date.now()}-${Math.random()}`,
      title: notification.title || 'Notification',
      message: notification.message || notification.body || '',
      read: false,
      createdAt: notification.createdAt || new Date().toISOString(),
      ...notification
    };
    list.unshift(newNotif);
    // Keep only the most recent 100 notifications
    saveDeliveryNotifications(list.slice(0, 100));
    window.dispatchEvent(new CustomEvent('deliveryNotificationsUpdated'));
    return newNotif;
  } catch (err) {
    debugError('Failed to add delivery notification', err);
    return notification;
  }
}

/**
 * Mark notification as read
 * @param {number|string} notificationId - Notification ID
 */
export const markDeliveryNotificationAsRead = (notificationId) => {
  try {
    const list = getDeliveryNotifications();
    const updated = list.map(item => 
      item.id === notificationId ? { ...item, read: true } : item
    );
    saveDeliveryNotifications(updated);
    window.dispatchEvent(new CustomEvent('deliveryNotificationsUpdated'));
  } catch (err) {
    debugError('Failed to mark delivery notification as read', err);
  }
}


