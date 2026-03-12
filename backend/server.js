require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/notifications', require('./routes/notifications'));

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ─── Serve Frontend Routes ──────────────────────────────────
app.get('*', (req, res) => {
  // If the request is for an API route that doesn't exist
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Otherwise serve the frontend
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Connect to MongoDB & Start Server ──────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mini-linkedin';

async function startServer() {
  try {
    // Try to connect to local/provided MongoDB with a short timeout
    await mongoose.connect(MONGODB_URI, { 
      serverSelectionTimeoutMS: 2000 
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.warn('⚠️  Local MongoDB not found. Starting in-memory MongoDB for development...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'mini-linkedin'
        },
        spawnTimeoutMS: 60000, // Increase timeout to 60s
      });
      const memoryUri = mongoServer.getUri();
      await mongoose.connect(memoryUri);
      console.log('✅ In-Memory MongoDB connected');
    } catch (memErr) {
      console.error('❌ Failed to start in-memory MongoDB:', memErr.message);
      console.error('   Please ensure you have an internet connection to download the MongoDB binary or install MongoDB locally.');
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║       Mini AI LinkedIn - Server Running          ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  🌐 Server:    http://localhost:${PORT}             ║
║  📦 Database:  MongoDB Connected                 ║
║  🚀 Mode:      ${process.env.NODE_ENV || 'development'}                    ║
║                                                  ║
╚══════════════════════════════════════════════════╝
    `);
  });
}

startServer();

module.exports = app;
