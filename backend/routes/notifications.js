const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/notifications - Get user notifications
router.get('/', authMiddleware, notificationController.getNotifications);

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', authMiddleware, notificationController.getUnreadCount);

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);

// PUT /api/notifications/:id/read - Mark single as read
router.put('/:id/read', authMiddleware, notificationController.markAsRead);

module.exports = router;
