'use strict';

const router = require('express').Router();
const { User, Guild } = require('../config/models');

// =============================================
// STATS ROUTE
// GET /api/stats
// Live: toplam sunucu, kullanıcı, Lotus Coin sayısı
// 60s cache ile veritabanı baskısını azaltır.
// =============================================

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60 saniye

router.get('/', async (req, res) => {
  try {
    const now = Date.now();

    // Cache hâlâ geçerliyse döndür
    if (cache && now - cacheTime < CACHE_TTL) {
      return res.json(cache);
    }

    const [
      totalGuilds,
      totalUsers,
      coinsResult,
    ] = await Promise.all([
      Guild.countDocuments(),
      User.countDocuments({ isRegistered: true }),
      User.aggregate([
        { $group: { _id: null, total: { $sum: '$totalEarned' } } },
      ]),
    ]);

    cache = {
      guilds:      totalGuilds,
      users:       totalUsers,
      lotusCoins:  coinsResult[0]?.total ?? 0,
      cachedAt:    new Date().toISOString(),
    };
    cacheTime = now;

    res.json(cache);
  } catch (err) {
    console.error('[Stats] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

module.exports = router;
