const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const cloudinary = require('../../config/cloudinary');
const { extractSkills } = require('../../config/groq');
const fs = require('fs');

/**
 * Create a new post
 * POST /api/posts
 */
exports.createPost = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Please register first' });
    }

    const { caption } = req.body;
    if (!caption) {
      return res.status(400).json({ error: 'Caption is required' });
    }

    let imageUrl = '';

    // Handle image upload
    if (req.file) {
      try {
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name') {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'mini-linkedin/posts',
            transformation: [{ width: 800, quality: 'auto' }]
          });
          imageUrl = result.secure_url;
          fs.unlinkSync(req.file.path);
        } else {
          imageUrl = `/uploads/${req.file.filename}`;
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        imageUrl = `/uploads/${req.file.filename}`;
      }
    }

    // Extract skills from the caption using AI
    let detectedSkills = [];
    try {
      detectedSkills = await extractSkills(caption);
    } catch (err) {
      console.error('Skill extraction error:', err.message);
    }

    const post = new Post({
      userId: req.user._id,
      caption,
      imageUrl,
      detectedSkills,
      likes: [],
      comments: []
    });

    await post.save();

    // Populate user info
    await post.populate('userId', 'name profilePic headline');

    // Run skill matching in the background (don't await)
    matchSkillsAndNotify(req.user, detectedSkills, post._id).catch(err => {
      console.error('Skill matching error:', err.message);
    });

    res.status(201).json({ message: 'Post created successfully', post });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

/**
 * Match skills and send notifications
 */
async function matchSkillsAndNotify(currentUser, detectedSkills, postId) {
  if (!detectedSkills || detectedSkills.length === 0) return;

  // Find users who have matching skills
  const matchingUsers = await User.find({
    _id: { $ne: currentUser._id },
    skills: { $in: detectedSkills.map(s => new RegExp(s, 'i')) }
  }).limit(10);

  // Create notifications for matching users
  const notifications = matchingUsers.map(matchedUser => {
    const sharedSkills = matchedUser.skills.filter(skill =>
      detectedSkills.some(ds => ds.toLowerCase() === skill.toLowerCase())
    );

    return {
      userId: matchedUser._id,
      fromUserId: currentUser._id,
      message: `You and ${currentUser.name} both share skills in ${sharedSkills.join(', ')}. Consider connecting since you share similar interests!`,
      type: 'skill-match',
      postId
    };
  });

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }
}

/**
 * Get feed posts (paginated)
 * GET /api/posts
 */
exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('userId', 'name profilePic headline')
      .populate('comments.userId', 'name profilePic')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments();

    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

/**
 * Get a single post
 * GET /api/posts/:id
 */
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('userId', 'name profilePic headline')
      .populate('comments.userId', 'name profilePic');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

/**
 * Get posts by a specific user
 * GET /api/posts/user/:userId
 */
exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.userId })
      .populate('userId', 'name profilePic headline')
      .populate('comments.userId', 'name profilePic')
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
};

/**
 * Toggle like on a post
 * POST /api/posts/:id/like
 */
exports.toggleLike = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Please register first' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const userId = req.user._id;
    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);

      // Send notification to post owner (if not self-like)
      if (post.userId.toString() !== userId.toString()) {
        await Notification.create({
          userId: post.userId,
          fromUserId: userId,
          message: `${req.user.name} liked your post`,
          type: 'like',
          postId: post._id
        });
      }
    }

    await post.save();

    res.json({
      message: alreadyLiked ? 'Unliked' : 'Liked',
      liked: !alreadyLiked,
      likesCount: post.likes.length
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

/**
 * Add a comment to a post
 * POST /api/posts/:id/comment
 */
exports.addComment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Please register first' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = {
      userId: req.user._id,
      text,
      createdAt: new Date()
    };

    post.comments.push(comment);
    await post.save();

    // Populate the new comment's user info
    await post.populate('comments.userId', 'name profilePic');

    // Send notification to post owner (if not self-comment)
    if (post.userId.toString() !== req.user._id.toString()) {
      await Notification.create({
        userId: post.userId,
        fromUserId: req.user._id,
        message: `${req.user.name} commented on your post: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
        type: 'comment',
        postId: post._id
      });
    }

    res.status(201).json({
      message: 'Comment added successfully',
      comment: post.comments[post.comments.length - 1]
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

/**
 * Delete a post
 * DELETE /api/posts/:id
 */
exports.deletePost = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Please register first' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};
