'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { Guild } = require('../config/models');

// =============================================
// GUILD ROUTE
// GET  /api/guild/:id  → sunucu ayarlarını getir
// PATCH /api/guild/:id → sunucu ayarlarını güncelle
// =============================================

const ALLOWED_SETTINGS = [
  'settings.logsEnabled',
  'settings.gamesEnabled',
  'settings.economyEnabled',
  'settings.gameChannelId',
  'settings.wordGameChannelId',
  'channels.joinLog',
  'channels.welcome',
  'channels.giveawayLog',
  'channels.modLog',
  'welcomeMessage.enabled',
  'welcomeMessage.template',
];

// ─────────────────────────────────────────────
// GET — Sunucu ayarlarını getir
// ─────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild   = await Guild.findOne({ guildId });

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found in database. Make sure the bot is in this server.' });
    }

    res.json({
      guildId:          guild.guildId,
      guildName:        guild.guildName,
      isEarlySupporter: guild.isEarlySupporter ?? false,
      economyMultiplier: guild.economyMultiplier ?? 1,
      settings:         guild.settings       || {},
      channels:         guild.channels       || {},
      welcomeMessage:   guild.welcomeMessage || {},
    });
  } catch (err) {
    console.error('[Guild GET] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch guild settings.' });
  }
});

// ─────────────────────────────────────────────
// PATCH — Sunucu ayarlarını güncelle
// Body: { "settings.logsEnabled": true, "channels.welcome": "12345" }
// ─────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid request body.' });
    }

    // Sadece izin verilen alanları güncelle
    const safeUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (ALLOWED_SETTINGS.includes(key)) {
        safeUpdates[key] = value;
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const guild = await Guild.findOneAndUpdate(
      { guildId },
      { $set: safeUpdates },
      { new: true, upsert: false }
    );

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found.' });
    }

    res.json({
      ok:       true,
      updated:  Object.keys(safeUpdates),
      settings: guild.settings  || {},
      channels: guild.channels  || {},
    });
  } catch (err) {
    console.error('[Guild PATCH] Error:', err.message);
    res.status(500).json({ error: 'Failed to update guild settings.' });
  }
});

module.exports = router;
