const User = require('../models/User');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

/**
 * Get user profile by ID
 * GET /api/users/:id
 */
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('connections', 'name profilePic headline');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/**
 * Get current user's profile
 * GET /api/users/me
 */
exports.getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    const user = await User.findById(req.user._id)
      .populate('connections', 'name profilePic headline');

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

/**
 * Update user profile
 * PUT /api/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Only allow users to update their own profile
    if (!req.user || req.user._id.toString() !== userId) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const allowedFields = ['name', 'bio', 'headline', 'skills', 'education', 'location'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Handle profile picture upload
    if (req.file) {
      try {
        // Try Cloudinary upload first
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name') {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'mini-linkedin/profiles',
            transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
          });
          updates.profilePic = result.secure_url;
          // Clean up temp file
          fs.unlinkSync(req.file.path);
        } else {
          // Use local file path
          updates.profilePic = `/uploads/${req.file.filename}`;
        }
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        updates.profilePic = `/uploads/${req.file.filename}`;
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('connections', 'name profilePic headline');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * Search users
 * GET /api/users/search?q=query
 */
exports.searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { skills: { $regex: query, $options: 'i' } },
        { headline: { $regex: query, $options: 'i' } }
      ]
    }).select('name profilePic headline skills').limit(20);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

/**
 * Connect with another user
 * POST /api/users/:id/connect
 */
exports.connectUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ error: 'Cannot connect with yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already connected
    const isConnected = req.user.connections.includes(targetUserId);

    if (isConnected) {
      // Remove connection
      await User.findByIdAndUpdate(currentUserId, { $pull: { connections: targetUserId } });
      await User.findByIdAndUpdate(targetUserId, { $pull: { connections: currentUserId } });
      return res.json({ message: 'Disconnected', connected: false });
    } else {
      // Add connection
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { connections: targetUserId } });
      await User.findByIdAndUpdate(targetUserId, { $addToSet: { connections: currentUserId } });
      return res.json({ message: 'Connected', connected: true });
    }
  } catch (error) {
    console.error('Connect error:', error);
    res.status(500).json({ error: 'Failed to update connection' });
  }
};

/**
 * Get all users (for suggestions)
 * GET /api/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('name profilePic headline skills')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments();

    res.json({ 
      users, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
