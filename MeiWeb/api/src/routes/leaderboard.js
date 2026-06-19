'use strict';

const router = require('express').Router();
const { User, Cafe } = require('../config/models');

// =============================================
// LEADERBOARD ROUTE
// GET /api/leaderboard?type=coins|cafe&limit=10
// Global veya sunucu bazlı sıralama
// =============================================

const LIMIT_MAX = 50;

router.get('/', async (req, res) => {
  try {
    const type  = req.query.type  || 'coins';
    const limit = Math.min(parseInt(req.query.limit) || 10, LIMIT_MAX);

    if (type === 'coins') {
      const users = await User.find({ isRegistered: true })
        .sort({ balance: -1 })
        .limit(limit)
        .select('userId username balance totalEarned isPremium badges');

      return res.json(
        users.map((u, i) => ({
          rank:             i + 1,
          userId:           u.userId,
          username:         u.username,
          avatar:           u.avatar ?? null,
          value:            u.balance ?? 0,
          balance:          u.balance,
          totalEarned:      u.totalEarned,
          isEarlySupporter: u.isEarlySupporter ?? false,
          badges:           u.badges,
        }))
      );
    }

    if (type === 'cafe') {
      const cafes = await Cafe.find()
        .sort({ level: -1, 'stats.totalEarned': -1 })
        .limit(limit)
        .select('userId cafeName level stats');

      // Sahip bilgilerini ekle
      const userIds = cafes.map(c => c.userId);
      const owners  = await User.find({ userId: { $in: userIds } })
        .select('userId username isPremium');
      const ownerMap = Object.fromEntries(owners.map(u => [u.userId, u]));

      return res.json(
        cafes.map((c, i) => ({
          rank:             i + 1,
          userId:           c.userId,
          username:         ownerMap[c.userId]?.username || 'Unknown',
          avatar:           ownerMap[c.userId]?.avatar ?? null,
          cafeName:         c.cafeName,
          level:            c.level,
          value:            c.stats?.totalEarned ?? 0,
          totalEarned:      c.stats?.totalEarned ?? 0,
          isEarlySupporter: ownerMap[c.userId]?.isEarlySupporter ?? false,
        }))
      );
    }

    res.status(400).json({ error: 'Invalid type. Use: coins | cafe' });
  } catch (err) {
    console.error('[Leaderboard] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

module.exports = router;
