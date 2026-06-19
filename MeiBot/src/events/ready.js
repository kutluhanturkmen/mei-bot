'use strict';

const { Events }          = require('discord.js');
const { loadCommands }    = require('../gateway/commands');
const logger              = require('../utils/logger');

// =============================================
// 🌸 MEI BOT — READY EVENT
// Bot Discord'a başarıyla bağlandığında tetiklenir.
// Slash komutları burada kayıt edilir.
// =============================================

module.exports = {
  name: Events.ClientReady,
  once: true,  // Sadece bir kez çalışır

  /**
   * @param {import('discord.js').Client} client
   */
  async execute(client) {
    // Konsol banner'ı
    logger.ready(client.user.tag, client.guilds.cache.size);

    // Bot kullanıcı adını ve avatarını ayarla (opsiyonel)
    try {
      await client.user.setPresence({
        activities: [{ name: '🌸 /help • Mei Bot', type: 3 }], // Type 3 = Watching
        status: 'online',
      });
    } catch (err) {
      logger.warn(`Failed to set presence: ${err.message}`);
    }

    // Slash komutlarını yükle ve Discord'a kayıt et
    try {
      await loadCommands(client);
    } catch (err) {
      logger.error(`Failed to load commands on ready: ${err.message}`);
    }

    // ── Invite Cache — guildMemberAdd için ───
    // Her sunucunun mevcut invite listesini önbelleğe al
    if (!client.inviteCache) client.inviteCache = new Map();

    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();
        const cache   = new Map();
        for (const [code, inv] of invites) {
          cache.set(code, { uses: inv.uses, inviterId: inv.inviterId });
        }
        client.inviteCache.set(guild.id, cache);
        logger.info(`Cached ${cache.size} invite(s) for guild: ${guild.name}`);
      } catch {
        // Bot'un bu sunucuda MANAGE_GUILD yetkisi yoksa atla
      }
    }

    logger.success(`Mei is online and ready! Serving ${client.guilds.cache.size} guild(s).`);
  },
};
