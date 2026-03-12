const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  firebaseId: {
    type: String,
    required: true,
    unique: true
  },
  profilePic: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500
  },
  headline: {
    type: String,
    default: '',
    maxlength: 200
  },
  skills: [{
    type: String,
    trim: true
  }],
  education: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  connections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for text search
userSchema.index({ name: 'text', skills: 'text', bio: 'text' });

module.exports = mongoose.model('User', userSchema);
