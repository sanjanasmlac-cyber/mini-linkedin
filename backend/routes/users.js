const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/users/me - Get current user (must be before /:id)
router.get('/me', authMiddleware, userController.getMe);

// GET /api/users/search?q=query
router.get('/search', userController.searchUsers);

// GET /api/users - Get all users
router.get('/', userController.getAllUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id', userController.getUser);

// PUT /api/users/:id - Update user profile
router.put('/:id', authMiddleware, upload.single('profilePic'), userController.updateUser);

// POST /api/users/:id/connect - Connect/disconnect with user
router.post('/:id/connect', authMiddleware, userController.connectUser);

module.exports = router;
