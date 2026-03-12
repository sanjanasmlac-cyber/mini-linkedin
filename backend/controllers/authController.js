const User = require('../models/User');

/**
 * Register a new user
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { name, email, firebaseId } = req.body;

    if (!name || !email || !firebaseId) {
      return res.status(400).json({ error: 'Name, email, and firebaseId are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { firebaseId }] 
    });

    if (existingUser) {
      return res.status(200).json({ 
        message: 'User already exists', 
        user: existingUser 
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      firebaseId,
      profilePic: req.body.profilePic || '',
      bio: '',
      skills: [],
      connections: []
    });

    await user.save();

    res.status(201).json({ 
      message: 'User registered successfully', 
      user 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

/**
 * Login - find or create user
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, firebaseId, name, profilePic } = req.body;

    if (!email || !firebaseId) {
      return res.status(400).json({ error: 'Email and firebaseId are required' });
    }

    // Find existing user or create new one
    let user = await User.findOne({ firebaseId });

    if (!user) {
      user = new User({
        name: name || email.split('@')[0],
        email,
        firebaseId,
        profilePic: profilePic || '',
        bio: '',
        skills: [],
        connections: []
      });
      await user.save();
    }

    res.json({ message: 'Login successful', user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};
