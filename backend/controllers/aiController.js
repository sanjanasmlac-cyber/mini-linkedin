const { enhanceBio, enhanceCaption, extractSkills } = require('../../config/groq');

/**
 * Enhance a professional bio using AI
 * POST /api/ai/enhance-bio
 */
exports.enhanceBio = async (req, res) => {
  try {
    const { bio } = req.body;
    
    if (!bio || bio.trim().length === 0) {
      return res.status(400).json({ error: 'Bio text is required' });
    }

    const enhancedBio = await enhanceBio(bio);
    
    res.json({ 
      original: bio,
      enhanced: enhancedBio 
    });
  } catch (error) {
    console.error('Enhance bio error:', error);
    res.status(500).json({ error: 'Failed to enhance bio. ' + error.message });
  }
};

/**
 * Enhance a post caption using AI
 * POST /api/ai/enhance-caption
 */
exports.enhanceCaption = async (req, res) => {
  try {
    const { caption } = req.body;
    
    if (!caption || caption.trim().length === 0) {
      return res.status(400).json({ error: 'Caption text is required' });
    }

    const enhancedCaption = await enhanceCaption(caption);
    
    res.json({ 
      original: caption,
      enhanced: enhancedCaption 
    });
  } catch (error) {
    console.error('Enhance caption error:', error);
    res.status(500).json({ error: 'Failed to enhance caption. ' + error.message });
  }
};

/**
 * Extract skills from text
 * POST /api/ai/extract-skills
 */
exports.extractSkills = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const skills = await extractSkills(text);
    
    res.json({ skills });
  } catch (error) {
    console.error('Extract skills error:', error);
    res.status(500).json({ error: 'Failed to extract skills. ' + error.message });
  }
};
