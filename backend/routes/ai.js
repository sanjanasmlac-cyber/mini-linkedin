const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/auth');

// POST /api/ai/enhance-bio - Enhance bio with AI
router.post('/enhance-bio', authMiddleware, aiController.enhanceBio);

// POST /api/ai/enhance-caption - Enhance caption with AI
router.post('/enhance-caption', authMiddleware, aiController.enhanceCaption);

// POST /api/ai/extract-skills - Extract skills from text
router.post('/extract-skills', authMiddleware, aiController.extractSkills);

module.exports = router;
