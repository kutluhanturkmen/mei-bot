'use strict';

const mongoose = require('mongoose');

// =============================================
// DB CONFIG — MeiBot schema'larını shared path
// üzerinden yeniden kullanır.
// API, MeiBot ile aynı MongoDB'ye bağlanır.
// =============================================

// Bağlantı olaylarını logla
mongoose.connection.on('connected', () => {
  console.log('[DB] MongoDB connection established — readyState:', mongoose.connection.readyState);
});
mongoose.connection.on('error', (err) => {
  console.error('[DB] MongoDB connection error:', err.message);
});
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] MongoDB disconnected');
});

async function connectDB() {
  // Zaten bağlıysa hemen dön
  if (mongoose.connection.readyState === 1) {
    console.log('[DB] Already connected, skipping.');
    return;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI environment variable is not set.');

  // bufferCommands default true — bağlantı kurulana kadar sorgular queue'da bekler
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS:          45000,
    connectTimeoutMS:         15000,
  });
}

module.exports = { connectDB };
