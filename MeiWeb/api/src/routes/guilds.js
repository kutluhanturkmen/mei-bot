'use strict';

const router = require('express').Router();
const axios  = require('axios');
const { requireAuth } = require('../middleware/auth');
const { Guild } = require('../config/models');

// =============================================
// GUILDS ROUTE
// GET /api/guilds
// Kullanıcının Discord'daki sunucularını döndürür.
// Sadece Admin (MANAGE_GUILD) yetkisine sahip olanlar.
// hasBot: Guild koleksiyonunda guildId mevcutsa true.
// =============================================

const DISCORD_API  = 'https://discord.com/api/v10';
const MANAGE_GUILD = 0x20; // PermissionFlagsBits.ManageGuild

router.get('/', requireAuth, async (req, res) => {
  try {
    const { accessToken } = req.user;

    // Discord'dan kullanıcının guild listesini çek
    const guildsRes = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userGuilds = guildsRes.data;

    // Sadece admin olduğu sunucuları filtrele
    const adminGuilds = userGuilds.filter(g => {
      const perms = BigInt(g.permissions);
      return (perms & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD);
    });

    if (adminGuilds.length === 0) {
      return res.json([]);
    }

    // DB'den botun hangi sunucularda olduğunu tek sorguda al
    const adminGuildIds = adminGuilds.map(g => g.id);
    const botGuilds = await Guild.find(
      { guildId: { $in: adminGuildIds } },
      { guildId: 1, _id: 0 }
    ).lean();

    // Set kullanarak O(1) lookup
    const botGuildSet = new Set(botGuilds.map(g => g.guildId));

    // Her sunucu için icon URL üret ve hasBot hesapla
    const formatted = adminGuilds.map(g => ({
      id:     g.id,
      name:   g.name,
      icon:   g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
        : null,
      hasBot: botGuildSet.has(g.id),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[Guilds] Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch guilds.' });
  }
});

module.exports = router;
