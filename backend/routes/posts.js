const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// POST /api/posts - Create a new post
router.post('/', authMiddleware, upload.single('image'), postController.createPost);

// GET /api/posts - Get feed posts (public)
router.get('/', optionalAuth, postController.getPosts);

// GET /api/posts/:id - Get a single post
router.get('/:id', optionalAuth, postController.getPost);

// GET /api/posts/user/:userId - Get posts by a user
router.get('/user/:userId', optionalAuth, postController.getUserPosts);

// POST /api/posts/:id/like - Toggle like
router.post('/:id/like', authMiddleware, postController.toggleLike);

// POST /api/posts/:id/comment - Add comment
router.post('/:id/comment', authMiddleware, postController.addComment);

// DELETE /api/posts/:id - Delete post
router.delete('/:id', authMiddleware, postController.deletePost);

module.exports = router;
