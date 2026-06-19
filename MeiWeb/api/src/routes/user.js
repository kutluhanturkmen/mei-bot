'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { User, Cafe } = require('../config/models');

// =============================================
// USER ROUTE
// GET /api/user/me  → oturum açmış kullanıcının
//                     bot profil bilgilerini döndürür
// =============================================

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { id, username, avatar } = req.user;

    const [user, cafe] = await Promise.all([
      User.findOne({ userId: id }),
      Cafe.findOne({ userId: id }),
    ]);

    const avatarURL = avatar
      ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/0.png`;

    if (!user?.isRegistered) {
      return res.json({
        id,
        username,
        avatarURL,
        isRegistered: false,
      });
    }

    res.json({
      id,
      username:         user.username,
      avatarURL,
      isRegistered:     true,
      isEarlySupporter: user.isEarlySupporter ?? false,
      balance:          user.balance,
      totalEarned:      user.totalEarned,
      badges:           user.badges,
      pinnedBadges:     user.pinnedBadges || [],
      profileBackground: user.profileBackground || 'default',
      ownedBackgrounds:  user.ownedBackgrounds  || ['default'],
      catfightStats: user.catfightStats,
      triviaStats:   user.triviaStats,
      cafe: cafe ? {
        cafeName:    cafe.cafeName,
        level:       cafe.level,
        totalEarned: cafe.stats?.totalEarned ?? 0,
        totalCleans: cafe.stats?.totalCleans ?? 0,
      } : null,
    });
  } catch (err) {
    console.error('[User/me] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user data.' });
  }
});

module.exports = router;
